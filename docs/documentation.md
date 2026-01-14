# UPRM Schedule to ICS - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Data Flow Diagram](#data-flow-diagram)
4. [Module Breakdown](#module-breakdown)
5. [Parser Deep Dive](#parser-deep-dive)
6. [ICS Generation](#ics-generation)
7. [Input Format Examples](#input-format-examples)

---

## Project Overview

This application converts UPRM class schedules into ICS calendar files that can be imported into Google Calendar, Outlook, Apple Calendar, etc.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                              │
│  (paste text, upload CSV, or drag-drop file)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        parser.ts                                │
│  parseSchedule() → detects format → extracts Course objects    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Course[] (app state)                        │
│  Stored in main.ts, rendered by ui.ts                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       calendar.ts                               │
│  generateICS() → creates ICS string → downloadICS() saves file │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── types.ts      # TypeScript interfaces (Course, Time, DayCode)
├── main.ts       # App entry point, state management, event handlers
├── ui.ts         # DOM manipulation, rendering, modals
├── parser.ts     # Text parsing logic for all input formats
├── calendar.ts   # ICS file generation
└── styles.css    # All styling including dark mode
```

### How files depend on each other:

```
                    types.ts
                   /    |    \
                  /     |     \
           parser.ts  ui.ts  calendar.ts
                 \      |      /
                  \     |     /
                   main.ts
                      |
                  index.html
```

---

## Module Breakdown

### 1. types.ts - Data Structures

Defines the core data types used throughout the app.

```typescript
// Represents a time like 9:30 AM
interface Time {
  hour: number; // 0-23 (24-hour format internally)
  minute: number; // 0-59
}

// A single course/class
interface Course {
  id: number; // Unique ID for React-like keying
  code: string; // "MATE3031", "CIIC4010"
  section: string; // "066", "090L"
  startTime: Time; // When class starts
  endTime: Time; // When class ends
  days: DayCode[]; // Which days it meets
  location: string; // "S 113", "CH-005"
  professor: string; // "Pedro Vasquez Urbano"
  color?: string; // Optional hex color for calendar
}

// ICS-standard day codes
type DayCode = "MO" | "TU" | "WE" | "TH" | "FR";

// UPRM Spanish day abbreviations
type UPRMDay = "L" | "M" | "W" | "J" | "V";
```

---

### 2. main.ts - Application Controller

The main entry point that wires everything together.

#### State Management

```typescript
let courses: Course[] = []; // All parsed courses live here
```

#### Key Functions

| Function                | Purpose                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `AddCourses()`          | Called when user clicks "Add Courses" button. Gets text from textarea, calls parser, updates state. |
| `removeCourse(id)`      | Removes a course from the array by ID                                                               |
| `editCourse(id)`        | Opens edit modal for a course                                                                       |
| `download()`            | Generates ICS from courses array and triggers download                                              |
| `handleCSVUpload(file)` | Reads file contents and puts them in textarea                                                       |
| `toggleDarkMode()`      | Switches theme and saves to localStorage                                                            |
| `setupDragDrop()`       | Attaches drag-drop event listeners                                                                  |
| `init()`                | Called on page load, sets up all event listeners                                                    |

#### Event Flow Example: Adding Courses

```
User pastes text → clicks "Add Courses"
         │
         ▼
    AddCourses()
         │
         ├── UI.getFormValues() → gets textarea content
         │
         ├── parseSchedule(text) → returns Course[]
         │
         ├── courses = [...courses, ...parsed] → update state
         │
         └── UI.renderCourses() → update the DOM
```

---

### 3. ui.ts - User Interface

Handles all DOM manipulation. Never touches parsing or ICS logic.

#### Cached DOM Elements

```typescript
let els: {
  success: HTMLElement; // Green success message div
  error: HTMLElement; // Red error message div
  startDate: HTMLInputElement; // Semester start date picker
  endDate: HTMLInputElement; // Semester end date picker
  scheduleInput: HTMLTextAreaElement; // Main text input
  coursesList: HTMLElement; // Where courses are rendered
  downloadBtn: HTMLButtonElement; // Download button
  editModal: HTMLElement; // The edit popup
  editForm: HTMLElement; // Form inside the modal
};
```

#### Key Functions

| Function                                   | Purpose                                               |
| ------------------------------------------ | ----------------------------------------------------- |
| `initUI()`                                 | Caches all DOM element references                     |
| `showSuccess(msg)`                         | Shows green message for 5 seconds                     |
| `showError(msg)`                           | Shows red message for 5 seconds                       |
| `getFormValues()`                          | Returns {startDate, endDate, scheduleText}            |
| `renderCourses(courses, onRemove, onEdit)` | Builds HTML for course list, attaches button handlers |
| `showEditModal(course, onSave)`            | Opens modal with form pre-filled                      |
| `hideEditModal()`                          | Closes the modal                                      |

#### Course Rendering Flow

```
renderCourses(courses, onRemove, onEdit)
         │
         ├── if courses.length === 0 → show "No courses" message
         │
         ├── Build HTML for each course:
         │   ┌────────────────────────────────────────┐
         │   │ [color bar] MATE3031 066              │
         │   │             9:30am - 10:45am · L M W  │
         │   │             S 113 · Dr. Smith    [Edit] [Remove]
         │   └────────────────────────────────────────┘
         │
         └── Attach click handlers to Edit/Remove buttons
```

---

### 4. parser.ts - The Brain

This is the most complex file. It handles multiple input formats.

#### Day Code Mappings

```typescript
// UPRM uses Spanish day abbreviations
SPANISH_DAYS = {
  L: "MO", // Lunes = Monday
  M: "TU", // Martes = Tuesday
  W: "WE", // Miércoles = Wednesday
  J: "TH", // Jueves = Thursday
  V: "FR", // Viernes = Friday
};

// New portal uses English
ENGLISH_DAYS = {
  TU: "TU",
  TH: "TH",
  M: "MO", // Single letter M = Monday
  W: "WE", // Single letter W = Wednesday
  F: "FR",
};
```

#### Main Entry Point: parseSchedule()

```
parseSchedule(text)
      │
      ├── Clean Excel ="value" format if present
      │
      ├── Is it CSV/tabular data?
      │   │
      │   YES → parseCSV(text)
      │   │      │
      │   │      ├── Has "meetings" column? → Old portal format
      │   │      │   └── parseMeetingsField() for each row
      │   │      │
      │   │      └── Has separate columns? → New portal format
      │   │          └── Parse days, schedule, room separately
      │   │
      │   NO → Plain text parsing
      │        │
      │        └── For each line:
      │            ├── parseLine(line) → extract course data
      │            └── Check next line for professor name
      │
      └── Return Course[]
```

#### Parsing a Single Line: parseLine()

Given input: `MATE3031  066  4  9:30 am - 10:45 am  MJ  S 113`

```
Step 1: Find time range (anchor point)
        "9:30 am - 10:45 am" found at position 18

Step 2: Split into before/after time
        before: "MATE3031  066  4"
        after:  "MJ  S 113"

Step 3: Parse before (course code, section)
        Loop through parts:
        - "MATE3031" matches /^[A-Z]{4}\d{4}/ → code = "MATE3031"
        - "066" matches /^\d{2,3}/ → section = "066"
        - "4" is credits (ignored)

Step 4: Parse after (days, location)
        State machine with 3 states: days → location → professor
        - "MJ" matches /^[LMWJV]+/ → days = ["TU", "TH"]
        - "S" is building code
        - "113" is room number → location = "S 113"

Step 5: Return Course object
```

#### Time Parsing: parseTime()

```typescript
parseTime("9:30 am")
    │
    ├── Lowercase: "9:30 am"
    ├── Remove spaces: "9:30am"
    ├── Match pattern: /^(\d{1,2}):(\d{2})(am|pm)?$/
    │   hour=9, min=30, period="am"
    │
    └── Return { hour: 9, minute: 30 }

parseTime("1:30 pm")
    │
    ├── hour=1, period="pm"
    ├── pm && hour !== 12 → hour += 12
    │
    └── Return { hour: 13, minute: 30 }
```

#### Day Parsing: parseDays()

```
parseDays("Tu Th")           parseDays("MJ")
      │                            │
      ├── Split by space           ├── No spaces, try Spanish
      │   ["Tu", "Th"]             │
      │                            ├── Loop each char: "M", "J"
      ├── "TU" in ENGLISH_DAYS     │   - "M" → "TU" (Martes)
      │   → push "TU"              │   - "J" → "TH" (Jueves)
      │                            │
      ├── "TH" in ENGLISH_DAYS     └── Return ["TU", "TH"]
      │   → push "TH"
      │
      └── Return ["TU", "TH"]
```

---

### 5. calendar.ts - ICS Generation

Converts Course objects into ICS format.

#### ICS File Structure

```
BEGIN:VCALENDAR              ← Calendar container
VERSION:2.0
PRODID:-//Schedule to ICS//EN
CALSCALE:GREGORIAN

BEGIN:VEVENT                 ← One event per course
UID:unique-id@schedule
DTSTAMP:20260113T120000Z     ← When file was created
DTSTART:20260112T093000      ← First class date + start time
DTEND:20260112T104500        ← First class date + end time
RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20260508T235959Z
SUMMARY:MATE3031 066
LOCATION:S 113
DESCRIPTION:Instructor: Dr. Smith
END:VEVENT

END:VCALENDAR
```

#### Finding First Class Date

```
Semester starts: Monday Jan 12, 2026
Class meets: Tu, Th

findFirstClassDate(semesterStart, ["TU", "TH"])
      │
      ├── semesterStart is Monday (day 1)
      ├── Class days: Tuesday (day 2), Thursday (day 4)
      ├── Days to add: [1, 3] (to reach Tu, Th)
      ├── Minimum: 1
      │
      └── Return: Tuesday Jan 13, 2026
```

#### RRULE Explanation

```
RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20260508T235959Z
       │           │              │
       │           │              └── Repeat until May 8, 2026
       │           └── On Tuesdays and Thursdays
       └── Repeat weekly
```

---

## Input Format Examples

### Format 1: New Portal (CSV with separate columns)

```csv
Course,Section,Title,Credits,Days,Schedule,Room,Modality
MATE3031,067,CALCULUS I,4,Tu Th,12:30 pm - 2:20 pm,F-B,(P) - Presencial
```

**How it's parsed:**

```
isCSV() returns true (has "course" header)
parseCSV() called
  → findCol(["days"]) = 4
  → findCol(["schedule"]) = 5
  → findCol(["room"]) = 6
  → For each row:
      days = parseDays("Tu Th") → ["TU", "TH"]
      time = parseTime("12:30 pm") → {hour: 12, minute: 30}
```

### Format 2: Excel Export (with ="value" format)

```csv
"Course","Section","Days","Schedule","Room"
="MATE3031",="067",="Tu Th",="12:30 pm - 2:20 pm",="F-B"
```

**How it's parsed:**

```
parseSchedule() first cleans: ="MATE3031" → MATE3031
Then same as Format 1
```

### Format 3: Old Portal (tab-separated, professor on next line)

```
MATE3032	066	4	12:30 pm - 2:20 pm  MJ   F C
Pedro Vasquez Urbano
CIIC3075	030	3	9:30 am - 10:20 am  LWV   S 113
Kejie Lu
```

**How it's parsed:**

```
isCSV() returns false (no header row with "course")
Plain text mode:
  Line 1: "MATE3032  066  4  12:30 pm..."
    → parseLine() extracts course data
  Line 2: "Pedro Vasquez Urbano"
    → Not a course code, so it's the professor name
    → Attached to previous course
```

### Format 4: Old Portal CSV (Meetings column)

```csv
Course,Section,Credits,Meetings,Professors
MATE3032,066,4,12:30 pm - 2:20 pm MJ F C,Pedro Vasquez
```

**How it's parsed:**

```
isCSV() returns true
parseCSV() called
  → findCol(["meetings"]) = 3 → isOldPortal = true
  → parseMeetingsField("12:30 pm - 2:20 pm MJ F C")
      → time regex finds "12:30 pm - 2:20 pm"
      → after time: "MJ F C"
      → "MJ" → days = ["TU", "TH"]
      → "F C" → room = "F C"
```

---

## State Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE                         │
│                                                                  │
│   courses: Course[] ─────────────────────────────────────────┐   │
│        │                                                     │   │
│        │  Modified by:           Read by:                    │   │
│        │  - AddCourses()         - renderCourses()           │   │
│        │  - removeCourse()       - download()                │   │
│        │  - editCourse()                                     │   │
│        │                                                     │   │
└────────│─────────────────────────────────────────────────────│───┘
         │                                                     │
         ▼                                                     ▼
┌─────────────────┐                               ┌─────────────────┐
│    UI UPDATE    │                               │  ICS GENERATION │
│                 │                               │                 │
│ renderCourses() │                               │  generateICS()  │
│ shows list in   │                               │  creates file   │
│ the DOM         │                               │  content        │
└─────────────────┘                               └─────────────────┘
```

---

## Dark Mode Implementation

```
User clicks "Dark/Light" button
         │
         ▼
toggleDarkMode()
         │
         ├── Check current theme: document.documentElement.getAttribute('data-theme')
         │
         ├── Toggle: 'dark' ↔ 'light'
         │
         ├── Set attribute: document.documentElement.setAttribute('data-theme', newTheme)
         │
         └── Save preference: localStorage.setItem('theme', newTheme)

On page load (init):
         │
         ├── Read: localStorage.getItem('theme') || 'light'
         │
         └── Apply: document.documentElement.setAttribute('data-theme', savedTheme)
```

CSS uses CSS variables that change based on `[data-theme="dark"]`:

```css
:root {
  --bg: #f5f5f5; /* Light mode */
  --text: #333;
}

[data-theme="dark"] {
  --bg: #1a1a2e; /* Dark mode overrides */
  --text: #eee;
}

body {
  background: var(--bg); /* Uses current theme's value */
  color: var(--text);
}
```

---

## Drag & Drop Implementation

```
File dragged over dropZone
         │
         ├── dragenter/dragover events
         │   └── Add 'drag-over' class (shows overlay)
         │
         ├── dragleave event
         │   └── Remove 'drag-over' class
         │
         └── drop event
             │
             ├── Remove 'drag-over' class
             ├── Get file: e.dataTransfer.files[0]
             └── Call handleCSVUpload(file)
                     │
                     ├── FileReader.readAsText(file)
                     └── onload → UI.setScheduleText(content)
```

---

## Summary

| File          | Responsibility   | Key Exports                                 |
| ------------- | ---------------- | ------------------------------------------- |
| `types.ts`    | Data structures  | `Course`, `Time`, `DayCode`                 |
| `main.ts`     | App logic, state | None (entry point)                          |
| `ui.ts`       | DOM manipulation | `initUI`, `renderCourses`, `showEditModal`  |
| `parser.ts`   | Text → Course[]  | `parseSchedule`, `formatTime`, `formatDays` |
| `calendar.ts` | Course[] → ICS   | `generateICS`, `downloadICS`                |
