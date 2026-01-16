import type { Course } from './types';
import { parseSchedule } from './parser';
import { downloadICS, generateICS } from './calendar';
import * as UI from './ui';
import { inject } from '@vercel/analytics';

// app state 
let courses : Course[] = [];

// called when user clicks "Add Courses" 
function AddCourses() {
    const {scheduleText} = UI.getFormValues();
    if (!scheduleText) {
        UI.showError("Please enter schedule text.");
        return;
    }   
    
    const parsed = parseSchedule(scheduleText);
    if (parsed.length > 0) {
        courses = [...courses, ...parsed];
        UI.clearScheduleInput();
        UI.renderCourses(courses, removeCourse, editCourse);
        UI.showSuccess(`Added ${parsed.length} course(s)`);
    } else {
        UI.showError("Could not parse any courses from the provided text.");
    }
}

// called when user clicks x on course
function removeCourse(id: number) {
    courses = courses.filter(c => c.id !== id);
    UI.renderCourses(courses, removeCourse, editCourse);
}

function editCourse(id: number) {
    const course = courses.find(c => c.id === id);
    if (!course) return;

    UI.showEditModal(course, (updated) => {
        courses = courses.map(c => c.id === id ? updated : c);
        UI.renderCourses(courses, removeCourse, editCourse);
        UI.showSuccess("Course updated.");
    });
}   

// called whhen user downloads
function download() {
    const {startDate, endDate} = UI.getFormValues();
    if (!startDate || !endDate) {
        UI.showError("Please provide start and end dates.");
        return;
    }   
    
    if (courses.length === 0) {
        UI.showError("Add some courses first.");
        return;
    }

    const ics = generateICS(courses, startDate, endDate);
    downloadICS(ics);
    UI.showSuccess("Calendar downloaded.");
}

// handle csv file upload (from input or drag-drop)
function handleCSVUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
            UI.setScheduleText(text);
            UI.showSuccess("File loaded - click 'Add Courses' to parse.");
        }
    };
    reader.readAsText(file);
}

// toggle dark mode
function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// setup drag and drop for the text area
function setupDragDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    // prevent default drag behaviors on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(event => {
        dropZone.addEventListener(event, () => dropZone.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, () => dropZone.classList.remove('drag-over'));
    });

    // handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const file = (e as DragEvent).dataTransfer?.files[0];
        if (file) handleCSVUpload(file);
    });
}


// sets everything up
function init() {
    // load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // initialize analytics
    inject();

    UI.initUI();

    // wire up buttons
    document.getElementById('addCoursesBtn')?.addEventListener('click', AddCourses);
    document.getElementById('downloadBtn')?.addEventListener('click', download);
    document.getElementById('darkModeBtn')?.addEventListener('click', toggleDarkMode);

    // csv file input
    document.getElementById('csvFileInput')?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleCSVUpload(file);
    });

    // setup drag and drop
    setupDragDrop();
}

document.addEventListener('DOMContentLoaded', init);