import type { Time, Course, DayCode, UPRMDay } from "../types";

const SPANISH_Days: Record<string, DayCode> = {
    "L": "MO", "M": "TU", "W": "WE", "J": "TH", "V": "FR"
};

const DAY_NAMES: Record<DayCode, UPRMDay> = {
    "MO": "L", "TU": "M", "WE": "W", "TH": "J", "FR": "V"
};


export function parseTime(str:string): Time | null  {
    const s = str.toLowerCase().replace(/\s+/g, '').replace(/[.,]/g, ':');

    const patterns = [
        /^(\\d{1,2}):(\d{2})(am|pm)$/,
        /^(\\d{1,2})(\d{2})(am|pm)$/,
    ];

    for (const p of patterns) {
        const m = s.match(p);
        if (m) {
            let hour = parseInt((m[1]));
            const min = parseInt(m[2]);
            const period = m[3];

            if (period === 'pm' && hour !== 12) hour += 12; 
            if (period === 'am' && hour === 12) hour = 0;
            
            if (hour <= 23 && min <= 59) return { hour, minute: min };
        }
    }
    return null;
}

// export function parseDays(str: string): DayCode[] {
//     const days: DayCode[] = [];
//     const upper = str.toUpperCase();

//     // English Codes First.....
//     for (const [code, day]) of [['TU', 'TU'], ['TH', 'TH'], ['MO', 'MO'], ['WE', 'WE'], ['FR', 'FR']] as [string, DayCode][]) {
//         if (upper.includes(code) && !days.includes(day)) days.push(day);
//     }

//     // Spanish Codes Next
//     if (days.length === 0) {
//         for (const char of upper.replace(/\s+/g, '')) {
//             const day = SPANISH_Days[char];
//             if (day && !days.includes(day)) days.push(day);
//         }
//     }

//     // "M AND W" format
//     if (days.length === 0) && /^[MTWRF] {
//     return days;
// }


