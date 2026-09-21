"use strict";

const NEBULA_SETTINGS_KEY = "nebulaSettings";

const NEBULA_DEFAULTS = {
  autoCloak: false,
  antiClose: false,
  searchEngine: "duckduckgo",
  transport: "auto",
};

const NEBULA_ENGINES = {
  duckduckgo: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q) + "&ia=web",
  startpage: (q) => "https://www.startpage.com/sp/search?query=" + encodeURIComponent(q),
  google: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q),
  bing: (q) => "https://www.bing.com/search?q=" + encodeURIComponent(q),
  brave: (q) => "https://search.brave.com/search?q=" + encodeURIComponent(q),
};

function getNebulaSettings() {
  try {
    const raw = localStorage.getItem(NEBULA_SETTINGS_KEY);
    if (!raw) return { ...NEBULA_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...NEBULA_DEFAULTS, ...parsed };
  } catch {
    return { ...NEBULA_DEFAULTS };
  }
}

function saveNebulaSettings(patch) {
  const next = { ...getNebulaSettings(), ...patch };
  try {
    localStorage.setItem(NEBULA_SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function nebulaSearchUrl(query) {
  const s = getNebulaSettings();
  const fn = NEBULA_ENGINES[s.searchEngine] || NEBULA_ENGINES.duckduckgo;
  return fn(query);
}

function cloakNebulaSite() {
  const origin = window.location.origin;
  const safeOrigin = String(origin).replace(/"/g, "");
  const popup = window.open("about:blank", "_blank");
  if (!popup) return false;
  try {
    popup.document.open();
    popup.document.write(
      '<!doctype html><html><head><meta charset="utf-8" />' +
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />' +
        "<style>html,body{margin:0;padding:0;width:100%;height:100%;background:#fff;overscroll-behavior:none}" +
        "iframe{display:block;position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;border:0;touch-action:auto}</style>" +
        '</head><body><iframe src="' +
        safeOrigin +
        '" title="content" allow="fullscreen; autoplay; clipboard-write" allowfullscreen></iframe></body></html>'
    );
    popup.document.close();
    try { popup.focus(); } catch {}
  } catch (e) {
    console.warn("Could not cloak site:", e);
    return false;
  }
  nebulaSuspendAntiClose();
  window.location.replace("https://www.google.com");
  return true;
}

function maybeNebulaAutoCloak() {
  try {
    if (window.self !== window.top) return;
    if (sessionStorage.getItem("nebula_autocloaked")) return;
    const s = getNebulaSettings();
    if (!s.autoCloak) return;
    sessionStorage.setItem("nebula_autocloaked", "1");
    cloakNebulaSite();
  } catch {}
}

function applyNebulaAntiClose() {
  try {
    const s = getNebulaSettings();
    if (s.antiClose) {
      window.addEventListener("beforeunload", nebulaBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", nebulaBeforeUnload);
    }
  } catch {}
}

function nebulaSuspendAntiClose() {
  try {
    window.removeEventListener("beforeunload", nebulaBeforeUnload);
  } catch {}
}

function nebulaBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = "";
  return "";
}

document.addEventListener("click", function (event) {
  const t = event.target;
  const link = t && t.closest ? t.closest("a[href]") : null;
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
  if (link.target === "_blank") return;
  nebulaSuspendAntiClose();
}, true);

document.addEventListener("submit", function () {
  nebulaSuspendAntiClose();
}, true);

try {
  applyNebulaAntiClose();
} catch {}
