/* SimpleMail Classique — couche DOM : salutation, avatars initiales,
   groupes de dates. Monde isolé, aucune préférence requise. */
(() => {
  "use strict";
  if (globalThis.__smClassicLoaded) return;
  globalThis.__smClassicLoaded = true;

  const $ = (s, p = document) => p.querySelector(s);
  const all = (s, p = document) => [...p.querySelectorAll(s)];
  let frame = 0;
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(); }); };
  const observer = new MutationObserver(schedule);

  const MONTHS = { jan: 0, "fév": 1, fev: 1, mar: 2, avr: 3, apr: 3, mai: 4, may: 4, juin: 5, jun: 5, juil: 6, jul: 6, "aoû": 7, aug: 7, sep: 8, oct: 9, nov: 10, "déc": 11, dec: 11 };

  function greeting() {
    const main = $(".bkK [role='main']") || $("[role='main']");
    if (!main) return;
    let head = $(".smc-greeting");
    if (!head) {
      const toolbar = $(".G-atb", main);
      head = document.createElement("div");
      head.className = "smc-greeting";
      const hello = document.createElement("div");
      hello.className = "smc-hello";
      hello.textContent = "Bonjour 👋";
      const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const stamp = document.createElement("div");
      stamp.className = "smc-date";
      stamp.textContent = date.charAt(0).toUpperCase() + date.slice(1);
      const counter = document.createElement("div");
      counter.className = "smc-counter";
      head.append(hello, stamp, counter);
      if (toolbar) toolbar.before(head);
      else main.prepend(head);
    }
    const unread = all(".zA.zE").length;
    const counter = $(".smc-counter", head);
    const text = unread ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "Aucun message non lu";
    if (counter.textContent !== text) counter.textContent = text;
  }

  function avatars() {
    for (const row of all(".zA")) {
      const cell = $(".yX", row);
      const name = $(".yW", cell || row);
      if (!cell || !name) continue;
      const initial = (name.textContent.trim()[0] || "?").toUpperCase();
      if (cell.dataset.initial !== initial) cell.dataset.initial = initial;
    }
  }

  function parseHint(hint) {
    const text = hint.toLowerCase();
    const m = text.match(/(\d{1,2})\s+([a-zéûà]+)/);
    if (m && MONTHS[m[2]] !== undefined) {
      const now = new Date();
      return new Date(now.getFullYear(), MONTHS[m[2]], +m[1]).getTime();
    }
    const d = new Date(hint).getTime();
    return isNaN(d) ? null : d;
  }

  function dateLabel(row) {
    const cell = $(".xW", row);
    if (!cell) return "";
    const value = cell.textContent.trim().toLowerCase();
    if (/^\d{1,2}:\d{2}/.test(value) || value.includes("aujourd")) return "Aujourd’hui";
    if (value.startsWith("hier")) return "Hier";
    const hint = $("[title]", cell)?.title || value;
    const ts = parseHint(hint);
    if (ts !== null && (Date.now() - ts) / 864e5 <= 7) return "Cette semaine";
    return "Plus ancien";
  }

  function dateGroups() {
    const rows = all("table.F.cf.zt .zA");
    all(".smc-date-row").forEach((el) => el.remove());
    let last = "";
    rows.forEach((row) => {
      const label = dateLabel(row);
      if (label && label !== last) {
        const tr = document.createElement("tr");
        tr.className = "smc-date-row";
        const td = document.createElement("td");
        td.colSpan = Math.max(row.children.length, 1);
        td.textContent = label;
        tr.append(td);
        row.before(tr);
      }
      last = label;
    });
  }

  function apply() {
    if (!document.body) return;
    greeting();
    avatars();
    dateGroups();
  }

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
  apply();
})();
