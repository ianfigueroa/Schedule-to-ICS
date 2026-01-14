import type { Time, Course, DayCode, UPRMDay } from "./types";

// UPRM Spanish days to ICS format
// L - Monday (Lunes), M - Tuesday (Martes), W - Wednesday (Miércoles), J - Thursday (Jueves), V - Friday (Viernes)
const SPANISH_DAYS: Record<string, DayCode> = {
    "L": "MO",
    "M": "TU",
    "W": "WE",
    "J": "TH",
    "V": "FR"
};

// English two-letter day codes (Tu Th format from new portal)
const ENGLISH_DAYS: Record<string, DayCode> = {
    "MO": "MO",
    "TU": "TU",
    "WE": "WE",
    "TH": "TH",
    "FR": "FR",
    "M": "MO",   // M W format
    "W": "WE",
    "F": "FR",
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

// Parse days from strings like "MO WE FR", "L M W", "Tu Th", "M W", "MJ", "LWV"
export function parseDays(str: string): DayCode[] {
    const days: DayCode[] = [];
    const cleaned = str.trim();

    // First try: "Tu Th" or "M W" format (space separated, English)
    const spaceParts = cleaned.split(/\s+/);
    if (spaceParts.length >= 1) {
        for (const part of spaceParts) {
            const upper = part.toUpperCase();
            // Check two-letter codes first (Tu, Th, Mo, We, Fr)
            if (ENGLISH_DAYS[upper]) {
                const day = ENGLISH_DAYS[upper];
                if (!days.includes(day)) days.push(day);
            }
        }
    }

    // If we found days with English format, return them
    if (days.length > 0) return days;

    // Second try: Spanish concatenated format "MJ", "LWV", "LMWJV"
    const upper = cleaned.toUpperCase().replace(/\s+/g, '');
    for (const char of upper) {
        const day = SPANISH_DAYS[char];
        if (day && !days.includes(day)) {
            days.push(day);
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
        // course codes look like MATE3031, CIIC4010, CIIC4010L
        if (/^[A-Z]{4}\d{4}[A-Z]?$/i.test(part)) {
            code = part.toUpperCase();
        }
        // sections are 2-3 digit numbers or like "090L"
        else if (/^\d{2,3}[A-Z]?$/i.test(part) && !section) {
            section = part;
        }
    }

    // fallback: just use first thing as code
    if (!code && beforeParts[0]) {
        code = beforeParts[0].toUpperCase();
    }

    // parse the stuff after the time (days, location, professor)
    // Format from old portal: "MJ F C Pedro Vasquez" or "LWV S 113 Some Professor"
    const afterParts = afterTime.split(/\s+/);
    let days: DayCode[] = [];
    let locationParts: string[] = [];
    let professorParts: string[] = [];
    let currentSection: 'days' | 'location' | 'professor' = 'days';

    for (let i = 0; i < afterParts.length; i++) {
        const part = afterParts[i];

        if (currentSection === 'days') {
            // Try to parse as days (Spanish format: MJ, LWV, etc.)
            if (/^[LMWJV]+$/i.test(part) && part.length <= 5) {
                days = parseDays(part);
                currentSection = 'location';
                continue;
            }
            // English format: Tu, Th, M, W, F
            if (/^(Tu|Th|Mo|We|Fr|M|W|F)$/i.test(part)) {
                // Collect consecutive day codes
                let dayStr = part;
                while (i + 1 < afterParts.length && /^(Tu|Th|Mo|We|Fr|M|W|F)$/i.test(afterParts[i + 1])) {
                    i++;
                    dayStr += ' ' + afterParts[i];
                }
                days = parseDays(dayStr);
                currentSection = 'location';
                continue;
            }
        }

        if (currentSection === 'location') {
            // Room patterns: "F-B", "CH-005", "S-113", "F", "S", "CH", etc. followed by room number
            // Also handles: "F C" (building F, room C... weird but ok)
            if (/^[A-Z]{1,4}[-]?[A-Z0-9]*$/i.test(part)) {
                // Check if next part is a room number
                const nextPart = afterParts[i + 1];
                if (nextPart && /^[A-Z]?\d*[A-Z]?$/i.test(nextPart) && nextPart.length <= 4) {
                    locationParts.push(part, nextPart);
                    i++;
                } else if (/^[A-Z]{1,4}[-]?\d{1,4}$/i.test(part)) {
                    // Combined format like "CH-005" or "S113"
                    locationParts.push(part);
                } else {
                    // Single letter/short building code
                    locationParts.push(part);
                }
                // Check if we've collected enough for location (usually 1-2 parts)
                if (locationParts.length >= 2 || (locationParts.length === 1 && /\d/.test(locationParts[0]))) {
                    currentSection = 'professor';
                }
                continue;
            }
            // If it looks like a name (starts with capital, has lowercase), switch to professor
            if (/^[A-Z][a-z]/.test(part)) {
                currentSection = 'professor';
            }
        }

        if (currentSection === 'professor') {
            professorParts.push(part);
        }
    }

    // if we couldn't find days, default to Monday (user can fix it)
    if (days.length === 0) {
        days = ['MO'];
    }

    const location = locationParts.join(' ').replace(/-/g, '-');
    const professor = professorParts.join(' ').trim();

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

// Parse "Meetings" field from old portal: "12:30 pm - 2:20 pm MJ F C"
// Format: time range + days + room (building + room number)
function parseMeetingsField(meetings: string): { days: DayCode[], start: Time | null, end: Time | null, room: string } {
    let days: DayCode[] = [];
    let start: Time | null = null;
    let end: Time | null = null;
    let room = '';

    // Extract time range first
    const timeMatch = meetings.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    if (timeMatch) {
        start = parseTime(timeMatch[1]);
        end = parseTime(timeMatch[2]);
    }

    // Get the part after the time range
    const afterTime = timeMatch 
        ? meetings.substring(timeMatch.index! + timeMatch[0].length).trim()
        : meetings;

    // Split by whitespace
    const parts = afterTime.split(/\s+/).filter(p => p.length > 0);
    
    // First part should be days (MJ, LWV, etc.)
    if (parts.length > 0) {
        const potentialDays = parseDays(parts[0]);
        if (potentialDays.length > 0) {
            days = potentialDays;
            // Remaining parts are room (e.g., "F C" or "S 113" or "CH 124")
            if (parts.length >= 2) {
                room = parts.slice(1).join(' ');
            }
        }
    }

    return { days, start, end, room };
}

// Parse CSV format - handles:
// - New portal CSV with separate columns (Course, Section, Days, Schedule, Room)
// - Old portal CSV with combined Meetings column
// - Excel exports that wrap values in ="..." 
function parseCSV(text: string): Course[] {
    const lines = text.trim().split('\n');
    const delim = lines[0].includes('\t') ? '\t' : ',';
    
    // Clean each cell and build header
    const cleanCell = (cell: string) => cell.trim().replace(/^="?|"?$/g, '');
    const header = lines[0].split(delim).map(h => cleanCell(h).toLowerCase());

    // Find column by checking if header contains any of the given names
    const findCol = (names: string[]) => header.findIndex(h => names.some(n => h.includes(n)));

    const courseCol = findCol(["course"]);
    const sectionCol = findCol(["section"]);
    const daysCol = findCol(["days", "day"]);
    const scheduleCol = findCol(["schedule", "time"]);
    const roomCol = findCol(["room", "location"]);
    const meetingsCol = findCol(["meetings", "meeting"]);  // Old portal format
    const professorCol = findCol(["professor", "instructor", "prof"]);
    
    // Detect which format we're dealing with
    const isOldPortal = meetingsCol >= 0;
    
    const courses: Course[] = [];

    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delim).map(c => cleanCell(c));
        if (!row[0]) continue;

        const code = row[courseCol >= 0 ? courseCol : 0] || '';
        if (!/^[A-Z]{4}\d{4}/i.test(code)) continue; // not a valid course code, skip

        const section = row[sectionCol >= 0 ? sectionCol : 1] || '';
        const professor = professorCol >= 0 ? row[professorCol] || '' : '';

        let days: DayCode[] = [];
        let start: Time | null = null;
        let end: Time | null = null;
        let room = '';

        if (isOldPortal) {
            // Old portal: "12:30 pm - 2:20 pm MJ F C" in meetings column
            const meetingsStr = row[meetingsCol] || '';
            const parsed = parseMeetingsField(meetingsStr);
            days = parsed.days;
            start = parsed.start;
            end = parsed.end;
            room = parsed.room;
        } else {
            // New portal: separate columns for days, schedule, room
            const daysStr = row[daysCol >= 0 ? daysCol : 4] || '';
            const timeStr = row[scheduleCol >= 0 ? scheduleCol : 5] || '';
            room = row[roomCol >= 0 ? roomCol : 6] || '';

            days = parseDays(daysStr);
            
            // Parse time range
            const range = timeStr.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
            if (range) {
                start = parseTime(range[1]);
                end = parseTime(range[2]);
            }
        }

        if (days.length === 0) continue;
        if (!start || !end) continue;

        courses.push({
            id: Date.now() + Math.random(),
            code: code.toUpperCase(),
            section,
            startTime: start,
            endTime: end,
            days,
            location: room,
            professor
        });
    }
    return courses;
}

// Main parse function - handles multiple input formats:
// 1. CSV from new portal (columns: Course, Section, Days, Schedule, Room)
// 2. CSV from Excel export with ="value" format  
// 3. Tab-separated text from old portal where professor is on next line
export function parseSchedule(text: string): Course[] {
    // Clean up Excel's weird ="value" format if present
    const cleanedText = text.replace(/="([^"]*)"/g, '$1');
    
    // Try CSV parsing first
    if (isCSV(cleanedText)) {
        const courses = parseCSV(cleanedText);
        if (courses.length > 0) return courses;
    }

    // Plain text parsing (old portal copy-paste format)
    // Professor name appears on line after the course info
    const lines = cleanedText.split('\n');
    const courses: Course[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length < 5) continue;
        
        // Try to parse this line as a course
        const course = parseLine(line);
        if (course && course.code) {
            // Check if next line is professor name (not a course code, not empty)
            const nextLine = lines[i + 1]?.trim() || '';
            if (nextLine && !nextLine.match(/^[A-Z]{4}\d{4}/) && nextLine.length > 2) {
                // Skip lines that are just metadata like "Laboratorio" or "Sección múltiple"
                if (!nextLine.match(/^(Laboratorio|Secci[oó]n|Multiple)/i)) {
                    course.professor = nextLine;
                }
                i++; // Skip the professor line
                
                // Also skip any additional info lines (Laboratorio, Sección múltiple, etc.)
                while (i + 1 < lines.length) {
                    const peekLine = lines[i + 1]?.trim() || '';
                    if (peekLine.match(/^(Laboratorio|Secci[oó]n|Multiple)/i)) {
                        i++;
                    } else {
                        break;
                    }
                }
            }
            courses.push(course);
        }
    }
    
    return courses;
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

