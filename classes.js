/* ===== EVERY CLASS'S SETTINGS, IN ONE PLACE =====
   This is the file you edit. The class pages, the teacher dashboard, the exit ticket page
   and the video page all read it, so a change here shows up everywhere.
   The order here is the order of the buttons in the top menu.

   Settings each class can have:
     key / file / icon / name   - the class's ID, its page, and its menu button
     TITLE, SUBTITLE            - the big title and the line under it
     CSV_URL                    - the "Publish to web" CSV link for the sheet's Student View tab (blank = "coming soon")
     WARMUP_APP                 - one warm-up page for every day (blank = each day's WU Link from the sheet)
     CHECKIN_FORM               - one exit ticket form for every day (blank = each day's ET Link from the sheet)
     APPS                       - a study app for each unit's performance task, matched against the unit name
     LABELS                     - checklist wording, e.g. { task: "Today's task", practicePrefix: 'Textbook: ' }
     SIDE: 'honors'             - side box shows honors tasks instead of the Study box
     CARRY_TASK: true           - a day with no Essential Task shows the previous day's
     FALL_YEAR                  - the year the school year starts (dates from July on are this year)
*/
window.CLASSES = [
  {
    key: 'math2', file: 'math2.html', icon: '➗', name: 'Math 2',
    TITLE: 'Math 2',
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQelJp9R95FwavTfcew_juMSE6nhqAzJcpArV7Vb0VO37QdrbCQ2E1Z5imUbnMgcs0LUM6l0CpcvCO2/pub?gid=1341448792&single=true&output=csv',
    WARMUP_APP: 'https://dladunlea.github.io/Math2_Warmup/',
    CHECKIN_FORM: 'https://docs.google.com/forms/d/13-LIJsDsXHTsZo4kMr7DYieKcdkDgoZtaQPHKgOnibc/viewform',
    APPS: [
      { match: /CP2 Unit 3\b/, name: 'Coordinate Methods',   url: 'https://dladunlea.github.io/CoordinateMethods/' },
      { match: /CP2 Unit 5\b/, name: 'Non-Linear Functions', url: 'https://dladunlea.github.io/Non-Linear_Functions/' },
      { match: /CP2 Unit 7\b/, name: 'Trigonometry',         url: 'https://dladunlea.github.io/Trigonometry/' },
      { match: /CP2 Unit 8\b/, name: 'Probability Models',   url: 'https://dladunlea.github.io/ProbabilityModels/' },
    ],
  },
  {
    key: 'math3', file: 'math3.html', icon: '📐', name: 'Math 3',
    TITLE: 'Math 3',
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrXCOIUr8fKl9qOtzrDlMKy-yx0mZeZZzolZUYFWpBNIdQMmRuFzKvTQw_VTGNUNaRU0_dStMHcQ5p/pub?gid=1341448792&single=true&output=csv',
    WARMUP_APP: 'https://dladunlea.github.io/Math3_Warmup/',
    CHECKIN_FORM: 'https://docs.google.com/forms/d/e/1FAIpQLSdSmpVoPR10jFxmGMBq6fkz9VxTZdis9KwMKugSr9P8MS8MXw/viewform',
    APPS: [
      // Add a study app for each test as it's built, e.g.
      // { match: /CP3 Unit 6/, name: 'Circles', url: 'https://dladunlea.github.io/Circles/' },
    ],
  },
  {
    key: 'physics', file: 'physics.html', icon: '🔬', name: 'Physics',
    TITLE: 'Physics of the Human Body',
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQLUiiW6Cxw6Xs0aGfVo6CDQ8c7iJ_mTaGrmLVzJobrkJRE6l_L0NnAMH_CxGLjAEo5Bn6puXLlqEi/pub?gid=1341448792&single=true&output=csv',
    WARMUP_APP: 'https://dladunlea.github.io/Physics_Warmup/',
    CHECKIN_FORM: 'https://docs.google.com/forms/d/e/1FAIpQLSduj7sW8lRFVLmec-krwWM9lquGiy2xbBv24jTihz0s9otoIQ/viewform',
    APPS: [],   // e.g. { match: /Topic 2\b/, name: 'Kinematics Review', url: 'https://...' }
    LABELS: { task: 'Essential Task', honors: 'Honors', practicePrefix: 'Textbook: ' },
    SIDE: 'honors',
    CARRY_TASK: true,
  },
  {
    key: 'advisory', file: 'advisory.html', icon: '🧑‍🏫', name: 'Advisory',
    TITLE: 'Advisory',
    LAYOUT: 'advisory',   // the Advisory layout: icebreaker, checklist, announcements, month calendar
    // Published CSV links for the Advisory sheet's tabs (Student View, Announcements, X-Block)
    CSV_URL:          'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0ITiZXVKseWfm4-H42OjtRayinBfM2o6hb79NikRvEG5DO8U-GIlEEOmb05G4ODT5CUmawL8a7iBT/pub?gid=1&single=true&output=csv',
    ANNOUNCEMENTS_CSV:'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0ITiZXVKseWfm4-H42OjtRayinBfM2o6hb79NikRvEG5DO8U-GIlEEOmb05G4ODT5CUmawL8a7iBT/pub?gid=2&single=true&output=csv',
    XBLOCK_CSV:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0ITiZXVKseWfm4-H42OjtRayinBfM2o6hb79NikRvEG5DO8U-GIlEEOmb05G4ODT5CUmawL8a7iBT/pub?gid=3&single=true&output=csv',
    // Check email button: tries the Outlook app on the iPad, and opens Outlook on the web if the app doesn't open
    OUTLOOK_APP: 'ms-outlook://',
    OUTLOOK_WEB: 'https://outlook.office.com/mail/',
    // DLA TV comes from the sheet's Video column, so it stays live
  },
  {
    key: 'music', file: 'music.html', icon: '🎵', name: 'Music',
    TITLE: 'Music',
    CSV_URL: '',   // paste the sheet's CSV link here when it's ready
    // Put the day's task in a "Task" column on the sheet
    LABELS: { task: "Today's task", practicePrefix: 'Textbook: ' },
  },
];
