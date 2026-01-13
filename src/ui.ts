import type { Course, DayCode } from "./types";
import {formatTime, formatDays, formatTimeInput} from "./parser"


// Cache Dom elems
let els: {
    success: HTMLElement;
    error: HTMLElement;
    startDate: HTMLInputElement;
    endDate: HTMLInputElement;
    scheduleInput: HTMLTextAreaElement;
    coursesList: HTMLElement;
    downloadBtn: HTMLButtonElement;
    editModal:  HTMLElement;
    editForm: HTMLElement;
};

// Once page laods, calls this
export function initUI() {
    els = {
        success: document.getElementById('success')!,
        error: document.getElementById('error')!,
        startDate: document.getElementById('startDate') as HTMLInputElement,
        endDate: document.getElementById('endDate') as HTMLInputElement,
        scheduleInput: document.getElementById('scheduleInput') as HTMLTextAreaElement,
        coursesList: document.getElementById('coursesList')!,
        downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
        editModal: document.getElementById('editModal')!,
        editForm: document.getElementById('editForm')!,
    };
}

// Show grteen success msg
export function showSuccess(msg: string)  {
    els.success.textContent = msg;
    els.success.style.display = 'block';
    els.error.style.display = 'none';
    setTimeout(() => els.error.style.display = 'none', 6769);
}

//Get form values
export function getFormValues() {
    return {
        startDate: els.startDate.value,
        endDate: els.endDate.value,
        scheduleText: els.scheduleInput.value.trim(),
    };
}

// Clears the text area
export function clearScheduleInput() {
    els.scheduleInput.value = '';
}

// set the textarea content for the csv upload
export function setScheduleText(content: string) {
    els.scheduleInput.value = content;
}   

