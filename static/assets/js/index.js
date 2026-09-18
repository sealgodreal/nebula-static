document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("form");
    const addressInput = document.getElementById("address");
    const browserUrlInput = document.getElementById("browser-url");

    const backBtn = document.getElementById("back-btn");
    const forwardBtn = document.getElementById("forward-btn");
    const reloadBtn = document.getElementById("reload-btn");

    let proxyFrame = null;

    addressInput.addEventListener("input", () => {
        browserUrlInput.value = addressInput.value;
    });

    browserUrlInput.addEventListener("input", () => {
        addressInput.value = browserUrlInput.value;
    });

    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await loadUrl(addressInput.value);
    });

    browserUrlInput.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            await loadUrl(browserUrlInput.value);
        }
    });

    backBtn.addEventListener("click", () => {
        if (!proxyFrame) return;

        try {
            proxyFrame.contentWindow.history.back();
        } catch (error) {
            console.error("Unable to go back:", error);
        }
    });

    forwardBtn.addEventListener("click", () => {
        if (!proxyFrame) return;

        try {
            proxyFrame.contentWindow.history.forward();
        } catch (error) {
            console.error("Unable to go forward:", error);
        }
    });

    reloadBtn.addEventListener("click", () => {
        if (!proxyFrame) return;

        try {
            proxyFrame.contentWindow.location.reload();
        } catch (error) {
            proxyFrame.src = proxyFrame.src;
        }
    });

    async function loadUrl(input) {
        let url = input.trim();

        if (!url) return;

        if (!isUrl(url)) {
            url =
                "https://duckduckgo.com/?q=" +
                encodeURIComponent(url) +
                "&ia=web";
        }

        else if (
            !url.startsWith("https://") &&
            !url.startsWith("http://")
        ) {
            url = "https://" + url;
        }

        addressInput.value = url;
        browserUrlInput.value = url;

        try {
            await navigator.serviceWorker.register("/lab.js", {
                scope: "/service/",
            });
        } catch (error) {
            console.error("Service worker registration failed:", error);
        }

        proxyFrame = document.getElementById("theiframe");

        if (!proxyFrame) {
            proxyFrame = document.createElement("iframe");

            proxyFrame.id = "theiframe";

            Object.assign(proxyFrame.style, {
                position: "fixed",
                left: "0",
                top: "0",
                width: "100vw",
                height: "100vh",
                border: "none",
                margin: "0",
                padding: "0",
                zIndex: "99999",
                background: "#0e0e0e",
            });

            proxyFrame.setAttribute("allowfullscreen", "true");

            document.body.appendChild(proxyFrame);

            proxyFrame.addEventListener("load", updateNavigationState);
        }

        const encodedUrl = __uv$config.encodeUrl(url);

        const proxyUrl =
            window.location.origin +
            "/service/" +
            encodedUrl;

        proxyFrame.src = proxyUrl;

        updateNavigationState();
    }

    function updateNavigationState() {
        if (!proxyFrame) return;

        try {
            const history = proxyFrame.contentWindow.history;

            backBtn.disabled = history.length <= 1;

            forwardBtn.disabled = false;
        } catch (error) {
            backBtn.disabled = true;
            forwardBtn.disabled = true;
        }

        try {
            const currentUrl = proxyFrame.contentWindow.location.href;

            if (
                currentUrl &&
                currentUrl.startsWith(window.location.origin + "/service/")
            ) {
                const encoded = currentUrl.substring(
                    (window.location.origin + "/service/").length
                );

                if (
                    window.__uv$config &&
                    typeof window.__uv$config.decodeUrl === "function"
                ) {
                    const decodedUrl = __uv$config.decodeUrl(encoded);

                    if (decodedUrl) {
                        addressInput.value = decodedUrl;
                        browserUrlInput.value = decodedUrl;
                    }
                }
            }
        } catch (error) {
        }
    }

    function isUrl(value = "") {
        value = value.trim();

        if (/^https?:\/\/\S+$/i.test(value)) {
            return true;
        }

        return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(value);
    }

    backBtn.disabled = true;
    forwardBtn.disabled = true;
});