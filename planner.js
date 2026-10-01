import { AELE_SCHEDULE, EXAM_DATE, SETUP_TASKS } from "./planner-schedule.js?v=planner-v2";

const STORAGE_KEY = "prepcore.web.planner.v1";
const POMODORO_HISTORY_KEY = "prepcore.web.pomodoroHistory.v1";
const FIRST_DATE = "2026-09-28";
const LAST_DATE = "2026-11-08";
const scheduleByDate = new Map(AELE_SCHEDULE.map((day) => [day.date, day]));
const setupByDate = new Map(SETUP_TASKS.map((day) => [day.date, day]));
const WEEK_COLOR_CLASSES = ["", "mathematics", "aerodynamics", "structures-powerplant", "acrm-air-laws", "final-review"];
const $ = (id) => document.getElementById(id);
let selectedDate = "";
let saved;
try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { saved = {}; }
const state = saved && typeof saved === "object" ? saved : {};
state.days = state.days && typeof state.days === "object" ? state.days : {};

function keyOf(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function dateOf(key) {
    const bits = key.split("-").map(Number);
    return new Date(bits[0], bits[1] - 1, bits[2]);
}
function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Keep the checklist usable without storage. */ }
}
function modelOf(key) {
    const setup = setupByDate.get(key);
    if (setup) return {
        date: key, subject: "Setup week", weekLabel: "Prepare for the review cycle", isSetup: true,
        tasks: [{ id: "setup", time: "Setup week", start: 8, duration: 1.5, label: "Get ready", title: "Setup checklist", detail: setup.text, reference: "AELE Last Blast setup list" }]
    };
    const day = scheduleByDate.get(key);
    if (!day) return null;
    const sunday = dateOf(key).getDay() === 0;
    const examEve = key === "2026-11-08";
    const tasks = [
        { id: "formula", time: "6:00–7:00 AM", start: 6, duration: 1, label: "Formula drill", title: "Formula drill", detail: day.formula, reference: "Formula sheets" },
        { id: "breakfast", time: "7:00–8:00 AM", start: 7, duration: 1, label: "Breakfast & get ready", title: "Breakfast & get ready", detail: "Eat breakfast and set up your study materials." },
        { id: "block-1", time: "8:00–11:30 AM", start: 8, duration: 3.5, label: "Block A", ...day.blocks[0] },
        { id: "lunch", time: "11:30 AM–1:00 PM", start: 11.5, duration: 1.5, label: "Lunch & short nap", title: "Lunch & short nap", detail: "Take your lunch break and a short nap." },
        { id: "block-2", time: "1:00–4:30 PM", start: 13, duration: 3.5, label: "Block B", ...day.blocks[1] },
        { id: "exercise", time: "4:30–6:30 PM", start: 16.5, duration: 2, label: "Exercise & dinner", title: "Exercise & dinner", detail: "Get some exercise, then have dinner." },
        { id: "block-3", time: "6:30–9:00 PM", start: 18.5, duration: 2.5, label: "Block C", ...day.blocks[2] }
    ];
    if (examEve) {
        tasks.push({ id: "night-review", time: "9:00–9:30 PM", start: 21, duration: 0.5, label: "Final prep", title: "Confirm exam-day setup", detail: "Check your Notice of Admission, testing center, reporting time, allowed items, route, and supplies." });
    } else {
        tasks.push({ id: "night-review", time: "9:00–9:30 PM", start: 21, duration: 0.5, label: "Error log", title: "Update error log & set out materials", detail: "Log today’s misses and set out tomorrow’s materials." });
        tasks.push({ id: "formula-flip", time: "9:30–10:00 PM", start: 21.5, duration: 0.5, label: "Formula flip", title: "Formula flip for tomorrow", detail: "Spend 30 minutes reviewing formula sheets for tomorrow’s subjects." });
    }
    tasks.push({ id: "sleep", time: examEve ? "By 9:30 PM" : "By 10:30 PM", start: examEve ? 21.5 : 22, duration: 0.5, label: "Sleep", title: examEve ? "Lights out by 9:30 PM" : "Wind down & sleep", detail: examEve ? "Everything is packed. Set two alarms and rest." : "Wind down and aim to sleep by 10:30 PM." });
    return { ...day, tasks, weekLabel: "Week " + day.week + " · " + day.subject, isSetup: false };
}
function checkedFor(key) { return state.days[key]?.checked || {}; }
function counts(key) {
    const model = modelOf(key);
    const done = model ? model.tasks.filter((task) => checkedFor(key)[task.id]).length : 0;
    return { total: model?.tasks.length || 0, done };
}
function allDates() {
    const dates = [];
    const cursor = dateOf(FIRST_DATE);
    const end = dateOf(LAST_DATE);
    while (cursor <= end) {
        dates.push(keyOf(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}
function isComplete(key) {
    const count = counts(key);
    return count.total > 0 && count.done === count.total;
}
function renderSummary() {
    const dates = allDates();
    const today = keyOf(new Date());
    $("planner-days-complete").textContent = dates.filter(isComplete).length + " / " + dates.length;
    const cursor = dateOf(today);
    if (!isComplete(today)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (keyOf(cursor) >= FIRST_DATE && keyOf(cursor) <= LAST_DATE && isComplete(keyOf(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    $("planner-streak").textContent = streak + " day" + (streak === 1 ? "" : "s");
    let history = {};
    try { history = JSON.parse(localStorage.getItem(POMODORO_HISTORY_KEY) || "{}") || {}; } catch { history = {}; }
    $("planner-focus-today").textContent = Math.floor((Number(history[today]) || 0) / 60) + " min";
}
function renderCalendar() {
    const calendar = $("planner-calendar");
    calendar.replaceChildren();
    const dates = allDates();
    const header = document.createElement("div");
    header.className = "planner-calendar-week planner-calendar-header";
    const weekHeading = document.createElement("span");
    weekHeading.className = "planner-calendar-week-label";
    weekHeading.textContent = "Review week";
    header.appendChild(weekHeading);
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((weekday) => {
        const label = document.createElement("span");
        label.className = "planner-calendar-weekday";
        label.textContent = weekday;
        header.appendChild(label);
    });
    calendar.appendChild(header);

    for (let offset = 0; offset < dates.length; offset += 7) {
        const week = dates.slice(offset, offset + 7);
        const section = document.createElement("section");
        section.className = "planner-calendar-week";
        const weekModel = modelOf(week[0]);
        const colorClass = weekModel?.isSetup ? "setup" : WEEK_COLOR_CLASSES[weekModel?.week] || "setup";
        section.classList.add("planner-week-color-" + colorClass);
        const heading = document.createElement("h3");
        heading.className = "planner-calendar-week-label";
        heading.textContent = offset === 0 ? "Setup week" : "Week " + (offset / 7) + " · " + (weekModel?.subject || "");
        section.appendChild(heading);
        week.forEach((key) => {
            const date = dateOf(key);
            const model = modelOf(key);
            const count = counts(key);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "planner-date";
            if (key === selectedDate) button.classList.add("is-selected");
            if (key === keyOf(new Date())) button.classList.add("is-today");
            if (count.total && count.done === count.total) button.classList.add("is-complete");
            button.setAttribute("aria-pressed", String(key === selectedDate));
            button.setAttribute("aria-label", date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + ": " + count.done + " of " + count.total + " tasks complete");
            const dayNumber = document.createElement("strong");
            dayNumber.textContent = date.getDate();
            const subject = document.createElement("span");
            subject.className = "planner-date-subject";
            subject.textContent = model?.isSetup ? "Setup" : model?.subject || "";
            const progress = document.createElement("span");
            progress.className = "planner-date-count";
            progress.textContent = count.done + "/" + count.total;
            button.append(dayNumber, subject, progress);
            button.addEventListener("click", () => { selectedDate = key; render(); });
            section.appendChild(button);
        });
        calendar.appendChild(section);
    }
}
function renderChecklist(model) {
    const list = $("planner-checklist");
    list.replaceChildren();
    model.tasks.forEach((task) => {
        const item = document.createElement("label");
        item.className = "planner-task";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(checkedFor(model.date)[task.id]);
        checkbox.setAttribute("aria-label", "Mark " + task.title + " complete");
        if (checkbox.checked) item.classList.add("is-checked");
        checkbox.addEventListener("change", () => {
            state.days[model.date] = state.days[model.date] || {};
            state.days[model.date].checked = state.days[model.date].checked || {};
            state.days[model.date].checked[task.id] = checkbox.checked;
            persist();
            render();
        });
        const copy = document.createElement("span");
        copy.className = "planner-task-copy";
        const time = document.createElement("span");
        time.className = "planner-task-time";
        time.textContent = task.time;
        const title = document.createElement("strong");
        title.textContent = task.title || task.label;
        const detail = document.createElement("span");
        detail.className = "planner-task-detail";
        detail.textContent = task.detail || "";
        copy.append(time, title, detail);
        if (task.reference) {
            const reference = document.createElement("span");
            reference.className = "planner-task-reference";
            reference.textContent = "Reference: " + task.reference;
            copy.appendChild(reference);
        }
        item.append(checkbox, copy);
        list.appendChild(item);
    });
}
function renderGantt(model) {
    const chart = $("planner-gantt");
    chart.replaceChildren();
    const tasks = model.tasks.filter((task) => task.id !== "sleep");
    tasks.forEach((task) => {
        const row = document.createElement("div");
        row.className = "planner-gantt-row";
        const blockClass = { "block-1": "a", "block-2": "b", "block-3": "c" }[task.id];
        if (blockClass) row.classList.add("planner-gantt-block-" + blockClass);
        const label = document.createElement("div");
        label.className = "planner-gantt-label";
        const time = document.createElement("span");
        time.textContent = task.time;
        const title = document.createElement("strong");
        title.textContent = task.title || task.label;
        label.append(time, title);
        const track = document.createElement("div");
        track.className = "planner-gantt-track";
        const bar = document.createElement("div");
        bar.className = "planner-gantt-bar";
        if (checkedFor(model.date)[task.id]) bar.classList.add("is-complete");
        const start = Number(task.start ?? 8);
        const duration = Number(task.duration ?? 1.5);
        bar.style.left = Math.max(0, ((start - 6) / 16.5) * 100) + "%";
        bar.style.width = Math.max(2, (duration / 16.5) * 100) + "%";
        bar.title = task.title || task.label;
        track.appendChild(bar);
        row.append(label, track);
        chart.appendChild(row);
    });
}
function renderSelectedDay() {
    const model = modelOf(selectedDate);
    if (!model) return;
    const date = dateOf(selectedDate);
    const dayNumber = Math.round((dateOf(EXAM_DATE) - date) / 86400000);
    $("planner-day-kicker").textContent = model.isSetup ? "Setup checklist" : "Week " + model.week + " · D-" + dayNumber;
    $("planner-day-heading").textContent = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    $("planner-day-subtitle").textContent = model.isSetup ? model.weekLabel : model.subject + " · " + model.weekLabel;
    const count = counts(selectedDate);
    const percent = count.total ? Math.round(count.done / count.total * 100) : 0;
    $("planner-day-progress-text").textContent = count.done + " of " + count.total + " tasks complete";
    $("planner-day-progress-percent").textContent = percent + "%";
    $("planner-day-progress-fill").style.width = percent + "%";
    renderChecklist(model);
    renderGantt(model);
    $("planner-previous-day").disabled = selectedDate <= FIRST_DATE;
    $("planner-next-day").disabled = selectedDate >= LAST_DATE;
}
function render() {
    renderSummary();
    renderCalendar();
    renderSelectedDay();
}
function moveDay(amount) {
    const next = dateOf(selectedDate);
    next.setDate(next.getDate() + amount);
    const key = keyOf(next);
    if (key >= FIRST_DATE && key <= LAST_DATE) { selectedDate = key; render(); }
}

const today = keyOf(new Date());
selectedDate = today < FIRST_DATE ? FIRST_DATE : today > LAST_DATE ? LAST_DATE : today;
$("planner-previous-day").addEventListener("click", () => moveDay(-1));
$("planner-next-day").addEventListener("click", () => moveDay(1));
$("planner-today").addEventListener("click", () => {
    const now = keyOf(new Date());
    selectedDate = now < FIRST_DATE ? FIRST_DATE : now > LAST_DATE ? LAST_DATE : now;
    render();
});
render();
window.setInterval(renderSummary, 30000);
