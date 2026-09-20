window.onload = async function () {
  let scope;
  try {
    if (location.hostname.endsWith(".vercel.app")) {
      localStorage.setItem("isVercel", "true");
    }
  } catch {
  }
  const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  const allowedHosts = ["localhost", "127.0.0.1"];
  function isMobile() {
    return /android|iphone|kindle|ipad/i.test(navigator.userAgent);
  }
  function isVercelHost() {
    return location.hostname.endsWith(".vercel.app") || localStorage.getItem("isVercel") === "true";
  }
  function createDomainRegex(domains) {
    const escapedDomains = domains.map((domain) => domain.replace(/\./g, "\\."));
    return new RegExp(escapedDomains.join("|") + "(?=[/\\s]|$)", "i");
  }
  async function resolveScope() {
    if (isMobile() || isVercelHost()) {
      return "/assignments/";
    }
    try {
      const response = await fetch("/data/b-list.json");
      const data = await response.json();
      const domains = data.domains || data;
      const domainRegex = createDomainRegex(domains);
      const stored = localStorage.getItem("targeturl");
      let decoded = stored || "";
      try {
        if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
          decoded = Ultraviolet.codec.xor.decode(stored);
        }
      } catch {
        decoded = stored || "";
      }
      if (decoded && domainRegex.test(decoded)) {
        return "/assignments/";
      }
    } catch (error) {
      console.warn("Could not resolve proxy scope, defaulting to /service/:", error);
    }
    return "/service/";
  }
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Your browser doesn't support service workers.");
    }
    if (location.protocol !== "https:" && !allowedHosts.includes(location.hostname)) {
      throw new Error("Service works cannot be registered without https.");
    }
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    await navigator.serviceWorker.register("/sw.js", { scope: "/service/" });
    await navigator.serviceWorker.register("/lab.js", { scope: "/assignments/" });
    scope = await resolveScope();
  }
  function loadFrame() {
    const targetUrl = localStorage.getItem("targeturl");
    if (!targetUrl) {
      console.warn("No targeturl found in localStorage.");
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.name = "theiframe";
    iframe.id = "browserframe";
    iframe.setAttribute("sandbox", [
      "allow-scripts",
      "allow-same-origin",
      "allow-forms",
      "allow-pointer-lock",
      "allow-orientation-lock",
      "allow-modals",
      "allow-top-navigation",
      "allow-downloads"
    ].join(" "));
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100vh";
    iframe.style.height = "100dvh";
    iframe.style.border = "none";
    iframe.style.zIndex = "99999";
    iframe.style.display = "block";
    iframe.style.touchAction = "auto";
    document.body.appendChild(iframe);
    const useScope = scope || "/service/";
    try {
      localStorage.setItem("proxyScope", useScope);
    } catch {
    }
    iframe.src = useScope + targetUrl;
  }
  try {
    await registerServiceWorker();
    loadFrame();
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
};