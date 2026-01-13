import type { Time, Course, DayCode, UPRMDay } from "./types";

// UPRM' Spanish days to ICS format
// L - Monday (Lunes), M - Tuesday (Martes), W - Wednesday (Miércoles), J - Thursday (Jueves), V - Friday (Viernes)
const SPANISH_Days: Record<string, DayCode> = {
    "L": "MO",
    "M": "TU",
    "W": "WE",
    "J": "TH",
    "V": "FR"
};

// Reverse mapping for display
const DAY_NAMES: Record<DayCode, UPRMDay> = {
    "MO": "L",
    "TU": "M",
    "WE": "W",
    "TH": "J",
    "FR": "V"
};

// Parse strings like "10:30am", "1030am", "10.30 am", "10,30am"
export function parseTime(str: string): Time | null {
    const s = str
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[.,]/g, ':');

    const patterns = [
        /^(\d{1,2}):(\d{2})(am|pm)?$/, // 8:30am or 14:30
        /^(\d{1,2})(\d{2})(am|pm)?$/   // 830am which has no colon
    ];

    for (const pattern of patterns) {
        const match = s.match(pattern);
        if (match) {
            let hour = parseInt(match[1], 10);
            const min = parseInt(match[2], 10);
            const period = match[3];

            // Convert to the 24 hr format
            if (period) {
                if (period === 'pm' && hour !== 12) hour += 12;
                if (period === 'am' && hour === 12) hour = 0;
            }

            if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
                return { hour, minute: min };
            }
        }
    }

    return null;
}

// Parse days from strings like "MO WE FR", "L M W", "M AND W"
export function parseDays(str: string): DayCode[] {
    const days: DayCode[] = [];
    const upper = str.toUpperCase();

    // Check for english two letter days
    for (const [code, day] of [
        ['MO', 'MO'],
        ['TU', 'TU'],
        ['WE', 'WE'],
        ['TH', 'TH'],
        ['FR', 'FR']
    ] as [string, DayCode][]) {
        if (upper.includes(code) && !days.includes(day)) {
            days.push(day);
        }
    }

    // Spanish Next
    if (days.length === 0) {
        for (const char of upper.replace(/\s+/g, '')) {
            const day = SPANISH_Days[char];
            if (day && !days.includes(day)) {
                days.push(day);
            }
        }
    }

    return days;
}

// Parse a single line of schedule text
function parseLine(line: string): Course | null {
    // look for the time range dis is our anchor point
    const timeMatch = line.match(
        /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i
    );

    if (!timeMatch) return null; // no time found, skip this line

    const startTime = parseTime(timeMatch[1]);
    const endTime = parseTime(timeMatch[2]);

    if (!startTime || !endTime) return null;

    // split the line into before time and after time parts
    const beforeTime = line.substring(0, timeMatch.index).trim();
    const afterTime = line
        .substring(timeMatch.index! + timeMatch[0].length)
        .trim();

    // parse the stuff before the time (course code, section, credits)
    const beforeParts = beforeTime.split(/\s+/);
    let code = '';
    let section = '';

    for (const part of beforeParts) {
        // course codes look like MATE3031, CIIC4010
        if (/^[A-Z]{2,4}\d{4}[A-Z]?$/i.test(part)) {
            code = part.toUpperCase();
        }
        // sections are 2-3 digit numbers
        else if (/^\d{2,3}$/.test(part) && !section) {
            section = part;
        }
    }

    // fallback  just use first thing as code
    if (!code && beforeParts[0]) {
        code = beforeParts[0].toUpperCase();
    }

    // parse the stuff after the time (days, location, professor)
    const afterParts = afterTime.split(/\s+/);
    let days: DayCode[] = [];
    let locationStart = 0;

    // find the days
    for (let i = 0; i < afterParts.length; i++) {
        const part = afterParts[i];
        // days are usually just letters like "MJ" or "LWV"
        if (/^[LMWJV]+$/i.test(part) && part.length <= 5) {
            days = parseDays(part);
            if (days.length > 0) {
                locationStart = i + 1;
                break;
            }
        }
    }

    // if we couldn't find days, default to Monday (user can fix it)
    if (days.length === 0) {
        days = ['MO'];
    }

    // everything else is location and professor
    const rest = afterParts.slice(locationStart).join(' ');
    let location = '';
    let professor = rest;

    // try to extract location (looks like "S 113" or "CH 221")
    const locMatch = rest.match(/^([A-Z]{1,4}[-\s]?\d{1,4})/i);
    if (locMatch) {
        location = locMatch[1].trim();
        professor = rest.substring(locMatch[0].length).trim();
    }

    return {
        id: Date.now() + Math.random(), // good enough unique id
        code,
        section,
        startTime,
        endTime,
        days,
        location,
        professor
    };
}

// Checks if the input looks like csv data
function isCSV(text: string): boolean {
    const lines = text.split('\n');
    if (lines.length < 2) return false;

    const header = lines[0].toLowerCase();

    return (
        header.includes("course") ||
        header.includes("section") ||
        lines[0].includes("\t") ||
        (lines[0].match(/,/g) || []).length >= 3
    );
}


// Parse into CSV format
function parseCSV(text: string): Course[] {
    const lines = text.trim().split('\n');
    const delim = lines[0].includes('\t') ? '\t' : ','; 
    const header = lines[0].split(delim).map(h => h.trim().toLowerCase());

    // Identify column indices
    const findCol  = (name: string) => header.findIndex(h => h.includes(name));

    const courseCol = findCol("course")
    const sectionCol = findCol("section");
    const daysCol = findCol("day");
    const scheduleCol = Math.max(findCol("schedule"), findCol("time"));
    const roomCol = Math.max(findCol("room"), findCol("location"));
    const courses:  Course[] = [];


    //  parse each line
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delim).map(c => c.trim());
        if (!row[0]) continue;

        const code = row[courseCol >= 0 ? courseCol : 0]  || '';
        if (!/^[A-Z]{4}\d{4}/i.test(code)) continue; // skip invalid course codes

        const section = row[sectionCol >= 0 ? sectionCol : 1] || '';
        const daysStr = row[daysCol >= 0 ? daysCol : 4] || '';
        const timeStr = row[scheduleCol >= 0 ? scheduleCol : 5] || '';
        const room = row[roomCol >= 0 ? roomCol : 6] || '';

        const days = parseDays(daysStr);
        if (days.length === 0) continue;
        
        //parse time which could be range or just start time
        let start: Time | null = null;
        let end: Time | null = null;

        const range = timeStr.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
        if (range) {
            start = parseTime(range[1]);
            end = parseTime(range[2]);
        } else {
            start = parseTime(timeStr)
            if (start) {
                const duration = (days.includes("TU") || days.includes("TH")) ? 75 : 90; // shorter duration for Tue/Thu
                const totalMins = start.hour * 60 + start.minute + duration;
                end = { hour: Math.floor(totalMins / 60), minute: totalMins % 60 };
            }
        }

        if (!start || !end) continue;

        courses.push({
            id: Date.now() + Math.random(),
            code: code.toUpperCase(),
            section,
            startTime: start,
            endTime: end,
            days,
            location: room,
            professor: ''
        });
    }
    return courses;
}

// Main parse function
export function parseSchedule(text: string): Course[] {
    // we try to detect if it's csv first
    if (isCSV(text)) {
        const courses = parseCSV(text);
        if (courses.length > 0) return courses;
    }

    // otherwise treat as plain text
    const lines = text.split('\n').filter(L => L.trim().length > 5);
    return lines.map(parseLine).filter((c): c is Course => c !== null && !!c.code);
}


// Format time for display (12-hour with am/pm)
export function formatTime(t: Time): string {
    const hour12 = t.hour % 12 || 12;
    const period = t.hour >= 12 ? 'pm' : 'am';
    const mins = t.minute.toString().padStart(2, '0');
    return `${hour12}:${mins} ${period}`;
}

// Format time for HTML time input (24 hour HH:MM)
export function formatTimeInput(t: Time): string {
    const hh = t.hour.toString().padStart(2, '0');
    const mm = t.minute.toString().padStart(2, '0');
    return `${hh}:${mm}`;
}

// Format days for display
export function formatDays(days: DayCode[]): string {
    return days.map(d => DAY_NAMES[d]).join(' ');
}

