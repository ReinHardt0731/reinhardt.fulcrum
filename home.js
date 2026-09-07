import { initHomePage } from "./shared.js";

if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

let homeScrollFrame = 0;

function scrollHomeToTop() {
    cancelAnimationFrame(homeScrollFrame);
    const start = window.scrollY || document.documentElement.scrollTop || 0;
    if (start <= 1) {
        window.scrollTo(0, 0);
        return;
    }
    const startedAt = performance.now();
    const duration = 900;
    const animate = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        window.scrollTo(0, Math.round(start * (1 - eased)));
        if (progress < 1) {
            homeScrollFrame = requestAnimationFrame(animate);
        }
    };
    homeScrollFrame = requestAnimationFrame(animate);
}

window.addEventListener("pageshow", () => window.setTimeout(scrollHomeToTop, 120));

document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(scrollHomeToTop, 120);
    initHomePage();
});
