export interface Time{
    hour: number;
    minute: number;
}

export interface Course {
    id: number;
    code: string;
    section: string;
    startTime: Time;
    endTime:  Time;
    days: DayCode[];
    location: string;
    professor: string;
}

export type DayCode = "MO" | "TU" | "WE" | "TH" | "FR";
export type  UPRMDay = "L" |  "M"  | "W"  | "J"  | "V";

