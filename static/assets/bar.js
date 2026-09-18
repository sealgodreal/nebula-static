const browserUrl = document.getElementById("browser-url");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const reloadBtn = document.getElementById("reload-btn");
const browserToolbar = document.getElementById("browser-toolbar");
const toolbarToggle = document.getElementById("toolbar-toggle");

if (browserToolbar && toolbarToggle) {
	toolbarToggle.addEventListener("click", () => {
		const isExpanded = browserToolbar.classList.toggle("toolbar-expanded");

		toolbarToggle.classList.toggle("expanded", isExpanded);

		toolbarToggle.setAttribute(
			"aria-expanded",
			String(isExpanded)
		);

		toolbarToggle.setAttribute(
			"aria-label",
			isExpanded
				? "Collapse browser toolbar"
				: "Expand browser toolbar"
		);
	});
}

function getBrowserFrame() {
	return document.getElementById("sj-frame");
}

function navigateTo(url) {
	const frame = getBrowserFrame();
	if (!frame || !url) return;
	if (
		!url.startsWith("http://") &&
		!url.startsWith("https://")
	) {
		url = "https://" + url;
	}
	const encodedUrl = encodeURIComponent(url);
	const scramjetUrl =
		window.location.origin +
		"/scramjet/" +
		encodedUrl;
	frame.src = scramjetUrl;
}

if (backBtn) {
	backBtn.addEventListener("click", () => {
		const frame = getBrowserFrame();

		if (frame && frame.contentWindow) {
			frame.contentWindow.history.back();
		}
	});
}

if (forwardBtn) {
	forwardBtn.addEventListener("click", () => {
		const frame = getBrowserFrame();

		if (frame && frame.contentWindow) {
			frame.contentWindow.history.forward();
		}
	});
}

if (reloadBtn) {
	reloadBtn.addEventListener("click", () => {
		const frame = getBrowserFrame();

		if (frame) {
			frame.src = frame.src;
		}
	});
}

if (browserUrl) {
	browserUrl.addEventListener("keydown", (event) => {
		if (event.key !== "Enter") return;
		const value = browserUrl.value.trim();
		if (!value) return;
		let url;
		if (
			value.startsWith("http://") ||
			value.startsWith("https://")
		) {
			url = value;
		}
		else if (
			value.includes(".") &&
			!value.includes(" ")
		) {
			url = "https://" + value;
		}
		else {
			url =
				"https://duckduckgo.com/?q=" +
				encodeURIComponent(value) +
				"&ia=web";
		}
		navigateTo(url);
		browserUrl.blur();
	});
}

setInterval(() => {
	const frame = getBrowserFrame();
	if (!frame || !browserUrl) return;
	if (document.activeElement === browserUrl) return;
	const src = frame.getAttribute("src");
	if (!src) return;
	const scramjetMarker = "/scramjet/";
	const scramjetIndex = src.indexOf(scramjetMarker);
	if (scramjetIndex === -1) return;
	const encodedUrl = src.substring(
		scramjetIndex + scramjetMarker.length
	);
	try {
		const decodedUrl = decodeURIComponent(encodedUrl);
		browserUrl.value = decodedUrl;
	} catch (error) {
		console.warn(
			"Could not decode Scramjet URL:",
			encodedUrl
		);
	}
}, 500);