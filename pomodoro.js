(() => {
    const STORAGE_KEY = "prepcore.web.pomodoro.v1";
    const DAILY_HISTORY_KEY = "prepcore.web.pomodoroHistory.v1";
    const DEFAULT_FOCUS_SECONDS = 25 * 60;
    const DEFAULT_BREAK_SECONDS = 5 * 60;
    const isExamPage = document.body.classList.contains("mode-exam");
    const isPlannerPage = document.body.classList.contains("planner-page");
    const widgets = document.querySelectorAll("[data-pomodoro]");
    if (!widgets.length) {
        return;
    }
    const alarm = new Audio("asset/alarm.mp3");
    alarm.preload = "auto";
    alarm.volume = 0.75;

    const defaults = {
        phase: "focus",
        focusSeconds: DEFAULT_FOCUS_SECONDS,
        breakSeconds: DEFAULT_BREAK_SECONDS,
        remaining: DEFAULT_FOCUS_SECONDS,
        running: false,
        lastTick: null,
        resumeAfterExam: false
    };
    let state = { ...defaults };
    let intervalId = null;
    const restoreDuration = (seconds, fallback) => {
        const value = Number(seconds);
        return Number.isFinite(value) && value > 0
            ? Math.round(Math.min(24 * 60 * 60, Math.max(60, value)))
            : fallback;
    };

    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved && (saved.phase === "focus" || saved.phase === "break")) {
            state = {
                phase: saved.phase,
                focusSeconds: restoreDuration(saved.focusSeconds, DEFAULT_FOCUS_SECONDS),
                breakSeconds: restoreDuration(saved.breakSeconds, DEFAULT_BREAK_SECONDS),
                remaining: Math.max(0, Number(saved.remaining) || 0),
                running: Boolean(saved.running),
                lastTick: Number(saved.lastTick) || null,
                resumeAfterExam: Boolean(saved.resumeAfterExam)
            };
        }
    } catch {
        state = { ...defaults };
    }

    const phaseDuration = () => state.phase === "focus" ? state.focusSeconds : state.breakSeconds;
    const formatTime = (seconds) => {
        const totalSeconds = Math.max(0, Math.floor(seconds));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const remainingSeconds = totalSeconds % 60;
        return hours > 0
            ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
            : `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function dateKey(value) {
        const date = new Date(value);
        return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
    }

    function recordFocusElapsed(startTime, elapsedSeconds) {
        if (state.phase !== "focus" || elapsedSeconds <= 0) {
            return;
        }
        let history;
        try {
            history = JSON.parse(localStorage.getItem(DAILY_HISTORY_KEY) || "{}");
        } catch {
            history = {};
        }
        let cursor = startTime;
        let remaining = elapsedSeconds;
        while (remaining > 0) {
            const currentDate = new Date(cursor);
            const nextDay = new Date(currentDate);
            nextDay.setHours(24, 0, 0, 0);
            const secondsUntilNextDay = Math.max(1, Math.ceil((nextDay.getTime() - cursor) / 1000));
            const chunk = Math.min(remaining, secondsUntilNextDay);
            const key = dateKey(cursor);
            history[key] = Math.max(0, Number(history[key]) || 0) + chunk;
            cursor += chunk * 1000;
            remaining -= chunk;
        }
        localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
    }

    function render() {
        const phaseLabel = state.phase === "focus" ? "Focus" : "Break";
        widgets.forEach((widget) => {
            widget.dataset.phase = state.phase;
            widget.classList.toggle("is-running", state.running);
            widget.querySelector("[data-pomodoro-phase]").textContent = phaseLabel;
            widget.querySelector("[data-pomodoro-time]").textContent = formatTime(state.remaining);
            const toggle = widget.querySelector("[data-pomodoro-toggle]");
            const actionLabel = state.running ? "Pause" : "Start";
            toggle.dataset.running = String(state.running);
            toggle.setAttribute("aria-label", `${actionLabel} Pomodoro timer`);
            toggle.title = `${actionLabel} timer`;
            if (!toggle.querySelector(".pomodoro-control-icon")) {
                toggle.textContent = actionLabel;
            }
            if (widget.classList.contains("planner-pomodoro")) {
                const browserFullscreen = widget.querySelector("[data-pomodoro-browser-fullscreen]");
                const isBrowserFullscreen = document.fullscreenElement === widget;
                const browserFullscreenLabel = isBrowserFullscreen ? "Exit browser fullscreen" : "Enter browser fullscreen";
                browserFullscreen.dataset.browserFullscreen = String(isBrowserFullscreen);
                browserFullscreen.setAttribute("aria-label", browserFullscreenLabel);
                browserFullscreen.title = browserFullscreenLabel;
            }
        });
        document.title = state.running ? `${formatTime(state.remaining)} | PrepCore` : document.title.replace(/^(?:\d{2,}:)?\d{2}:\d{2} \| /, "");
    }

    function playAlarm() {
        alarm.currentTime = 0;
        const playback = alarm.play();
        if (playback) {
            playback.catch(() => {});
        }
    }

    function switchPhase(shouldPlayAlarm = true) {
        state.phase = state.phase === "focus" ? "break" : "focus";
        state.remaining = phaseDuration();
        state.running = false;
        state.lastTick = null;
        stop();
        save();
        render();
        if (shouldPlayAlarm) {
            playAlarm();
        }
    }

    function tick() {
        if (!state.running || !state.lastTick) {
            return;
        }
        const elapsed = Math.floor((Date.now() - state.lastTick) / 1000);
        if (elapsed < 1) {
            return;
        }
        recordFocusElapsed(state.lastTick, elapsed);
        state.remaining -= elapsed;
        state.lastTick += elapsed * 1000;
        if (state.remaining <= 0) {
            switchPhase();
            return;
        }
        save();
        render();
    }

    function start() {
        if (state.remaining <= 0) {
            state.remaining = phaseDuration();
        }
        state.running = true;
        state.lastTick = Date.now();
        save();
        render();
        stop();
        intervalId = window.setInterval(tick, 1000);
    }

    function stop() {
        if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
        }
    }

    function pause() {
        tick();
        state.running = false;
        state.lastTick = null;
        save();
        render();
        stop();
    }

    function reset() {
        state = { ...defaults };
        save();
        render();
        stop();
    }

    function closeSettings(widget) {
        widget.querySelector("[data-pomodoro-settings-panel]").hidden = true;
        const button = widget.querySelector("[data-pomodoro-settings]");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Open timer settings");
        button.title = "Open timer settings";
    }

    function openSettings(widget) {
        if (widget.querySelector("[data-pomodoro-hours]")) {
            [
                ["focus", state.focusSeconds],
                ["break", state.breakSeconds]
            ].forEach(([phase, seconds]) => {
                widget.querySelector(`[data-pomodoro-${phase}-hours]`).value = Math.floor(seconds / 3600);
                widget.querySelector(`[data-pomodoro-${phase}-minutes]`).value = Math.floor((seconds % 3600) / 60);
            });
        } else {
            widget.querySelector("[data-pomodoro-focus]").value = Math.round(state.focusSeconds / 60);
            widget.querySelector("[data-pomodoro-break]").value = Math.round(state.breakSeconds / 60);
        }
        widget.querySelector("[data-pomodoro-settings-panel]").hidden = false;
        const button = widget.querySelector("[data-pomodoro-settings]");
        button.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-label", "Close timer settings");
        button.title = "Close timer settings";
    }

    function saveSettings(widget, event) {
        event.preventDefault();
        if (widget.querySelector("[data-pomodoro-hours]")) {
            const durations = ["focus", "break"].map((phase) => {
                const hoursInput = widget.querySelector(`[data-pomodoro-${phase}-hours]`);
                const minutesInput = widget.querySelector(`[data-pomodoro-${phase}-minutes]`);
                const hours = Number(hoursInput.value);
                const minutes = Number(minutesInput.value);
                const valid = Number.isInteger(hours) && Number.isInteger(minutes)
                    && hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59
                    && hours * 60 + minutes >= 1 && hours * 60 + minutes <= 24 * 60;
                hoursInput.setCustomValidity(valid ? "" : "Enter a duration from 00:01 to 24:00.");
                return valid ? (hours * 60 + minutes) * 60 : null;
            });
            if (durations.some((duration) => duration === null)) {
                widget.querySelector("[data-pomodoro-settings-panel]").reportValidity();
                return;
            }
            state.focusSeconds = durations[0];
            state.breakSeconds = durations[1];
        } else {
            const focusMinutes = Number(widget.querySelector("[data-pomodoro-focus]").value);
            const breakMinutes = Number(widget.querySelector("[data-pomodoro-break]").value);
            if (!Number.isInteger(focusMinutes) || !Number.isInteger(breakMinutes) || focusMinutes < 1 || focusMinutes > 120 || breakMinutes < 1 || breakMinutes > 120) {
                return;
            }
            state.focusSeconds = focusMinutes * 60;
            state.breakSeconds = breakMinutes * 60;
        }
        state.remaining = phaseDuration();
        state.running = false;
        state.lastTick = null;
        stop();
        save();
        render();
        closeSettings(widget);
    }

    widgets.forEach((widget) => {
        widget.querySelector("[data-pomodoro-toggle]").addEventListener("click", () => {
            if (state.running) {
                pause();
            } else {
                start();
            }
        });
        widget.querySelector("[data-pomodoro-reset]").addEventListener("click", reset);
        widget.querySelector("[data-pomodoro-settings]").addEventListener("click", () => {
            const panel = widget.querySelector("[data-pomodoro-settings-panel]");
            if (panel.hidden) {
                openSettings(widget);
            } else {
                closeSettings(widget);
            }
        });
        widget.querySelector("[data-pomodoro-settings-panel]").addEventListener("submit", (event) => saveSettings(widget, event));
        widget.querySelector("[data-pomodoro-cancel]").addEventListener("click", () => closeSettings(widget));
        if (isPlannerPage && widget.classList.contains("planner-pomodoro")) {
            let keepOverlayOnBrowserExit = false;
            let fullscreenPlaceholder = null;
            ["focus", "break"].forEach((phase) => {
                const hoursInput = widget.querySelector(`[data-pomodoro-${phase}-hours]`);
                const minutesInput = widget.querySelector(`[data-pomodoro-${phase}-minutes]`);
                [hoursInput, minutesInput].forEach((input) => input.addEventListener("input", () => {
                    hoursInput.setCustomValidity("");
                }));
            });
            const setExpanded = (expanded) => {
                if (expanded && !fullscreenPlaceholder) {
                    fullscreenPlaceholder = document.createComment("Planner timer position");
                    widget.parentNode.insertBefore(fullscreenPlaceholder, widget);
                    document.body.appendChild(widget);
                } else if (!expanded && fullscreenPlaceholder) {
                    fullscreenPlaceholder.parentNode.insertBefore(widget, fullscreenPlaceholder);
                    fullscreenPlaceholder.remove();
                    fullscreenPlaceholder = null;
                }
                widget.classList.toggle("is-fullscreen", expanded);
                widget.querySelector("[data-pomodoro-expand]").hidden = expanded;
                widget.querySelector("[data-pomodoro-browser-fullscreen]").hidden = !expanded;
                widget.querySelector("[data-pomodoro-close]").hidden = !expanded;
                if (expanded) {
                    closeSettings(widget);
                }
            };
            widget.querySelector("[data-pomodoro-expand]").addEventListener("click", () => setExpanded(true));
            widget.querySelector("[data-pomodoro-close]").addEventListener("click", async () => {
                if (document.fullscreenElement === widget && document.exitFullscreen) {
                    try { await document.exitFullscreen(); } catch {}
                }
                setExpanded(false);
            });
            widget.querySelector("[data-pomodoro-browser-fullscreen]").addEventListener("click", async () => {
                try {
                    if (document.fullscreenElement === widget) {
                        keepOverlayOnBrowserExit = true;
                        await document.exitFullscreen();
                    } else if (widget.requestFullscreen) {
                        await widget.requestFullscreen();
                    }
                } catch {
                    // The in-page fullscreen view remains available if browser fullscreen is blocked.
                }
                render();
            });
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && widget.classList.contains("is-fullscreen")) {
                    if (document.fullscreenElement === widget && document.exitFullscreen) {
                        document.exitFullscreen().catch(() => {});
                    }
                    setExpanded(false);
                }
            });
            document.addEventListener("fullscreenchange", () => {
                if (document.fullscreenElement !== widget && widget.dataset.browserFullscreen === "true") {
                    widget.dataset.browserFullscreen = "false";
                    if (!keepOverlayOnBrowserExit) {
                        setExpanded(false);
                    }
                    keepOverlayOnBrowserExit = false;
                } else {
                    widget.dataset.browserFullscreen = String(document.fullscreenElement === widget);
                }
                render();
            });
        }
    });

    if (isExamPage && state.running) {
        const now = Date.now();
        const elapsed = Math.min(
            Math.max(0, Math.floor((now - (state.lastTick || now)) / 1000)),
            state.remaining
        );
        recordFocusElapsed(state.lastTick || now, elapsed);
        state.remaining = Math.max(0, state.remaining - elapsed);
        state.resumeAfterExam = state.remaining > 0;
        state.running = false;
        state.lastTick = null;
        if (state.remaining <= 0) {
            state.resumeAfterExam = false;
            switchPhase(false);
        } else {
            save();
        }
    } else if (isExamPage) {
        // If the exam page reloads while paused, keep the resume marker intact.
        state.running = false;
        state.lastTick = null;
        save();
    } else if (state.resumeAfterExam) {
        state.resumeAfterExam = false;
        state.running = true;
        state.lastTick = Date.now();
        save();
        intervalId = window.setInterval(tick, 1000);
    } else if (state.running) {
        const elapsed = Math.floor((Date.now() - (state.lastTick || Date.now())) / 1000);
        recordFocusElapsed(state.lastTick || Date.now(), elapsed);
        state.remaining -= elapsed;
        state.lastTick = Date.now();
        if (state.remaining <= 0) {
            switchPhase(false);
        } else {
            intervalId = window.setInterval(tick, 1000);
        }
    }
    render();
})();
