# Class Pages

Upload everything in this folder to the **Home** repo, replacing what's there.
The links students already have (…/Home/index.html, math.html, physics.html, advisory.html, music.html) stay the same.

## How it works
Each class page reads the **Student View** tab of its own Google Sheet, so editing the sheet updates the page (within about 5 minutes).
All four pages share the same engine: `assets/classpage.js` and `assets/classpage.css`.

## Turning on a new class (Physics, Advisory, Music)
1. Make the class's Google Sheet with a **Student View** tab using the same columns as Math 2:
   `Week, Date, Topic, Warm Up, Checkpoint, WU Link, ET Link, Practice, Exit Ticket, What, Why, How`
   - Unit header rows: unit name in Week, guiding question in Topic, What / Why / How in the last three columns.
   - Day rows: date like `Mon 11/9` in Date. Put `No School` in Topic for days off.
   - Tests: start the Topic with `PT #` (e.g. `PT #2`). Checkpoints go in the Checkpoint column.
2. File → Share → **Publish to web** → Student View → **CSV**, with "Automatically republish when changes are made" checked.
3. Open the class page file (e.g. `physics.html`), paste the link into `CSV_URL`, and upload it.
4. Add the sheet's edit link to `SHEETS` in `teacher.html` so its Edit button shows up.

## Teacher dashboard
`teacher.html` isn't linked anywhere for students. It shows whether each class's sheet is loading, with Edit sheet, Open page and Preview-a-day buttons.
Preview any page on a given day by adding `?date=2026-11-18` to its address.
