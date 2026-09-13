/* ============================================================
   Teacher dashboard logic.
   - Repo location (owner/repo/branch) lives in plain localStorage.
   - The GitHub token is AES-GCM encrypted with a key derived (via
     PBKDF2) from a PIN you choose, and only the encrypted blob is
     stored in localStorage. The decrypted token lives only in a
     JS variable for this tab's lifetime — reloading the page
     re-locks it and asks for the PIN again. This deters a casual
     visitor from reading the token out of storage; it is NOT
     protection against someone with real access to this browser
     and time to brute-force a short PIN.
   - Loads each class's data/<class>.json straight from GitHub,
     lets you edit it with checkboxes, and "Publish" commits the
     updated file back to GitHub so the live student pages update.
   ============================================================ */

(function () {
  var STORAGE_PREFIX = "classroomSite_";
  var PBKDF2_ITERATIONS = 150000;
  var CLASSES = [
    { key: "math", label: "Math", file: "data/math.json" },
    { key: "physics", label: "Physics", file: "data/physics.json" },
    { key: "advisory", label: "Advisory", file: "data/advisory.json" },
    { key: "music", label: "Music", file: "data/music.json" }
  ];

  var state = {}; // key -> { data, sha, loaded, exists }
  var activeKey = CLASSES[0].key;
  var sessionToken = null; // decrypted token, memory-only, cleared on reload/lock

  /* ---------------- repo location (not secret) ---------------- */

  function getConfig() {
    return {
      owner: localStorage.getItem(STORAGE_PREFIX + "owner") || "",
      repo: localStorage.getItem(STORAGE_PREFIX + "repo") || "",
      branch: localStorage.getItem(STORAGE_PREFIX + "branch") || "main"
    };
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_PREFIX + "owner", cfg.owner);
    localStorage.setItem(STORAGE_PREFIX + "repo", cfg.repo);
    localStorage.setItem(STORAGE_PREFIX + "branch", cfg.branch);
  }

  /* ---------------- encrypted token storage ---------------- */

  function hasStoredToken() {
    return !!localStorage.getItem(STORAGE_PREFIX + "tok_enc");
  }

  function forgetStoredToken() {
    localStorage.removeItem(STORAGE_PREFIX + "tok_enc");
    localStorage.removeItem(STORAGE_PREFIX + "tok_iv");
    localStorage.removeItem(STORAGE_PREFIX + "tok_salt");
    sessionToken = null;
  }

  function lockSession() {
    sessionToken = null;
  }

  function bytesToB64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function deriveKey(pin, saltBytes) {
    return crypto.subtle
      .importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
      });
  }

  function encryptAndStoreToken(token, pin) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pin, salt).then(function (key) {
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(token)).then(function (cipherBuf) {
        localStorage.setItem(STORAGE_PREFIX + "tok_salt", bytesToB64(salt));
        localStorage.setItem(STORAGE_PREFIX + "tok_iv", bytesToB64(iv));
        localStorage.setItem(STORAGE_PREFIX + "tok_enc", bytesToB64(new Uint8Array(cipherBuf)));
        sessionToken = token;
      });
    });
  }

  function unlockWithPin(pin) {
    var salt = b64ToBytes(localStorage.getItem(STORAGE_PREFIX + "tok_salt"));
    var iv = b64ToBytes(localStorage.getItem(STORAGE_PREFIX + "tok_iv"));
    var cipherBytes = b64ToBytes(localStorage.getItem(STORAGE_PREFIX + "tok_enc"));
    return deriveKey(pin, salt)
      .then(function (key) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipherBytes);
      })
      .then(function (plainBuf) {
        sessionToken = new TextDecoder().decode(plainBuf);
        return sessionToken;
      })
      .catch(function () {
        throw new Error("Incorrect PIN.");
      });
  }

  /* ---------------- base64 (unicode-safe, for JSON file content) ---------------- */

  function b64Encode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) {
        return String.fromCharCode("0x" + p1);
      })
    );
  }

  function b64Decode(str) {
    var clean = str.replace(/\n/g, "");
    return decodeURIComponent(
      atob(clean)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
  }

  /* ---------------- GitHub API ---------------- */

  function apiUrl(cfg, path) {
    return (
      "https://api.github.com/repos/" +
      encodeURIComponent(cfg.owner) +
      "/" +
      encodeURIComponent(cfg.repo) +
      "/contents/" +
      path
    );
  }

  function ghHeaders(token) {
    return {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function ghGetFile(cfg, token, path) {
    var url = apiUrl(cfg, path) + "?ref=" + encodeURIComponent(cfg.branch) + "&t=" + Date.now();
    return fetch(url, { headers: ghHeaders(token), cache: "no-store" }).then(function (r) {
      if (r.status === 404) return { notFound: true };
      if (!r.ok) return r.json().then(function (j) { throw new Error(describeError(r.status, j)); });
      return r.json().then(function (j) {
        return { sha: j.sha, data: JSON.parse(b64Decode(j.content)) };
      });
    });
  }

  function ghPutFile(cfg, token, path, obj, sha, message) {
    var body = {
      message: message,
      content: b64Encode(JSON.stringify(obj, null, 2)),
      branch: cfg.branch
    };
    if (sha) body.sha = sha;
    return fetch(apiUrl(cfg, path), {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders(token)),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(describeError(r.status, j)); });
      return r.json().then(function (j) { return j.content.sha; });
    });
  }

  function describeError(status, json) {
    var msg = (json && json.message) || "Unknown error";
    if (status === 401) return "GitHub rejected the token (401). Double-check it was copied correctly and hasn't expired.";
    if (status === 403) return "GitHub says: forbidden (403). The token may not have Contents: Read & write permission on this repo.";
    if (status === 404) return "Repo or branch not found (404). Check the owner/repo/branch settings below.";
    if (status === 409) return "Conflict (409) — this file changed on GitHub since you loaded it. Click “Reload from GitHub” and re-apply your changes.";
    if (status === 422) return "GitHub rejected the request (422): " + msg;
    return "GitHub error (" + status + "): " + msg;
  }

  /* ---------------- ids & templates ---------------- */

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function blankItem(label, url) {
    return { id: newId("item"), label: label || "", url: url || "", visible: true };
  }

  function blankWeek(title) {
    return { id: newId("week"), title: title || "New Week", visible: true, warmups: [], apps: [] };
  }

  function emptyClassData(label) {
    return { className: label, resources: [], weeks: [blankWeek("Week 1")] };
  }

  /* ---------------- DOM refs ---------------- */

  var el = {}; // filled on init from ids in teacher.html

  function q(id) { return document.getElementById(id); }

  /* ---------------- settings panel (owner/repo/branch) ---------------- */

  function fillSettingsForm() {
    var cfg = getConfig();
    el.owner.value = cfg.owner;
    el.repo.value = cfg.repo;
    el.branch.value = cfg.branch;
  }

  function onSaveSettings() {
    var cfg = {
      owner: el.owner.value.trim(),
      repo: el.repo.value.trim(),
      branch: el.branch.value.trim() || "main"
    };
    if (!cfg.owner || !cfg.repo) {
      setSettingsStatus("Please fill in at least the owner and repo name.", "err");
      return;
    }
    saveConfig(cfg);
    setSettingsStatus("Saved.", "ok");
    if (sessionToken) loadAllClasses();
  }

  function setSettingsStatus(msg, kind) {
    el.settingsStatus.textContent = msg;
    el.settingsStatus.className = "status-msg " + (kind || "");
  }

  function setTokenStatus(msg, kind) {
    el.tokenStatus.textContent = msg;
    el.tokenStatus.className = "status-msg " + (kind || "");
  }

  /* ---------------- token area (PIN-gated) ---------------- */

  function renderTokenArea() {
    el.tokenArea.innerHTML = "";

    if (sessionToken) {
      // Unlocked this session
      var row = document.createElement("div");
      row.className = "field-row";
      var badge = document.createElement("span");
      badge.className = "token-connected";
      badge.textContent = "🔓 Unlocked for this session";
      row.appendChild(badge);
      row.appendChild(mkBtn("Lock now", "secondary small", function () {
        lockSession();
        renderTokenArea();
        setTokenStatus("Locked. Enter your PIN to publish again.", "pending");
      }));
      row.appendChild(mkBtn("Forget saved token", "danger small", function () {
        if (!confirm("This removes the saved token from this browser completely. You'll need to paste it again (with a new PIN) next time. Continue?")) return;
        forgetStoredToken();
        renderTokenArea();
        setTokenStatus("Token forgotten.", "ok");
        renderEditor();
      }));
      el.tokenArea.appendChild(row);
      return;
    }

    if (hasStoredToken()) {
      // Locked — ask for PIN
      var lockRow = document.createElement("div");
      lockRow.className = "field-row";
      lockRow.innerHTML = '<label>PIN</label>';
      var pinInput = document.createElement("input");
      pinInput.type = "password";
      pinInput.placeholder = "Enter your PIN";
      pinInput.addEventListener("keydown", function (e) { if (e.key === "Enter") unlockBtn.click(); });
      lockRow.appendChild(pinInput);
      var unlockBtn = mkBtn("🔓 Unlock", "", function () {
        var pin = pinInput.value;
        if (!pin) return;
        setTokenStatus("Unlocking…", "pending");
        unlockWithPin(pin)
          .then(function () {
            pinInput.value = "";
            renderTokenArea();
            setTokenStatus("Unlocked. Loading your classes…", "pending");
            loadAllClasses();
          })
          .catch(function (err) { setTokenStatus(err.message, "err"); });
      });
      lockRow.appendChild(unlockBtn);
      lockRow.appendChild(mkBtn("Forget saved token", "danger small", function () {
        if (!confirm("Forgot your PIN, or setting up a new token? This removes the saved token from this browser. Continue?")) return;
        forgetStoredToken();
        renderTokenArea();
        setTokenStatus("Token forgotten. Paste a new one below.", "ok");
      }));
      el.tokenArea.appendChild(lockRow);
      return;
    }

    // No token stored yet — first-time setup
    var setupRow1 = document.createElement("div");
    setupRow1.className = "field-row";
    setupRow1.innerHTML = "<label>Token</label>";
    var tokenInput = document.createElement("input");
    tokenInput.type = "password";
    tokenInput.placeholder = "paste GitHub token here";
    tokenInput.style.flex = "1";
    tokenInput.style.minWidth = "220px";
    setupRow1.appendChild(tokenInput);
    el.tokenArea.appendChild(setupRow1);

    var setupRow2 = document.createElement("div");
    setupRow2.className = "field-row";
    setupRow2.innerHTML = "<label>Choose a PIN</label>";
    var pin1 = document.createElement("input");
    pin1.type = "password";
    pin1.placeholder = "PIN (6+ characters is safer)";
    var pin2 = document.createElement("input");
    pin2.type = "password";
    pin2.placeholder = "confirm PIN";
    setupRow2.appendChild(pin1);
    setupRow2.appendChild(pin2);
    setupRow2.appendChild(mkBtn("Save & Connect", "", function () {
      var token = tokenInput.value.trim();
      if (!token) { setTokenStatus("Paste your GitHub token first.", "err"); return; }
      if (!pin1.value || pin1.value.length < 4) { setTokenStatus("Choose a PIN of at least 4 characters.", "err"); return; }
      if (pin1.value !== pin2.value) { setTokenStatus("PINs don't match.", "err"); return; }
      setTokenStatus("Saving…", "pending");
      encryptAndStoreToken(token, pin1.value).then(function () {
        renderTokenArea();
        setTokenStatus("Saved and unlocked. Loading your classes…", "pending");
        loadAllClasses();
      });
    }));
    el.tokenArea.appendChild(setupRow2);
  }

  /* ---------------- tabs ---------------- */

  function renderTabs() {
    el.tabs.innerHTML = "";
    CLASSES.forEach(function (c) {
      var btn = document.createElement("button");
      btn.textContent = c.label;
      btn.className = c.key === activeKey ? "active" : "";
      btn.addEventListener("click", function () {
        activeKey = c.key;
        renderTabs();
        renderEditor();
      });
      el.tabs.appendChild(btn);
    });
  }

  /* ---------------- loading ---------------- */

  function loadAllClasses() {
    var cfg = getConfig();
    if (!cfg.owner || !cfg.repo) {
      setSettingsStatus("Add your GitHub owner and repo above, then click Save.", "pending");
      renderEditor();
      return;
    }
    if (!sessionToken) {
      renderEditor();
      return;
    }
    var promises = CLASSES.map(function (c) {
      return ghGetFile(cfg, sessionToken, c.file)
        .then(function (res) {
          if (res.notFound) {
            state[c.key] = { data: emptyClassData(c.label), sha: null, exists: false, loaded: true };
          } else {
            state[c.key] = { data: res.data, sha: res.sha, exists: true, loaded: true };
          }
        })
        .catch(function (err) {
          state[c.key] = { data: null, sha: null, exists: false, loaded: true, error: err.message };
        });
    });
    Promise.all(promises).then(function () {
      var anyError = CLASSES.find(function (c) { return state[c.key] && state[c.key].error; });
      if (anyError) {
        setTokenStatus(state[anyError.key].error, "err");
      } else {
        setTokenStatus("✓ Connected — all four classes loaded.", "ok");
      }
      renderEditor();
    });
  }

  /* ---------------- editor rendering ---------------- */

  function currentClassMeta() {
    return CLASSES.filter(function (c) { return c.key === activeKey; })[0];
  }

  function renderEditor() {
    var meta = currentClassMeta();
    var s = state[activeKey];
    el.editorArea.innerHTML = "";

    if (!s || !s.loaded) {
      var msg = sessionToken
        ? "Loading " + meta.label + "…"
        : "Unlock with your PIN above (or set up a token if this is your first time) to load " + meta.label + ".";
      el.editorArea.innerHTML = '<p class="panel-desc">' + msg + "</p>";
      return;
    }
    if (s.error) {
      el.editorArea.innerHTML = '<p class="status-msg err">' + s.error + "</p>";
      return;
    }

    var data = s.data;

    var wrap = document.createElement("div");

    // top bar: reload / publish / status
    var bar = document.createElement("div");
    bar.className = "field-row";
    var reloadBtn = mkBtn("Reload from GitHub", "secondary small", function () {
      if (!sessionToken) { setClassStatus("Unlock with your PIN first.", "err"); return; }
      var cfg = getConfig();
      setClassStatus("Reloading…", "pending");
      ghGetFile(cfg, sessionToken, meta.file)
        .then(function (res) {
          if (res.notFound) {
            state[activeKey] = { data: emptyClassData(meta.label), sha: null, exists: false, loaded: true };
          } else {
            state[activeKey] = { data: res.data, sha: res.sha, exists: true, loaded: true };
          }
          setClassStatus("Reloaded.", "ok");
          renderEditor();
        })
        .catch(function (err) { setClassStatus(err.message, "err"); });
    });
    var publishBtn = mkBtn("🚀 Publish changes", "", function () { publish(meta); });
    bar.appendChild(reloadBtn);
    bar.appendChild(publishBtn);
    wrap.appendChild(bar);

    var statusEl = document.createElement("div");
    statusEl.className = "status-msg";
    statusEl.id = "class-status";
    wrap.appendChild(statusEl);

    if (!s.exists) {
      var note = document.createElement("p");
      note.className = "panel-desc";
      note.textContent = "This class's data file doesn't exist on GitHub yet — Publish will create " + meta.file + ".";
      wrap.appendChild(note);
    }

    // class name field
    var nameRow = document.createElement("div");
    nameRow.className = "field-row";
    nameRow.innerHTML = '<label>Class name</label>';
    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = data.className || "";
    nameInput.addEventListener("input", function () { data.className = nameInput.value; });
    nameRow.appendChild(nameInput);
    wrap.appendChild(nameRow);

    // weeks
    var weeksHeading = document.createElement("h2");
    weeksHeading.textContent = "Weeks";
    wrap.appendChild(weeksHeading);
    var weeksDesc = document.createElement("p");
    weeksDesc.className = "panel-desc";
    weeksDesc.textContent = "New weeks are added to the top. Whichever checked week is closest to the top is what students see as “This Week” — other checked weeks below it appear collapsed under “Past Weeks.” Unchecked weeks are completely hidden.";
    wrap.appendChild(weeksDesc);

    var currentIdx = data.weeks.findIndex(function (w) { return w.visible !== false; });
    data.weeks.forEach(function (week, wIdx) {
      wrap.appendChild(renderWeekEditor(data, week, wIdx, wIdx === currentIdx));
    });

    var addWeekBtn = mkBtn("+ Add new week (goes on top)", "secondary", function () {
      data.weeks.unshift(blankWeek("New Week"));
      renderEditor();
    });
    wrap.appendChild(addWeekBtn);

    // resources
    var resHeading = document.createElement("h2");
    resHeading.style.marginTop = "28px";
    resHeading.textContent = "Resources (shown on every week)";
    wrap.appendChild(resHeading);
    var resDesc = document.createElement("p");
    resDesc.className = "panel-desc";
    resDesc.textContent = "Course-wide links like a calculator or syllabus — these show up in the third column every time.";
    wrap.appendChild(resDesc);
    wrap.appendChild(renderItemEditorList(data.resources, function () { renderEditor(); }));
    wrap.appendChild(renderAddItemRow(function (label, url) {
      data.resources.push(blankItem(label, url));
      renderEditor();
    }));

    el.editorArea.appendChild(wrap);
  }

  function setClassStatus(msg, kind) {
    var elx = q("class-status");
    if (!elx) return;
    elx.textContent = msg;
    elx.className = "status-msg " + (kind || "");
  }

  function renderWeekEditor(data, week, wIdx, isCurrent) {
    var box = document.createElement("div");
    box.className = "editor-week";

    var head = document.createElement("div");
    head.className = "editor-week-head";

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "checkbox-lg";
    cb.checked = week.visible !== false;
    cb.title = "Show this week to students";
    cb.addEventListener("change", function () { week.visible = cb.checked; });
    head.appendChild(cb);

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = week.title || "";
    titleInput.addEventListener("input", function () { week.title = titleInput.value; });
    head.appendChild(titleInput);

    if (isCurrent) {
      var tag = document.createElement("span");
      tag.className = "current-tag";
      tag.style.background = "var(--accent)";
      tag.style.color = "#fff";
      tag.style.padding = "3px 10px";
      tag.style.borderRadius = "999px";
      tag.style.fontSize = "0.72rem";
      tag.textContent = "✓ STUDENTS SEE THIS AS “THIS WEEK”";
      head.appendChild(tag);
    } else if (week.visible !== false) {
      var tag2 = document.createElement("span");
      tag2.className = "current-tag";
      tag2.style.background = "var(--muted)";
      tag2.style.color = "#fff";
      tag2.style.padding = "3px 10px";
      tag2.style.borderRadius = "999px";
      tag2.style.fontSize = "0.72rem";
      tag2.textContent = "Visible under Past Weeks";
      head.appendChild(tag2);
    }

    var delBtn = mkBtn("Delete week", "danger small", function () {
      if (!confirm('Delete "' + (week.title || "this week") + '" and everything in it?')) return;
      data.weeks.splice(wIdx, 1);
      renderEditor();
    });
    head.appendChild(delBtn);

    box.appendChild(head);

    var cols = document.createElement("div");
    cols.className = "editor-columns";

    var warmupCol = document.createElement("div");
    warmupCol.className = "editor-col";
    warmupCol.innerHTML = "<h4>🔥 Warmups</h4>";
    warmupCol.appendChild(renderItemEditorList(week.warmups, function () { renderEditor(); }));
    warmupCol.appendChild(renderAddItemRow(function (label, url) {
      week.warmups.push(blankItem(label, url));
      renderEditor();
    }));
    cols.appendChild(warmupCol);

    var appsCol = document.createElement("div");
    appsCol.className = "editor-col";
    appsCol.innerHTML = "<h4>💻 Web Apps</h4>";
    appsCol.appendChild(renderItemEditorList(week.apps, function () { renderEditor(); }));
    appsCol.appendChild(renderAddItemRow(function (label, url) {
      week.apps.push(blankItem(label, url));
      renderEditor();
    }));
    cols.appendChild(appsCol);

    box.appendChild(cols);
    return box;
  }

  function renderItemEditorList(items, onChange) {
    var listWrap = document.createElement("div");
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "Nothing added yet.";
      listWrap.appendChild(empty);
      return listWrap;
    }
    items.forEach(function (item, idx) {
      var row = document.createElement("div");
      row.className = "editor-item-row";

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "checkbox-lg";
      cb.checked = item.visible !== false;
      cb.title = "Show to students";
      cb.addEventListener("change", function () { item.visible = cb.checked; });
      row.appendChild(cb);

      var labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = item.label || "";
      labelInput.placeholder = "Label";
      labelInput.addEventListener("input", function () { item.label = labelInput.value; });
      row.appendChild(labelInput);

      var urlInput = document.createElement("input");
      urlInput.type = "url";
      urlInput.value = item.url || "";
      urlInput.placeholder = "https://…";
      urlInput.addEventListener("input", function () { item.url = urlInput.value; });
      row.appendChild(urlInput);

      var delBtn = mkBtn("✕", "danger small", function () {
        items.splice(idx, 1);
        onChange();
      });
      row.appendChild(delBtn);

      listWrap.appendChild(row);
    });
    return listWrap;
  }

  function renderAddItemRow(onAdd) {
    var row = document.createElement("div");
    row.className = "add-row";

    var labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "New item label";

    var urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://…";

    var addBtn = mkBtn("+ Add", "secondary small", function () {
      if (!labelInput.value.trim() || !urlInput.value.trim()) return;
      onAdd(labelInput.value.trim(), urlInput.value.trim());
    });

    row.appendChild(labelInput);
    row.appendChild(urlInput);
    row.appendChild(addBtn);
    return row;
  }

  function mkBtn(text, cls, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (cls || "");
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  /* ---------------- publish ---------------- */

  function publish(meta) {
    var cfg = getConfig();
    if (!sessionToken) {
      setClassStatus("Unlock with your PIN in the Publishing access panel above first.", "err");
      return;
    }
    var s = state[meta.key];
    setClassStatus("Publishing…", "pending");
    ghPutFile(cfg, sessionToken, meta.file, s.data, s.sha, "Update " + meta.label + " page (" + new Date().toLocaleString() + ")")
      .then(function (newSha) {
        s.sha = newSha;
        s.exists = true;
        setClassStatus("✓ Published! Students will see this within a minute or two.", "ok");
      })
      .catch(function (err) {
        setClassStatus(err.message, "err");
      });
  }

  /* ---------------- init ---------------- */

  function init() {
    el.owner = q("gh-owner");
    el.repo = q("gh-repo");
    el.branch = q("gh-branch");
    el.tokenArea = q("token-area");
    el.tokenStatus = q("token-status");
    el.settingsStatus = q("settings-status");
    el.tabs = q("class-tabs");
    el.editorArea = q("editor-area");

    q("gh-save-btn").addEventListener("click", onSaveSettings);

    fillSettingsForm();
    renderTabs();
    renderTokenArea();
    renderEditor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
