# Class Pages

Upload the .html files to the **Home** repo (Add file → Upload files), replacing what's there.
The links students already have (…/Home/index.html, math.html, physics.html, advisory.html, music.html) stay the same.

## How it works
Each class page reads the **Student View** tab of its own Google Sheet, so editing the sheet updates the page (within about 5 minutes).
Each page is self-contained: its colors and code are inside the file, so there are no extra folders to upload.

## Turning on a new class (Physics, Advisory, Music)
1. Make the class's Google Sheet with a **Student View** tab. The page finds columns by their header name, so order doesn't matter. Use any of:
   `Week, Date, Topic, Warm Up, Checkpoint, Practice, Exit Ticket, What, Why, How, Substitute Task, Web App`
   (optional per-day links: `WU Link`, `ET Link`; Web App cells look like `App name | https://…`, one per line)
   Other columns the page understands: `Essential Task` + `Essential Task Link`, `Honors` + `Honors Link` (optional item),
   `Task` (Music), `Announcement` + `Announcement Link` (a banner above the checklist, for Advisory).
   Cells that say "None…" are skipped. Tests are found from `PT #2` in the Topic or `Performance Task 2: …` in the Topic or Essential Task.
   Checklist wording is set per class with `LABELS` in that class's settings block.
   - Unit header rows: unit name in Week, guiding question in Topic, What / Why / How in the last three columns.
   - Day rows: date like `Mon 11/9` in Date. Put `No School` in Topic for days off.
   - Tests: start the Topic with `PT #` (e.g. `PT #2`). Checkpoints go in the Checkpoint column.
2. File → Share → **Publish to web** → Student View → **CSV**, with "Automatically republish when changes are made" checked.
3. Open the class page file (e.g. `physics.html`), paste the link into `CSV_URL` in the SETTINGS block near the bottom, and upload it.
4. Add the sheet's edit link to `SHEETS` in `teacher.html` so its Edit button shows up.

## Ahead or behind: the Shift cell
Each sheet's Student View tab has a **Shift** column (header in row 1, the number right under it).
- `0` = on the plan, `-1` = one class day behind, `2` = two class days ahead.
- The page then shows that lesson's topic, unit card and checklist (task, practice, web apps, exit ticket), with a small "(planned for …)" note.
- These stay on the real date: the date, warm-up or checkpoint, substitute task, honors, announcements, the calendar, and every test and due date.
- The shift never reaches past a test, exam, assessment or performance task day, so those days catch everyone back up. Still, set it back to `0` once you've caught up.
- Preview a shift without touching the sheet: add `?shift=-1` to the page address (works with `?date=` too).
The teacher dashboard shows each class's current shift with a **Change shift** button that opens the sheet right at that cell.

## Teacher dashboard
`teacher.html` isn't linked anywhere for students. It shows whether each class's sheet is loading, with Edit sheet, Open page and Preview-a-day buttons.
Preview any page on a given day by adding `?date=2026-11-18` to its address.
