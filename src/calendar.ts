import type { Course, DayCode } from "./types";

// Calculate which day of the week (Monday=0)
const WEEKDAY_NUM: Record<DayCode, number> = {
    "MO": 0,
    "TU": 1,
    "WE": 2,
    "TH": 3,
    "FR": 4
};

function pad(n: number): string {
    return n.toString().padStart(2, '0');
}

// Format date + time for ICS (YYYYMMDDTHHMMSS)
export function formatDateTime(date: Date, time: { hour: number; minute: number }): string {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}${m}${d}T${pad(time.hour)}${pad(time.minute)}00`;
}

// Find the first class date given semester start and class days
function findFirstClassDate(semesterStart: Date, days: DayCode[]): Date {
    const result = new Date(semesterStart);
    const startDayOfWeek = result.getDay(); // Sunday=0, Monday=1, etc.
    
    // Map UPRM DayCode to numbers 0-6 (Monday=0)
    const classDays = days.map(d => WEEKDAY_NUM[d]);
    
    // Find the closest class day >= startDayOfWeek
    let daysToAdd = classDays.map(cd => (cd - startDayOfWeek + 7) % 7);
    const minDaysToAdd = Math.min(...daysToAdd);
    
    result.setDate(result.getDate() + minDaysToAdd);
    return result;
}

// Generate ICS event for courses
export function generateICSEvent(courses: Course[], startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Schedule to ICS//EN',
        'CALSCALE:GREGORIAN',
    ];

    courses.forEach((course) => {
        const firstClassDate = findFirstClassDate(start, course.days);
        const until = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T235959Z`;
        const uid = `${firstClassDate.getTime()}-${course.code}@schedule`;

        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${formatDateTime(now, { hour: now.getHours(), minute: now.getMinutes() })}Z`,
            `DTSTART:${formatDateTime(firstClassDate, course.startTime)}`,
            `DTEND:${formatDateTime(firstClassDate, course.endTime)}`,
            `RRULE:FREQ=WEEKLY;BYDAY=${course.days.join(',')};UNTIL=${until}`,
            `SUMMARY:${course.code} ${course.section}`,
            `LOCATION:${course.location}`,
            `DESCRIPTION:Instructor: ${course.professor}`,
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

// Download ICS file
export function downloadICS(content: string): void {
    const blob  = new Blob([content], { type: 'text/calendar; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schedule.ics';
    link.click();

    //cleanup
    URL.revokeObjectURL(url);
}

