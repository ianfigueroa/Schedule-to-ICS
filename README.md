<div align="center">

# UPRM Schedule to ICS

**Convert your UPRM class schedule into a calendar file (.ics)**

Import directly into Google Calendar, Apple Calendar, Outlook, and more.

🔗 **[Live Demo](https://schedule-to-ics.vercel.app/)**

</div>

---

## Why?

Because manually adding each class to your calendar is tedious, and the enrollment portal doesn't give you an export option.

## How to use

1. Go to your UPRM enrollment portal and copy your schedule
2. Paste it into the text box
3. Set your semester start/end dates
4. Download the .ics file
5. Import it into your calendar app
   where
   The parser handles the standard format from the portal:

```
MATE3031 026 4 8:30 am - 10:20 am MJ S 113 Michael
```

You can also upload a CSV if you have your schedule in that format.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│                    (User Interface)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        main.ts                              │
│              (Application Entry Point)                      │
│         Handles events, coordinates modules                 │
└───────┬─────────────────┬─────────────────┬─────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   parser.ts   │ │  calendar.ts  │ │     ui.ts     │
│               │ │               │ │               │
│ Parses course │ │ Generates ICS │ │ DOM updates,  │
│ text & CSV    │ │ file format   │ │ modals, forms │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
              ┌───────────────────────┐
              │       types.ts        │
              │   Shared TypeScript   │
              │   type definitions    │
              └───────────────────────┘
```

### Module Breakdown

| File          | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `main.ts`     | Entry point, event handlers, app state management      |
| `parser.ts`   | Parses schedule text and CSV files into course objects |
| `calendar.ts` | Generates ICS file content with recurring events       |
| `ui.ts`       | All DOM manipulation, rendering courses, modals        |
| `types.ts`    | TypeScript interfaces (`Course`, etc.)                 |

---

## Roadmap

- [ ] Color-coded classes by course type or custom colors
- [ ] Improve parsing algorithm for edge cases
- [ ] Screenshot/OCR text reading (upload image of schedule)
- [ ] More flexible text parsing for different formats
- [ ] Export to Google Calendar API directly
- [ ] Dark mode

Have a suggestion? [Open an issue](https://github.com/ianfigueroa/schedule_to_ics/issues)!

---

## Run locally

```bash
npm install
npm run dev
```

---
