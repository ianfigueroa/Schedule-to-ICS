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

export function renderCourses(
    courses: Course[],
    onRemove: (id: number) => void,
    onEdit: (id: number) => void
) {
    if (courses.length === 0) {
        els.coursesList.innerHTML = '<div class="empty">No courses parsed yet.</div>';
        els.downloadBtn.disabled = true;
        return;
    }   
    els.downloadBtn.disabled = false;

    // Build the HTML for each course
    els.coursesList.innerHTML = courses.map(course => `
        <div class="course-item" data-id="${course.id}">
            <div class="info">
                <div class="code">${course.code}${course.section ? ' - ' + course.section : ''}</div>
                <div class="details">
                    ${formatTime(course.startTime)} - ${formatTime(course.endTime)} · ${formatDays(course.days)}
                    ${course.location ? ' · ' + course.location : ''}
                    ${course.professor ? ' · ' + course.professor : ''}
                </div>
            </div>
            <div class="actions">
                <button class="btn-edit" title="Edit">Edit</button>
                <button class="btn-remove" title="Remove">Remove</button>
            </div>
        </div>
    `).join('');

    // Hook up delete buttons
    els.coursesList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = (e.target as HTMLElement).closest('.course-item')!;
            const id = Number(item.getAttribute('data-id'));
            onRemove(id);
        });
    });

    // Hook up edit buttons
    els.coursesList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = (e.target as HTMLElement).closest('.course-item')!;
            const id = Number(item.getAttribute('data-id'));
            onEdit(id);
        });
    });
}
