(() => {
    const STORAGE_KEY = "prepcore.web.pomodoro.v1";
    const DAILY_HISTORY_KEY = "prepcore.web.pomodoroHistory.v1";
    const DEFAULT_FOCUS_SECONDS = 25 * 60;
    const DEFAULT_BREAK_SECONDS = 5 * 60;
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
        lastTick: null
    };
    let state = { ...defaults };
    let intervalId = null;

    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved && (saved.phase === "focus" || saved.phase === "break")) {
            state = {
                phase: saved.phase,
                focusSeconds: Math.min(120, Math.max(1, Number(saved.focusSeconds) || DEFAULT_FOCUS_SECONDS / 60)) * 60,
                breakSeconds: Math.min(120, Math.max(1, Number(saved.breakSeconds) || DEFAULT_BREAK_SECONDS / 60)) * 60,
                remaining: Math.max(0, Number(saved.remaining) || 0),
                running: Boolean(saved.running),
                lastTick: Number(saved.lastTick) || null
            };
        }
    } catch {
        state = { ...defaults };
    }

    const phaseDuration = () => state.phase === "focus" ? state.focusSeconds : state.breakSeconds;
    const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

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
            widget.querySelector("[data-pomodoro-toggle]").textContent = state.running ? "Pause" : "Start";
        });
        document.title = state.running ? `${formatTime(state.remaining)} | PrepCore` : document.title.replace(/^\d{2}:\d{2} \| /, "");
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
        widget.querySelector("[data-pomodoro-settings]").setAttribute("aria-expanded", "false");
    }

    function openSettings(widget) {
        widget.querySelector("[data-pomodoro-focus]").value = Math.round(state.focusSeconds / 60);
        widget.querySelector("[data-pomodoro-break]").value = Math.round(state.breakSeconds / 60);
        widget.querySelector("[data-pomodoro-settings-panel]").hidden = false;
        widget.querySelector("[data-pomodoro-settings]").setAttribute("aria-expanded", "true");
    }

    function saveSettings(widget, event) {
        event.preventDefault();
        const focusMinutes = Number(widget.querySelector("[data-pomodoro-focus]").value);
        const breakMinutes = Number(widget.querySelector("[data-pomodoro-break]").value);
        if (!Number.isInteger(focusMinutes) || !Number.isInteger(breakMinutes) || focusMinutes < 1 || focusMinutes > 120 || breakMinutes < 1 || breakMinutes > 120) {
            return;
        }
        state.focusSeconds = focusMinutes * 60;
        state.breakSeconds = breakMinutes * 60;
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
    });

    if (state.running) {
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
