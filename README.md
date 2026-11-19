# Class Pages

Upload every file here to the **Home** repo (Add file → Upload files), replacing what's there.
Class pages: …/Home/index.html, math2.html, math3.html, physics.html, advisory.html, music.html.

## Which file to edit
- **classes.js**: every class's settings (sheet link, warm-up app, exit ticket form, study apps, wording) and the top menu. This is the one you'll edit.
- **engine.js** and **style.css**: the page code and the look, shared by every class page. A fix here fixes every class at once.
- **math2.html, physics.html, …**: tiny pages that just say which class to show. You shouldn't need to touch them.
- **teacher.html, exit.html, video.html, task.html** read classes.js too, so they always agree with the class pages.

To add a class: add an entry to `CLASSES` in classes.js, then copy math2.html to a new file (e.g. `chem.html`) and change `'math2'` (twice: the title and `startClassPage('math2')`) to the new key.
To hide a class's button (Home page and top menu) without taking its page down, add `HIDDEN: true` to its entry in classes.js. Advisory and Music are hidden right now.

## How it works
Each class page reads the **Student View** tab of its own Google Sheet, so editing the sheet updates the page (within about 5 minutes).
Each page shows the copy it saved last time straight away, then checks the live sheet and redraws only if something changed, so it opens instantly even on slow Wi-Fi.
Each class sheet has an **Instructions** tab explaining how to add or change every kind of data without breaking the page.

## Sheet layout (Math 2, Math 3, Physics)
- **Row 1** of every published tab is a warning that students who inspect a page can read it. On the Calendar, A1:B1 is ▶ Jump to today and the warning starts in C1. **Row 2** has the column headings. The page finds the heading row (Week, Date…) wherever it is, so the warning row is skipped.
- **Published tabs** (and nothing else): Student View, Warmups, Check Points, plus Warmups Schedule for Physics. The Calendar, Instructions, Retake Sections and Physics's Midterm/Final Exam stay private.
- **Student View** is built from the Calendar with one formula per column (rows 3–301), so inserting or deleting Calendar rows is safe. Its rows line up with the Calendar's, which is how the teacher dashboard's Edit notes button finds the right cell.
- **Links** are written right in the cell, one per line, as `Name | https://…` (Web Apps and Video columns). There's no App Links tab.

## Turning on a new class
1. Make the class's Google Sheet with a **Student View** tab. The page finds columns by their header name, so order doesn't matter. Use any of:
   `Week, Date, Topic, Warm Up, Checkpoint, Practice, Exit Ticket, What, Why, How, Replace Tasks With, Web App`
   (optional per-day links: `WU Link`, `ET Link`; Web App cells look like `App name | https://…`, one per line)
   Other columns the page understands: `Essential Task` + `Essential Task Link`, `Honors` + `Honors Link` (optional item),
   `Task` (Music), `Announcement` + `Announcement Link` (a banner above the checklist, for Advisory).
   Cells that say "None…" are skipped. Tests are found from `PT #2` in the Topic or `Performance Task 2: …` in the Topic or Essential Task.
   Checklist wording is set per class with `LABELS` in classes.js.
   - Unit header rows: unit name in Week, guiding question in Topic, What / Why / How in the last three columns.
   - Day rows: date like `Mon 11/9` in Date. Put `No School` in Topic for days off.
   - Tests: start the Topic with `PT #` (e.g. `PT #2`). Checkpoints go in the Checkpoint column.
   - Replace Tasks With (the old Substitute Task column): what students do instead of the day's practice, e.g. on a sub day.
2. File → Share → **Publish to web** → Student View → **CSV**, with "Automatically republish when changes are made" checked.
3. Open **classes.js**, paste the link into that class's `CSV_URL`, and upload classes.js.
4. Add the sheet's edit link to `SHEETS` in `teacher.html` so its Edit button shows up.

## Warm-ups
Each warm-up page (Math2_Warmup, Math3_Warmup, Physics_Warmup) reads the class's published Student View, Warmups and Check Points tabs (and Warmups Schedule for Physics).
- The Calendar's Warm Up column has **one name per week** (e.g. `WU C3U6.2`, `WU 2.2`), the same every class day that week. The warm-up page works out which day of the week it is from the date, and gives each student a different set each day.
- Math banks: a question belongs to a unit's bank when its Topic starts with the bank code (e.g. `CP3U6 Circles…` for `WU C3U6.x`).
- The class page's Start button sends the warm-up name and the date (`?wu=WU%20C3U6.2&date=2026-09-08`), so an old day opens that day's set. The score form records the date.

## Ahead or behind: the Shift cell
Each sheet's Student View tab has a **Shift** column (heading in row 2, the number right under it).
- `0` = on the plan, `-1` = one class day behind, `2` = two class days ahead.
- The page then shows that lesson's topic, unit card and checklist (task, practice, web apps, exit ticket), with a small "(planned for …)" note.
- These stay on the real date: the date, warm-up or checkpoint, Replace Tasks With, honors, announcements, the calendar and the Study/Honors box.
- The shift counts straight through test and performance task days, so if you push a test back, the test day's checklist moves with it. The calendar and the Study/Honors box still show the test on its original date; change the date in the sheet if the test is moving for good. Set the shift back to `0` once you've caught up.
- Preview a shift without touching the sheet: add `?shift=-1` to the page address (works with `?date=` too).
The teacher dashboard shows each class's current shift with a **Change shift** button that opens the sheet right at that cell.

## Essential task pages
With `TASKS_CSV` set for a class in classes.js (Physics has it), every Essential Task button opens `task.html` instead of the old link.
- The page shows the task's unit, name, assigned and due dates, a "What to do" list, and a **Turn it in** box with the task's Google Form embedded (plus an "Open the form in a new tab" button, like the exit ticket).
- Beside it, the **Essential Tasks** box shows the task assigned that day as a button, then past tasks from the same unit as links, newest first. Due dates are optional; a task shows up once it has an Assigned date.
- The button sends the calendar day (`&d=`), so a task opened from an old day shows everything as of that day, with a note at the top.
- Everything comes from the sheet's **Tasks** tab (published as CSV): `ID, Task, Unit, Assigned, Due, Description, Form Link`.
  - **Task** must match the name in the Calendar's Essential Task column (the ID before the colon, like `4a` or `PT4`, also works).
  - A task that repeats each semester gets a row for each semester; the page picks the one assigned most recently before the day.
  - **Description**: one bullet per line (Ctrl+Enter for a new line in the cell). A line written `Name | https://…` becomes a link, and `[text](https://…)` makes a link inside a sentence. Don't use Sheets' Insert link: the published tab drops it.
  - **Form Link**: the task's Google Form. Leave it blank and the page says "Upload coming soon."
- A task that isn't on the Tasks tab yet still gets a button to its old link (from the Calendar cell).

## Exit tickets
The Exit ticket button opens `exit.html`: the day's question (from the Exit Ticket column) in big text at the top, with the class's Google Form embedded below it.
The form is the class's `CHECKIN_FORM` setting in classes.js (or the day's `ET Link` if that's blank). Nothing to set up per day.
If a form ever won't show inside the page, the "Open the form in a new tab" button under it still works.
Anything after `[Look for:` in a Calendar exit ticket is your answer key; Student View removes it before publishing.

## Videos
Put videos in the Video column of the Calendar tab (right after Web Apps) as `▶ Video: name | https://www.youtube.com/watch?v=…` (one per line); Student View adds them to the Web App column.
The Watch button opens `video.html`, which plays the video inside the site (YouTube's privacy-enhanced player) with a Back to class button and an "Open it on YouTube" button underneath. Non-YouTube video links just open in a new tab.

## Lesson notes
Each sheet's Calendar tab has a **Lesson Notes** column (column C on every class sheet). Student View copies it into its own Lesson Notes column, so it's published along with the rest of Student View. Keep anything private out of it.
The teacher dashboard shows each class's notes for the day in "Preview a day" (following the Shift), and **Edit notes** opens the sheet at that day's cell. Class pages ignore this column.
Links in a note become clickable on the dashboard. Line breaks in a note (Ctrl/Cmd+Enter in a cell) are kept.

## Picking a day on the calendar
Students can tap any class day on the calendar to see that day's unit card and checklist, with a "Back to today" button. The Study box and calendar don't change.
The warm-up or checkpoint button on that day opens that exact one (the warm-up page gets `?wu=<name>&date=<day>`), and the exit ticket shows that day's question. Each day keeps its own checkmarks.
A picked day shows the lesson written on that row (the Shift only applies to today). Link straight to a day with `?day=2026-09-15`.

## Teacher dashboard
`teacher.html` isn't linked anywhere for students. It shows whether each class's sheet is loading, with Edit sheet, Open page and Preview-a-day buttons.
Preview any page on a given day by adding `?date=2026-11-18` to its address.

## Advisory
Advisory uses its own layout (`LAYOUT: 'advisory'` in classes.js) and reads three published tabs of the Advisory sheet: **Student View** (`CSV_URL`), **Announcements** (`ANNOUNCEMENTS_CSV`) and **X-Block** (`XBLOCK_CSV`). Everything on the page comes live from the sheet except the Outlook links, which are in classes.js.
- **Student View**: one row per date, weekends included (`Date, Day, Day Type, Topic of the Week, School Event, Deadline, Icebreaker, Video, Lesson Notes`). Day Type sets the calendar color: School Day, Finals, Minimum Day, No School, Weekend. School events like PSAT, CAASPP and testing show blue.
- **Page, top to bottom**: Topic of the Week, today's icebreaker in big text, the checklist (DLA TV from the Video column, Check email, X-Block sign-up), Announcements, then Coming up and a month calendar on the side. On a day with no school it shows the next school day's icebreaker and checklist.
- **Announcements**: a row shows from **Show Starting** (or a week before **Event Date** if that's blank) through **Hide After** (or the Event Date if that's blank). A row with no dates shows until you delete it. Put a link in **Link** for an Open button.
- **X-Block**: the sign-up button appears only from **Opens** through **Closes**, and needs a **Sign-up Link**.
- **Check email** tries the Outlook app first and opens Outlook on the web if the app doesn't open.
