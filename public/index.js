"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

function getUrl(input) {
	input = input.trim();

	if (!input) return null;

	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
		return input;
	}

	if (input.startsWith("localhost")) {
		return "http://" + input;
	}

	if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/i.test(input)) {
		return "http://" + input;
	}

	if (
		/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#].*)?$/i.test(input)
	) {
		return "https://" + input;
	}

	return search(input, searchEngine.value);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	error.textContent = "";
	errorCode.textContent = "";

	const input = address.value.trim();

	if (!input) return;

	try {
		await registerSW();

		const url = getUrl(input);

		const wispUrl =
			(location.protocol === "https:" ? "wss" : "ws") +
			"://" +
			location.host +
			"/wisp/";

		if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
			await connection.setTransport("/libcurl/index.mjs", [
				{ websocket: wispUrl },
			]);
		}

		const oldFrame = document.getElementById("sj-frame");

		if (oldFrame) {
			oldFrame.remove();
		}

		const frame = scramjet.createFrame();
		frame.frame.id = "sj-frame";
		frame.frame.style.position = "fixed";
		frame.frame.style.left = "0";
		frame.frame.style.top = "0";
		frame.frame.style.width = "100vw";
		frame.frame.style.height = "100vh";
		frame.frame.style.minWidth = "100vw";
		frame.frame.style.minHeight = "100vh";
		frame.frame.style.border = "none";
		frame.frame.style.margin = "0";
		frame.frame.style.padding = "0";
		frame.frame.style.zIndex = "99999";
		frame.frame.style.backgroundColor = "#0e0e0e";
		document.body.appendChild(frame.frame);
		await frame.go(url);

	} catch (err) {
		error.textContent = "Failed to load page.";
		errorCode.textContent =
			err?.stack || err?.toString() || String(err);
	}
});