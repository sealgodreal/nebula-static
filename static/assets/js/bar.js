"use strict";

const browserUrl = document.getElementById("browser-url");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const reloadBtn = document.getElementById("reload-btn");
const browserToolbar = document.getElementById("browser-toolbar");
const toolbarToggle = document.getElementById("toolbar-toggle");
const TARGET_URL = "targeturl";
const HISTORY_KEY = "browserHistory";
const HISTORY_INDEX_KEY = "browserHistoryIndex";
const SERVICE_PREFIX = "/service/";
const ASSIGNMENTS_PREFIX = "/assignments/";

function isMobileDevice() {
  return /android|iphone|kindle|ipad/i.test(navigator.userAgent);
}

function isVercelHost() {
  try {
    return location.hostname.endsWith(".vercel.app") || localStorage.getItem("isVercel") === "true";
  } catch {
    return false;
  }
}

function activePrefix() {
  try {
    const stored = localStorage.getItem("proxyScope");
    if (stored === ASSIGNMENTS_PREFIX || stored === SERVICE_PREFIX) return stored;
  } catch {
  }
  if (isMobileDevice() || isVercelHost()) return ASSIGNMENTS_PREFIX;
  return SERVICE_PREFIX;
}

function rememberPrefix(prefix) {
  try {
    if (prefix === ASSIGNMENTS_PREFIX || prefix === SERVICE_PREFIX) {
      localStorage.setItem("proxyScope", prefix);
    }
  } catch {
  }
}

function createDomainRegex(domains) {
  const escapedDomains = domains.map((domain) => domain.replace(/\./g, "\\."));
  return new RegExp(escapedDomains.join("|") + "(?=[/\\s]|$)", "i");
}

async function resolvePrefixForUrl(decodedUrl) {
  if (isMobileDevice() || isVercelHost()) return ASSIGNMENTS_PREFIX;
  try {
    const response = await fetch("/data/b-list.json");
    const data = await response.json();
    const domains = data.domains || data;
    if (decodedUrl && createDomainRegex(domains).test(decodedUrl)) {
      return ASSIGNMENTS_PREFIX;
    }
  } catch (error) {
    console.warn("Could not resolve proxy scope, defaulting to /service/:", error);
  }
  return SERVICE_PREFIX;
}

function encodeUrl(url) {
  if (!url) return url;
  if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
    return Ultraviolet.codec.xor.encode(url);
  }
  if (typeof self !== "undefined" && self.__uv$config && typeof self.__uv$config.encodeUrl === "function") {
    return self.__uv$config.encodeUrl(url);
  }
  console.warn("Ultraviolet codec is not available. Make sure wk2.js is loaded first.");
  return encodeURIComponent(url);
}

function decodeUrl(encodedUrl) {
  if (!encodedUrl) return encodedUrl;
  if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
    return Ultraviolet.codec.xor.decode(encodedUrl);
  }
  if (typeof self !== "undefined" && self.__uv$config && typeof self.__uv$config.decodeUrl === "function") {
    return self.__uv$config.decodeUrl(encodedUrl);
  }
  console.warn("Ultraviolet codec is not available. Make sure wk2.js is loaded first.");
  try {
    return decodeURIComponent(encodedUrl);
  } catch {
    return encodedUrl;
  }
}

if (browserToolbar && toolbarToggle) {
  toolbarToggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    const isExpanded = browserToolbar.classList.toggle("toolbar-expanded");
    toolbarToggle.classList.toggle("expanded", isExpanded);
    toolbarToggle.setAttribute("aria-expanded", String(isExpanded));
    toolbarToggle.setAttribute("aria-label", isExpanded ? "Collapse browser toolbar" : "Expand browser toolbar");
  });
}

function getBrowserFrame() {
  return document.getElementById("browserframe");
}

function waitForFrame(timeout = 10000) {
  return new Promise(function (resolve) {
    const existing = getBrowserFrame();
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(function () {
      const frame = getBrowserFrame();
      if (frame) {
        observer.disconnect();
        resolve(frame);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () {
      observer.disconnect();
      resolve(getBrowserFrame());
    }, timeout);
  });
}

function getBrowserHistory() {
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    if (!value) return [];
    const history = JSON.parse(value);
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveBrowserHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getHistoryIndex() {
  const value = localStorage.getItem(HISTORY_INDEX_KEY);
  if (value === null) return -1;
  const index = Number.parseInt(value, 10);
  return Number.isNaN(index) ? -1 : index;
}

function saveHistoryIndex(index) {
  localStorage.setItem(HISTORY_INDEX_KEY, String(index));
}

function updateButtons() {
  const history = getBrowserHistory();
  const index = getHistoryIndex();
  if (backBtn) backBtn.disabled = history.length === 0 || index <= 0;
  if (forwardBtn) forwardBtn.disabled = history.length === 0 || index < 0 || index >= history.length - 1;
}

function addToHistory(encodedUrl) {
  if (!encodedUrl) return;
  let history = getBrowserHistory();
  let index = getHistoryIndex();
  if (index >= 0 && index < history.length - 1) {
    history = history.slice(0, index + 1);
  }
  if (history.length === 0 || history[history.length - 1] !== encodedUrl) {
    history.push(encodedUrl);
  }
  index = history.length - 1;
  saveBrowserHistory(history);
  saveHistoryIndex(index);
  updateButtons();
}

function initializeHistory() {
  const target = localStorage.getItem(TARGET_URL);
  const history = getBrowserHistory();
  const index = getHistoryIndex();
  if (target && history.length === 0) {
    saveBrowserHistory([target]);
    saveHistoryIndex(0);
  } else if (target && (index < 0 || index >= history.length)) {
    const existingIndex = history.indexOf(target);
    if (existingIndex >= 0) {
      saveHistoryIndex(existingIndex);
    } else {
      history.push(target);
      saveBrowserHistory(history);
      saveHistoryIndex(history.length - 1);
    }
  }
}

async function loadEncodedUrl(encodedUrl, prefix) {
  if (!encodedUrl) return;
  localStorage.setItem(TARGET_URL, encodedUrl);
  const usePrefix = prefix || activePrefix();
  rememberPrefix(usePrefix);
  lastSyncedEncoded = encodedUrl;
  const frame = getBrowserFrame() || await waitForFrame();
  if (!frame) {
    console.warn("Could not find browserframe.");
    return;
  }
  frame.src = usePrefix + encodedUrl;
  if (browserUrl) {
    try {
      browserUrl.value = decodeUrl(encodedUrl);
    } catch {
      browserUrl.value = encodedUrl;
    }
  }
}

async function navigateTo(url) {
  if (!url) return;
  url = url.trim();
  if (!url) return;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  const encoded = encodeUrl(url);
  const prefix = await resolvePrefixForUrl(url);
  rememberPrefix(prefix);
  localStorage.setItem(TARGET_URL, encoded);
  addToHistory(encoded);
  await loadEncodedUrl(encoded, prefix);
}

if (backBtn) {
  backBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();
    const history = getBrowserHistory();
    let index = getHistoryIndex();
    if (history.length === 0 || index <= 0) {
      updateButtons();
      return;
    }
    index--;
    saveHistoryIndex(index);
    await loadEncodedUrl(history[index]);
    updateButtons();
  });
}

if (forwardBtn) {
  forwardBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();
    const history = getBrowserHistory();
    let index = getHistoryIndex();
    if (history.length === 0 || index < 0 || index >= history.length - 1) {
      updateButtons();
      return;
    }
    index++;
    saveHistoryIndex(index);
    await loadEncodedUrl(history[index]);
    updateButtons();
  });
}

if (reloadBtn) {
  reloadBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();
    const frame = getBrowserFrame() || await waitForFrame();
    if (!frame) return;
    try {
      frame.contentWindow.location.reload();
    } catch {
      const current = localStorage.getItem(TARGET_URL);
      if (current) frame.src = activePrefix() + current;
    }
  });
}

if (browserUrl) {
  browserUrl.addEventListener("keydown", async function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = browserUrl.value.trim();
    if (!value) return;
    let url;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      url = value;
    } else if (value.includes(".") && !value.includes(" ")) {
      url = "https://" + value;
    } else {
      url = "https://duckduckgo.com/?q=" + encodeURIComponent(value) + "&ia=web";
    }
    await navigateTo(url);
    browserUrl.blur();
  });
}

function updateBrowserUrl() {
  if (!browserUrl) return;
  if (document.activeElement === browserUrl) return;
  const storedUrl = localStorage.getItem(TARGET_URL);
  if (!storedUrl) return;
  try {
    const decoded = decodeUrl(storedUrl);
    if (decoded) browserUrl.value = decoded;
  } catch (error) {
    console.warn("Could not decode targeturl:", storedUrl, error);
  }
}

function extractEncodedUrl(frameUrl) {
  if (!frameUrl) return null;
  try {
    const absolute = new URL(frameUrl, window.location.origin);
    for (const prefix of [SERVICE_PREFIX, "/assignments/"]) {
      if (absolute.pathname.startsWith(prefix)) {
        const encoded = absolute.pathname.slice(prefix.length).split("/")[0];
        return encoded || null;
      }
    }
    for (const prefix of [SERVICE_PREFIX, "/assignments/"]) {
      const idx = frameUrl.indexOf(prefix);
      if (idx >= 0) {
        const encoded = frameUrl.slice(idx + prefix.length).split("/")[0].split("?")[0].split("#")[0];
        return encoded || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function getFrameEncodedUrl() {
  const frame = getBrowserFrame();
  if (!frame) return null;
  try {
    const href = frame.contentWindow && frame.contentWindow.location && frame.contentWindow.location.href;
    const fromHref = extractEncodedUrl(href);
    if (fromHref) return fromHref;
  } catch {
  }
  const srcAttr = frame.getAttribute("src") || frame.src;
  return extractEncodedUrl(srcAttr);
}

let lastSyncedEncoded = localStorage.getItem(TARGET_URL);

function syncFrameToUrl() {
  if (!browserUrl) {
    updateButtons();
    return;
  }
  const encoded = getFrameEncodedUrl();
  if (!encoded) {
    updateBrowserUrl();
    updateButtons();
    return;
  }
  if (encoded === lastSyncedEncoded) {
    updateButtons();
    return;
  }
  lastSyncedEncoded = encoded;
  localStorage.setItem(TARGET_URL, encoded);
  if (document.activeElement !== browserUrl) {
    try {
      browserUrl.value = decodeUrl(encoded);
    } catch {
      browserUrl.value = encoded;
    }
  }
  const history = getBrowserHistory();
  const index = getHistoryIndex();
  if (history[index] !== encoded) {
    addToHistory(encoded);
  } else {
    updateButtons();
  }
}

initializeHistory();
updateBrowserUrl();
updateButtons();

waitForFrame().then(function (frame) {
  if (!frame) return;
  const target = localStorage.getItem(TARGET_URL);
  lastSyncedEncoded = target;
  const prefix = activePrefix();
  if (target && frame.getAttribute("src") !== prefix + target) {
    frame.src = prefix + target;
  }
  updateBrowserUrl();
  updateButtons();
});

const menuBtn = document.getElementById("menu-btn");
const toolbarMenu = document.getElementById("toolbar-menu");
const menuReturn = document.getElementById("menu-return");
const menuCloak = document.getElementById("menu-cloak");
const menuFullscreen = document.getElementById("menu-fullscreen");

function isToolbarMenuOpen() {
  return Boolean(toolbarMenu) && !toolbarMenu.hasAttribute("hidden");
}

function openToolbarMenu() {
  if (!toolbarMenu || !menuBtn) return;
  toolbarMenu.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
}

function closeToolbarMenu() {
  if (!toolbarMenu || !menuBtn) return;
  toolbarMenu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}

function cloakSite() {
  const origin = window.location.origin;
  const safeOrigin = String(origin).replace(/"/g, "");
  const popup = window.open("about:blank", "_blank");
  if (!popup) return;
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
    try {
      popup.focus();
    } catch {}
  } catch (error) {
    console.warn("Could not cloak site:", error);
  }
  window.location.replace("https://www.google.com");
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch (error) {
    console.warn("Could not toggle fullscreen:", error);
  }
}

if (menuBtn && toolbarMenu) {
  menuBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (isToolbarMenuOpen()) {
      closeToolbarMenu();
    } else {
      openToolbarMenu();
    }
  });

  document.addEventListener("click", function (event) {
    if (!isToolbarMenuOpen()) return;
    if (event.target.closest && event.target.closest("#toolbar-menu, #menu-btn")) return;
    closeToolbarMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isToolbarMenuOpen()) {
      event.stopPropagation();
      closeToolbarMenu();
      menuBtn.focus();
    }
  });
}

if (menuReturn) {
  menuReturn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    window.location.href = "/";
  });
}

if (menuCloak) {
  menuCloak.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    cloakSite();
  });
}

if (menuFullscreen) {
  menuFullscreen.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    toggleFullscreen();
  });
}

setInterval(function () {
  syncFrameToUrl();
}, 1000);