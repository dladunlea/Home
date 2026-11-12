# Class Pages

Upload every file here to the **Home** repo (Add file → Upload files), replacing what's there.
Class pages: …/Home/index.html, math2.html, math3.html, physics.html, advisory.html, music.html.

## Which file to edit
- **classes.js**: every class's settings (sheet link, warm-up app, exit ticket form, study apps, wording) and the top menu. This is the one you'll edit.
- **engine.js** and **style.css**: the page code and the look, shared by every class page. A fix here fixes every class at once.
- **math2.html, physics.html, …**: tiny pages that just say which class to show. You shouldn't need to touch them.
- **teacher.html, exit.html, video.html** read classes.js too, so they always agree with the class pages.

To add a class: add an entry to `CLASSES` in classes.js, then copy math2.html to a new file (e.g. `chem.html`) and change `'math2'` (twice: the title and `startClassPage('math2')`) to the new key.

## How it works
Each class page reads the **Student View** tab of its own Google Sheet, so editing the sheet updates the page (within about 5 minutes).
Each page shows the copy it saved last time straight away, then checks the live sheet and redraws only if something changed, so it opens instantly even on slow Wi-Fi.

## Turning on a new class (Math 3, Advisory, Music)
1. Make the class's Google Sheet with a **Student View** tab. The page finds columns by their header name, so order doesn't matter. Use any of:
   `Week, Date, Topic, Warm Up, Checkpoint, Practice, Exit Ticket, What, Why, How, Substitute Task, Web App`
   (optional per-day links: `WU Link`, `ET Link`; Web App cells look like `App name | https://…`, one per line)
   Other columns the page understands: `Essential Task` + `Essential Task Link`, `Honors` + `Honors Link` (optional item),
   `Task` (Music), `Announcement` + `Announcement Link` (a banner above the checklist, for Advisory).
   Cells that say "None…" are skipped. Tests are found from `PT #2` in the Topic or `Performance Task 2: …` in the Topic or Essential Task.
   Checklist wording is set per class with `LABELS` in classes.js.
   - Unit header rows: unit name in Week, guiding question in Topic, What / Why / How in the last three columns.
   - Day rows: date like `Mon 11/9` in Date. Put `No School` in Topic for days off.
   - Tests: start the Topic with `PT #` (e.g. `PT #2`). Checkpoints go in the Checkpoint column.
2. File → Share → **Publish to web** → Student View → **CSV**, with "Automatically republish when changes are made" checked.
3. Open **classes.js**, paste the link into that class's `CSV_URL`, and upload classes.js.
4. Add the sheet's edit link to `SHEETS` in `teacher.html` so its Edit button shows up.

## Ahead or behind: the Shift cell
Each sheet's Student View tab has a **Shift** column (header in row 1, the number right under it).
- `0` = on the plan, `-1` = one class day behind, `2` = two class days ahead.
- The page then shows that lesson's topic, unit card and checklist (task, practice, web apps, exit ticket), with a small "(planned for …)" note.
- These stay on the real date: the date, warm-up or checkpoint, substitute task, honors, announcements, the calendar and the Study/Honors box.
- The shift counts straight through test and performance task days, so if you push a test back, the test day's checklist moves with it. The calendar and the Study/Honors box still show the test on its original date; change the date in the sheet if the test is moving for good. Set the shift back to `0` once you've caught up.
- Preview a shift without touching the sheet: add `?shift=-1` to the page address (works with `?date=` too).
The teacher dashboard shows each class's current shift with a **Change shift** button that opens the sheet right at that cell.

## Exit tickets
The Exit ticket button opens `exit.html`: the day's question (from the Exit Ticket column) in big text at the top, with the class's Google Form embedded below it.
The form is the class's `CHECKIN_FORM` setting in classes.js (or the day's `ET Link` if that's blank). Nothing to set up per day.
If a form ever won't show inside the page, the "Open the form in a new tab" button under it still works.

## Videos
Put videos in the Video column of the Calendar tab (right after Web Apps) as `▶ Video: name | https://www.youtube.com/watch?v=…` (one per line); Student View adds them to the Web App column.
The Watch button opens `video.html`, which plays the video inside the site (YouTube's privacy-enhanced player) with a Back to class button and an "Open it on YouTube" button underneath. Non-YouTube video links just open in a new tab.

## Lesson notes
Each sheet's Calendar tab has a **Lesson Notes** column (column C on every class sheet). Student View copies it into its own Lesson Notes column, so it's published along with the rest of Student View. Keep anything private out of it.
The teacher dashboard shows each class's notes for the day in "Preview a day" (following the Shift), and **Edit notes** opens the sheet at that day's cell. Class pages ignore this column.
Links in a note become clickable on the dashboard. Line breaks in a note (Ctrl/Cmd+Enter in a cell) are kept.

## Picking a day on the calendar
Students can tap any class day on the calendar to see that day's unit card and checklist, with a "Back to today" button. The Study box and calendar don't change.
The warm-up or checkpoint button on that day opens that exact one (the warm-up page gets `?wu=<name>`), and the exit ticket shows that day's question. Each day keeps its own checkmarks.
A picked day shows the lesson written on that row (the Shift only applies to today). Link straight to a day with `?day=2026-09-15`.

## Teacher dashboard
`teacher.html` isn't linked anywhere for students. It shows whether each class's sheet is loading, with Edit sheet, Open page and Preview-a-day buttons.
Preview any page on a given day by adding `?date=2026-11-18` to its address.
