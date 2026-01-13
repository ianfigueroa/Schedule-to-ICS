import type { Course, DayCode } from "./types";
import { formatTime, formatDays, formatTimeInput } from "./parser";

// Cache DOM elements
let els: {
    success: HTMLElement;
    error: HTMLElement;
    startDate: HTMLInputElement;
    endDate: HTMLInputElement;
    scheduleInput: HTMLTextAreaElement;
    coursesList: HTMLElement;
    downloadBtn: HTMLButtonElement;
    editModal: HTMLElement;
    editForm: HTMLElement;
};

// Initialize UI references
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

// Show success message
export function showSuccess(msg: string) {
    els.success.textContent = msg;
    els.success.style.display = 'block';
    els.error.style.display = 'none';
    setTimeout(() => els.success.style.display = 'none', 5000);
}

// Show error message
export function showError(msg: string) {
    els.error.textContent = msg;
    els.error.style.display = 'block';
    els.success.style.display = 'none';
    setTimeout(() => els.error.style.display = 'none', 5000);
}

// Get form values
export function getFormValues() {
    return {
        startDate: els.startDate.value,
        endDate: els.endDate.value,
        scheduleText: els.scheduleInput.value.trim(),
    };
}

// Clear textarea
export function clearScheduleInput() {
    els.scheduleInput.value = '';
}

// Set textarea content
export function setScheduleText(content: string) {
    els.scheduleInput.value = content;
}

// Render courses list with edit/delete buttons
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

    // Hook up remove buttons
    els.coursesList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', e => {
            const item = (e.target as HTMLElement).closest('.course-item')!;
            const id = Number(item.getAttribute('data-id'));
            onRemove(id);
        });
    });

    // Hook up edit buttons
    els.coursesList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', e => {
            const item = (e.target as HTMLElement).closest('.course-item')!;
            const id = Number(item.getAttribute('data-id'));
            onEdit(id);
        });
    });
}

// Day options for edit form
const ALL_DAYS: DayCode[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
const DAY_LABELS: Record<DayCode, string> = {
    'MO': 'L', 'TU': 'M', 'WE': 'W', 'TH': 'J', 'FR': 'V'
};

// Show edit modal for a course
export function showEditModal(course: Course, onSave: (updated: Course) => void) {
    // Day checkboxes
    const daysHtml = ALL_DAYS.map(day => `
        <label class="day-checkbox ${course.days.includes(day) ? 'active' : ''}">
            <input type="checkbox" name="days" value="${day}" 
                ${course.days.includes(day) ? 'checked' : ''}>
            ${DAY_LABELS[day]}
        </label>
    `).join('');

    // Form HTML
    els.editForm.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Course Code</label>
                <input type="text" id="editCode" value="${course.code}">
            </div>
            <div class="form-group">
                <label>Section</label>
                <input type="text" id="editSection" value="${course.section}">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Start Time</label>
                <input type="time" id="editStart" value="${formatTimeInput(course.startTime)}">
            </div>
            <div class="form-group">
                <label>End Time</label>
                <input type="time" id="editEnd" value="${formatTimeInput(course.endTime)}">
            </div>
        </div>

        <div class="form-group">
            <label>Days</label>
            <div class="days-selector">${daysHtml}</div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Location</label>
                <input type="text" id="editLocation" value="${course.location}">
            </div>
            <div class="form-group">
                <label>Professor</label>
                <input type="text" id="editProfessor" value="${course.professor}">
            </div>
        </div>

        <div class="modal-buttons">
            <button type="button" class="btn-save">Save</button>
            <button type="button" class="btn-cancel">Cancel</button>
        </div>
    `;

    // Day checkbox toggle
    els.editForm.querySelectorAll('.day-checkbox').forEach(label => {
        const checkbox = label.querySelector('input') as HTMLInputElement;
        checkbox.addEventListener('change', () => {
            label.classList.toggle('active', checkbox.checked);
        });
    });

    // Save button
    const btnSave = els.editForm.querySelector('.btn-save')!;
    btnSave.addEventListener('click', () => {
        const selectedDays: DayCode[] = [];
        els.editForm.querySelectorAll<HTMLInputElement>('input[name="days"]:checked')
            .forEach(cb => selectedDays.push(cb.value as DayCode));

        if (selectedDays.length === 0) {
            showError('Pick at least one day');
            return;
        }

        const startVal = (els.editForm.querySelector('#editStart') as HTMLInputElement).value;
        const endVal = (els.editForm.querySelector('#editEnd') as HTMLInputElement).value;
        const [startH, startM] = startVal.split(':').map(Number);
        const [endH, endM] = endVal.split(':').map(Number);

        const updated: Course = {
            ...course,
            code: (els.editForm.querySelector('#editCode') as HTMLInputElement).value.toUpperCase().trim(),
            section: (els.editForm.querySelector('#editSection') as HTMLInputElement).value.trim(),
            startTime: { hour: startH, minute: startM },
            endTime: { hour: endH, minute: endM },
            days: selectedDays,
            location: (els.editForm.querySelector('#editLocation') as HTMLInputElement).value.trim(),
            professor: (els.editForm.querySelector('#editProfessor') as HTMLInputElement).value.trim(),
        };

        onSave(updated);
        hideEditModal();
    });

    // Cancel button
    const btnCancel = els.editForm.querySelector('.btn-cancel')!;
    btnCancel.addEventListener('click', hideEditModal);

    // Show modal
    els.editModal.classList.add('active');
}

// Hide edit modal
export function hideEditModal() {
    els.editModal.classList.remove('active');
}
