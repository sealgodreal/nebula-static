const nebulaSubtexts = [
    "usenebula.netlify.app",
    "join our discord! (.gg/gCTFQZK6C6)",
    "sub to our youtube! (@nebulaunblocking)",
    "follow our tiktok! (@nebulaunbl0cking)",
    "best unblocker!",
    "nebula on top",
    "sudo rm -rf --no-preserve-root /*",
    "sudo apt install opsec",
];

const subtitle = document.getElementById("nebula-subtitle");
let subtitleIndex = Math.floor(Math.random() * nebulaSubtexts.length);
subtitle.textContent = nebulaSubtexts[subtitleIndex];
subtitle.addEventListener("click", () => {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * nebulaSubtexts.length);
    } while (newIndex === subtitleIndex && nebulaSubtexts.length > 1);
    subtitleIndex = newIndex;
    subtitle.style.opacity = "0";
    setTimeout(() => {
        subtitle.textContent = nebulaSubtexts[subtitleIndex];
        subtitle.style.opacity = "1";
    }, 150);
});