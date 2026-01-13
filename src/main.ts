import type { Course } from './types';
import { parseSchedule } from './parser';
import { downloadICS, generateICS } from './calendar';
import * as UI from './ui';

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

// handle csv file upload
function handleCSVUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
            UI.setScheduleText(text);
            UI.showSuccess("CSV loaded - click 'Add Courses' to parse.");
        }
    };
    reader.readAsText(file);
}


// sets everything
function init() {
    UI.initUI();

    // wire up buttons
    document.getElementById('addCoursesBtn')?.addEventListener('click', AddCourses);
    document.getElementById('downloadBtn')?.addEventListener('click', download);

    // csv file intput
    document.getElementById('csvFileInput')?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleCSVUpload(file);
    });
}

;document.addEventListener('DOMContentLoaded', init);