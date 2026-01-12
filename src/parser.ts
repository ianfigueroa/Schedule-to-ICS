import type { Time, Course, DayCode, UPRMDay } from "../types";

// UPRM' Spanish days to ICS format
// L - Monday (Lunes), M - Tuesday (Martes), W - Wednesday (Miércoles), J - Thursday (Jueves), V - Friday (Viernes)
const SPANISH_Days: Record<string, DayCode> = {
    "L": "MO", "M": "TU", "W": "WE", "J": "TH", "V": "FR"
};

// Reverse mapping for display
const DAY_NAMES: Record<DayCode, UPRMDay> = {
    "MO": "L", "TU": "M", "WE": "W", "TH": "J", "FR": "V"
};

// Parse strings like "10:30am", "1030am", "10.30 am", "10,30am"
export function parseTime(str:string): Time | null  {
    const s = str.toLowerCase().replace(/\s+/g, '').replace(/[.,]/g, ':');

    const patterns = [
        /^(\\d{1,2}):(\d{2})(am|pm)$/, // 8"30am or 14:30 
        /^(\\d{1,2})(\d{2})(am|pm)$/, // 830am which has no colon 
    ];

    for (const pattern of patterns) {
        const match = s.match(pattern);
        if (match) {
            let hour = parseInt((match[1]));
            const min = parseInt(match[2]);
            const period = match[3];  
            
            // Convert to le 24 hr format
            if (period === 'pm' && hour !== 12) hour += 12; 
            if (period === 'am' && hour === 12) hour = 0;
            
            if (hour <= 23 && min <= 59) return { hour, minute: min };
        }
    }

    return null;
}

// Parse days from strings like "MO WE FR", "L M W", "M AND W"
export function parseDays(str: string): DayCode[] {
    const days: DayCode[] = [];
    const upper = str.toUpperCase();

    // Check for englkish two letter days 
    for (const [code, day] of [['MO', 'MO'], ['TU', 'TU'], ['WE', 'WE'], ['TH', 'TH'], ['FR', 'FR']] as [string, DayCode][]) {
        if (upper.includes(code) && !days.includes(day)) days.push(day);
    }

    // Spanish Next
    if (days.length === 0) {
        for (const char of upper.replace(/\s+/g, '')) {
            const day = SPANISH_Days[char];
            if (day && !days.includes(day)) days.push(day);
        }
    }
    return days;
}
    



