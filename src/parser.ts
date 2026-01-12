import type { Time, Course, DayCode, UPRMDay } from "../types";

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
    // look for the time range - this is our anchor point
    const timeMatch = line.match(
        /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i
    );

    if (!timeMatch) return null; // no time found, skip this line

    const startTime = parseTime(timeMatch[1]);
    const endTime = parseTime(timeMatch[2]);

    if (!startTime || !endTime) return null;

    // split the line into before-time and after-time parts
    const beforeTime = line.substring(0, timeMatch.index).trim();
    const afterTime = line
        .substring(timeMatch.index! + timeMatch[0].length)
        .trim();

    // parse the stuff before the time (course code, section, credits)
    const beforeParts = beforeTime.split(/\s+/);
    let code = '';
    let selection = '';

    for (const part of beforeParts) {
        // course codes look like MATE3031, CIIC4010
        if (/^[A-Z]{2,4}\d{4}[A-Z]?$/i.test(part)) {
            code = part.toUpperCase();
        }
        // sections are 2-3 digit numbers
        else if (/^\d{2,3}$/.test(part) && !selection) {
            selection = part;
        }
    }

    // fallback - just use first thing as code
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
