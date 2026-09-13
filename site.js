/* ============================================================
   Student page renderer.
   Include like:
   <script src="assets/site.js" data-file="data/math.json" defer></script>
   Renders into <div id="page-content"></div>
   ============================================================ */

(function () {
  var thisScript = document.currentScript;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function visibleItems(list) {
    return (list || []).filter(function (it) { return it && it.visible !== false; });
  }

  function renderItemList(items) {
    if (!items.length) {
      return '<p class="empty-note">Nothing posted here yet.</p>';
    }
    var html = '<ul class="item-list">';
    items.forEach(function (it) {
      html += '<li class="item-card"><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.label) + "</a></li>";
    });
    html += "</ul>";
    return html;
  }

  function renderColumns(warmups, apps, resources, twoCol) {
    var html = '<div class="columns' + (twoCol ? "" : "") + '">';
    html += '<div class="column"><h3>🔥 Warmups</h3>' + renderItemList(warmups) + "</div>";
    html += '<div class="column"><h3>💻 Web Apps</h3>' + renderItemList(apps) + "</div>";
    if (!twoCol) {
      html += '<div class="column"><h3>🛠️ Resources</h3>' + renderItemList(resources) + "</div>";
    }
    html += "</div>";
    return html;
  }

  function render(data) {
    var container = document.getElementById("page-content");
    if (!container) return;

    var titleEl = document.getElementById("class-title");
    if (titleEl && data.className) titleEl.textContent = data.className;

    var weeks = (data.weeks || []).filter(function (w) { return w && w.visible !== false; });
    var resources = visibleItems(data.resources);

    if (!weeks.length) {
      container.innerHTML =
        '<div class="nothing-yet">📭 Nothing has been posted yet — check back soon!</div>';
      return;
    }

    var current = weeks[0];
    var past = weeks.slice(1);

    var html = "";
    html += '<div class="week-block">';
    html += '<div class="week-heading"><h2>' + esc(current.title) + '</h2><span class="current-tag">This Week</span></div>';
    html += renderColumns(visibleItems(current.warmups), visibleItems(current.apps), resources, false);
    html += "</div>";

    if (past.length) {
      html += '<details class="past-weeks"><summary>📚 Past Weeks (' + past.length + ")</summary>";
      past.forEach(function (w) {
        html += '<div class="past-week-entry"><h3 class="past-title">' + esc(w.title) + "</h3>";
        html += renderColumns(visibleItems(w.warmups), visibleItems(w.apps), [], true);
        html += "</div>";
      });
      html += "</details>";
    }

    container.innerHTML = html;
  }

  function load() {
    var file = thisScript.getAttribute("data-file");
    if (!file) return;
    var url = file + (file.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
    fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        var container = document.getElementById("page-content");
        if (container) {
          container.innerHTML =
            '<div class="nothing-yet">⚠️ Couldn\'t load this page\'s content right now. Try refreshing in a bit.</div>';
        }
        console.error("Failed to load class data:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
