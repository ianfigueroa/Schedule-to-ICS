import type { Time, Course, DayCode, UPRMDay } from "../types";

const SPANISH_Days: Record<string, DayCode> = {
    "L": "MO", "M": "TU", "W": "WE", "J": "TH", "V": "FR"
};

const DAY_NAMES: Record<DayCode, UPRMDay> = {
    "MO": "L", "TU": "M", "WE": "W", "TH": "J", "FR": "V"
};


export function parseTime(str:string): Time | null  {
    const s = str.toLowerCase().replace(\/\s+/g, '').replace(/[.,]/g, ':');

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


}