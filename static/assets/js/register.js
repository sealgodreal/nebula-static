const stockSW = "/uv/sw.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];
const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

async function registerSW() {
  if (!navigator.serviceWorker) {
    if (
      location.protocol !== "https:" &&
      !swAllowedHostnames.includes(location.hostname)
    )
      throw new Error("Service workers cannot be registered without https.");

    throw new Error("Your browser doesn't support service workers.");
  }

  if (typeof nebulaSetTransport === "function") {
    await nebulaSetTransport(connection, wispUrl);
  } else {
    try {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    } catch (err) {
      console.warn("Epoxy failed on home page, trying libcurl fallback:", err);
      await connection.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
    }
  }
  await window.navigator.serviceWorker.register("/sw.js", {
    scope: '/service/',
  });
  await window.navigator.serviceWorker.register("/lab.js", {
    scope: '/assignments/',
  });
}

registerSW();