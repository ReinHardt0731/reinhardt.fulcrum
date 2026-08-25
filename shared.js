export const STORAGE_KEY = "prepcore.web.subjects.v1";
export const ACTIVE_SUBJECT_KEY = "prepcore.web.activeSubject.v1";
export const ACTIVE_CHAPTER_KEY = "prepcore.web.activeChapter.v1";
export const ACTIVE_MODE_KEY = "prepcore.web.activeMode.v1";
export const REVIEW_SESSION_KEY = "prepcore.web.reviewSession.v1";
export const QUIZ_SESSION_KEY = "prepcore.web.quizSession.v1";
export const PROGRESS_HISTORY_KEY = "prepcore.web.progressHistory.v1";
export const ADMIN_UNLOCK_KEY = "prepcore.web.adminUnlocked.v1";
export const ADMIN_PASSWORD = "prepcore";
export const NOTES_PATH = "./markdowns";
const SUBJECTS_PATH = "./subjects.json";
const VALID_MODES = new Set(["quiz", "learn", "flashcards", "exam", "note"]);
const SUBJECTS_CACHE_KEY = "prepcore.web.subjectsCache.v1";
const CHAPTER_CACHE_KEY = "prepcore.web.chapterCache.v1";
const LEARN_SESSION_KEY = "prepcore.web.learnSession.v1";
const FLASHCARDS_SESSION_KEY = "prepcore.web.flashcardsSession.v1";
const LEARN_BATCH_SIZE = 10;
const LEARN_AUTO_ADVANCE_MS = 1200;
let learnAutoAdvanceTimer = null;

function cancelLearnAutoAdvance() {
    if (learnAutoAdvanceTimer !== null) {
        clearTimeout(learnAutoAdvanceTimer);
        learnAutoAdvanceTimer = null;
    }
}
const MODE_SESSION_KEYS = {
    quiz: QUIZ_SESSION_KEY,
    learn: LEARN_SESSION_KEY,
    flashcards: FLASHCARDS_SESSION_KEY
};

const UPDATE_LOG_API = "./updates.json";
const DEFAULT_UPDATE_LOG = [
    { date: "2026-07-12", message: "Redo the Aluminum Chapter." },
    { date: "2026-07-12", message: "Added ATA chapters and improved the assessment icon." },
    { date: "2026-07-12", message: "Improved the exam mode experience." },
    { date: "2026-07-12", message: "Fixed vendor workflow issues." },
    { date: "2026-07-12", message: "Added KaTeX math rendering for equations." }
];

const text = (value) => String(value ?? "").trim();

function shuffleArray(values) {
    const next = [...values];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
}

function normalizeChoiceOrder(choiceOrder, choiceCount) {
    if (!Array.isArray(choiceOrder) || choiceOrder.length !== choiceCount || choiceCount < 2) {
        return null;
    }

    const normalized = choiceOrder.map((value) => Number(value));
    if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value >= choiceCount)) {
        return null;
    }

    const unique = new Set(normalized);
    return unique.size === choiceCount ? normalized : null;
}

function buildChoiceOrder(choiceCount, shuffleChoices = false) {
    const order = Array.from({ length: choiceCount }, (_, index) => index);
    return shuffleChoices ? shuffleArray(order) : order;
}

function prepareQuestionForSession(entry, position, options = {}) {
    const question = coerceQuestion(entry, position);
    if (question.questionType !== "multiple_choice") {
        return question;
    }

    const choiceCount = Array.isArray(question.choices) ? question.choices.length : 0;
    const existingOrder = normalizeChoiceOrder(entry?.choiceOrder ?? question.choiceOrder, choiceCount);
    const shuffleChoices = Boolean(options.shuffleChoices);
    const choiceOrder = shuffleChoices
        ? buildChoiceOrder(choiceCount, true)
        : existingOrder || buildChoiceOrder(choiceCount, false);

    return {
        ...question,
        choiceOrder
    };
}

function getChoiceOrder(question) {
    const choiceCount = Array.isArray(question?.choices) ? question.choices.length : 0;
    return normalizeChoiceOrder(question?.choiceOrder, choiceCount) || buildChoiceOrder(choiceCount, false);
}

function getOrderedChoices(question) {
    const order = getChoiceOrder(question);
    return order.map((originalIndex, displayIndex) => ({
        displayIndex,
        originalIndex,
        choice: Array.isArray(question?.choices) ? question.choices[originalIndex] : ""
    }));
}

function shuffleSessionQuestions(session) {
    if (!session || !Array.isArray(session.questions) || session.questions.length < 2) {
        return false;
    }

    const entries = session.questions.map((question, index) => ({
        question,
        answer: Array.isArray(session.answers) ? session.answers[index] : null,
        draft: Array.isArray(session.drafts) ? session.drafts[index] : ""
    }));
    const shuffledEntries = shuffleArray(entries);

    session.questions = shuffledEntries.map((entry, index) => prepareQuestionForSession(entry.question, index + 1, { shuffleChoices: true }));
    session.answers = shuffledEntries.map((entry) => entry.answer ?? null);
    session.drafts = shuffledEntries.map((entry) => entry.draft ?? "");
    session.index = 0;
    session.reviewed = false;
    session.revealed = false;
    session.lastResult = null;
    session.selectedChoice = null;
    session.typedAnswer = "";
    session.complete = false;
    session.currentSummary = null;
    return true;
}

const slugify = (value) =>
    text(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "subject";

export function buildChapterFilePath(chapterTitle) {
    const base = slugify(chapterTitle || "chapter");
    return `chapters/${base}.json`;
}

export async function loadNotesForSubject(subjectId) {
    if (!subjectId) return null;
    const path = `${NOTES_PATH}/${subjectId}.md`;
    try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) return null;
        const text = await res.text();
        return text;
    } catch {
        return null;
    }
}

const safeParse = (raw, fallback) => {
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const storageGet = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : safeParse(raw, fallback);
    } catch {
        return fallback;
    }
};

const storageSet = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        return;
    }
};

const storageRemove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch {
        return;
    }
};

const formatDateKey = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

function getProgressEntries() {
    const entries = storageGet(PROGRESS_HISTORY_KEY, []);
    return Array.isArray(entries) ? entries : [];
}

export function recordStudyProgress(payload = {}) {
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: payload.timestamp || new Date().toISOString(),
        dateKey: payload.dateKey || formatDateKey(payload.date || new Date()),
        mode: text(payload.mode || "quiz"),
        subjectId: text(payload.subjectId),
        subjectName: text(payload.subjectName),
        chapterTitle: text(payload.chapterTitle),
        attempted: Math.max(0, Number(payload.attempted ?? payload.answered ?? 1) || 0),
        correct: Math.max(0, Number(payload.correct ?? 0) || 0)
    };

    if (payload.accuracy !== undefined) {
        entry.accuracy = Number(payload.accuracy) || 0;
    }
    ["learningProgress", "masteryProgress", "firstAttemptCorrect", "mistakesReviewed", "checkpointNumber", "checkpointQuestionCount", "sessionQuestionCount"].forEach((key) => {
        if (payload[key] !== undefined) {
            entry[key] = Number(payload[key]) || 0;
        }
    });
    ["sessionId", "checkpointId"].forEach((key) => {
        if (payload[key] !== undefined) {
            entry[key] = text(payload[key]);
        }
    });
    if (payload.questionCount !== undefined) {
        entry.questionCount = Math.max(0, Number(payload.questionCount) || 0);
    }
    if (payload.summaryType !== undefined) {
        entry.summaryType = text(payload.summaryType);
    }
    if (payload.timeLimitSeconds !== undefined) {
        entry.timeLimitSeconds = Math.max(0, Number(payload.timeLimitSeconds) || 0);
    }
    if (payload.timeRemainingSeconds !== undefined) {
        entry.timeRemainingSeconds = Math.max(0, Number(payload.timeRemainingSeconds) || 0);
    }
    if (payload.elapsedSeconds !== undefined) {
        entry.elapsedSeconds = Math.max(0, Number(payload.elapsedSeconds) || 0);
    }
    if (payload.selectedChapterTitles !== undefined) {
        entry.selectedChapterTitles = Array.isArray(payload.selectedChapterTitles)
            ? payload.selectedChapterTitles.map(text)
            : [text(payload.selectedChapterTitles)];
    }

    const nextEntries = [...getProgressEntries(), entry].slice(-500);
    storageSet(PROGRESS_HISTORY_KEY, nextEntries);
    return entry;
}

export function recordExamSessionProgress(session) {
    if (!session || session.mode !== "exam") {
        return null;
    }

    const summary = session.currentSummary || summarizeResults(session);
    const elapsedSeconds = session.startedAt
        ? Math.max(0, Math.floor((Date.now() - Number(session.startedAt)) / 1000))
        : 0;

    return recordStudyProgress({
        mode: "exam",
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        chapterTitle: session.chapterTitle,
        attempted: session.questions.length,
        correct: summary.correctCount,
        accuracy: summary.accuracy,
        questionCount: session.questions.length,
        timeLimitSeconds: session.timeLimitSeconds,
        timeRemainingSeconds: session.timeRemainingSeconds,
        elapsedSeconds,
        selectedChapterTitles: session.selectedChapterTitles,
        summaryType: "session"
    });
}

export function recordQuizSessionProgress(session) {
    if (!session || session.mode !== "quiz" || !session.complete) {
        return null;
    }

    const summary = session.currentSummary || summarizeResults(session);
    return recordStudyProgress({
        mode: "quiz",
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        chapterTitle: session.chapterTitle,
        attempted: summary.total,
        correct: summary.correctCount,
        accuracy: summary.accuracy,
        questionCount: summary.total,
        summaryType: "session"
    });
}

export function recordSessionProgress(session) {
    if (!session || session.progressRecorded || !session.complete) {
        return null;
    }

    let result = null;
    if (session.mode === "quiz") {
        result = recordQuizSessionProgress(session);
    } else if (session.mode === "exam") {
        result = recordExamSessionProgress(session);
    } else if (session.mode === "learn") {
        result = recordLearnCheckpointProgress(session, true);
    }

    if (result) {
        session.progressRecorded = true;
        if (session.mode === "quiz") {
            saveQuizSession(session);
        } else if (session.mode === "learn") {
            saveModeSession(session);
        }
    }

    return result;
}

export function getDailyProgressSummary(dateKey = formatDateKey()) {
    const entries = getProgressEntries().filter((entry) => entry.dateKey === dateKey);
    const attempted = entries.reduce((sum, entry) => sum + Number(entry.attempted || 0), 0);
    const correct = entries.reduce((sum, entry) => sum + Number(entry.correct || 0), 0);
    return {
        dateKey,
        attempted,
        correct,
        accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
        sessions: entries.length,
        entries
    };
}

export function getRecentProgressSummary(days = 7) {
    const today = new Date();
    const summary = [];
    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        const dateKey = formatDateKey(date);
        summary.push(getDailyProgressSummary(dateKey));
    }
    return summary;
}

export function getRecentModeSummary(mode, days = 7) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
    const cutoffKey = formatDateKey(cutoff);
    const entries = getProgressEntries().filter((entry) =>
        text(entry.mode) === text(mode)
        && text(entry.dateKey) >= cutoffKey
        && (text(entry.summaryType) === "session" || (text(mode) === "learn" && text(entry.summaryType) === "learn-checkpoint"))
    );
    const attemptCount = entries.length;
    const attempted = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.attempted || 0)), 0);
    const correct = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.correct || 0)), 0);
    return {
        mode: text(mode),
        attemptCount,
        attempted,
        correct,
        accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
        entries,
        days: Math.max(0, Number(days) || 7)
    };
}

export function getAssessmentsBySubject() {
    const entries = getProgressEntries();
    const bySubject = {};

    entries.filter((entry) => text(entry.mode) === "quiz" || text(entry.mode) === "exam").forEach((entry) => {
        const subjectName = text(entry.subjectName) || "Untitled";
        const chapterTitle = text(entry.chapterTitle) || "General";

        if (!bySubject[subjectName]) {
            bySubject[subjectName] = {
                subjectName,
                totalAttempted: 0,
                totalCorrect: 0,
                chapters: {},
                entries: []
            };
        }

        const subject = bySubject[subjectName];
        subject.totalAttempted += Number(entry.attempted || 0);
        subject.totalCorrect += Number(entry.correct || 0);
        subject.entries.push(entry);

        if (!subject.chapters[chapterTitle]) {
            subject.chapters[chapterTitle] = {
                chapterTitle,
                attempted: 0,
                correct: 0
            };
        }

        subject.chapters[chapterTitle].attempted += Number(entry.attempted || 0);
        subject.chapters[chapterTitle].correct += Number(entry.correct || 0);
    });

    Object.values(bySubject).forEach((subject) => {
        subject.accuracy = subject.totalAttempted
            ? Math.round((subject.totalCorrect / subject.totalAttempted) * 100)
            : 0;
        Object.values(subject.chapters).forEach((chapter) => {
            chapter.accuracy = chapter.attempted
                ? Math.round((chapter.correct / chapter.attempted) * 100)
                : 0;
        });
    });

    return bySubject;
}

export function getBoardExamCountdown(now = new Date()) {
    const current = now instanceof Date ? new Date(now.getTime()) : new Date(now);
    const start = new Date(2026, 10, 9);
    const end = new Date(2026, 10, 11, 23, 59, 59, 999);
    const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const daysUntilStart = Math.ceil((start - currentDay) / 86400000);

    if (current > end) {
        return { status: "ended", daysUntilStart: 0, daysLabel: "Exam window complete" };
    }
    if (current >= start) {
        return { status: "active", daysUntilStart: 0, daysLabel: "Exam window is live" };
    }
    return {
        status: "upcoming",
        daysUntilStart: Math.max(0, daysUntilStart),
        daysLabel: `${Math.max(0, daysUntilStart)} Day${daysUntilStart === 1 ? "" : "s"} Until the EXAM`
    };
}

export function getDashboardProgress(subjects = [], entries = getProgressEntries()) {
    const subjectProgress = subjects.map((subject) => ({
        id: text(subject.id),
        name: text(subject.name) || "Untitled subject",
        totalChapters: Array.isArray(subject.chapters) ? subject.chapters.length : 0,
        chapterTitles: new Set((Array.isArray(subject.chapters) ? subject.chapters : []).map((chapter) => text(chapter.title)).filter(Boolean)),
        completedChapters: new Set(),
        answered: 0,
        correct: 0
    }));
    const byId = new Map(subjectProgress.filter((subject) => subject.id).map((subject) => [subject.id, subject]));
    const byName = new Map(subjectProgress.map((subject) => [subject.name.toLowerCase(), subject]));

    (Array.isArray(entries) ? entries : []).forEach((entry) => {
        if (text(entry.summaryType) !== "session") {
            return;
        }
        const progress = byId.get(text(entry.subjectId)) || byName.get(text(entry.subjectName).toLowerCase());
        if (!progress) {
            return;
        }

        progress.answered += Math.max(0, Number(entry.attempted || 0) || 0);
        progress.correct += Math.max(0, Number(entry.correct || 0) || 0);
        const chapters = Array.isArray(entry.selectedChapterTitles) && entry.selectedChapterTitles.length
            ? entry.selectedChapterTitles
            : [entry.chapterTitle];
        chapters.map(text).filter((chapterTitle) => progress.chapterTitles.has(chapterTitle))
            .forEach((chapterTitle) => progress.completedChapters.add(chapterTitle));
    });

    const progressBySubject = subjectProgress.map((subject) => {
        const completedChapters = Math.min(subject.totalChapters, subject.completedChapters.size);
        return {
            id: subject.id,
            name: subject.name,
            totalChapters: subject.totalChapters,
            completedChapters,
            completedChapterTitles: [...subject.completedChapters],
            answered: subject.answered,
            correct: subject.correct,
            complete: subject.totalChapters > 0 && completedChapters >= subject.totalChapters,
            percent: subject.totalChapters ? Math.round((completedChapters / subject.totalChapters) * 100) : 0
        };
    });
    const totalChapters = progressBySubject.reduce((sum, subject) => sum + subject.totalChapters, 0);
    const completedChapters = progressBySubject.reduce((sum, subject) => sum + subject.completedChapters, 0);

    return {
        subjects: progressBySubject,
        completedSubjects: progressBySubject.filter((subject) => subject.complete).length,
        completedChapters,
        totalChapters,
        answered: progressBySubject.reduce((sum, subject) => sum + subject.answered, 0),
        correct: progressBySubject.reduce((sum, subject) => sum + subject.correct, 0),
        percent: totalChapters ? Math.round((completedChapters / totalChapters) * 100) : 0
    };
}

export function getDashboardContinuation(subjects = [], progress = getDashboardProgress(subjects)) {
    const savedQuiz = loadQuizSession();
    if (savedQuiz && !savedQuiz.complete && text(savedQuiz.subjectId) && text(savedQuiz.chapterTitle)) {
        const subject = subjects.find((entry) => text(entry.id) === text(savedQuiz.subjectId));
        if (subject && subject.chapters.some((chapter) => text(chapter.title) === text(savedQuiz.chapterTitle))) {
            const questionCount = Array.isArray(savedQuiz.questions) ? savedQuiz.questions.length : 0;
            const answeredCount = Array.isArray(savedQuiz.answers)
                ? savedQuiz.answers.filter((answer) => answer !== null && answer !== undefined).length
                : Math.max(0, Number(savedQuiz.index) || 0);
            return {
                type: "resume",
                status: "Resume Quiz",
                subject,
                chapter: subject.chapters.find((chapter) => text(chapter.title) === text(savedQuiz.chapterTitle)),
                answeredCount: Math.min(answeredCount, questionCount),
                questionCount,
                remainingCount: Math.max(0, questionCount - Math.min(answeredCount, questionCount)),
                percent: questionCount ? Math.round((Math.min(answeredCount, questionCount) / questionCount) * 100) : 0
            };
        }
    }

    const activeSubjectId = text(storageGet(ACTIVE_SUBJECT_KEY, ""));
    const orderedProgress = [...progress.subjects].sort((left, right) => {
        if (left.id === activeSubjectId) return -1;
        if (right.id === activeSubjectId) return 1;
        return 0;
    });
    for (const subjectProgress of orderedProgress) {
        const subject = subjects.find((entry) => text(entry.id) === subjectProgress.id);
        const completed = new Set(subjectProgress.completedChapterTitles || []);
        const chapter = subject?.chapters?.find((entry) => !completed.has(text(entry.title)));
        if (subject && chapter) {
            return { type: "start", status: "Next Chapter", subject, chapter };
        }
    }

    return { type: "complete", status: "All Chapters Complete" };
}

export function getDashboardLearnContinuation(subjects = [], progress = getDashboardProgress(subjects)) {
    const savedLearn = loadModeSession("learn");
    if (savedLearn && !savedLearn.complete && text(savedLearn.subjectId) && text(savedLearn.chapterTitle)) {
        const subject = subjects.find((entry) => text(entry.id) === text(savedLearn.subjectId));
        const chapter = subject?.chapters?.find((entry) => text(entry.title) === text(savedLearn.chapterTitle));
        if (subject && chapter) {
            const questionCount = Array.isArray(savedLearn.questions) ? savedLearn.questions.length : 0;
            const answeredCount = Array.isArray(savedLearn.answers)
                ? savedLearn.answers.filter(Boolean).length
                : Math.max(0, Number(savedLearn.index) || 0);
            const safeAnsweredCount = Math.min(answeredCount, questionCount);
            return {
                type: "resume",
                status: "Resume Learn",
                subject,
                chapter,
                answeredCount: safeAnsweredCount,
                questionCount,
                remainingCount: Math.max(0, questionCount - safeAnsweredCount),
                percent: questionCount ? Math.round((safeAnsweredCount / questionCount) * 100) : 0
            };
        }
    }

    const activeSubjectId = text(storageGet(ACTIVE_SUBJECT_KEY, ""));
    const orderedProgress = [...progress.subjects].sort((left, right) => {
        if (left.id === activeSubjectId) return -1;
        if (right.id === activeSubjectId) return 1;
        return 0;
    });
    for (const subjectProgress of orderedProgress) {
        const subject = subjects.find((entry) => text(entry.id) === subjectProgress.id);
        const completed = new Set(subjectProgress.completedChapterTitles || []);
        const chapter = subject?.chapters?.find((entry) => !completed.has(text(entry.title)));
        if (subject && chapter) {
            return { type: "start", status: "Start Learn", subject, chapter };
        }
    }

    return { type: "complete", status: "All Chapters Complete" };
}

const sessionGet = (key, fallback) => {
    try {
        const raw = sessionStorage.getItem(key);
        return raw === null ? fallback : safeParse(raw, fallback);
    } catch {
        return fallback;
    }
};

const sessionSet = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        return;
    }
};

const sessionRemove = (key) => {
    try {
        sessionStorage.removeItem(key);
    } catch {
        return;
    }
};

function normalizeTags(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((entry) => text(entry)).filter(Boolean);
}

function getPrimaryTag(question) {
    const tags = Array.isArray(question?.tags) ? question.tags : [];
    return text(tags[0] || question?.chapterTitle || "Untagged");
}

function isQuestionLikeObject(value) {
    return Boolean(
        value
        && typeof value === "object"
        && !Array.isArray(value)
        && (
            "question" in value
            || "question_text" in value
            || "prompt" in value
            || "text" in value
            || "choices" in value
            || "answer" in value
            || "answerText" in value
            || "answer_text" in value
            || "answerIndex" in value
            || "answer_index" in value
            || "questionType" in value
            || "question_type" in value
            || "expectedAnswer" in value
            || "expected_answer" in value
            || "numeric_answer" in value
        )
    );
}

function isChapterLikeObject(value) {
    return Boolean(
        value
        && typeof value === "object"
        && !Array.isArray(value)
        && (
            "title" in value
            || "chapter" in value
            || "name" in value
            || "questions" in value
            || "questionList" in value
            || "items" in value
            || "rows" in value
            || "cards" in value
        )
    );
}

function collectQuestionEntries(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (isQuestionLikeObject(value)) {
        return [value];
    }

    if (value && typeof value === "object") {
        return Object.values(value);
    }

    return [];
}

function collectChapterEntries(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (isChapterLikeObject(value)) {
        return [value];
    }

    if (value && typeof value === "object") {
        return Object.values(value);
    }

    return [];
}

function collectChapterQuestions(chapter) {
    return collectQuestionEntries(
        chapter?.questions
        ?? chapter?.questionList
        ?? chapter?.items
        ?? chapter?.question
        ?? chapter?.rows
        ?? chapter?.cards
    );
}

function hasQuestionRows(chapter) {
    return collectChapterQuestions(chapter).length > 0;
}

function getUsableChapter(subject, chapterTitle = "") {
    if (!subject) {
        return null;
    }

    const preferred = chapterTitle ? getChapterByTitle(subject, chapterTitle) : null;
    if (hasQuestionRows(preferred)) {
        return preferred;
    }

    const firstUsable = subject.chapters.find((chapter) => hasQuestionRows(chapter));
    if (firstUsable) {
        return firstUsable;
    }

    return preferred || subject.chapters[0] || null;
}

function formatNumericAnswer(value) {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? String(numberValue) : text(value);
}

function parseNumericAnswer(entry) {
    const candidates = [
        entry?.expectedAnswer,
        entry?.expected_answer,
        entry?.numericAnswer,
        entry?.numeric_answer,
        entry?.answerText,
        entry?.answer_text,
        entry?.answer
    ];
    for (const candidate of candidates) {
        const numberValue = Number(candidate);
        if (Number.isFinite(numberValue)) {
            return numberValue;
        }
    }
    return null;
}

function formatExplanationText(value) {
    const normalized = text(value)
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\r\n?/g, "\n");

    return normalized
        .replace(/\n{3,}/g, "\n\n")
        .replace(/([^\n])\s*(💡|🎯|🧠|✅|⚠️)/g, "$1\n\n$2")
        .replace(/\n{3,}/g, "\n\n");
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function createFormattedTextNode(value) {
    const rawText = formatExplanationText(value);
    const fragment = document.createDocumentFragment();

    if (!rawText) {
        return fragment;
    }

    const escapedText = escapeHtml(rawText);
    const segments = escapedText.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

    segments.forEach((segment) => {
        if (/^\*\*[^*]+\*\*$/.test(segment)) {
            const strong = document.createElement("strong");
            strong.textContent = segment.slice(2, -2);
            fragment.appendChild(strong);
        } else {
            fragment.appendChild(document.createTextNode(segment));
        }
    });

    return fragment;
}

function createFormattedTextElement(value, className) {
    const element = document.createElement("p");
    if (className) {
        element.className = className;
    }
    element.style.whiteSpace = "pre-wrap";
    element.appendChild(createFormattedTextNode(value));
    return element;
}

export function normalizeQuestion(entry, position) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`Question ${position} must be an object.`);
    }

    const question = text(entry.question);
    if (!question) {
        throw new Error(`Question ${position} is missing text.`);
    }

    const questionType = text(
        entry.questionType
            || entry.question_type
            || (entry.expectedAnswer !== undefined || entry.expected_answer !== undefined || entry.numeric_answer !== undefined ? "numeric" : "multiple_choice")
    ).toLowerCase();

    const explanation = formatExplanationText(entry.explanation || entry.explaination);
    const tags = normalizeTags(entry.tags);

    if (questionType === "numeric") {
        const expectedAnswer = parseNumericAnswer(entry);
        if (expectedAnswer === null) {
            throw new Error(`Question ${position} needs a numeric expected answer.`);
        }

        return {
            question,
            questionType: "numeric",
            choices: [],
            answerIndex: -1,
            answerText: text(entry.answerText || entry.answer_text) || formatNumericAnswer(expectedAnswer),
            explanation,
            tags,
            expectedAnswer,
            acceptedDeviation: Number.isInteger(Number(entry.acceptedDeviation ?? entry.accepted_deviation ?? entry.deviation))
                ? Number(entry.acceptedDeviation ?? entry.accepted_deviation ?? entry.deviation)
                : 0
        };
    }

    const choices = (Array.isArray(entry.choices) ? entry.choices : []).map((choice) => text(choice)).filter(Boolean);
    if (choices.length < 2) {
        throw new Error(`Question ${position} needs at least two choices.`);
    }

    let answerIndex = Number.isInteger(Number(entry.answerIndex ?? entry.answer_index))
        ? Number(entry.answerIndex ?? entry.answer_index)
        : -1;

    if (answerIndex < 0) {
        const answerText = text(entry.answerText || entry.answer_text || entry.answer);
        if (answerText) {
            answerIndex = choices.findIndex((choice) => choice.toLowerCase() === answerText.toLowerCase());
        }
    }

    if (answerIndex < 0 || answerIndex >= choices.length) {
        throw new Error(`Question ${position} needs a valid answer index or matching answer text.`);
    }

    return {
        question,
        questionType: "multiple_choice",
        choices,
        answerIndex,
        answerText: text(entry.answerText || entry.answer_text || entry.answer) || choices[answerIndex],
        explanation,
        tags,
        expectedAnswer: null,
        acceptedDeviation: 0
    };
}

function coerceQuestion(entry, position) {
    try {
        return normalizeQuestion(entry, position);
    } catch (error) {
        const rawQuestionText = typeof entry === "string" || typeof entry === "number" ? text(entry) : "";
        const question = text(entry?.question || entry?.question_text || entry?.prompt || entry?.text || rawQuestionText || `Question ${position}`);
        const explanation = formatExplanationText(entry?.explanation || entry?.explaination);
        const tags = normalizeTags(entry?.tags);
        const choices = (Array.isArray(entry?.choices) ? entry.choices : []).map((choice) => text(choice)).filter(Boolean);
        const questionTypeHint = text(entry?.questionType || entry?.question_type).toLowerCase();
        const hasNumericHints = questionTypeHint === "numeric"
            || entry?.expectedAnswer !== undefined
            || entry?.expected_answer !== undefined
            || entry?.numeric_answer !== undefined;
        const numericAnswer = hasNumericHints ? parseNumericAnswer(entry) : null;

        if (numericAnswer !== null) {
            return {
                question,
                questionType: "numeric",
                choices: [],
                answerIndex: -1,
                answerText: text(entry?.answerText || entry?.answer_text) || formatNumericAnswer(numericAnswer),
                explanation,
                tags,
                expectedAnswer: numericAnswer,
                acceptedDeviation: Number.isInteger(Number(entry?.acceptedDeviation ?? entry?.accepted_deviation ?? entry?.deviation))
                    ? Number(entry?.acceptedDeviation ?? entry?.accepted_deviation ?? entry?.deviation)
                    : 0
            };
        }

        let answerIndex = Number.isInteger(Number(entry?.answerIndex ?? entry?.answer_index))
            ? Number(entry?.answerIndex ?? entry?.answer_index)
            : -1;

        if (answerIndex < 0) {
            const answerText = text(entry?.answerText || entry?.answer_text || entry?.answer);
            if (answerText) {
                answerIndex = choices.findIndex((choice) => choice.toLowerCase() === answerText.toLowerCase());
            }
        }

        const safeChoices = choices.length >= 2 ? choices : ["Option 1", "Option 2"];

        return {
            question,
            questionType: "multiple_choice",
            choices: safeChoices,
            answerIndex: answerIndex >= 0 && answerIndex < safeChoices.length ? answerIndex : 0,
            answerText: text(entry?.answerText || entry?.answer_text || entry?.answer) || safeChoices[Math.max(0, answerIndex)] || safeChoices[0],
            explanation,
            tags,
            expectedAnswer: null,
            acceptedDeviation: 0
        };
    }
}

function coerceChapter(entry, position, chapterLookup = {}) {
    const normalizedEntry = (() => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return entry;
        }

        const file = text(entry.file || entry.path || entry.source || entry.chapterFile);
        if (!file) {
            return entry;
        }

        return chapterLookup[file] || entry;
    })();

    if (Array.isArray(normalizedEntry)) {
        const questions = collectQuestionEntries(normalizedEntry).map((question, index) => coerceQuestion(question, index + 1));

        if (!questions.length) {
            return null;
        }
        return {
            title: `Chapter ${position}`,
            questions
        };
    }

    if (!normalizedEntry || typeof normalizedEntry !== "object") {
        return null;
    }

    const title = text(normalizedEntry.title || normalizedEntry.chapter || normalizedEntry.name || entry?.title || entry?.chapter || entry?.name);
    const questionsSource = collectQuestionEntries(normalizedEntry.questions ?? normalizedEntry.questionList ?? normalizedEntry.items ?? normalizedEntry.question);
    const wrappedQuestions = questionsSource.length ? questionsSource : collectQuestionEntries(normalizedEntry.rows ?? normalizedEntry.cards);


    if (!title && !wrappedQuestions.length) {
        return null;
    }

    const questions = wrappedQuestions.map((question, index) => coerceQuestion(question, index + 1));
    if (!questions.length) {
        return null;
    }

    const file = text(entry?.file || entry?.path || entry?.source || entry?.chapterFile);
    return {
        title: title || `Chapter ${position}`,
        questions,
        ...(file ? { file } : {})
    };
}

async function resolveChapterData(entry, chapterLookup = {}) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
    }

    const file = text(entry.file || entry.path || entry.source || entry.chapterFile);
    if (file) {
        const cached = chapterLookup[file];
        if (cached && typeof cached === "object") {
            return {
                ...cached,
                title: text(cached.title || entry.title || entry.chapter || entry.name || "Imported"),
                file
            };
        }

        try {
            const response = await fetch(file, { cache: "no-store" });
            if (response.ok) {
                const payload = await response.json();
                const resolved = Array.isArray(payload)
                    ? {
                        title: text(entry.title || entry.chapter || entry.name || "Imported"),
                        questions: collectQuestionEntries(payload),
                        file
                    }
                    : payload && typeof payload === "object"
                        ? {
                            title: text(payload.title || payload.chapter || payload.name || entry.title || entry.chapter || entry.name || "Imported"),
                            questions: collectQuestionEntries(payload.questions ?? payload.questionList ?? payload.items ?? payload.question ?? payload.rows ?? payload.cards),
                            file
                        }
                        : null;

                if (resolved) {
                    return resolved;
                }
            }
        } catch {
            return null;
        }
    }

    return null;
}

function coerceStoredSubject(entry, position, chapterLookup = {}) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
    }

    const name = text(entry.name || entry.subject || entry.title || `Subject ${position}`);
    const chapters = (Array.isArray(entry.chapters) ? entry.chapters : [])
        .map((chapter, index) => coerceChapter(chapter, index + 1, chapterLookup))
        .filter(Boolean);

    const notesPath = typeof entry.notesPath === "string" && text(entry.notesPath) ? text(entry.notesPath) : "";

    return {
        id: text(entry.id) || slugify(name),
        name,
        quizType: text(entry.quizType || entry.quiz_type || "short_quiz"),
        schemaVersion: Number(entry.schemaVersion || entry.schema_version || 1),
        selectedChapter: text(entry.selectedChapter || entry.selected_chapter || chapters[0]?.title || ""),
        chapters,
        notesPath,
        updatedAt: text(entry.updatedAt || entry.updated_at || new Date().toISOString())
    };
}

function normalizeSubjectCollection(subjects, chapterLookup = {}) {
    if (!Array.isArray(subjects)) {
        return [];
    }

    return subjects
        .map((subject, index) => coerceStoredSubject(subject, index + 1, chapterLookup))
        .filter(Boolean)
        .sort((left, right) => text(left.name).localeCompare(text(right.name)));
}

export function normalizeChapter(entry, position, chapterLookup = {}) {
    const looseChapter = coerceChapter(entry, position, chapterLookup);

    if (!looseChapter) {
        throw new Error(`Chapter ${position} must include a title and at least one question.`);
    }

    return {
        title: looseChapter.title,
        questions: looseChapter.questions.map((question, index) => normalizeQuestion(question, index + 1))
    };
}

export function normalizeQuizPayload(payload, subjectOverride = "") {
    if (!payload || (typeof payload !== "object" && !Array.isArray(payload))) {
        throw new Error("Quiz file must be a JSON object or array.");
    }

    let chaptersSource = [];
    const chapterEntries = collectChapterEntries(payload.chapters);
    if (chapterEntries.length) {
        chaptersSource = chapterEntries;
    } else if (Array.isArray(payload)) {
        const chapterLike = payload.length > 0 && payload.every((entry) =>
            Array.isArray(entry)
            || isChapterLikeObject(entry)
        );
        chaptersSource = chapterLike
            ? payload
            : [
                {
                    title: text(payload.selected_chapter || payload.title || payload.chapter || subjectOverride || payload.subject || "Imported"),
                    questions: payload
                }
            ];
    } else if (payload.questions) {
        chaptersSource = [
            {
                title: text(payload.selected_chapter || payload.title || payload.chapter || subjectOverride || payload.subject || "Imported"),
                questions: collectQuestionEntries(payload.questions)
            }
        ];
    }

    const chapters = chaptersSource.map((chapter, index) => normalizeChapter(chapter, index + 1));
    return {
        subject: text(payload.subject || payload.title || subjectOverride || "Imported"),
        selected_chapter: text(payload.selected_chapter || payload.title || payload.chapter || subjectOverride || payload.subject || "Imported"),
        quiz_type: text(payload.quiz_type || payload.quizType || "short_quiz"),
        chapters
    };
}

export async function loadSubjects() {
    try {
        const response = await fetch(SUBJECTS_PATH, { cache: "no-store" });
        if (!response.ok) {
            return [];
        }

        const raw = await response.json();
        const chapterLookup = raw?.chapterData || raw?.chapterFiles || {};
        const subjects = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.subjects)
                ? raw.subjects
                : [];

        const resolvedSubjects = [];
        for (const subject of subjects) {
            if (!subject || typeof subject !== "object" || Array.isArray(subject)) {
                continue;
            }

            const chapterEntries = Array.isArray(subject.chapters) ? subject.chapters : [];
            const resolvedChapters = [];
            for (const chapterEntry of chapterEntries) {
                const loadedChapter = await resolveChapterData(chapterEntry, chapterLookup);
                const chapterPayload = loadedChapter || chapterEntry;
                const chapter = coerceChapter(
                    loadedChapter
                        ? { ...chapterEntry, ...loadedChapter, file: loadedChapter.file || chapterEntry?.file || chapterEntry?.path || chapterEntry?.source || chapterEntry?.chapterFile }
                        : chapterEntry,
                    1,
                    chapterLookup
                );
                if (chapter) {
                    resolvedChapters.push(chapter);
                }
            }

            const normalizedSubject = coerceStoredSubject({ ...subject, chapters: resolvedChapters }, 1, chapterLookup);
            if (normalizedSubject) {
                resolvedSubjects.push(normalizedSubject);
            }
        }

        const sortedSubjects = resolvedSubjects.sort((left, right) => text(left.name).localeCompare(text(right.name)));
        return sortedSubjects;
    } catch {
        return [];
    }
}

export function slugForSubject(subject) {
    return text(subject.id || slugify(subject.name));
}

export function saveSubjects(subjects) {
    return normalizeSubjectCollection(subjects);
}

export function serializeSubjects(subjects) {
    const normalizedSubjects = saveSubjects(subjects);
    const chapterData = {};
    const exportSubjects = normalizedSubjects.map((subject) => ({
        ...subject,
        ...(subject.notesPath ? { notesPath: subject.notesPath } : {}),
        chapters: subject.chapters.map((chapter) => {
            const file = chapter.file || `chapters/${slugify(chapter.title || "chapter")}.json`;
            chapterData[file] = {
                title: chapter.title,
                questions: Array.isArray(chapter.questions) ? chapter.questions.map((question) => ({
                    ...question,
                    choices: Array.isArray(question.choices) ? [...question.choices] : [],
                    tags: Array.isArray(question.tags) ? [...question.tags] : []
                })) : []
            };
            return {
                title: chapter.title,
                file
            };
        })
    }));

    return `${JSON.stringify({ subjects: exportSubjects, chapterData }, null, 2)}\n`;

}

export function getSubjectById(subjects, subjectId) {
    return subjects.find((subject) => subject.id === subjectId) || subjects[0] || null;
}

export function getChapterByTitle(subject, chapterTitle) {
    if (!subject) {
        return null;
    }
    return subject.chapters.find((chapter) => chapter.title === chapterTitle) || subject.chapters[0] || null;
}

export function textValue(value) {
    return String(value ?? "").trim();
}

export function tallyQuestionCount(subject) {
    return subject.chapters.reduce((sum, chapter) => sum + collectChapterQuestions(chapter).length, 0);
}

export function createSession(subject, chapter, mode, options = {}) {
    const questionsSource = Array.isArray(options.questions) && options.questions.length
        ? options.questions
        : collectChapterQuestions(chapter);
    const shouldShuffleChoices = options.shuffleChoices ?? !Array.isArray(options.questions);
    const questions = questionsSource.map((question, index) => prepareQuestionForSession(question, index + 1, {
        shuffleChoices: shouldShuffleChoices
    }));
    return {
        subjectId: subject.id,
        subjectName: subject.name,
        chapterTitle: text(options.chapterTitle || chapter.title),
        mode,
        questions,
        index: 0,
        answers: [],
        drafts: questions.map(() => ""),
        revealed: false,
        reviewed: false,
        busy: false,
        lastResult: null,
        selectedChoice: null,
        typedAnswer: "",
        complete: false,
        currentSummary: null,
        assessmentModalShown: false,
        progressRecorded: false,
        reviewLabel: text(options.reviewLabel),
        reviewSource: text(options.reviewSource),
        learnSessionId: text(options.learnSessionId) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        learnBatchStart: 0,
        learnBatchEnd: 0,
        learnCheckpointNumber: 0,
        learnCheckpointActive: false,
        learnCheckpointSummarySeen: false,
        learnReviewQueue: [],
        learnReviewPosition: 0,
        learnReviewDrafts: {},
        learnReviewResults: {},
        learnReviewSubmittedIndexes: [],
        learnReviewedMistakeIndexes: [],
        learnFirstAttemptCorrectCount: 0,
        learnMistakesReviewedCount: 0,
        learnRecordedCheckpointIds: [],
        learnSlideNext: false
    };
}

export function createExamSession(subject, chapterTitles, questionCount, options = {}) {
    const selectedChapters = Array.isArray(chapterTitles) && chapterTitles.length
        ? chapterTitles
        : [options.chapterTitle || ""];
    const questionPool = [];

    selectedChapters.forEach((chapterTitle) => {
        const chapter = getChapterByTitle(subject, chapterTitle);
        if (!chapter) {
            return;
        }
        const chapterQuestions = collectChapterQuestions(chapter);
        chapterQuestions.forEach((question, index) => {
            const normalizedQuestion = prepareQuestionForSession(question, index + 1, {
                shuffleChoices: true
            });
            questionPool.push({
                ...normalizedQuestion,
                chapterTitle: chapter.title
            });
        });
    });

    const questions = shuffleArray(questionPool)
        .slice(0, Math.max(1, Math.min(Number(questionCount) || 1, questionPool.length)));
    const preparedQuestions = questions.map((question, index) => prepareQuestionForSession(question, index + 1, {
        shuffleChoices: true
    }));

    return {
        subjectId: subject.id,
        subjectName: subject.name,
        chapterTitle: text(options.chapterTitle || (selectedChapters[0] || subject.chapters[0]?.title || "Exam")),
        mode: "exam",
        questions: preparedQuestions,
        index: 0,
        answers: [],
        drafts: preparedQuestions.map(() => ""),
        revealed: false,
        reviewed: false,
        busy: false,
        lastResult: null,
        selectedChoice: null,
        typedAnswer: "",
        complete: false,
        currentSummary: null,
        progressRecorded: false,
        reviewLabel: "Exam review",
        reviewSource: "exam",
        selectedChapterTitles: selectedChapters.filter(Boolean),
        questionCount: questions.length,
        timeLimitSeconds: Number(options.timeLimitSeconds) || 0,
        timeRemainingSeconds: Number(options.timeLimitSeconds) || 0,
        startedAt: null,
        submitted: false,
        timerStarted: false,
        reviewingAnswers: false,
        reviewOnlyUnsure: false,
        unsureFlags: questions.map(() => false),
        assessmentModalShown: false
    };
}

export function buildQuestionResult(question, session, answer, correct, isUnsure = false) {
    const userAnswerIndex = question.questionType === "multiple_choice" ? Number(answer) : null;
    const userAnswer = question.questionType === "multiple_choice"
        ? question.choices?.[Number(answer)] ?? (answer === null || answer === undefined ? "" : String(answer))
        : answer === null || answer === undefined ? "" : String(answer);

    const correctAnswer = question.questionType === "multiple_choice"
        ? question.choices?.[Number(question.answerIndex)] ?? question.answerText
        : question.answerText;

    return {
        questionText: question.question,
        chapterTitle: session.chapterTitle,
        correctAnswer,
        userAnswer,
        userAnswerIndex,
        correct,
        isUnsure,
        explanation: formatExplanationText(question.explanation || question.explaination),
        tags: question.tags
    };
}

export function getAnswerForQuestion(question, session) {
    if (question.questionType === "numeric") {
        const value = text(session.typedAnswer);
        return value ? Number(value) : null;
    }
    return session.selectedChoice;
}

export function isQuestionCorrect(question, answer) {
    if (question.questionType === "numeric") {
        if (answer === null || answer === undefined || answer === "") {
            return false;
        }
        const numericAnswer = Number(answer);
        if (!Number.isFinite(numericAnswer)) {
            return false;
        }
        return Math.abs(numericAnswer - Number(question.expectedAnswer)) <= Number(question.acceptedDeviation || 0);
    }

    return Number(answer) === Number(question.answerIndex);
}

export function summarizeResults(session) {
    const correctCount = session.answers.filter((entry) => entry && entry.correct).length;
    const total = session.questions.length;
    const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
    const missed = session.answers.filter((entry) => entry && !entry.correct);

    const weakAreaCounts = new Map();
    const tagBreakdown = new Map();
    session.questions.forEach((question, index) => {
        const entry = session.answers[index];
        const tagName = getPrimaryTag(question);
        const bucket = tagBreakdown.get(tagName) || { tag: tagName, correct: 0, incorrect: 0, total: 0 };
        bucket.total += 1;
        if (entry?.correct) {
            bucket.correct += 1;
        } else {
            bucket.incorrect += 1;
        }
        tagBreakdown.set(tagName, bucket);

        if (!entry?.correct) {
            const tags = Array.isArray(question.tags) && question.tags.length ? question.tags : [question.chapterTitle || "Untagged"];
            tags.forEach((tag) => {
                weakAreaCounts.set(tag, (weakAreaCounts.get(tag) || 0) + 1);
            });
        }
    });

    const weakAreas = [...weakAreaCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

    return {
        correctCount,
        total,
        accuracy,
        missed,
        weakAreas,
        tagBreakdown: [...tagBreakdown.values()].sort((left, right) => right.total - left.total || left.tag.localeCompare(right.tag))
    };
}

export function createReviewSessionPayload(session, summary) {
    const missedQuestions = session.questions.filter((_, index) => session.answers[index] && !session.answers[index].correct);

    return {
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        chapterTitle: session.chapterTitle,
        reviewLabel: "Missed questions",
        reviewSource: session.mode,
        questions: missedQuestions.map((question) => ({
            ...question,
            choices: Array.isArray(question.choices) ? [...question.choices] : [],
            tags: Array.isArray(question.tags) ? [...question.tags] : []
        })),
        createdAt: new Date().toISOString()
    };
}

export function saveReviewSession(payload) {
    sessionSet(REVIEW_SESSION_KEY, payload);
}

export function loadReviewSession() {
    return sessionGet(REVIEW_SESSION_KEY, null);
}

export function clearReviewSession() {
    sessionRemove(REVIEW_SESSION_KEY);
}

function saveQuizSession(session) {
    if (!session || session.mode !== "quiz" || !session.subjectId || !session.chapterTitle) {
        return;
    }

    storageSet(QUIZ_SESSION_KEY, {
        subjectId: session.subjectId,
        chapterTitle: session.chapterTitle,
        index: Number(session.index) || 0,
        answers: Array.isArray(session.answers) ? session.answers : [],
        drafts: Array.isArray(session.drafts) ? session.drafts : [],
        questions: Array.isArray(session.questions) ? session.questions.map((question) => ({
            ...question,
            choices: Array.isArray(question.choices) ? [...question.choices] : [],
            tags: Array.isArray(question.tags) ? [...question.tags] : [],
            choiceOrder: Array.isArray(question.choiceOrder) ? [...question.choiceOrder] : undefined
        })) : [],
        complete: Boolean(session.complete),
        currentSummary: session.currentSummary || null,
        assessmentModalShown: Boolean(session.assessmentModalShown),
        progressRecorded: Boolean(session.progressRecorded),
        selectedChoice: session.selectedChoice ?? null,
        typedAnswer: session.typedAnswer ?? "",
        lastResult: session.lastResult || null
    });
}

function loadQuizSession() {
    return storageGet(QUIZ_SESSION_KEY, null);
}

function clearQuizSession() {
    storageRemove(QUIZ_SESSION_KEY);
}

function restoreQuizSession(subject, chapter) {
    const saved = loadQuizSession();
    if (!saved || !subject || !chapter || saved.subjectId !== subject.id || saved.chapterTitle !== chapter.title) {
        return null;
    }

    const session = createSession(subject, chapter, "quiz", {
        questions: Array.isArray(saved.questions) && saved.questions.length ? saved.questions : undefined,
        shuffleChoices: false
    });
    session.answers = Array.isArray(saved.answers)
        ? saved.answers.slice(0, session.questions.length).map((entry) => entry || null)
        : session.questions.map(() => null);
    session.drafts = Array.isArray(saved.drafts)
        ? saved.drafts.slice(0, session.questions.length).map((entry) => text(entry))
        : session.questions.map(() => "");
    session.index = Math.max(0, Math.min(Number(saved.index) || 0, session.questions.length - 1));
    session.complete = Boolean(saved.complete);
    session.currentSummary = saved.currentSummary || (session.complete ? summarizeResults(session) : null);
    session.assessmentModalShown = Boolean(saved.assessmentModalShown);
    session.progressRecorded = Boolean(saved.progressRecorded);
    session.selectedChoice = saved.selectedChoice ?? null;
    session.typedAnswer = saved.typedAnswer ?? "";
    session.lastResult = saved.lastResult || null;

    return session;
}

function saveModeSession(session) {
    if (!session || !MODE_SESSION_KEYS[session.mode] || !session.subjectId || !session.chapterTitle) {
        return;
    }

    const key = MODE_SESSION_KEYS[session.mode];
    storageSet(key, {
        subjectId: session.subjectId,
        chapterTitle: session.chapterTitle,
        mode: session.mode,
        index: Number(session.index) || 0,
        answers: Array.isArray(session.answers) ? session.answers : [],
        drafts: Array.isArray(session.drafts) ? session.drafts : [],
        questions: Array.isArray(session.questions) ? session.questions : [],
        complete: Boolean(session.complete),
        currentSummary: session.currentSummary || null,
        revealed: Boolean(session.revealed),
        reviewed: Boolean(session.reviewed),
        selectedChoice: session.selectedChoice ?? null,
        typedAnswer: session.typedAnswer ?? "",
        lastResult: session.lastResult || null,
        assessmentModalShown: Boolean(session.assessmentModalShown),
        progressRecorded: Boolean(session.progressRecorded),
        reviewLabel: text(session.reviewLabel),
        reviewSource: text(session.reviewSource),
        learnSessionId: text(session.learnSessionId),
        learnBatchStart: Number(session.learnBatchStart) || 0,
        learnBatchEnd: Number(session.learnBatchEnd) || 0,
        learnCheckpointNumber: Number(session.learnCheckpointNumber) || 0,
        learnCheckpointActive: Boolean(session.learnCheckpointActive),
        learnCheckpointSummarySeen: Boolean(session.learnCheckpointSummarySeen),
        learnReviewQueue: Array.isArray(session.learnReviewQueue) ? session.learnReviewQueue : [],
        learnReviewPosition: Number(session.learnReviewPosition) || 0,
        learnReviewDrafts: session.learnReviewDrafts && typeof session.learnReviewDrafts === "object" ? session.learnReviewDrafts : {},
        learnReviewResults: session.learnReviewResults && typeof session.learnReviewResults === "object" ? session.learnReviewResults : {},
        learnReviewSubmittedIndexes: Array.isArray(session.learnReviewSubmittedIndexes) ? session.learnReviewSubmittedIndexes : [],
        learnReviewedMistakeIndexes: Array.isArray(session.learnReviewedMistakeIndexes) ? session.learnReviewedMistakeIndexes : [],
        learnFirstAttemptCorrectCount: Number(session.learnFirstAttemptCorrectCount) || 0,
        learnMistakesReviewedCount: Number(session.learnMistakesReviewedCount) || 0,
        learnRecordedCheckpointIds: Array.isArray(session.learnRecordedCheckpointIds) ? session.learnRecordedCheckpointIds : [],
        learnSlideNext: Boolean(session.learnSlideNext)
    });
}

function loadModeSession(mode) {
    const key = MODE_SESSION_KEYS[mode];
    return key ? storageGet(key, null) : null;
}

function clearModeSession(mode) {
    const key = MODE_SESSION_KEYS[mode];
    if (key) {
        storageRemove(key);
    }
}

function restoreModeSession(subject, chapter, mode) {
    if (mode === "quiz") {
        return restoreQuizSession(subject, chapter);
    }

    const saved = loadModeSession(mode);
    if (!saved || !subject || !chapter || saved.subjectId !== subject.id || saved.chapterTitle !== chapter.title) {
        return null;
    }

    const session = createSession(subject, chapter, mode, {
        questions: Array.isArray(saved.questions) && saved.questions.length ? saved.questions : undefined,
        chapterTitle: saved.chapterTitle,
        reviewLabel: saved.reviewLabel,
        reviewSource: saved.reviewSource,
        shuffleChoices: false
    });

    session.answers = Array.isArray(saved.answers)
        ? saved.answers.slice(0, session.questions.length).map((entry) => entry || null)
        : session.questions.map(() => null);
    session.drafts = Array.isArray(saved.drafts)
        ? saved.drafts.slice(0, session.questions.length).map((entry) => text(entry))
        : session.questions.map(() => "");
    session.index = Math.max(0, Math.min(Number(saved.index) || 0, session.questions.length - 1));
    session.complete = Boolean(saved.complete);
    session.currentSummary = saved.currentSummary || (session.complete ? summarizeResults(session) : null);
    session.revealed = Boolean(saved.revealed);
    session.reviewed = Boolean(saved.reviewed);
    session.selectedChoice = saved.selectedChoice ?? null;
    session.typedAnswer = saved.typedAnswer ?? "";
    session.lastResult = saved.lastResult || null;
    session.assessmentModalShown = Boolean(saved.assessmentModalShown);
    session.progressRecorded = Boolean(saved.progressRecorded);
    session.reviewLabel = text(saved.reviewLabel);
    session.reviewSource = text(saved.reviewSource);
    session.learnSessionId = text(saved.learnSessionId) || session.learnSessionId;
    session.learnBatchStart = Math.max(0, Number(saved.learnBatchStart) || 0);
    session.learnBatchEnd = Math.max(0, Number(saved.learnBatchEnd) || 0);
    session.learnCheckpointNumber = Math.max(0, Number(saved.learnCheckpointNumber) || 0);
    session.learnCheckpointActive = Boolean(saved.learnCheckpointActive);
    session.learnCheckpointSummarySeen = Boolean(saved.learnCheckpointSummarySeen);
    session.learnReviewQueue = Array.isArray(saved.learnReviewQueue) ? saved.learnReviewQueue.map(Number).filter(Number.isInteger) : [];
    session.learnReviewPosition = Math.max(0, Number(saved.learnReviewPosition) || 0);
    session.learnReviewDrafts = saved.learnReviewDrafts && typeof saved.learnReviewDrafts === "object" ? saved.learnReviewDrafts : {};
    session.learnReviewResults = saved.learnReviewResults && typeof saved.learnReviewResults === "object" ? saved.learnReviewResults : {};
    session.learnReviewSubmittedIndexes = Array.isArray(saved.learnReviewSubmittedIndexes) ? saved.learnReviewSubmittedIndexes.map(Number).filter(Number.isInteger) : [];
    session.learnReviewedMistakeIndexes = Array.isArray(saved.learnReviewedMistakeIndexes) ? saved.learnReviewedMistakeIndexes.map(Number).filter(Number.isInteger) : [];
    session.learnFirstAttemptCorrectCount = Math.max(0, Number(saved.learnFirstAttemptCorrectCount) || 0);
    session.learnMistakesReviewedCount = Math.max(0, Number(saved.learnMistakesReviewedCount) || 0);
    session.learnRecordedCheckpointIds = Array.isArray(saved.learnRecordedCheckpointIds) ? saved.learnRecordedCheckpointIds.map(text) : [];
    session.learnSlideNext = Boolean(saved.learnSlideNext);

    return session;
}

export async function storageSelectState() {
    const subjects = await loadSubjects();

    const storedSubjectId = text(storageGet(ACTIVE_SUBJECT_KEY, ""));
    const storedMode = text(storageGet(ACTIVE_MODE_KEY, "quiz")) || "quiz";
    const activeSubject = getSubjectById(subjects, storedSubjectId) || subjects[0] || null;
    const storedChapterTitle = text(storageGet(ACTIVE_CHAPTER_KEY, activeSubject?.selectedChapter || activeSubject?.chapters[0]?.title || ""));
    const activeChapter = activeSubject ? getUsableChapter(activeSubject, storedChapterTitle) : null;

    return {
        subjects,
        activeSubject,
        activeChapter,
        mode: VALID_MODES.has(storedMode) ? storedMode : "quiz"
    };
}

// KaTeX math rendering helper
export function renderMath(container = document.body, attempts = 6) {
    const showMathFallback = () => {
        container.querySelectorAll?.("[data-equation-card]").forEach((card) => {
            if (card.querySelector(".equation-card-math-status")) return;
            const status = document.createElement("p");
            status.className = "equation-card-math-status";
            status.textContent = "Math rendering is unavailable. The equation data and interactive controls remain available.";
            card.prepend(status);
        });
    };
    try {
        if (!window.renderMathInElement) {
            // KaTeX auto-render not loaded yet — queue container and start poller
            try {
                globalThis.__katex_pending = globalThis.__katex_pending || new Set();
                globalThis.__katex_pending.add(container);
                if (!globalThis.__katex_polling) {
                    globalThis.__katex_polling = true;
                    const poll = () => {
                        if (window.renderMathInElement) {
                            try {
                                const pending = Array.from(globalThis.__katex_pending || []);
                                globalThis.__katex_pending = new Set();
                                pending.forEach((elem) => {
                                    try { renderMath(elem, 0); } catch (_) {}
                                });
                            } catch (_) {}
                            globalThis.__katex_polling = false;
                            return;
                        }
                        if (attempts > 0) {
                            setTimeout(poll, 150);
                        } else {
                            showMathFallback();
                            globalThis.__katex_polling = false;
                        }
                    };
                    setTimeout(poll, 150);
                }
            } catch (_) {}
            return;
        }

        window.renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false,
            errorCallback: (err) => {
                // Keep errors silent in production; log for debugging
                try { console.warn('KaTeX render error', err && err.message ? err.message : err); } catch (_) {}
            }
        });
    } catch (error) {
        // No-op on render failures
        try { console.warn('renderMath failed', error && error.message ? error.message : error); } catch (_) {}
    }
}

export function syncSelection(subjectId, chapterTitle, mode) {
    if (subjectId) {
        storageSet(ACTIVE_SUBJECT_KEY, subjectId);
    }
    storageSet(ACTIVE_CHAPTER_KEY, chapterTitle || "");
    if (mode && VALID_MODES.has(mode)) {
        storageSet(ACTIVE_MODE_KEY, mode);
    }
}

export function setAdminUnlocked() {
    // Prefer session storage, but also write to local storage as a fallback
    try {
        sessionSet(ADMIN_UNLOCK_KEY, true);
    } catch (_) {}
    try {
        storageSet(ADMIN_UNLOCK_KEY, true);
    } catch (_) {}
}

export function isAdminUnlocked() {
    try {
        const sessionVal = sessionGet(ADMIN_UNLOCK_KEY, null);
        if (sessionVal) return true;
    } catch (_) {}
    try {
        return Boolean(storageGet(ADMIN_UNLOCK_KEY, false));
    } catch (_) {
        return false;
    }
}

export function parseUploadedFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                resolve(JSON.parse(String(reader.result || "")));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error("Unable to read the selected file."));
        reader.readAsText(file, "utf-8");
    });
}

export async function previewQuizFile(file, subjectOverride = "") {
    const raw = await parseUploadedFile(file);
    return normalizeQuizPayload(raw, subjectOverride);
}
function capitalize(value) {
    const raw = text(value);
    return raw ? `${raw.charAt(0).toUpperCase()}${raw.slice(1)}` : "";
}

function buildModeHref(mode) {
    return `${mode}.html`;
}

function renderModeButtons(buttons, mode) {
    buttons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.mode === mode);
    });
}

function renderHomeCarousel(track, subjects, activeSubjectId, selectSubject) {
    track.replaceChildren();

    subjects.forEach((subject) => {
        const card = document.createElement("article");
        card.className = "subject-carousel-card";
        if (subject.id === activeSubjectId) {
            card.classList.add("is-active");
        }

        const title = document.createElement("h4");
        title.textContent = subject.name;

        const index = document.createElement("span");
        index.className = "subject-carousel-index";
        index.textContent = String(subjects.indexOf(subject) + 1).padStart(2, "0");

        const heading = document.createElement("div");
        heading.className = "subject-carousel-heading";
        heading.append(title, index);

        const meta = document.createElement("p");
        meta.className = "subject-carousel-meta";
        meta.textContent = `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"} • ${tallyQuestionCount(subject)} questions`;

        const actions = document.createElement("div");
        actions.className = "subject-carousel-actions";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary-button";
        button.textContent = "Start quiz";
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            selectSubject(subject.id);
        });
        actions.appendChild(button);

        card.addEventListener("click", () => {
            selectSubject(subject.id);
        });

        card.append(heading, meta, actions);
        track.appendChild(card);
    });
}

function renderSubjectDrawer(subjects, activeSubjectId, activeChapterTitle, expandedSubjectId, subjectList, subjectSelect, selectSubject, toggleSubject, dismissSubjectDrawer) {
    subjectList.replaceChildren();
    subjectSelect.replaceChildren();

    subjects.forEach((subject) => {
        // Build a collapsible subject card: header button + chapter list container
        const wrapper = document.createElement("div");
        wrapper.className = "subject-card";
        wrapper.dataset.subjectId = subject.id;

        const header = document.createElement("button");
        header.type = "button";
        header.className = "subject-item";
        const isActiveSubject = subject.id === activeSubjectId;
        const isExpanded = subject.id === expandedSubjectId;
        if (isActiveSubject) {
            header.classList.add("is-active");
        }
        if (isExpanded) {
            header.classList.add("is-open");
        }

        const copy = document.createElement("span");
        copy.className = "subject-item-copy";

        const title = document.createElement("span");
        title.className = "subject-item-title";
        title.textContent = subject.name;

        const meta = document.createElement("span");
        meta.className = "subject-item-meta";
        meta.textContent = `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"}`;

        const caret = document.createElement("span");
        caret.className = "subject-item-caret";
        caret.textContent = "▾";
        copy.append(title, meta);
        header.setAttribute("aria-expanded", String(isExpanded));
        header.append(copy, caret);

        // Chapter list that will be shown/hidden when header is toggled
        const chapterList = document.createElement("div");
        chapterList.className = "subject-chapters";
        chapterList.id = `subject-chapters-${subject.id}`;
        chapterList.hidden = !isExpanded;
        header.setAttribute("aria-controls", chapterList.id);

        subject.chapters.forEach((chapter) => {
            const chapterButton = document.createElement("button");
            chapterButton.type = "button";
            chapterButton.className = "subject-chapter-item";
            if (isActiveSubject && chapter.title === activeChapterTitle) {
                chapterButton.classList.add("is-active");
            }
            chapterButton.textContent = chapter.title;
            chapterButton.addEventListener("click", (event) => {
                event.stopPropagation();
                selectSubject(subject.id, chapter.title);
                if (typeof dismissSubjectDrawer === "function") {
                    dismissSubjectDrawer();
                }
            });
            chapterList.appendChild(chapterButton);
        });

        header.addEventListener("click", () => {
            toggleSubject(subject.id);
        });

        wrapper.append(header, chapterList);
        subjectList.appendChild(wrapper);

        const option = document.createElement("option");
        option.value = subject.id;
        option.textContent = subject.name;
        option.selected = subject.id === activeSubjectId;
        subjectSelect.appendChild(option);
    });
}

function renderChapterStrip(subject, activeChapterTitle, strip, selectChapter) {
    strip.replaceChildren();
    if (!subject) {
        return;
    }

    subject.chapters.forEach((chapter) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chapter-chip";
        chip.textContent = chapter.title;
        if (chapter.title === activeChapterTitle) {
            chip.classList.add("is-active");
        }
        chip.addEventListener("click", () => selectChapter(chapter.title));
        strip.appendChild(chip);
    });
}

function resolveSubjectNotesPath(subject) {
    if (!subject || typeof subject !== "object") {
        return null;
    }

    const trimmed = text(subject.notesPath);
    if (trimmed) {
        if (trimmed.includes("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
            return trimmed;
        }
        return `${NOTES_PATH}/${trimmed}`;
    }

    if (!subject.id) {
        return null;
    }

    return `${NOTES_PATH}/${subject.id}.md`;
}

async function loadSubjectMarkdown(subject) {
    const path = resolveSubjectNotesPath(subject);
    if (!path) {
        return null;
    }

    try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) {
            return null;
        }
        return await response.text();
    } catch {
        return null;
    }
}

function equationText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function graphLabelText(value, fallback) {
    return String(value ?? fallback)
        .replace(/\\([A-Za-z]+)/g, "$1")
        .replace(/[{}]/g, "");
}

function createEquationExpression(expression, constants = {}) {
    const source = String(expression || "").trim();
    const tokenPattern = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|([()+\-*/^,]))\s*/y;
    const tokens = [];
    let offset = 0;
    while (offset < source.length) {
        tokenPattern.lastIndex = offset;
        const match = tokenPattern.exec(source);
        if (!match) {
            throw new Error("Graph expression contains an unsupported character.");
        }
        tokens.push(match[1] ? { type: "number", value: Number(match[1]) } : match[2] ? { type: "name", value: match[2] } : { type: match[3] });
        offset = tokenPattern.lastIndex;
    }

    const functions = { abs: Math.abs, cos: Math.cos, exp: Math.exp, ln: Math.log, log: Math.log, sin: Math.sin, sqrt: Math.sqrt, tan: Math.tan };
    let currentX = 0;
    let index = 0;
    const peek = (type) => tokens[index]?.type === type;
    const consume = (type) => {
        if (!peek(type)) return false;
        index += 1;
        return true;
    };
    const parseExpression = () => {
        let value = parseTerm();
        while (peek("+") || peek("-")) {
            const operator = tokens[index++].type;
            const right = parseTerm();
            value = operator === "+" ? value + right : value - right;
        }
        return value;
    };
    const parseTerm = () => {
        let value = parsePower();
        while (peek("*") || peek("/")) {
            const operator = tokens[index++].type;
            const right = parsePower();
            value = operator === "*" ? value * right : value / right;
        }
        return value;
    };
    const parsePower = () => {
        let value = parseUnary();
        if (consume("^")) value = Math.pow(value, parsePower());
        return value;
    };
    const parseUnary = () => {
        if (consume("+")) return parseUnary();
        if (consume("-")) return -parseUnary();
        return parsePrimary();
    };
    const parsePrimary = () => {
        const token = tokens[index++];
        if (!token) throw new Error("Graph expression is incomplete.");
        if (token.type === "number") return token.value;
        if (token.type === "(") {
            const value = parseExpression();
            if (!consume(")")) throw new Error("Graph expression has an unmatched parenthesis.");
            return value;
        }
        if (token.type !== "name") throw new Error("Graph expression expected a value.");
        if (consume("(")) {
            const fn = functions[token.value];
            if (!fn) throw new Error(`Unsupported graph function: ${token.value}.`);
            const value = fn(parseExpression());
            if (!consume(")")) throw new Error("Graph function has an unmatched parenthesis.");
            return value;
        }
        if (token.value === "x") return currentX;
        if (token.value === "pi") return Math.PI;
        if (Object.prototype.hasOwnProperty.call(constants, token.value)) return constants[token.value];
        throw new Error(`Unsupported graph variable: ${token.value}.`);
    };

    return (x) => {
        index = 0;
        currentX = x;
        const value = parseExpression();
        if (index !== tokens.length || !Number.isFinite(value)) throw new Error("Graph expression produced an invalid value.");
        return value;
    };
}

function equationVariableNumber(value) {
    const match = String(value ?? "").match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
    return match ? Number(match[0]) : null;
}

const EQUATION_FUNCTIONS = {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    cos: Math.cos,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan
};
const EQUATION_CARD_CONFIGS = new Map();

function createInteractiveEquationExpression(expression, constants = {}) {
    const source = String(expression || "").replace(/\*\*/g, "^").trim();
    const tokenPattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_]\w*)|([()+\-*\/^,]))\s*/y;
    const tokens = [];
    let offset = 0;
    while (offset < source.length) {
        tokenPattern.lastIndex = offset;
        const match = tokenPattern.exec(source);
        if (!match) throw new Error("Expression contains an unsupported character.");
        tokens.push(match[1] ? { type: "number", value: Number(match[1]) } : match[2] ? { type: "name", value: match[2] } : { type: match[3] });
        offset = tokenPattern.lastIndex;
    }
    let currentX = 0;
    let index = 0;
    const peek = (type) => tokens[index]?.type === type;
    const consume = (type) => peek(type) && (++index);
    const parseExpression = () => {
        let value = parseTerm();
        while (peek("+") || peek("-")) {
            const operator = tokens[index++].type;
            const right = parseTerm();
            value = operator === "+" ? value + right : value - right;
        }
        return value;
    };
    const parseTerm = () => {
        let value = parsePower();
        while (peek("*") || peek("/")) {
            const operator = tokens[index++].type;
            const right = parsePower();
            value = operator === "*" ? value * right : value / right;
        }
        return value;
    };
    const parsePower = () => {
        const value = parseUnary();
        return consume("^") ? Math.pow(value, parsePower()) : value;
    };
    const parseUnary = () => {
        if (consume("+")) return parseUnary();
        if (consume("-")) return -parseUnary();
        return parsePrimary();
    };
    const parsePrimary = () => {
        const token = tokens[index++];
        if (!token) throw new Error("Expression is incomplete.");
        if (token.type === "number") return token.value;
        if (token.type === "(") {
            const value = parseExpression();
            if (!consume(")")) throw new Error("Expression has an unmatched parenthesis.");
            return value;
        }
        if (token.type !== "name") throw new Error("Expression expected a value.");
        if (consume("(")) {
            const fn = EQUATION_FUNCTIONS[token.value];
            if (!fn) throw new Error(`Unsupported function: ${token.value}.`);
            const value = fn(parseExpression());
            if (!consume(")")) throw new Error("Function has an unmatched parenthesis.");
            return value;
        }
        if (token.value === "x") return currentX;
        if (token.value === "pi") return Math.PI;
        if (Object.prototype.hasOwnProperty.call(constants, token.value)) return constants[token.value];
        throw new Error(`Unknown variable: ${token.value}.`);
    };
    return (x = 0) => {
        index = 0;
        currentX = x;
        const value = parseExpression();
        if (index !== tokens.length || !Number.isFinite(value)) throw new Error("Expression produced an invalid value.");
        return value;
    };
}

export function getRecentLearnSummary(days = 7) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
    const latestBySession = new Map();

    getProgressEntries()
        .filter((entry) => text(entry.mode) === "learn" && text(entry.dateKey) >= formatDateKey(cutoff))
        .forEach((entry) => {
            const key = text(entry.sessionId) || `${entry.subjectId}:${entry.chapterTitle}`;
            const previous = latestBySession.get(key);
            if (!previous || String(previous.timestamp) < String(entry.timestamp)) {
                latestBySession.set(key, entry);
            }
        });

    const entries = [...latestBySession.values()];
    return {
        mode: "learn",
        attemptCount: entries.length,
        entries,
        learningProgress: entries.length ? Math.max(...entries.map((entry) => Number(entry.learningProgress) || 0)) : 0,
        attempted: entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.attempted) || 0), 0),
        questionCount: entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.questionCount) || 0), 0),
        days: Math.max(0, Number(days) || 7)
    };
}

function normalizeVariableBehaviorGraph(graph, variables, behavior) {
    if (!graph || typeof graph !== "object" || !["variable-behavior", "duct-particle"].includes(text(graph.type))) {
        return null;
    }
    const graphType = text(graph.type);
    const relationship = graph.relationship && typeof graph.relationship === "object" ? graph.relationship : {};
    const left = text(relationship.left);
    const right = text(relationship.right);
    if (!left || !right) throw new Error("Conservation cards need left and right relationship expressions.");
    const axes = graph.axes && typeof graph.axes === "object" ? graph.axes : {};
    const normalizedAxes = ["left", "right"].reduce((result, axis) => {
        const source = axes[axis] && typeof axes[axis] === "object" ? axes[axis] : {};
        result[axis] = { label: text(source.label) || (axis === "left" ? "Left axis" : "Right axis"), unit: text(source.unit) };
        return result;
    }, {});
    const variableSymbols = new Set(variables.map((variable) => variable.symbol));
    const relationshipSymbols = new Set(`${left} ${right}`.match(/[A-Za-z_]\w*/g) || []);
    const allowedNames = new Set(["e", "pi", ...Object.keys(EQUATION_FUNCTIONS)]);
    const unknownSymbols = [...relationshipSymbols].filter((symbol) => !variableSymbols.has(symbol) && !allowedNames.has(symbol));
    if (unknownSymbols.length) throw new Error(`Relationship contains undeclared variable(s): ${unknownSymbols.join(", ")}.`);
    variables.forEach((variable, index) => {
        if (variable.fixed) {
            variable.interactive = false;
            return;
        }
        const axis = text(variable.axis).toLowerCase();
        if (!["left", "right"].includes(axis)) throw new Error(`Variable ${index + 1} must use axis \"left\" or \"right\".`);
        if (!variable.interactive) throw new Error(`Variable ${variable.symbol} must be interactive or fixed in a variable-behavior card.`);
        variable.axis = axis;
    });
    const requestedActive = Array.isArray(behavior?.activeVariables)
        ? behavior.activeVariables
        : [];
    const interactiveSymbols = new Set(variables.filter((variable) => variable.interactive).map((variable) => variable.symbol));
    const activeVariables = requestedActive.filter((symbol, index, list) => interactiveSymbols.has(text(symbol)) && list.indexOf(symbol) === index).map(text);
    if (activeVariables.length !== 2) throw new Error("Variable-behavior cards need exactly two active variables.");
    const particleSource = graph.particles && typeof graph.particles === "object" ? graph.particles : {};
    const particles = graphType === "duct-particle" ? {
        count: Number(particleSource.count ?? 24),
        speedScale: Number(particleSource.speedScale ?? 1),
        showTrails: particleSource.showTrails !== false,
        showVectors: particleSource.showVectors !== false
    } : null;
    if (particles && (!Number.isInteger(particles.count) || particles.count < 8 || particles.count > 100 || !Number.isFinite(particles.speedScale) || particles.speedScale <= 0)) {
        throw new Error("Duct particle settings need a count from 8 to 100 and a positive speed scale.");
    }
    if (graphType === "duct-particle" && variables.filter((variable) => variable.interactive && variable.axis === "left").length < 2) throw new Error("Duct particle cards need two adjustable area variables on the left axis.");
    if (graphType === "duct-particle" && variables.filter((variable) => variable.interactive && variable.axis === "right").length < 2) throw new Error("Duct particle cards need two adjustable velocity variables on the right axis.");
    return { ...graph, type: graphType, relationship: { left, right }, axes: normalizedAxes, activeVariables, ...(particles ? { particles } : {}) };
}

function normalizeInteractiveEquationCard(config) {
    if (!config || typeof config !== "object" || !text(config.equation)) throw new Error("An equation is required.");
    const variables = (Array.isArray(config.variables) ? config.variables : []).map((variable, index) => {
        const entry = variable && typeof variable === "object" ? variable : {};
        const symbol = text(entry.symbol);
        const value = equationVariableNumber(entry.value);
        if (!/^[A-Za-z_]\w*$/.test(symbol) || value === null) throw new Error(`Variable ${index + 1} needs a valid symbol and numeric value.`);
        const fixed = entry.fixed === true;
        const interactive = !fixed && entry.interactive === true;
        const min = Number(entry.min);
        const max = Number(entry.max);
        const step = Number(entry.step);
        if (fixed && !text(entry.unit)) throw new Error(`Fixed variable ${symbol} needs a unit.`);
        if (interactive && (!(max > min) || !Number.isFinite(step) || step <= 0)) throw new Error(`Variable ${symbol} needs valid min, max, and step values.`);
        const displaySymbolHidden = entry.displaySymbolHidden === true;
        return { ...entry, symbol, value: interactive ? Math.min(max, Math.max(min, value)) : value, min, max, step, interactive, fixed, name: text(entry.name) || symbol, displaySymbolHidden, displaySymbol: displaySymbolHidden ? "" : text(entry.displaySymbol) || symbol };
    });
    const variableBehaviorGraph = normalizeVariableBehaviorGraph(config.graph, variables, config.behavior);
    const derived = variableBehaviorGraph ? [] : (Array.isArray(config.derived) ? config.derived : []).map((item, index) => {
        const entry = item && typeof item === "object" ? item : {};
        const symbol = text(entry.symbol);
        const hasExpression = Boolean(text(entry.expression));
        const hasSolver = entry.solver && typeof entry.solver === "object";
        if (!/^[A-Za-z_]\w*$/.test(symbol) || (!hasExpression && !hasSolver)) throw new Error(`Derived value ${index + 1} is invalid.`);
        const displaySymbolHidden = entry.displaySymbolHidden === true;
        return { ...entry, symbol, expression: text(entry.expression), solver: hasSolver ? entry.solver : null, displaySymbolHidden, displaySymbol: displaySymbolHidden ? "" : text(entry.displaySymbol) || symbol };
    });
    const symbols = new Set();
    [...variables, ...derived].forEach((item) => {
        if (symbols.has(item.symbol)) throw new Error(`The symbol ${item.symbol} is declared more than once.`);
        symbols.add(item.symbol);
    });
    return {
        ...config,
        variables,
        derived,
        graph: variableBehaviorGraph || (config.graph && typeof config.graph === "object" ? config.graph : null),
        behaviorMode: variableBehaviorGraph ? variableBehaviorGraph.type : "standard",
        behavior: variableBehaviorGraph ? { activeVariables: [...variableBehaviorGraph.activeVariables] } : null,
        runtimeRanges: {},
        notes: Array.isArray(config.notes) ? config.notes.map(text).filter(Boolean) : []
    };
}

function solveThetaBetaM(thetaDegrees, mach, gamma, branch = "weak") {
    const theta = Number(thetaDegrees) * Math.PI / 180;
    const M = Number(mach);
    const heatRatio = Number(gamma);
    if (!Number.isFinite(theta) || theta < 0 || theta >= Math.PI / 2) throw new Error("Deflection angle must be between 0 and 90 degrees.");
    if (!Number.isFinite(M) || M <= 1) throw new Error("Mach number must be greater than 1 for an attached shock.");
    if (!Number.isFinite(heatRatio) || heatRatio <= 0) throw new Error("Specific heat ratio must be greater than zero.");

    const machAngle = Math.asin(1 / M);
    const lower = machAngle + 1e-7;
    const upper = Math.PI / 2 - 1e-7;
    const residual = (beta) => {
        const sine = Math.sin(beta);
        const denominator = M * M * (heatRatio + Math.cos(2 * beta)) + 2;
        if (Math.abs(sine) < 1e-12 || Math.abs(denominator) < 1e-12) return NaN;
        const right = (2 / Math.tan(beta)) * ((M * M * sine * sine - 1) / denominator);
        return right - Math.tan(theta);
    };
    const roots = [];
    const samples = 720;
    let previousBeta = lower;
    let previousValue = residual(previousBeta);
    for (let index = 1; index <= samples; index += 1) {
        const beta = lower + ((upper - lower) * index) / samples;
        const value = residual(beta);
        if (Number.isFinite(previousValue) && Number.isFinite(value)) {
            if (Math.abs(previousValue) < 1e-8) {
                roots.push(previousBeta);
            } else if (previousValue * value < 0) {
                let left = previousBeta;
                let right = beta;
                for (let iteration = 0; iteration < 60; iteration += 1) {
                    const middle = (left + right) / 2;
                    const middleValue = residual(middle);
                    if (!Number.isFinite(middleValue)) break;
                    if (Math.abs(middleValue) < 1e-10) {
                        left = middle;
                        right = middle;
                        break;
                    }
                    if (previousValue * middleValue <= 0) {
                        right = middle;
                    } else {
                        left = middle;
                        previousValue = middleValue;
                    }
                }
                roots.push((left + right) / 2);
            }
        }
        previousBeta = beta;
        previousValue = value;
    }

    const uniqueRoots = roots.filter((root, index) => index === 0 || Math.abs(root - roots[index - 1]) > 1e-5);
    if (!uniqueRoots.length) throw new Error("No attached-shock solution exists for this deflection angle and Mach number.");
    const selected = branch === "strong" ? uniqueRoots[uniqueRoots.length - 1] : uniqueRoots[0];
    return selected * 180 / Math.PI;
}

function evaluateInteractiveEquationValues(config, values) {
    const resolved = { ...values };
    const pending = [...config.derived];
    let attempts = 0;
    while (pending.length && attempts <= config.derived.length) {
        const unresolved = [];
        pending.forEach((item) => {
            try {
                if (item.solver) {
                    const solver = item.solver;
                    if (text(solver.type) !== "theta-beta-m") throw new Error(`Unsupported solver: ${text(solver.type) || "unknown"}.`);
                    const theta = text(solver.theta);
                    const mach = text(solver.mach);
                    const gamma = text(solver.gamma);
                    if (!Object.prototype.hasOwnProperty.call(resolved, theta)) throw new Error(`Unknown variable: ${theta}.`);
                    if (!Object.prototype.hasOwnProperty.call(resolved, mach)) throw new Error(`Unknown variable: ${mach}.`);
                    if (!Object.prototype.hasOwnProperty.call(resolved, gamma)) throw new Error(`Unknown variable: ${gamma}.`);
                    resolved[item.symbol] = solveThetaBetaM(resolved[theta], resolved[mach], resolved[gamma], text(solver.branch) || "weak");
                } else {
                    resolved[item.symbol] = createInteractiveEquationExpression(item.expression, resolved)(0);
                }
            } catch (error) {
                if (/Unknown variable:/.test(error.message)) unresolved.push(item);
                else throw new Error(`${item.symbol}: ${error.message}`);
            }
        });
        if (unresolved.length === pending.length) throw new Error("Derived values contain an unknown or circular dependency.");
        pending.splice(0, pending.length, ...unresolved);
        attempts += 1;
    }
    return resolved;
}

function equationDisplayValue(value, unit = "") {
    const number = Number(value);
    const formatted = Number.isFinite(number) ? number.toFixed(2).replace(/\.00$/, "") : String(value ?? "");
    return `${formatted}${unit ? ` ${unit}` : ""}`;
}

function getEquationTickStep(min, max, targetTicks = 6) {
    const range = Math.abs(max - min);
    if (!Number.isFinite(range) || range <= 0) return 1;
    const raw = range / Math.max(2, targetTicks);
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const fraction = raw / power;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * power;
}

function getEquationTicks(min, max, targetTicks = 6) {
    const step = getEquationTickStep(min, max, targetTicks);
    const precision = Math.max(0, Math.ceil(-Math.log10(step)) + 2);
    const values = [];
    const first = Math.ceil(min / step) * step;
    for (let value = first; value <= max + step * 0.0001 && values.length < 12; value += step) {
        values.push(Number(value.toFixed(precision)));
    }
    [min, max].forEach((value) => {
        if (!values.some((tick) => Math.abs(tick - value) < step * 0.0001)) values.push(value);
    });
    return [...new Set(values.map((value) => Number(value.toFixed(precision))))].sort((left, right) => left - right);
}

function formatEquationTick(value, step) {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(1).replace("e+", "e");
    const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step)) + 1));
    return Number(value.toFixed(decimals)).toString();
}

function renderInteractiveEquationGraph(graph, values) {
    if (!graph || typeof graph !== "object") return "";
    const xMin = Number(graph.xMin);
    const xMax = Number(graph.xMax);
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !(xMax > xMin)) return `<p class="equation-card-error">Graph error: xMax must be greater than xMin.</p>`;
    const graphValues = { ...(values || {}) };
    const xVariable = text(graph.xVariable);
    let evaluate;
    try {
        evaluate = createInteractiveEquationExpression(graph.expression, graphValues);
    } catch (error) {
        return `<p class="equation-card-error">Graph error: ${equationText(error.message)}</p>`;
    }
    const evaluateAt = (x) => {
        if (xVariable) graphValues[xVariable] = x;
        return evaluate(x);
    };
    const width = 640;
    const height = 420;
    const padding = { left: 62, right: 22, top: 22, bottom: 60 };
    const points = [];
    for (let sample = 0; sample <= 160; sample += 1) {
        const x = xMin + ((xMax - xMin) * sample) / 160;
        try {
            const y = evaluateAt(x);
            if (Number.isFinite(y)) points.push({ x, y });
        } catch (_) {}
    }
    if (points.length < 2) return `<p class="equation-card-error">Graph error: the expression produced no plottable values.</p>`;
    const yMin = Number.isFinite(Number(graph.yMin)) ? Number(graph.yMin) : Math.min(...points.map((point) => point.y));
    const yMax = Number.isFinite(Number(graph.yMax)) ? Number(graph.yMax) : Math.max(...points.map((point) => point.y));
    if (!(yMax > yMin)) return `<p class="equation-card-error">Graph error: yMax must be greater than yMin.</p>`;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const toSvgX = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const toSvgY = (y) => padding.top + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
    const clampX = (value) => Math.max(xMin, Math.min(xMax, value));
    const clampY = (value) => Math.max(yMin, Math.min(yMax, value));
    const path = points.map((point, index) => `${index ? "L" : "M"}${toSvgX(point.x).toFixed(2)} ${toSvgY(point.y).toFixed(2)}`).join(" ");
    const xStep = getEquationTickStep(xMin, xMax);
    const yStep = getEquationTickStep(yMin, yMax);
    const xTicks = getEquationTicks(xMin, xMax);
    const yTicks = getEquationTicks(yMin, yMax, 8);
    const xGrid = xTicks.map((tick) => `<line class="equation-graph-grid" x1="${toSvgX(tick)}" y1="${padding.top}" x2="${toSvgX(tick)}" y2="${height - padding.bottom}"></line><text class="equation-graph-tick-label" x="${toSvgX(tick)}" y="${height - padding.bottom + 20}" text-anchor="middle">${formatEquationTick(tick, xStep)}</text>`).join("");
    const yGrid = yTicks.map((tick) => `<line class="equation-graph-grid" x1="${padding.left}" y1="${toSvgY(tick)}" x2="${width - padding.right}" y2="${toSvgY(tick)}"></line><text class="equation-graph-tick-label" x="${padding.left - 10}" y="${toSvgY(tick) + 4}" text-anchor="end">${formatEquationTick(tick, yStep)}</text>`).join("");
    const markerValue = Number(values[xVariable]);
    const marker = Number.isFinite(markerValue) && markerValue >= xMin && markerValue <= xMax
        ? `<circle class="equation-graph-marker" cx="${toSvgX(markerValue)}" cy="${toSvgY(evaluateAt(markerValue))}" r="5"></circle>`
        : "";
    return `<div class="equation-card-graph-wrap"><svg class="equation-card-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graph of ${equationText(graph.expression || "function")}">${xGrid}${yGrid}<line class="equation-graph-axis" x1="${padding.left}" y1="${toSvgY(clampY(0))}" x2="${width - padding.right}" y2="${toSvgY(clampY(0))}"></line><line class="equation-graph-axis" x1="${toSvgX(clampX(0))}" y1="${padding.top}" x2="${toSvgX(clampX(0))}" y2="${height - padding.bottom}"></line><path class="equation-graph-line" d="${path}"></path>${marker}<text class="equation-graph-label" x="${width / 2}" y="${height - 10}" text-anchor="middle">${equationText(graphLabelText(graph.xLabel, "x"))}</text><text class="equation-graph-label" x="16" y="${height / 2}" text-anchor="middle" transform="rotate(-90 16 ${height / 2})">${equationText(graphLabelText(graph.yLabel, "y"))}</text></svg></div>`;
}

function solveVariableBehaviorPartner(config, values, sourceSymbol, targetSymbol) {
    const solver = globalThis.nerdamer;
    if (typeof solver !== "function") {
        throw new Error("The symbolic equation solver is unavailable.");
    }
    const relationship = config.graph.relationship;
    const equation = `${relationship.left}=(${relationship.right})`.replace(/\*\*/g, "^");
    const equationExpression = solver(equation);
    if (!equationExpression || typeof equationExpression.solveFor !== "function") throw new Error("The symbolic equation solver could not parse the relationship.");
    const solutions = equationExpression.solveFor(targetSymbol);
    const candidates = Array.isArray(solutions) ? solutions : [solutions];
    const variable = config.variables.find((entry) => entry.symbol === targetSymbol);
    const resolved = candidates.map((solution) => {
        if (solution === null || solution === undefined) return null;
        const evaluated = solver(String(solution)).evaluate(values);
        const valueText = typeof evaluated.text === "function" ? evaluated.text("decimal") : String(evaluated);
        if (/\bi\b|NaN|Infinity/i.test(valueText)) return null;
        const value = Number(valueText);
        if (!Number.isFinite(value)) return null;
        if (Number.isFinite(variable?.min) && variable.min >= 0 && value < 0) return null;
        return value;
    }).filter((value, index, list) => value !== null && list.findIndex((candidate) => Math.abs(candidate - value) < 1e-8) === index);
    if (resolved.length === 0) throw new Error(`No valid real value was found for ${targetSymbol}.`);
    if (resolved.length !== 1) throw new Error(`The relationship has multiple valid values for ${targetSymbol}.`);
    return resolved[0];
}

function variableBehaviorRange(config, variable, value) {
    const existing = config.runtimeRanges[variable.symbol] || { min: variable.min, max: variable.max };
    if (value < existing.min) existing.min = value;
    if (value > existing.max) existing.max = value;
    config.runtimeRanges[variable.symbol] = existing;
    return existing;
}

function renderVariableBehaviorGraph(graph, variables, values, activeVariables = []) {
    const width = 820;
    const height = 430;
    const padding = { left: 68, right: 68, top: 34, bottom: 94 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const plotBottom = height - padding.bottom;
    const axisValues = { left: [], right: [] };
    const graphVariables = variables.filter((variable) => variable.interactive);
    graphVariables.forEach((variable) => axisValues[variable.axis].push(Number(values[variable.symbol]) || 0));
    const scales = {};
    ["left", "right"].forEach((axis) => {
        const entries = axisValues[axis];
        const max = Math.max(1, ...entries, 0);
        const min = Math.min(0, ...entries, 0);
        scales[axis] = { min, max };
    });
    const yFor = (axis, value) => {
        const scale = scales[axis];
        const span = Math.max(1e-9, scale.max - scale.min);
        return padding.top + (1 - (value - scale.min) / span) * plotHeight;
    };
    const tickMarkup = (axis, side) => {
        const scale = scales[axis];
        const ticks = Array.from({ length: 5 }, (_, index) => scale.min + ((scale.max - scale.min) * index) / 4);
        const x = side === "left" ? padding.left - 10 : width - padding.right + 10;
        const anchor = side === "left" ? "end" : "start";
        return ticks.map((tick) => `<text class="equation-graph-tick-label" x="${x}" y="${yFor(axis, tick) + 4}" text-anchor="${anchor}">${equationText(formatEquationTick(tick, getEquationTickStep(scale.min, scale.max)))}</text>`).join("");
    };
    const grid = Array.from({ length: 5 }, (_, index) => {
        const y = padding.top + (plotHeight * index) / 4;
        return `<line class="equation-graph-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>`;
    }).join("");
    const slot = plotWidth / Math.max(1, graphVariables.length);
    const bars = graphVariables.map((variable, index) => {
        const value = Number(values[variable.symbol]) || 0;
        const baseline = yFor(variable.axis, 0);
        const y = yFor(variable.axis, value);
        const x = padding.left + slot * index + slot * 0.2;
        const barWidth = slot * 0.6;
        const active = activeVariables.includes(variable.symbol);
        const outsideRange = value < variable.min || value > variable.max;
        const label = `${equationText(variable.name || variable.symbol)}${variable.displaySymbol && variable.displaySymbol !== variable.name ? ` (${equationText(variable.displaySymbol)})` : ""}`;
        const unit = equationText(variable.unit || graph.axes[variable.axis].unit || "");
        return `<g class="equation-variable-bar${active ? " is-active" : ""}${outsideRange ? " is-out-of-range" : ""}"><rect x="${x}" y="${Math.min(y, baseline)}" width="${barWidth}" height="${Math.max(2, Math.abs(baseline - y))}" rx="7"></rect><text class="equation-variable-bar-value" x="${x + barWidth / 2}" y="${Math.min(y, baseline) - 10}" text-anchor="middle">${equationText(equationDisplayValue(value))}</text><text class="equation-variable-bar-label" x="${x + barWidth / 2}" y="${plotBottom + 30}" text-anchor="middle">${label}</text><text class="equation-variable-bar-unit" x="${x + barWidth / 2}" y="${plotBottom + 51}" text-anchor="middle">${unit}</text></g>`;
    }).join("");
    return `<div class="equation-variable-behavior-graph-wrap"><svg class="equation-variable-behavior-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Variable behavior graph"><text class="equation-graph-axis-label" x="${padding.left - 50}" y="${padding.top - 12}" text-anchor="start">${equationText(graph.axes.left.label)}${graph.axes.left.unit ? ` (${equationText(graph.axes.left.unit)})` : ""}</text><text class="equation-graph-axis-label" x="${width - padding.right + 50}" y="${padding.top - 12}" text-anchor="end">${equationText(graph.axes.right.label)}${graph.axes.right.unit ? ` (${equationText(graph.axes.right.unit)})` : ""}</text>${grid}<line class="equation-graph-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${plotBottom}"></line><line class="equation-graph-axis" x1="${width - padding.right}" y1="${padding.top}" x2="${width - padding.right}" y2="${plotBottom}"></line><line class="equation-graph-axis" x1="${padding.left}" y1="${plotBottom}" x2="${width - padding.right}" y2="${plotBottom}"></line>${tickMarkup("left", "left")}${tickMarkup("right", "right")}${bars}</svg></div>`;
}

function renderEquationGraph(graph, variables) {
    if (!graph || typeof graph !== "object") return "";
    const xMin = Number.isFinite(Number(graph.xMin)) ? Number(graph.xMin) : 0;
    const xMax = Number.isFinite(Number(graph.xMax)) ? Number(graph.xMax) : 10;
    if (!(xMax > xMin)) return `<p class="equation-card-error">Graph error: xMax must be greater than xMin.</p>`;
    const constants = Object.fromEntries(variables.map((variable) => [String(variable.symbol || ""), equationVariableNumber(variable.value)]).filter((entry) => entry[0] && entry[1] !== null));
    let evaluate;
    try {
        evaluate = createEquationExpression(graph.expression, constants);
    } catch (error) {
        return `<p class="equation-card-error">Graph error: ${equationText(error.message)}</p>`;
    }
    const width = 640;
    const height = 320;
    const padding = { left: 54, right: 18, top: 18, bottom: 42 };
    const points = [];
    for (let sample = 0; sample <= 120; sample += 1) {
        const x = xMin + ((xMax - xMin) * sample) / 120;
        try {
            const y = evaluate(x);
            if (Number.isFinite(y)) points.push({ x, y });
        } catch (_) {}
    }
    if (points.length < 2) return `<p class="equation-card-error">Graph error: the expression produced no plottable values.</p>`;
    const suppliedYMin = Number(graph.yMin);
    const suppliedYMax = Number(graph.yMax);
    const yMin = Number.isFinite(suppliedYMin) ? suppliedYMin : Math.min(...points.map((point) => point.y));
    const yMax = Number.isFinite(suppliedYMax) ? suppliedYMax : Math.max(...points.map((point) => point.y));
    if (!(yMax > yMin)) return `<p class="equation-card-error">Graph error: yMax must be greater than yMin.</p>`;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const toSvgX = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const toSvgY = (y) => padding.top + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
    const path = points.map((point, index) => `${index ? "L" : "M"}${toSvgX(point.x).toFixed(2)} ${toSvgY(point.y).toFixed(2)}`).join(" ");
    const grid = Array.from({ length: 6 }, (_, index) => {
        const ratio = index / 5;
        const x = padding.left + ratio * plotWidth;
        const y = padding.top + ratio * plotHeight;
        return `<line class="equation-graph-grid" x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}"></line><line class="equation-graph-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>`;
    }).join("");
    const xLabel = equationText(graphLabelText(graph.xLabel, "x"));
    const yLabel = equationText(graphLabelText(graph.yLabel, "y"));
    return `<div class="equation-card-graph-wrap"><svg class="equation-card-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Graph of ${equationText(graph.expression || "function")}">${grid}<line class="equation-graph-axis" x1="${padding.left}" y1="${toSvgY(0)}" x2="${width - padding.right}" y2="${toSvgY(0)}"></line><line class="equation-graph-axis" x1="${toSvgX(0)}" y1="${padding.top}" x2="${toSvgX(0)}" y2="${height - padding.bottom}"></line><path class="equation-graph-line" d="${path}"></path><text class="equation-graph-label" x="${width / 2}" y="${height - 8}" text-anchor="middle">${xLabel}</text><text class="equation-graph-label" x="14" y="${height / 2}" text-anchor="middle" transform="rotate(-90 14 ${height / 2})">${yLabel}</text></svg></div>`;
}

const PARTICLE_CARD_CONFIGS = new Map();
const PARTICLE_PHYSICS_CARD_CONFIGS = new Map();
const FLUID_CONTROL_VOLUME_CONFIGS = new Map();

function normalizeParticleRange(config, key, defaults, label) {
    const source = config?.[key] && typeof config[key] === "object" ? config[key] : {};
    const min = Number(source.min ?? defaults.min);
    const max = Number(source.max ?? defaults.max);
    const step = Number(source.step ?? defaults.step);
    const value = Number(source.value ?? defaults.value);
    if (!(max > min) || !Number.isFinite(step) || step <= 0 || !Number.isFinite(value)) {
        throw new Error(`${label} needs valid min, max, step, and value settings.`);
    }
    return {
        value: Math.min(max, Math.max(min, value)),
        min,
        max,
        step,
        unit: text(source.unit) || defaults.unit
    };
}

function normalizeParticleCard(config) {
    if (!config || typeof config !== "object") throw new Error("A particle-card configuration is required.");
    const particleCount = Number(config.particleCount ?? 36);
    if (!Number.isInteger(particleCount) || particleCount < 8 || particleCount > 100) {
        throw new Error("particleCount must be a whole number between 8 and 100.");
    }
    const modern = config.mass !== undefined || (config.gas && typeof config.gas === "object");
    const temperature = normalizeParticleRange(config, "temperature", { value: modern ? 288.15 : 300, min: 100, max: 900, step: modern ? 1 : 10, unit: "K" }, "Temperature");
    const volume = normalizeParticleRange(config, "volume", modern ? { value: 1, min: 0.1, max: 5, step: 0.01, unit: "m^3" } : { value: 1, min: 0.5, max: 2, step: 0.05, unit: "relative" }, "Volume");
    if (modern && volume.min <= 0) throw new Error("Volume must have a positive minimum.");
    const mass = modern ? normalizeParticleRange(config, "mass", { value: 1.225, min: 0.1, max: 5, step: 0.01, unit: "kg" }, "Mass") : null;
    if (modern && mass.min <= 0) throw new Error("Mass must have a positive minimum.");
    if (modern && config.mass && Number(config.mass.value) <= 0) throw new Error("Mass must be positive.");
    if (modern && config.volume && Number(config.volume.value) <= 0) throw new Error("Volume must be positive.");
    const gas = config.gas && typeof config.gas === "object" ? config.gas : {};
    const gasConstant = modern ? Number(gas.R ?? 287) : null;
    if (modern && (!Number.isFinite(gasConstant) || gasConstant <= 0)) throw new Error("The gas constant R must be positive.");
    return {
        title: text(config.title) || "Temperature, Volume, and Pressure",
        subtitle: text(config.subtitle),
        particleCount,
        modern,
        gas: modern ? { R: gasConstant, unit: text(gas.unit) || "J/(kg·K)" } : null,
        temperature,
        mass,
        volume,
        notes: Array.isArray(config.notes) ? config.notes.map(text).filter(Boolean) : []
    };
}

function particleDisplayValue(value, range) {
    const digits = range.step < 0.1 ? 2 : range.step < 1 ? 1 : 0;
    return `${Number(value).toFixed(digits)}${range.unit ? ` ${range.unit}` : ""}`;
}

function renderParticleCard(config, cardIndex) {
    const normalized = normalizeParticleCard(config);
    PARTICLE_CARD_CONFIGS.set(String(cardIndex), normalized);
    const temperature = normalized.temperature;
    const mass = normalized.mass;
    const volume = normalized.volume;
    const notes = normalized.notes.map((note) => `<p>${equationText(note)}</p>`).join("");
    const equationPanel = normalized.modern ? `<section class="particle-card-equation" aria-label="Ideal gas equation"><p class="section-label">Ideal Gas Relationship</p><div>$$P = \\rho R T$$</div></section>` : "";
    const temperatureControl = `<div class="particle-card-control"><div class="particle-card-control-heading"><label for="particle-temperature-${cardIndex}">Temperature</label><output data-particle-temperature-output>${equationText(particleDisplayValue(temperature.value, temperature))}</output></div><input id="particle-temperature-${cardIndex}" class="particle-card-range" type="range" min="${temperature.min}" max="${temperature.max}" step="${temperature.step}" value="${temperature.value}" data-particle-input="temperature" aria-label="Adjust temperature"></div>`;
    const volumeControl = `<div class="particle-card-control"><div class="particle-card-control-heading"><label for="particle-volume-${cardIndex}">Volume</label><output data-particle-volume-output>${equationText(particleDisplayValue(volume.value, volume))}</output></div><input id="particle-volume-${cardIndex}" class="particle-card-range" type="range" min="${volume.min}" max="${volume.max}" step="${volume.step}" value="${volume.value}" data-particle-input="volume" aria-label="Adjust volume in cubic meters"></div>`;
    const modernControls = `<details class="particle-density-controls" open><summary>Density Controls</summary><div class="particle-density-control-body"><div class="particle-card-control"><div class="particle-card-control-heading"><label for="particle-mass-${cardIndex}">Mass</label><output data-particle-mass-output>${equationText(particleDisplayValue(mass.value, mass))}</output></div><input id="particle-mass-${cardIndex}" class="particle-card-range" type="range" min="${mass.min}" max="${mass.max}" step="${mass.step}" value="${mass.value}" data-particle-input="mass" aria-label="Adjust mass in kilograms"></div>${volumeControl}</div></details>`;
    const legacyControls = volumeControl.replace(/Volume/g, "Relative volume").replace(/volume in cubic meters/g, "relative volume");
    const metrics = normalized.modern ? `<div class="particle-card-metrics"><div class="particle-card-metric"><span>Pressure</span><strong data-particle-pressure>--</strong><small>Pa from P = rho R T</small></div><div class="particle-card-metric"><span>Density</span><strong data-particle-density>--</strong><small>kg/m^3 from m/V</small></div></div>` : `<div class="particle-card-metrics"><div class="particle-card-metric"><span>Reference pressure</span><strong data-particle-ideal-pressure>1.00</strong><small>P/P₀ from ideal-gas behavior</small></div><div class="particle-card-metric"><span>Collision pressure</span><strong data-particle-collision-pressure>1.00</strong><small>P/P₀ from wall impacts</small></div></div>`;
    const controls = normalized.modern ? `${temperatureControl}${modernControls}` : `${temperatureControl}${legacyControls}`;
    const caption = normalized.modern ? "Particle speed represents temperature. Container area represents physical volume." : "Particle speed represents temperature. Container area represents relative volume.";
    return `<article class="particle-card${normalized.modern ? " particle-card-modern" : ""}" data-particle-card="${equationText(cardIndex)}"><header class="particle-card-header"><div><p class="section-label">Interactive Gas Model</p><h3>${equationText(normalized.title)}</h3>${normalized.subtitle ? `<p>${equationText(normalized.subtitle)}</p>` : ""}</div><button type="button" class="card-fullscreen-button" data-card-fullscreen aria-label="Enter fullscreen for particle card" aria-pressed="false">Fullscreen</button></header>${equationPanel}<div class="particle-card-layout"><section class="particle-card-simulation" aria-label="Animated two-dimensional gas container"><canvas class="particle-card-canvas" data-particle-canvas role="img" aria-label="Moving particles inside a resizable control volume"></canvas><div class="particle-card-canvas-caption">${caption}</div></section><section class="particle-card-controls">${controls}${metrics}<p class="particle-card-status" data-particle-status aria-live="polite"></p></section></div>${notes ? `<section class="particle-card-notes"><p class="section-label">About this model</p>${notes}</section>` : ""}</article>`;
}

function reportParticleCardIssue(card, message) {
    if (!card) return;
    card.classList.add("particle-card-error-state");
    let status = card.querySelector("[data-particle-status]");
    if (!status) {
        status = document.createElement("p");
        status.className = "particle-card-status";
        card.appendChild(status);
    }
    if (status) {
        status.textContent = `Particle card unavailable: ${message}`;
        status.setAttribute("role", "alert");
    }
    console.error("Particle Card hydration failed:", message);
}

function hydrateParticleCards(container) {
    container.querySelectorAll("[data-particle-card]").forEach((card) => {
        try {
        const config = PARTICLE_CARD_CONFIGS.get(card.dataset.particleCard);
        const canvas = card.querySelector("[data-particle-canvas]");
        if (!config) {
            reportParticleCardIssue(card, "the card configuration is missing.");
            return;
        }
        if (!canvas) {
            reportParticleCardIssue(card, "the simulation canvas is missing.");
            return;
        }
        const context = canvas.getContext("2d");
        if (!context) {
            reportParticleCardIssue(card, "this browser could not create a 2D canvas context.");
            return;
        }
        const values = { temperature: config.temperature.value, volume: config.volume.value, ...(config.modern ? { mass: config.mass.value } : {}) };
        const particles = [];
        const pulses = { top: 0, right: 0, bottom: 0, left: 0 };
        const state = { width: 0, height: 0, box: null, lastTime: 0, collisionPressure: 1, impulse: 0, sampleTime: 0, raf: 0, stopped: false };
        const temperatureOutput = card.querySelector("[data-particle-temperature-output]");
        const volumeOutput = card.querySelector("[data-particle-volume-output]");
        const massOutput = card.querySelector("[data-particle-mass-output]");
        const idealOutput = card.querySelector("[data-particle-ideal-pressure]");
        const pressureOutput = card.querySelector("[data-particle-pressure]");
        const densityOutput = card.querySelector("[data-particle-density]");
        const collisionOutput = card.querySelector("[data-particle-collision-pressure]");
        const status = card.querySelector("[data-particle-status]");
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const density = () => config.modern ? values.mass / values.volume : null;
        const idealPressure = () => config.modern ? density() * config.gas.R * values.temperature : (values.temperature / config.temperature.value) * (config.volume.value / values.volume);
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(280, rect.width || 640);
            const height = Math.max(220, rect.height || 390);
            const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            state.width = width;
            state.height = height;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            particles.forEach((particle) => {
                particle.x = clamp(particle.x, 20, width - 20);
                particle.y = clamp(particle.y, 20, height - 20);
            });
        };
        const updateBox = () => {
            const scale = Math.sqrt(values.volume / config.volume.value);
            const boxWidth = clamp(state.width * 0.78 * scale, 150, state.width - 28);
            const boxHeight = clamp(state.height * 0.72 * scale, 120, state.height - 28);
            state.box = { left: (state.width - boxWidth) / 2, top: (state.height - boxHeight) / 2, right: (state.width + boxWidth) / 2, bottom: (state.height + boxHeight) / 2 };
            particles.forEach((particle) => {
                particle.x = clamp(particle.x, state.box.left + particle.radius, state.box.right - particle.radius);
                particle.y = clamp(particle.y, state.box.top + particle.radius, state.box.bottom - particle.radius);
            });
        };
        const speedScale = () => Math.sqrt(values.temperature / config.temperature.value);
        const resetParticleSpeed = () => {
            const target = 64 * speedScale();
            particles.forEach((particle) => {
                const speed = Math.hypot(particle.vx, particle.vy) || 1;
                particle.vx = (particle.vx / speed) * target;
                particle.vy = (particle.vy / speed) * target;
            });
        };
        const particleCountForMass = () => config.modern ? clamp(Math.round(config.particleCount * values.mass / config.mass.value), 8, 100) : config.particleCount;
        const makeParticle = (index) => {
            const angle = (index * 2.399963) % (Math.PI * 2);
            const speed = 64 * speedScale() * (0.78 + (index % 5) * 0.08);
            return { x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 5.5 };
        };
        const placeParticle = (particle, index) => {
            if (!state.box) return;
            const angle = (index * 2.399963) % (Math.PI * 2);
            const radius = Math.min(state.box.right - state.box.left, state.box.bottom - state.box.top) * 0.42;
            particle.x = clamp((state.box.left + state.box.right) / 2 + Math.cos(angle) * radius * ((index % 4) / 4), state.box.left + particle.radius, state.box.right - particle.radius);
            particle.y = clamp((state.box.top + state.box.bottom) / 2 + Math.sin(angle) * radius * ((index % 5) / 5), state.box.top + particle.radius, state.box.bottom - particle.radius);
        };
        const syncParticleCount = () => {
            const target = particleCountForMass();
            while (particles.length < target) {
                const particle = makeParticle(particles.length);
                placeParticle(particle, particles.length);
                particles.push(particle);
            }
            if (particles.length > target) particles.splice(target);
        };
        const collideParticles = () => {
            for (let first = 0; first < particles.length; first += 1) {
                for (let second = first + 1; second < particles.length; second += 1) {
                    const a = particles[first];
                    const b = particles[second];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const distance = Math.hypot(dx, dy);
                    const minimum = a.radius + b.radius;
                    if (!distance || distance >= minimum) continue;
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const overlap = (minimum - distance) / 2;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                    if (relative > 0) continue;
                    a.vx += relative * nx;
                    a.vy += relative * ny;
                    b.vx -= relative * nx;
                    b.vy -= relative * ny;
                }
            }
        };
        const wallImpact = (wall, impulse) => {
            state.impulse += impulse;
            pulses[wall] = Math.min(1, pulses[wall] + 0.45);
        };
        const update = (delta) => {
            if (!state.box) return;
            particles.forEach((particle) => {
                particle.x += particle.vx * delta;
                particle.y += particle.vy * delta;
                if (particle.x - particle.radius < state.box.left) { particle.x = state.box.left + particle.radius; particle.vx = Math.abs(particle.vx); wallImpact("left", Math.abs(particle.vx)); }
                if (particle.x + particle.radius > state.box.right) { particle.x = state.box.right - particle.radius; particle.vx = -Math.abs(particle.vx); wallImpact("right", Math.abs(particle.vx)); }
                if (particle.y - particle.radius < state.box.top) { particle.y = state.box.top + particle.radius; particle.vy = Math.abs(particle.vy); wallImpact("top", Math.abs(particle.vy)); }
                if (particle.y + particle.radius > state.box.bottom) { particle.y = state.box.bottom - particle.radius; particle.vy = -Math.abs(particle.vy); wallImpact("bottom", Math.abs(particle.vy)); }
            });
            collideParticles();
        };
        const draw = () => {
            if (!state.box) return;
            context.clearRect(0, 0, state.width, state.height);
            const pressure = clamp(state.collisionPressure, 0.5, 3);
            const wallColor = `rgba(255, ${Math.round(210 - clamp(pressure - 1, 0, 1) * 120)}, 102, ${0.35 + clamp(pressure / 4, 0, 0.35)})`;
            context.fillStyle = "rgba(3, 17, 29, 0.62)";
            context.fillRect(state.box.left, state.box.top, state.box.right - state.box.left, state.box.bottom - state.box.top);
            context.strokeStyle = wallColor;
            context.lineWidth = 4 + clamp(pressure - 1, 0, 2) * 2;
            context.strokeRect(state.box.left, state.box.top, state.box.right - state.box.left, state.box.bottom - state.box.top);
            Object.entries(pulses).forEach(([wall, intensity]) => {
                if (intensity <= 0.01) return;
                context.fillStyle = `rgba(255, 209, 102, ${intensity * 0.45})`;
                if (wall === "left") context.fillRect(state.box.left - 12, state.box.top, 12, state.box.bottom - state.box.top);
                if (wall === "right") context.fillRect(state.box.right, state.box.top, 12, state.box.bottom - state.box.top);
                if (wall === "top") context.fillRect(state.box.left, state.box.top - 12, state.box.right - state.box.left, 12);
                if (wall === "bottom") context.fillRect(state.box.left, state.box.bottom, state.box.right - state.box.left, 12);
                pulses[wall] *= 0.88;
            });
            particles.forEach((particle) => {
                const speed = Math.hypot(particle.vx, particle.vy);
                const color = `hsl(${clamp(205 - speed * 0.55, 20, 205)} 88% 67%)`;
                context.beginPath();
                context.fillStyle = color;
                context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                context.fill();
            });
        };
        const renderReadings = () => {
            const ideal = idealPressure();
            if (temperatureOutput) temperatureOutput.textContent = particleDisplayValue(values.temperature, config.temperature);
            if (volumeOutput) volumeOutput.textContent = particleDisplayValue(values.volume, config.volume);
            if (massOutput) massOutput.textContent = particleDisplayValue(values.mass, config.mass);
            if (idealOutput) idealOutput.textContent = ideal.toFixed(2);
            if (pressureOutput) pressureOutput.textContent = `${ideal.toFixed(0)} Pa`;
            if (densityOutput) densityOutput.textContent = `${density().toFixed(3)} kg/m^3`;
            if (collisionOutput) collisionOutput.textContent = state.collisionPressure.toFixed(2);
            if (status) status.textContent = config.modern ? "Pressure follows density, temperature, and the gas constant." : "Higher pressure means more frequent or harder wall impacts.";
        };
        const frame = (timestamp) => {
            try {
            if (state.stopped || !card.isConnected) {
                state.stopped = true;
                if (state.resizeObserver) state.resizeObserver.disconnect();
                return;
            }
            const delta = Math.min(0.04, state.lastTime ? (timestamp - state.lastTime) / 1000 : 0.016);
            state.lastTime = timestamp;
            update(delta);
            state.sampleTime += delta;
            if (state.sampleTime >= 0.24) {
                const perimeter = Math.max(1, 2 * ((state.box?.right || 1) - (state.box?.left || 0) + (state.box?.bottom || 1) - (state.box?.top || 0)));
                const raw = (state.impulse / state.sampleTime / perimeter) / 0.08;
                state.collisionPressure += (clamp(raw, 0.2, 4) - state.collisionPressure) * 0.35;
                state.impulse = 0;
                state.sampleTime = 0;
                renderReadings();
            }
            draw();
            state.raf = requestAnimationFrame(frame);
            } catch (error) {
                state.stopped = true;
                reportParticleCardIssue(card, error?.message || "the animation loop stopped unexpectedly.");
            }
        };
        const inputHandlers = card.querySelectorAll("[data-particle-input]");
        inputHandlers.forEach((input) => input.addEventListener("input", () => {
            values[input.dataset.particleInput] = Number(input.value);
            if (input.dataset.particleInput === "temperature") resetParticleSpeed();
            if (input.dataset.particleInput === "volume") updateBox();
            if (input.dataset.particleInput === "mass") syncParticleCount();
            renderReadings();
        }));
        syncParticleCount();
        resize();
        updateBox();
        particles.forEach((particle, index) => {
            const angle = (index * 2.399963) % (Math.PI * 2);
            const radius = Math.min(state.box.right - state.box.left, state.box.bottom - state.box.top) * 0.42;
            particle.x = (state.box.left + state.box.right) / 2 + Math.cos(angle) * radius * ((index % 4) / 4);
            particle.y = (state.box.top + state.box.bottom) / 2 + Math.sin(angle) * radius * ((index % 5) / 5);
        });
        state.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => { resize(); updateBox(); }) : null;
        state.resizeObserver?.observe(canvas);
        renderReadings();
        if (typeof requestAnimationFrame !== "function") {
            reportParticleCardIssue(card, "animation is unavailable in this browser.");
            return;
        }
        state.raf = requestAnimationFrame(frame);
        } catch (error) {
            reportParticleCardIssue(card, error?.message || "an unexpected hydration error occurred.");
        }
    });
}

function renderDuctParticleVisualization(normalized, values) {
    const areaVariables = normalized.variables.filter((variable) => variable.interactive && variable.axis === "left").slice(0, 2);
    const velocityVariables = normalized.variables.filter((variable) => variable.interactive && variable.axis === "right").slice(0, 2);
    const windows = [
        { key: "inlet", label: "Inlet Control Volume", area: areaVariables[0], velocity: velocityVariables[0] },
        { key: "outlet", label: "Outlet Control Volume", area: areaVariables[1], velocity: velocityVariables[1] }
    ].map((window) => {
        const areaSymbol = window.area.displaySymbol || window.area.symbol;
        const velocitySymbol = window.velocity.displaySymbol || window.velocity.symbol;
        const productLabel = `${areaSymbol} \\cdot ${velocitySymbol}`;
        const productText = `${areaSymbol} · ${velocitySymbol}`;
        const product = Number(values[window.area.symbol]) * Number(values[window.velocity.symbol]);
        const control = (variable) => {
            const symbol = equationText(variable.symbol);
            const label = equationText(variable.name || variable.symbol);
            const displayLabel = variable.displaySymbol ? ` <strong>$${equationText(variable.displaySymbol)}$</strong>` : "";
            return `<div class="equation-card-variable duct-particle-variable-control" data-equation-variable="${symbol}"><div class="equation-card-variable-heading"><span><button type="button" class="equation-variable-select" data-equation-select-variable="${symbol}" aria-label="Toggle ${label} as an active variable" aria-pressed="false"></button>${label}${displayLabel}</span><output data-equation-control-value="${symbol}">${equationText(equationDisplayValue(variable.value, variable.unit))}</output></div><input class="equation-card-range" type="range" min="${variable.min}" max="${variable.max}" step="${variable.step}" value="${variable.value}" data-equation-input="${symbol}" aria-label="Adjust ${label}"></div>`;
        };
        return `<section class="duct-particle-window" data-duct-window="${window.key}"><header class="duct-particle-window-header"><div><p class="equation-card-section-label">${equationText(window.label)}</p><strong>$${equationText(areaSymbol)}$ · $${equationText(velocitySymbol)}$</strong></div></header><div class="duct-particle-window-values" aria-label="${equationText(window.label)} values"><span><b>Area</b><output data-duct-value="${window.key}-area">${equationText(equationDisplayValue(values[window.area.symbol], window.area.unit))}</output></span><span><b>Velocity</b><output data-duct-value="${window.key}-velocity">${equationText(equationDisplayValue(values[window.velocity.symbol], window.velocity.unit))}</output></span><span class="duct-particle-product"><b>${equationText(productText)}</b><output data-duct-value="${window.key}-product" aria-label="${equationText(productLabel)} product">${equationText(equationDisplayValue(product))} ${equationText(`${window.area.unit} · ${window.velocity.unit}`)}</output></span></div><div class="duct-particle-window-controls"><p class="equation-card-section-label">Adjust Variables</p>${control(window.area)}${control(window.velocity)}</div><canvas data-duct-canvas="${window.key}" role="img" aria-label="${equationText(window.label)} with moving fluid parcels"></canvas><p class="duct-particle-window-caption">Toggle a circle to make a variable active or calculated.</p></section>`;
    }).join("");
    return `<section class="duct-particle-visualization" data-duct-particle-visualization><div class="duct-particle-windows">${windows}</div><div class="duct-particle-connector" aria-hidden="true"><span>Flow direction</span><i></i></div></section>`;
}

function hydrateDuctParticleScene(card, config, values) {
    const areaVariables = config.variables.filter((variable) => variable.interactive && variable.axis === "left").slice(0, 2);
    const velocityVariables = config.variables.filter((variable) => variable.interactive && variable.axis === "right").slice(0, 2);
    const windows = [
        { key: "inlet", area: areaVariables[0], velocity: velocityVariables[0], canvas: card.querySelector('[data-duct-canvas="inlet"]') },
        { key: "outlet", area: areaVariables[1], velocity: velocityVariables[1], canvas: card.querySelector('[data-duct-canvas="outlet"]') }
    ];
    const state = { particles: [], raf: 0, lastTime: 0, width: 0, height: 0, stopped: false };
    const createParticleSet = () => windows.map(() => Array.from({ length: config.graph.particles.count }, (_, index) => ({ phase: index / config.graph.particles.count, y: 0.18 + ((index * 0.618) % 1) * 0.64, trail: [] })));
    state.particles = createParticleSet();
    const resizeCanvas = (canvas) => {
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(260, rect.width || 420);
        const height = Math.max(210, rect.height || 270);
        const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        const context = canvas.getContext("2d");
        context?.setTransform(ratio, 0, 0, ratio, 0, 0);
        return { context, width, height };
    };
    const drawWindow = (windowConfig, windowIndex, delta) => {
        const metrics = resizeCanvas(windowConfig.canvas);
        if (!metrics?.context) return;
        const { context, width, height } = metrics;
        state.width = width; state.height = height;
        const maxArea = Math.max(...areaVariables.map((variable) => Number(variable.max) || 1), 1);
        const area = Number(values[windowConfig.area.symbol]) || 0;
        const velocity = Number(values[windowConfig.velocity.symbol]) || 0;
        const maxVelocity = Math.max(...velocityVariables.map((variable) => Number(variable.max) || 1), 1);
        const opening = Math.max(0.24, Math.min(0.82, 0.24 + (area / maxArea) * 0.58));
        const left = 22; const right = width - 22; const top = (height * (1 - opening)) / 2; const bottom = height - top;
        const center = (top + bottom) / 2;
        const speed = (velocity / maxVelocity) * config.graph.particles.speedScale * 0.48;
        context.clearRect(0, 0, width, height);
        context.fillStyle = "rgba(3, 17, 29, 0.82)"; context.fillRect(0, 0, width, height);
        context.strokeStyle = "rgba(77,184,255,.28)"; context.lineWidth = 1; context.strokeRect(10, 10, width - 20, height - 20);
        context.fillStyle = "rgba(77,184,255,.13)"; context.fillRect(left, top, right - left, bottom - top);
        context.strokeStyle = "#4db8ff"; context.lineWidth = 3; context.beginPath(); context.moveTo(left, top); context.lineTo(right, top); context.moveTo(left, bottom); context.lineTo(right, bottom); context.stroke();
        context.fillStyle = "#91a0b6"; context.font = "12px sans-serif"; context.fillText(windowIndex === 0 ? "Flow enters" : "Flow exits", 16, 24);
        state.particles[windowIndex].forEach((particle) => {
            particle.phase = (particle.phase + speed * delta) % 1;
            const x = left + particle.phase * (right - left);
            const y = top + particle.y * (bottom - top);
            if (config.graph.particles.showTrails) { particle.trail.push({ x, y }); if (particle.trail.length > 9) particle.trail.shift(); context.strokeStyle = "rgba(189,92,255,.3)"; context.lineWidth = 1; context.beginPath(); particle.trail.forEach((point, pointIndex) => pointIndex ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); } else particle.trail = [];
            context.fillStyle = windowIndex === 0 ? "#4db8ff" : "#bd5cff"; context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill();
            if (config.graph.particles.showVectors) { context.strokeStyle = context.fillStyle; context.lineWidth = 1.5; context.beginPath(); context.moveTo(x, y); context.lineTo(Math.min(right - 2, x + 16 + speed * 16), y); context.stroke(); }
        });
        context.fillStyle = "#91a0b6"; context.fillText(`A = ${area.toFixed(2)} ${windowConfig.area.unit}`, 16, height - 26); context.fillText(`V = ${velocity.toFixed(2)} ${windowConfig.velocity.unit}`, 16, height - 11);
        const product = area * velocity;
        card.querySelector(`[data-duct-value="${windowConfig.key}-area"]`)?.replaceChildren(document.createTextNode(equationDisplayValue(area, windowConfig.area.unit)));
        card.querySelector(`[data-duct-value="${windowConfig.key}-velocity"]`)?.replaceChildren(document.createTextNode(equationDisplayValue(velocity, windowConfig.velocity.unit)));
        card.querySelector(`[data-duct-value="${windowConfig.key}-product"]`)?.replaceChildren(document.createTextNode(`${equationDisplayValue(product)} ${windowConfig.area.unit} · ${windowConfig.velocity.unit}`));
    };
    const draw = (delta = 0) => windows.forEach((windowConfig, index) => drawWindow(windowConfig, index, delta));
    const frame = (timestamp) => { if (state.stopped || !card.isConnected) return; const delta = Math.min(0.04, state.lastTime ? (timestamp - state.lastTime) / 1000 : 0.016); state.lastTime = timestamp; draw(delta); state.raf = requestAnimationFrame(frame); };
    const reset = () => { state.particles = createParticleSet(); state.lastTime = 0; draw(); };
    draw();
    if (typeof requestAnimationFrame === "function") state.raf = requestAnimationFrame(frame);
    else throw new Error("Duct particle animation is unavailable in this browser.");
    return { reset, draw: () => draw(), stop: () => { state.stopped = true; cancelAnimationFrame(state.raf); } };
}

function renderVariableBehaviorEquationCard(normalized, cardIndex) {
    EQUATION_CARD_CONFIGS.set(String(cardIndex), normalized);
    const variableRows = normalized.variables.filter((variable) => variable.interactive).map((variable) => {
        const symbol = equationText(variable.symbol);
        const label = equationText(variable.name || variable.symbol);
        const displayLabel = variable.displaySymbol ? ` <strong>$${equationText(variable.displaySymbol)}$</strong>` : "";
        return `<div class="equation-card-variable equation-variable-behavior-row" data-equation-variable="${symbol}"><div class="equation-card-variable-heading"><span><button type="button" class="equation-variable-select" data-equation-select-variable="${symbol}" aria-label="Select ${label} as an active variable" aria-pressed="false"></button>${label}${displayLabel}</span><output data-equation-value="${symbol}">${equationText(equationDisplayValue(variable.value, variable.unit))}</output></div><input class="equation-card-range" type="range" min="${variable.min}" max="${variable.max}" step="${variable.step}" value="${variable.value}" data-equation-input="${symbol}" aria-label="Adjust ${label}"></div>`;
    }).join("");
    const constantRows = normalized.variables.filter((variable) => variable.fixed).map((variable) => {
        const symbol = variable.displaySymbol ? `<strong>$${equationText(variable.displaySymbol)}$</strong>` : "";
        const label = equationText(variable.name || variable.symbol);
        return `<div class="equation-card-constant" data-equation-variable="${equationText(variable.symbol)}"><span>${label} ${symbol}</span><strong data-equation-value="${equationText(variable.symbol)}">${equationText(equationDisplayValue(variable.value, variable.unit))}</strong></div>`;
    }).join("");
    const initialValues = Object.fromEntries(normalized.variables.map((variable) => [variable.symbol, variable.value]));
    const isDuctParticle = normalized.graph.type === "duct-particle";
    const equationPanel = `<section class="equation-card-equation-wide"><p class="equation-card-section-label">Equation</p><div class="equation-card-equation">$$${equationText(normalized.equation)}$$</div></section>`;
    const constantsPanel = constantRows ? `<div class="equation-card-section equation-card-constants-section"><p class="equation-card-section-label">Fixed Constants</p><div class="equation-card-constants">${constantRows}</div></div>` : "";
    const conservationPanel = isDuctParticle ? "" : `<div class="equation-card-section equation-card-conservation-results"><p class="equation-card-section-label">Conservation values</p><div class="equation-card-metrics"><div class="equation-card-metric"><span>Left side</span><strong data-equation-side="left">--</strong><small>${equationText(normalized.graph.relationship.left)}</small></div><div class="equation-card-metric"><span>Right side</span><strong data-equation-side="right">--</strong><small>${equationText(normalized.graph.relationship.right)}</small></div></div></div>`;
    const controlPanel = `<section class="equation-card-control-panel"><div class="equation-card-section equation-card-variable-section"><p class="equation-card-section-label">${isDuctParticle ? "Variable Selection" : "Variables"}</p><div class="equation-card-inputs">${isDuctParticle ? "" : variableRows}</div><p class="equation-card-selection-help">${isDuctParticle ? "Turn off an active circle before selecting another variable." : "Select two circles to choose the active variables."}</p><div class="equation-card-legend"><span><i class="equation-legend-swatch adjustable"></i>Active</span><span><i class="equation-legend-swatch calculated"></i>Calculated</span></div></div>${constantsPanel}${conservationPanel}<div class="equation-card-live-region" data-equation-status aria-live="polite"></div></section>`;
    const graphPanel = isDuctParticle ? renderDuctParticleVisualization(normalized, initialValues) : `<section class="equation-card-graph-panel"><p class="equation-card-section-label">Bar Graph — Relative Magnitudes</p><div class="equation-card-graph-stage" data-equation-graph>${renderVariableBehaviorGraph(normalized.graph, normalized.variables, initialValues, normalized.behavior.activeVariables)}</div></section>`;
    const explanation = normalized.subtitle || normalized.notes.length
        ? `<section class="equation-card-explanation"><p class="section-label">Relationship Insight</p>${normalized.subtitle ? `<p class="equation-card-explanation-lead">${equationText(normalized.subtitle)}</p>` : ""}${normalized.notes.map((note) => `<p>${equationText(note)}</p>`).join("")}</section>`
        : "";
    const body = isDuctParticle ? `${equationPanel}${graphPanel}${controlPanel}` : `${equationPanel}<div class="equation-card-layout">${controlPanel}${graphPanel}</div>`;
    return `<article class="equation-card equation-card-interactive equation-card-variable-behavior${isDuctParticle ? " equation-card-duct-particle" : ""}" data-equation-card="${equationText(cardIndex)}"><header class="equation-card-header"><div><p class="section-label">${isDuctParticle ? "Duct Particle Conservation" : "Conservation Variable Behavior"}</p><h3>${equationText(normalized.title || "Equation")}</h3></div><button type="button" class="card-fullscreen-button" data-card-fullscreen aria-label="Enter fullscreen for equation card" aria-pressed="false">Fullscreen</button></header>${body}</article>${explanation}`;
}

function renderEquationCard(config, cardIndex) {
    const normalized = normalizeInteractiveEquationCard(config);
    if (normalized.behaviorMode === "variable-behavior" || normalized.behaviorMode === "duct-particle") return renderVariableBehaviorEquationCard(normalized, cardIndex);
    EQUATION_CARD_CONFIGS.set(String(cardIndex), normalized);
    const variableRows = normalized.variables.map((variable) => {
        const symbol = equationText(variable.symbol);
        const label = equationText(variable.name || variable.symbol);
        const displayLabel = variable.displaySymbol ? ` <strong>$${equationText(variable.displaySymbol)}$</strong>` : "";
        return `<div class="equation-card-variable" data-equation-variable="${symbol}"><div class="equation-card-variable-heading"><span>${label}${displayLabel}</span><output data-equation-value="${symbol}">${equationText(equationDisplayValue(variable.value, variable.unit))}</output></div>${variable.interactive ? `<input class="equation-card-range" type="range" min="${variable.min}" max="${variable.max}" step="${variable.step}" value="${variable.value}" data-equation-input="${symbol}" aria-label="Adjust ${label}">` : `<p class="equation-card-fixed">Fixed value</p>`}</div>`;
    }).join("");
    const derivedRows = normalized.derived.map((item) => `<div class="equation-card-metric"><span>${item.displaySymbol ? `$${equationText(item.displaySymbol)}$` : ""}</span><strong data-equation-derived="${equationText(item.symbol)}">--</strong><small>${equationText(item.name || item.symbol)}${item.unit ? ` · ${equationText(item.unit)}` : ""}</small></div>`).join("");
    const explanationItems = normalized.variables
        .filter((variable) => variable.description)
        .map((variable) => `<p><strong>${equationText(variable.name || variable.symbol)}:</strong> ${equationText(variable.description)}</p>`)
        .join("");
    const explanation = normalized.subtitle || explanationItems || normalized.notes.length
        ? `<section class="equation-card-explanation"><p class="section-label">About this relationship</p>${normalized.subtitle ? `<p class="equation-card-explanation-lead">${equationText(normalized.subtitle)}</p>` : ""}${explanationItems}${normalized.notes.map((note) => `<p>${equationText(note)}</p>`).join("")}</section>`
        : "";
    const initialValues = Object.fromEntries(normalized.variables.map((variable) => [variable.symbol, variable.value]));
    let initialGraphValues = initialValues;
    try {
        initialGraphValues = evaluateInteractiveEquationValues(normalized, initialValues);
    } catch (_) {
        // Hydration will display a specific dependency error after insertion.
    }
    const equationLengthClass = normalized.equation.length > 130 ? " equation-card-equation-extra-compact" : normalized.equation.length > 82 ? " equation-card-equation-compact" : "";
    const equationPanel = `<section class="equation-card-equation-wide"><p class="equation-card-section-label">Equation</p><div class="equation-card-equation${equationLengthClass}">$$${equationText(normalized.equation)}$$</div></section>`;
    const controlPanel = `<section class="equation-card-control-panel"><div class="equation-card-section equation-card-variable-section"><p class="equation-card-section-label">Variables</p><div class="equation-card-inputs">${variableRows || `<p class="equation-card-error">No variables were provided.</p>`}</div></div>${derivedRows ? `<div class="equation-card-section equation-card-results-section"><p class="equation-card-section-label">Results</p><div class="equation-card-metrics" data-equation-metrics>${derivedRows}</div></div>` : ""}<div class="equation-card-live-region" data-equation-status aria-live="polite"></div></section>`;
    const graphPanel = `<section class="equation-card-graph-panel"><p class="equation-card-section-label">Graph</p><div class="equation-card-graph-stage" data-equation-graph>${normalized.graph ? renderInteractiveEquationGraph(normalized.graph, initialGraphValues) : `<p class="equation-card-error">No graph was provided.</p>`}</div></section>`;
    return `<article class="equation-card equation-card-interactive" data-equation-card="${equationText(cardIndex)}"><header class="equation-card-header"><div><p class="section-label">Interactive Relationship Card</p><h3>${equationText(normalized.title || "Equation")}</h3></div><button type="button" class="card-fullscreen-button" data-card-fullscreen aria-label="Enter fullscreen for equation card" aria-pressed="false">Fullscreen</button></header>${equationPanel}<div class="equation-card-layout">${controlPanel}${graphPanel}</div></article>${explanation}`;
}

function syncEquationGraphSizing(card) {
    if (!card?.matches("[data-equation-card]")) return;
    card.querySelectorAll(".equation-card-graph").forEach((svg) => {
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    });
}

function hydrateFullscreenButtons(container) {
    container.querySelectorAll("[data-card-fullscreen]").forEach((button) => {
            const card = button.closest("[data-equation-card], [data-model-card], [data-particle-card], [data-particle-physics-card], [data-fluid-control-volume-card]");
        if (!card) return;
        const status = card.querySelector("[data-fullscreen-status]");
        const updateButton = () => {
            const active = document.fullscreenElement === card;
            button.textContent = active ? "Exit fullscreen" : "Fullscreen";
            button.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
            button.setAttribute("aria-pressed", String(active));
            syncEquationGraphSizing(card);
        };
        button.addEventListener("click", async () => {
            if (status) status.textContent = "";
            try {
                if (document.fullscreenElement === card) {
                    await document.exitFullscreen();
                } else if (typeof card.requestFullscreen === "function") {
                    await card.requestFullscreen();
                } else if (status) {
                    status.textContent = "Fullscreen is not supported by this browser.";
                }
            } catch (_error) {
                if (status) status.textContent = "Fullscreen could not be enabled. Check your browser permissions.";
            }
        });
        document.addEventListener("fullscreenchange", updateButton);
        updateButton();
    });
}

export function summarizeLearnProgress(session) {
    const total = Array.isArray(session?.questions) ? session.questions.length : 0;
    const answered = Array.isArray(session?.answers) ? session.answers.filter(Boolean).length : 0;
    const firstAttemptCorrect = Math.max(0, Number(session?.learnFirstAttemptCorrectCount) || 0);
    const mistakesReviewed = Math.max(0, Number(session?.learnMistakesReviewedCount) || 0);
    const masteryPoints = firstAttemptCorrect + (mistakesReviewed * 0.5);

    return {
        total,
        answered,
        firstAttemptCorrect,
        mistakesReviewed,
        masteryPoints,
        learningProgress: total ? Math.round((masteryPoints / total) * 100) : 0,
        remaining: Math.max(0, total - answered),
        checkpointsCompleted: Math.max(0, Number(session?.learnCheckpointNumber) || 0)
    };
}

export function recordLearnCheckpointProgress(session, completed = false) {
    if (!session || session.mode !== "learn") {
        return null;
    }

    const summary = summarizeLearnProgress(session);
    const checkpointNumber = Math.max(1, Number(session.learnCheckpointNumber) || 1);
    const summaryType = completed ? "learn-session" : "learn-checkpoint";
    const checkpointId = `${session.learnSessionId}:${checkpointNumber}:${summaryType}`;
    if (Array.isArray(session.learnRecordedCheckpointIds) && session.learnRecordedCheckpointIds.includes(checkpointId)) {
        return null;
    }

    const result = recordStudyProgress({
        mode: "learn",
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        chapterTitle: session.chapterTitle,
        attempted: summary.answered,
        correct: summary.firstAttemptCorrect,
        questionCount: summary.total,
        learningProgress: summary.learningProgress,
        masteryProgress: summary.learningProgress,
        firstAttemptCorrect: summary.firstAttemptCorrect,
        mistakesReviewed: summary.mistakesReviewed,
        checkpointNumber,
        checkpointQuestionCount: Math.max(0, Number(session.learnCheckpointEnd) || summary.answered),
        sessionQuestionCount: summary.total,
        sessionId: session.learnSessionId,
        checkpointId,
        summaryType
    });

    session.learnRecordedCheckpointIds = Array.isArray(session.learnRecordedCheckpointIds)
        ? [...session.learnRecordedCheckpointIds, checkpointId]
        : [checkpointId];
    return result;
}

function normalizeParticlePhysicsRange(source, defaults, label) {
    const valueSource = source && typeof source === "object" ? source : {};
    const min = Number(valueSource.min ?? defaults.min);
    const max = Number(valueSource.max ?? defaults.max);
    const step = Number(valueSource.step ?? defaults.step);
    const value = Number(valueSource.value ?? defaults.value);
    if (!(max > min) || !Number.isFinite(step) || step <= 0 || !Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${label} needs a finite value within a valid range.`);
    }
    return { value, min, max, step, unit: text(valueSource.unit) || defaults.unit };
}

function normalizeParticlePhysicsCard(config) {
    if (!config || typeof config !== "object") throw new Error("A particle-physics-card configuration is required.");
    if (text(config.model) !== "two-body-collision") throw new Error("Particle physics cards must use the two-body-collision model.");
    if (!Array.isArray(config.particles) || config.particles.length !== 2) throw new Error("Particle physics cards require exactly two particles.");
    const restitution = normalizeParticlePhysicsRange(config.restitution, { value: 1, min: 0, max: 1, step: 0.05, unit: "" }, "Restitution");
    if (restitution.min < 0 || restitution.max > 1 || restitution.value < 0 || restitution.value > 1) throw new Error("Restitution must be between 0 and 1.");
    const ids = new Set();
    const symbols = new Set();
    const particles = config.particles.map((source, index) => {
        const entry = source && typeof source === "object" ? source : {};
        const id = text(entry.id);
        const symbol = text(entry.symbol);
        const position = Number(entry.position);
        if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id) || ids.has(id)) throw new Error(`Particle ${index + 1} needs a unique valid id.`);
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol) || symbols.has(symbol)) throw new Error(`Particle ${index + 1} needs a unique valid symbol.`);
        if (!Number.isFinite(position)) throw new Error(`Particle ${id} needs a finite position.`);
        ids.add(id);
        symbols.add(symbol);
        const mass = normalizeParticlePhysicsRange(entry.mass, { value: 1, min: 0.1, max: 5, step: 0.1, unit: "kg" }, `${id} mass`);
        if (mass.min <= 0 || mass.value <= 0) throw new Error(`Particle ${id} mass must be positive.`);
        const color = text(entry.color) || (index === 0 ? "#4db8ff" : "#bd5cff");
        if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`Particle ${id} needs a six-digit hexadecimal color.`);
        return {
            id,
            name: text(entry.name) || `Particle ${index + 1}`,
            symbol,
            mass,
            velocity: normalizeParticlePhysicsRange(entry.velocity, { value: index === 0 ? 2 : 0, min: -10, max: 10, step: 0.1, unit: "m/s" }, `${id} velocity`),
            position,
            color
        };
    });
    if (Math.abs(particles[0].position - particles[1].position) < 0.001) throw new Error("Particle positions must be separated.");
    return {
        title: text(config.title) || "Two-Body Collision Lab",
        subtitle: text(config.subtitle),
        model: "two-body-collision",
        restitution,
        particles,
        notes: Array.isArray(config.notes) ? config.notes.map(text).filter(Boolean) : []
    };
}

function particlePhysicsNumber(value, digits = 2) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(digits).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") : "--";
}

function particlePhysicsMetrics(particles) {
    const momentum = particles.reduce((sum, particle) => sum + particle.mass * particle.velocity, 0);
    const energy = particles.reduce((sum, particle) => sum + 0.5 * particle.mass * particle.velocity ** 2, 0);
    return { momentum, energy };
}

function particlePhysicsScene(state, config, cardIndex) {
    const width = 760;
    const height = 270;
    const trackLeft = 54;
    const trackRight = width - 54;
    const trackY = 146;
    const positions = config.particles.map((particle) => particle.position);
    const span = Math.max(12, Math.abs(Math.max(...positions) - Math.min(...positions)) + 8);
    const center = (Math.max(...positions) + Math.min(...positions)) / 2;
    const minPosition = center - span / 2;
    const toX = (position) => trackLeft + ((position - minPosition) / span) * (trackRight - trackLeft);
    const particles = state.particles.map((particle, index) => {
        const x = toX(particle.position);
        const radius = 18 + Math.min(8, particle.mass * 2);
        const arrowLength = Math.max(-90, Math.min(90, particle.velocity * 13));
        const color = config.particles[index].color;
        const arrowEnd = x + arrowLength;
        const arrowDirection = arrowLength >= 0 ? 1 : -1;
        return `<g class="particle-physics-body" aria-label="${equationText(config.particles[index].name)} at position ${particlePhysicsNumber(particle.position)}"><line class="particle-physics-vector" x1="${x}" y1="${trackY - 44}" x2="${arrowEnd}" y2="${trackY - 44}" stroke="${color}"></line><path class="particle-physics-vector-head" d="M ${arrowEnd} ${trackY - 44} l ${-8 * arrowDirection} -5 l 0 10 z" fill="${color}"></path><circle cx="${x}" cy="${trackY}" r="${radius}" fill="${color}"></circle><text class="particle-physics-label" x="${x}" y="${trackY + 5}" text-anchor="middle">${equationText(config.particles[index].symbol)}</text><text class="particle-physics-name" x="${x}" y="${trackY + 49}" text-anchor="middle">${equationText(config.particles[index].name)}</text><text class="particle-physics-velocity" x="${x}" y="${trackY - 61}" text-anchor="middle">${particlePhysicsNumber(particle.velocity)} m/s</text></g>`;
    }).join("");
    const collisionMarker = state.collided ? `<line class="particle-physics-collision-marker" x1="${toX(state.collisionPosition)}" y1="${trackY - 82}" x2="${toX(state.collisionPosition)}" y2="${trackY + 28}"></line><text class="particle-physics-collision-text" x="${toX(state.collisionPosition)}" y="${trackY - 91}" text-anchor="middle">Collision</text>` : "";
    return `<svg class="particle-physics-scene" viewBox="0 0 ${width} ${height}" role="img" aria-label="Two-body collision track for ${equationText(config.title)}"><line class="particle-physics-track" x1="${trackLeft}" y1="${trackY}" x2="${trackRight}" y2="${trackY}"></line><line class="particle-physics-track-end" x1="${trackLeft}" y1="${trackY - 12}" x2="${trackLeft}" y2="${trackY + 12}"></line><line class="particle-physics-track-end" x1="${trackRight}" y1="${trackY - 12}" x2="${trackRight}" y2="${trackY + 12}"></line>${collisionMarker}${particles}</svg>`;
}

function renderParticlePhysicsCard(config, cardIndex) {
    const normalized = normalizeParticlePhysicsCard(config);
    PARTICLE_PHYSICS_CARD_CONFIGS.set(String(cardIndex), normalized);
    const particleRows = normalized.particles.map((particle, index) => `<div class="particle-physics-control" data-particle-physics-control="${particle.id}"><div class="particle-physics-control-heading"><span><i class="particle-physics-color" style="--particle-color:${particle.color}"></i>${equationText(particle.name)} <strong>${equationText(particle.symbol)}</strong></span><output data-particle-physics-value="${particle.id}">${particlePhysicsNumber(particle.velocity.value)} ${equationText(particle.velocity.unit)}</output></div><label>Mass <input type="range" min="${particle.mass.min}" max="${particle.mass.max}" step="${particle.mass.step}" value="${particle.mass.value}" data-particle-physics-input="${index}:mass" aria-label="Adjust ${particle.name} mass"></label><label>Initial velocity <input type="range" min="${particle.velocity.min}" max="${particle.velocity.max}" step="${particle.velocity.step}" value="${particle.velocity.value}" data-particle-physics-input="${index}:velocity" aria-label="Adjust ${particle.name} initial velocity"></label><small data-particle-physics-summary="${particle.id}">Initial velocity: ${particlePhysicsNumber(particle.velocity.value)} ${equationText(particle.velocity.unit)} · Mass: ${particlePhysicsNumber(particle.mass.value)} ${equationText(particle.mass.unit)}</small></div>`).join("");
    const notes = normalized.notes.map((note) => `<p>${equationText(note)}</p>`).join("");
    return `<article class="particle-physics-card" data-particle-physics-card="${equationText(cardIndex)}"><header class="particle-physics-header"><div><p class="section-label">Particle Physics Collision Lab</p><h3>${equationText(normalized.title)}</h3>${normalized.subtitle ? `<p>${equationText(normalized.subtitle)}</p>` : ""}</div><button type="button" class="card-fullscreen-button" data-card-fullscreen aria-label="Enter fullscreen for particle physics card" aria-pressed="false">Fullscreen</button></header><section class="particle-physics-simulation" data-particle-physics-scene>${particlePhysicsScene({ particles: normalized.particles.map((particle) => ({ position: particle.position, velocity: particle.velocity.value, mass: particle.mass.value })), collided: false, collisionPosition: 0 }, normalized, cardIndex)}</section><section class="particle-physics-toolbar" aria-label="Simulation controls"><button type="button" class="primary-button" data-particle-physics-play>Play</button><button type="button" class="ghost-button" data-particle-physics-pause>Pause</button><button type="button" class="ghost-button" data-particle-physics-step>Step</button><button type="button" class="ghost-button" data-particle-physics-reset>Reset</button><label>Restitution <output data-particle-physics-restitution>${particlePhysicsNumber(normalized.restitution.value, 2)}</output><input type="range" min="${normalized.restitution.min}" max="${normalized.restitution.max}" step="${normalized.restitution.step}" value="${normalized.restitution.value}" data-particle-physics-restitution-input aria-label="Adjust restitution"></label></section><div class="particle-physics-layout"><section class="particle-physics-controls"><p class="equation-card-section-label">Particle Controls</p>${particleRows}</section><section class="particle-physics-readout"><p class="equation-card-section-label">Conservation Readout</p><div class="particle-physics-metrics"><div><span>Momentum before</span><strong data-particle-physics-metric="momentum-before">--</strong></div><div><span>Momentum now</span><strong data-particle-physics-metric="momentum-now">--</strong></div><div><span>Energy before</span><strong data-particle-physics-metric="energy-before">--</strong></div><div><span>Energy now</span><strong data-particle-physics-metric="energy-now">--</strong></div></div><p data-particle-physics-status aria-live="polite">Ready to simulate.</p></section></div>${notes ? `<section class="particle-physics-notes"><p class="section-label">About this model</p>${notes}</section>` : ""}</article>`;
}

function hydrateParticlePhysicsCards(container) {
    container.querySelectorAll("[data-particle-physics-card]").forEach((card) => {
        try {
            const config = PARTICLE_PHYSICS_CARD_CONFIGS.get(card.dataset.particlePhysicsCard);
            if (!config) throw new Error("the card configuration is missing.");
            const initialParticles = config.particles.map((particle) => ({ position: particle.position, velocity: particle.velocity.value, mass: particle.mass.value }));
            const state = { particles: initialParticles.map((particle) => ({ ...particle })), initial: initialParticles.map((particle) => ({ ...particle })), restitution: config.restitution.value, collided: false, collisionPosition: 0, playing: false, raf: 0, lastTime: 0, elapsed: 0 };
            const scene = card.querySelector("[data-particle-physics-scene]");
            const status = card.querySelector("[data-particle-physics-status]");
            const metric = (name) => card.querySelector(`[data-particle-physics-metric="${name}"]`);
            const render = () => {
                scene.innerHTML = particlePhysicsScene(state, config, card.dataset.particlePhysicsCard);
                const before = particlePhysicsMetrics(state.initial);
                const now = particlePhysicsMetrics(state.particles);
                if (metric("momentum-before")) metric("momentum-before").textContent = `${particlePhysicsNumber(before.momentum)} kg·m/s`;
                if (metric("momentum-now")) metric("momentum-now").textContent = `${particlePhysicsNumber(now.momentum)} kg·m/s`;
                if (metric("energy-before")) metric("energy-before").textContent = `${particlePhysicsNumber(before.energy)} J`;
                if (metric("energy-now")) metric("energy-now").textContent = `${particlePhysicsNumber(now.energy)} J`;
                config.particles.forEach((particle, index) => {
                    const output = card.querySelector(`[data-particle-physics-value="${particle.id}"]`);
                    const summary = card.querySelector(`[data-particle-physics-summary="${particle.id}"]`);
                    if (output) output.textContent = `${particlePhysicsNumber(state.particles[index].velocity)} ${particle.velocity.unit}`;
                    if (summary) summary.textContent = `Initial velocity: ${particlePhysicsNumber(state.initial[index].velocity)} ${particle.velocity.unit} · Mass: ${particlePhysicsNumber(state.particles[index].mass)} ${particle.mass.unit}`;
                });
            };
            const reset = () => {
                state.particles = config.particles.map((particle) => ({ position: particle.position, velocity: particle.velocity.value, mass: particle.mass.value }));
                state.initial = state.particles.map((particle) => ({ ...particle }));
                state.restitution = config.restitution.value;
                state.collided = false;
                state.collisionPosition = 0;
                state.elapsed = 0;
                state.playing = false;
                if (status) status.textContent = "Ready to simulate.";
                render();
            };
            const collide = () => {
                const [first, second] = state.particles;
                const relative = first.velocity - second.velocity;
                const approaching = relative * (first.position - second.position) < 0;
                if (Math.abs(first.position - second.position) < 0.85 && approaching) {
                    const collisionPosition = (first.position + second.position) / 2;
                    const massTotal = first.mass + second.mass;
                    const firstVelocity = (first.mass * first.velocity + second.mass * second.velocity - second.mass * state.restitution * relative) / massTotal;
                    const secondVelocity = (first.mass * first.velocity + second.mass * second.velocity + first.mass * state.restitution * relative) / massTotal;
                    first.velocity = firstVelocity;
                    second.velocity = secondVelocity;
                    const firstIsLeft = first.position < second.position;
                    first.position = collisionPosition + (firstIsLeft ? -0.43 : 0.43);
                    second.position = collisionPosition + (firstIsLeft ? 0.43 : -0.43);
                    state.collided = true;
                    state.collisionPosition = collisionPosition;
                    state.playing = false;
                    const before = particlePhysicsMetrics(state.initial);
                    const after = particlePhysicsMetrics(state.particles);
                    const momentumConserved = Math.abs(before.momentum - after.momentum) < 1e-7;
                    const energyConserved = Math.abs(before.energy - after.energy) < 1e-7;
                    if (status) status.textContent = `Collision complete. Momentum ${momentumConserved ? "conserved" : "changed"}; kinetic energy ${energyConserved ? "conserved" : "decreased"}.`;
                }
            };
            const step = (delta = 0.016) => {
                if (state.collided) return;
                state.particles.forEach((particle) => { particle.position += particle.velocity * delta; });
                state.elapsed += delta;
                collide();
                render();
            };
            const frame = (timestamp) => {
                if (!state.playing || !card.isConnected) { state.raf = 0; return; }
                const delta = Math.min(0.04, state.lastTime ? (timestamp - state.lastTime) / 1000 : 0.016);
                state.lastTime = timestamp;
                step(delta);
                state.raf = requestAnimationFrame(frame);
            };
            card.querySelector("[data-particle-physics-play]")?.addEventListener("click", () => { if (!state.playing && !state.collided) { state.playing = true; state.lastTime = 0; state.raf = requestAnimationFrame(frame); } });
            card.querySelector("[data-particle-physics-pause]")?.addEventListener("click", () => { state.playing = false; });
            card.querySelector("[data-particle-physics-step]")?.addEventListener("click", () => { state.playing = false; step(); });
            card.querySelector("[data-particle-physics-reset]")?.addEventListener("click", reset);
            card.querySelector("[data-particle-physics-restitution-input]")?.addEventListener("input", (event) => { config.restitution.value = Number(event.target.value); const output = card.querySelector("[data-particle-physics-restitution]"); if (output) output.textContent = particlePhysicsNumber(config.restitution.value); reset(); });
            card.querySelectorAll("[data-particle-physics-input]").forEach((input) => input.addEventListener("input", (event) => { const [indexText, field] = event.target.dataset.particlePhysicsInput.split(":"); const index = Number(indexText); config.particles[index][field].value = Number(event.target.value); reset(); }));
            render();
        } catch (error) {
            const status = card.querySelector("[data-particle-physics-status]");
            if (status) { status.textContent = `Particle physics card unavailable: ${error.message}`; status.setAttribute("role", "alert"); }
            card.classList.add("particle-physics-error-state");
        }
    });
}

function normalizeFluidRange(source, fallback, label) {
    const entry = source && typeof source === "object" ? source : {};
    const min = Number(entry.min ?? fallback.min);
    const max = Number(entry.max ?? fallback.max);
    const step = Number(entry.step ?? fallback.step);
    const value = Number(entry.value ?? fallback.value);
    if (!(max > min) || !Number.isFinite(step) || step <= 0 || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} needs a valid value and range.`);
    return { value, min, max, step, unit: text(entry.unit) || fallback.unit || "" };
}

function normalizeFluidControlVolumeCard(config) {
    if (!config || typeof config !== "object" || text(config.model) !== "fluid-control-volume") throw new Error("A fluid-control-volume card requires model fluid-control-volume.");
    const domain = config.domain && typeof config.domain === "object" ? config.domain : {};
    const x = Array.isArray(domain.x) ? domain.x.map(Number) : [0, 1];
    const y = Array.isArray(domain.y) ? domain.y.map(Number) : [0, 1];
    if (x.length !== 2 || y.length !== 2 || !(x[1] > x[0]) || !(y[1] > y[0])) throw new Error("Fluid domain bounds must have two increasing values for x and y.");
    const walls = domain.walls && typeof domain.walls === "object" ? domain.walls : {};
    const wallModes = ["inlet", "outlet", "slip", "no-slip"];
    const normalizedWalls = ["left", "right", "top", "bottom"].reduce((result, side) => {
        const mode = text(walls[side]) || (side === "left" ? "inlet" : side === "right" ? "outlet" : "slip");
        if (!wallModes.includes(mode)) throw new Error(`Unsupported ${side} wall mode: ${mode}.`);
        result[side] = mode;
        return result;
    }, {});
    const fieldSource = config.field && typeof config.field === "object" ? config.field : {};
    const field = { u: text(fieldSource.u) || "0", v: text(fieldSource.v) || "0", P: text(fieldSource.P), T: text(fieldSource.T), scale: Number(fieldSource.scale ?? 1) };
    if (!Number.isFinite(field.scale) || field.scale <= 0) throw new Error("Fluid field scale must be positive.");
    const thermoSource = config.thermodynamics && typeof config.thermodynamics === "object" ? config.thermodynamics : {};
    const thermoModel = text(thermoSource.model || "ideal-gas");
    if (!["ideal-gas", "incompressible"].includes(thermoModel)) throw new Error("Unsupported fluid thermodynamic model.");
    const R = Number(thermoSource.R ?? 287);
    const gamma = Number(thermoSource.gamma ?? 1.4);
    const cp = Number(thermoSource.cp ?? 1004.5);
    if (!(R > 0) || !(gamma > 1) || !(cp > 0)) throw new Error("Fluid thermodynamic constants require R > 0, gamma > 1, and cp > 0.");
    const referenceSource = thermoSource.reference && typeof thermoSource.reference === "object" ? thermoSource.reference : {};
    const reference = { P: Number(referenceSource.P ?? 101325), T: Number(referenceSource.T ?? 288.15) };
    if (!(reference.P > 0) || !(reference.T > 0)) throw new Error("Reference pressure and temperature must be positive.");
    const rho = Number(thermoSource.rho ?? reference.P / (R * reference.T));
    if (!(rho > 0) || !Number.isFinite(rho)) throw new Error("Fluid density must be positive and finite.");
    const stateSource = config.state && typeof config.state === "object" ? config.state : {};
    const rawInputs = stateSource.inputs && typeof stateSource.inputs === "object" ? stateSource.inputs : { P: 101325, T: 288.15, U0: 120 };
    const ranges = stateSource.ranges && typeof stateSource.ranges === "object" ? stateSource.ranges : {};
    const inputs = {};
    Object.entries(rawInputs).forEach(([key, value]) => {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`Invalid fluid input symbol: ${key}.`);
        inputs[key] = Number(value);
        if (!Number.isFinite(inputs[key])) throw new Error(`Fluid input ${key} must be numeric.`);
    });
    if (!(inputs.P > 0) || !(inputs.T > 0)) throw new Error("Fluid pressure and temperature inputs must be positive.");
    const inputRanges = {};
    Object.entries(inputs).forEach(([key, value]) => { inputRanges[key] = normalizeFluidRange(ranges[key], { value, min: value * 0.5 || 0.1, max: value * 1.5 + 1, step: Math.max(Math.abs(value) / 100, 0.1), unit: key === "P" ? "Pa" : key === "T" ? "K" : "" }, `Fluid input ${key}`); });
    const scenarioSource = config.scenario && typeof config.scenario === "object" ? config.scenario : {};
    const geometrySource = config.geometry && typeof config.geometry === "object" ? config.geometry : {};
    const geometryType = text(geometrySource.type);
    const geometry = geometryType === "converging-pipe" ? {
        type: geometryType,
        inletHeight: Number(geometrySource.inletHeight ?? 1),
        outletHeight: Number(geometrySource.outletHeight ?? 0.5),
        center: Number(geometrySource.center ?? 0.5),
        wallMode: text(geometrySource.wallMode) || "no-slip"
    } : null;
    if (geometry && (!(geometry.inletHeight > 0) || !(geometry.outletHeight > 0) || !Number.isFinite(geometry.center) || !["no-slip", "slip"].includes(geometry.wallMode))) throw new Error("Converging-pipe geometry needs positive heights, a finite center, and a valid wall mode.");
    const presets = ["incompressible", "incompressible-converging-pipe", "bernoulli", "isobaric", "isentropic", "subsonic", "supersonic", "compressible-flow"];
    const preset = text(scenarioSource.preset) || "compressible-flow";
    if (!presets.includes(preset)) throw new Error(`Unsupported fluid scenario preset: ${preset}.`);
    const solverSource = scenarioSource.solver && typeof scenarioSource.solver === "object" ? scenarioSource.solver : {};
    const solver = { mode: text(solverSource.mode) || "target", target: text(solverSource.target), unknowns: Array.isArray(solverSource.unknowns) ? solverSource.unknowns.map(text).filter(Boolean) : [], equations: Array.isArray(solverSource.equations) ? solverSource.equations.map(text).filter(Boolean) : [], ranges: solverSource.ranges && typeof solverSource.ranges === "object" ? solverSource.ranges : {} };
    if (!["target", "system"].includes(solver.mode)) throw new Error("Fluid solver mode must be target or system.");
    if (solver.mode === "target" && solver.equations.length && !solver.target) throw new Error("Target-mode fluid solvers require a target variable.");
    if (solver.mode === "target" && solver.equations.length > 1) throw new Error("Target-mode fluid solvers accept exactly one equation.");
    if (solver.mode === "system" && (!solver.unknowns.length || solver.unknowns.length !== solver.equations.length)) throw new Error("System-mode fluid solvers require one equation per unknown.");
    const displaySource = config.display && typeof config.display === "object" ? config.display : {};
    const metrics = Array.isArray(displaySource.metrics) ? displaySource.metrics.map(text).filter(Boolean) : ["P", "T", "rho", "V", "Mach", "h", "s"];
    const allowedColors = ["speed", "mach", "pressure", "temperature", "entropy"];
    const colorBy = text(displaySource.colorBy) || "mach";
    if (!allowedColors.includes(colorBy)) throw new Error(`Unsupported fluid color mode: ${colorBy}.`);
    if (preset === "isentropic" && !solver.equations.length) { solver.mode = "target"; solver.target = "T"; solver.equations = ["T = T0 * (P/P0)^((gamma-1)/gamma)"]; }
    if (preset === "incompressible-converging-pipe" && (!geometry || geometry.type !== "converging-pipe")) throw new Error("The incompressible-converging-pipe preset requires converging-pipe geometry.");
    if (preset === "incompressible-converging-pipe" && thermoModel !== "incompressible") throw new Error("The incompressible-converging-pipe preset requires the incompressible thermodynamic model.");
    return { title: text(config.title) || "Fluid Control Volume", subtitle: text(config.subtitle), model: "fluid-control-volume", domain: { x, y, walls: normalizedWalls }, geometry, field, thermodynamics: { model: thermoModel, R, gamma, cp, rho, reference }, state: { inputs, ranges: inputRanges }, scenario: { preset, solver }, display: { colorBy, metrics, showParticles: displaySource.showParticles !== false, showVectors: displaySource.showVectors !== false, showBoundaryLayer: displaySource.showBoundaryLayer !== false }, notes: Array.isArray(config.notes) ? config.notes.map(text).filter(Boolean) : [] };
}

function fluidExpression(expression, constants) {
    return createInteractiveEquationExpression(String(expression || "0").replace(/\*\*/g, "^"), constants);
}

function fluidSolveSystem(config, values) {
    const solver = config.scenario.solver;
    if (!solver.equations.length) return values;
    const unknowns = solver.mode === "target" ? [solver.target] : solver.unknowns;
    const ranges = Object.fromEntries(unknowns.map((name) => [name, normalizeFluidRange(solver.ranges[name], config.state.ranges[name] || { value: values[name] ?? 0, min: -1e6, max: 1e6, step: 0.1, unit: "" }, `Solver variable ${name}`)]));
    if (unknowns.some((name) => !name || (!Object.prototype.hasOwnProperty.call(values, name) && !solver.ranges[name] && !config.state.ranges[name]))) throw new Error("Fluid solver variables need an input or explicit range.");
    const reference = config.thermodynamics.reference;
    const sharedConstants = { ...values, R: config.thermodynamics.R, gamma: config.thermodynamics.gamma, cp: config.thermodynamics.cp, P0: reference.P, T0: reference.T, rho0: reference.P / (config.thermodynamics.R * reference.T), P_ref: reference.P, T_ref: reference.T };
    const residual = (candidate) => solver.equations.map((equation) => {
        const parts = equation.split("=");
        if (parts.length !== 2) throw new Error("Fluid equations must contain exactly one equals sign.");
        const constants = { ...sharedConstants, ...candidate };
        return fluidExpression(parts[0], constants)(0) - fluidExpression(parts[1], constants)(0);
    });
    if (solver.mode === "target") {
        const nerdamerSolver = globalThis.nerdamer;
        if (typeof nerdamerSolver !== "function") throw new Error("The symbolic fluid solver is unavailable.");
        const equation = solver.equations[0].replace(/\*\*/g, "^");
        const solutions = nerdamerSolver(equation).solveFor(solver.target);
        const candidates = Array.isArray(solutions) ? solutions : [solutions];
        const resolved = candidates.map((solution) => {
            const evaluated = nerdamerSolver(String(solution)).evaluate(sharedConstants);
            const raw = typeof evaluated.text === "function" ? evaluated.text("decimal") : String(evaluated);
            const number = Number(raw);
            return Number.isFinite(number) && number >= ranges[solver.target].min && number <= ranges[solver.target].max ? number : null;
        }).filter((value, index, list) => value !== null && list.indexOf(value) === index);
        if (resolved.length !== 1) throw new Error(resolved.length ? "Fluid target equation has multiple valid solutions." : "Fluid target equation has no valid solution.");
        return { ...values, [solver.target]: resolved[0] };
    }
    let candidate = Object.fromEntries(unknowns.map((name) => [name, Number(values[name] ?? ranges[name].value)]));
    for (let iteration = 0; iteration < 40; iteration += 1) {
        const base = residual(candidate);
        if (base.every((value) => Number.isFinite(value) && Math.abs(value) < 1e-7)) return { ...values, ...candidate };
        const matrix = base.map((_, row) => unknowns.map((name) => { const shifted = { ...candidate, [name]: candidate[name] + Math.max(1e-6, ranges[name].step / 10) }; return (residual(shifted)[row] - base[row]) / Math.max(1e-6, ranges[name].step / 10); }));
        const augmented = matrix.map((row, index) => [...row, -base[index]]);
        for (let pivot = 0; pivot < unknowns.length; pivot += 1) {
            let best = pivot;
            for (let row = pivot + 1; row < unknowns.length; row += 1) if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
            if (Math.abs(augmented[best][pivot]) < 1e-12) throw new Error("Fluid system is singular or ambiguous.");
            [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
            const divisor = augmented[pivot][pivot];
            for (let column = pivot; column <= unknowns.length; column += 1) augmented[pivot][column] /= divisor;
            for (let row = 0; row < unknowns.length; row += 1) if (row !== pivot) { const factor = augmented[row][pivot]; for (let column = pivot; column <= unknowns.length; column += 1) augmented[row][column] -= factor * augmented[pivot][column]; }
        }
        unknowns.forEach((name, index) => { candidate[name] = Math.max(ranges[name].min, Math.min(ranges[name].max, candidate[name] + augmented[index][unknowns.length])); });
    }
    throw new Error("Fluid system did not converge to a valid solution.");
}

function fluidProperties(config, values, velocity) {
    const { model, R, gamma, cp, rho: fixedRho, reference } = config.thermodynamics;
    const P = Number(values.P);
    const T = Number(values.T);
    const rho = model === "incompressible" ? Number(values.rho ?? fixedRho) : P / (R * T);
    const a = Math.sqrt(gamma * R * T);
    const Mach = velocity / a;
    const h = cp * T;
    const s = model === "incompressible" ? 0 : cp * Math.log(T / reference.T) - R * Math.log(P / reference.P);
    return { P, T, rho, V: velocity, DeltaV: velocity - Number(values.U0 || 0), a, Mach, h, s };
}

function fluidMetricLabel(metric) { return ({ P: "Pressure", T: "Temperature", rho: "Density", V: "Velocity", DeltaV: "Velocity difference", a: "Sound speed", Mach: "Mach number", h: "Enthalpy", s: "Entropy change" })[metric] || metric; }

function fluidMetricUnit(metric) { return ({ P: "Pa", T: "K", rho: "kg/m^3", V: "m/s", DeltaV: "m/s", a: "m/s", Mach: "", h: "J/kg", s: "J/(kg·K)" })[metric] || ""; }

function fluidConvergingHeight(config, x) {
    const geometry = config.geometry;
    const progress = Math.max(0, Math.min(1, (x - config.domain.x[0]) / (config.domain.x[1] - config.domain.x[0])));
    return geometry.inletHeight + (geometry.outletHeight - geometry.inletHeight) * progress;
}

function fluidConvergingState(config, values, x) {
    const height = fluidConvergingHeight(config, x);
    const inletHeight = config.geometry.inletHeight;
    const inletVelocity = Number(values.U0);
    const inletPressure = Number(values.P);
    const rho = Number(values.rho ?? config.thermodynamics.rho);
    const velocity = inletVelocity * inletHeight / height;
    const pressure = inletPressure + 0.5 * rho * (inletVelocity ** 2 - velocity ** 2);
    return { height, V: velocity, P: pressure, T: Number(values.T), rho, DeltaV: velocity - inletVelocity, continuity: inletHeight * inletVelocity - height * velocity, bernoulli: pressure + 0.5 * rho * velocity ** 2 - (inletPressure + 0.5 * rho * inletVelocity ** 2) };
}

function renderFluidControlVolumeCard(config, cardIndex) {
    const normalized = normalizeFluidControlVolumeCard(config);
    FLUID_CONTROL_VOLUME_CONFIGS.set(String(cardIndex), normalized);
    const inputs = Object.entries(normalized.state.ranges).map(([key, range]) => normalized.scenario.preset === "incompressible-converging-pipe" && key === "T" ? `<div class="fluid-control-input fluid-control-readonly-input"><span>Reference T</span><output>${equationText(String(range.value))} K</output><small>Temperature is fixed for this incompressible model.</small></div>` : `<label class="fluid-control-input"><span>${equationText(key)}</span><output data-fluid-input-output="${key}">${equationText(String(range.value))}</output><input type="range" min="${range.min}" max="${range.max}" step="${range.step}" value="${range.value}" data-fluid-input="${key}" aria-label="Adjust ${key}"></label>`).join("");
    const metrics = normalized.display.metrics.map((metric) => `<div class="fluid-metric" data-fluid-metric-card="${metric}"><span>${equationText(fluidMetricLabel(metric))}</span><strong data-fluid-metric="${metric}">--</strong><small>${equationText(fluidMetricUnit(metric))}</small></div>`).join("");
    const notes = normalized.notes.map((note) => `<p>${equationText(note)}</p>`).join("");
    const relationship = normalized.scenario.preset === "incompressible-converging-pipe" ? `<section class="fluid-control-relationship"><p class="equation-card-section-label">Inlet / Outlet Relationship</p><div class="fluid-control-relationship-grid"><div><span>Inlet</span><strong data-fluid-inlet>--</strong></div><div><span>Outlet</span><strong data-fluid-outlet>--</strong></div><div><span>Delta P</span><strong data-fluid-delta-p>--</strong></div><div><span>Delta V</span><strong data-fluid-delta-v>--</strong></div></div><p data-fluid-conservation-check>Continuity and Bernoulli checks pending.</p></section>` : "";
    return `<article class="fluid-control-volume-card${normalized.scenario.preset === "incompressible-converging-pipe" ? " fluid-control-converging-pipe" : ""}" data-fluid-control-volume-card="${equationText(cardIndex)}"><header class="fluid-control-header"><div><p class="section-label">Fluid Control Volume</p><h3>${equationText(normalized.title)}</h3>${normalized.subtitle ? `<p>${equationText(normalized.subtitle)}</p>` : ""}</div><button type="button" class="card-fullscreen-button" data-card-fullscreen aria-label="Enter fullscreen for fluid control volume card" aria-pressed="false">Fullscreen</button></header><div class="fluid-control-layout"><section class="fluid-control-simulation"><div class="fluid-control-badge" data-fluid-scenario>${equationText(normalized.scenario.preset)}</div><canvas data-fluid-canvas role="img" aria-label="Animated fluid parcels moving through a two-dimensional control volume"></canvas><div class="fluid-control-toolbar"><button type="button" class="primary-button" data-fluid-play>Play</button><button type="button" class="ghost-button" data-fluid-pause>Pause</button><button type="button" class="ghost-button" data-fluid-reset>Reset</button></div></section><section class="fluid-control-panel"><p class="equation-card-section-label">Flow Inputs</p><div class="fluid-control-inputs">${inputs}</div><div class="fluid-control-property-grid">${metrics}</div>${relationship}<div class="fluid-control-differences"><strong>Reference differences</strong><span data-fluid-difference>--</span></div><p data-fluid-status aria-live="polite">Ready to simulate.</p></section></div>${notes ? `<section class="fluid-control-notes"><p class="section-label">About this model</p>${notes}</section>` : ""}</article>`;
}

function hydrateFluidControlVolumeCards(container) {
    container.querySelectorAll("[data-fluid-control-volume-card]").forEach((card) => {
        try {
            const config = FLUID_CONTROL_VOLUME_CONFIGS.get(card.dataset.fluidControlVolumeCard);
            if (!config) throw new Error("the card configuration is missing.");
            const canvas = card.querySelector("[data-fluid-canvas]");
            const context = canvas?.getContext("2d");
            if (!canvas || !context) throw new Error("this browser could not create the fluid canvas.");
            const values = { ...config.state.inputs };
            const state = { parcels: [], playing: false, raf: 0, lastTime: 0, elapsed: 0, width: 0, height: 0 };
            const fieldConstants = { ...values, R: config.thermodynamics.R, gamma: config.thermodynamics.gamma, cp: config.thermodynamics.cp, rho: values.rho ?? config.thermodynamics.rho, pi: Math.PI };
            fieldConstants.y = 0;
            fieldConstants.t = 0;
            const uEval = fluidExpression(config.field.u, fieldConstants);
            const vEval = fluidExpression(config.field.v, fieldConstants);
            const pEval = fluidExpression(config.field.P || "P", fieldConstants);
            const tEval = fluidExpression(config.field.T || "T", fieldConstants);
            const resolveState = () => { const solved = config.scenario.preset === "incompressible-converging-pipe" ? values : fluidSolveSystem(config, values); if (!(Number(solved.P) > 0) || !(Number(solved.T) > 0)) throw new Error("Fluid pressure and temperature must remain positive."); if (config.scenario.preset === "incompressible-converging-pipe" && !(Number(solved.rho) > 0)) throw new Error("Fluid density must remain positive."); Object.assign(values, solved); Object.assign(fieldConstants, solved); fieldConstants.rho = values.rho ?? config.thermodynamics.rho; };
            const resetParcels = () => { const startX = config.domain.x[0] + 0.01; const height = config.geometry ? fluidConvergingHeight(config, startX) : config.domain.y[1] - config.domain.y[0]; const center = config.geometry?.center ?? (config.domain.y[0] + config.domain.y[1]) / 2; state.parcels = Array.from({ length: 30 }, (_, index) => ({ x: startX, y: config.geometry ? center + (index / 29 - 0.5) * height * 0.82 : config.domain.y[0] + ((index + 0.5) / 30) * (config.domain.y[1] - config.domain.y[0]), age: index / 30 })); state.elapsed = 0; state.playing = false; };
            const resize = () => { const rect = canvas.getBoundingClientRect(); state.width = Math.max(320, rect.width || 640); state.height = Math.max(250, rect.height || 360); const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1)); canvas.width = Math.round(state.width * ratio); canvas.height = Math.round(state.height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0); };
            const evaluate = (parcel) => { fieldConstants.y = parcel.y; fieldConstants.t = state.elapsed; if (config.scenario.preset === "incompressible-converging-pipe") { const pipe = fluidConvergingState(config, values, parcel.x); const properties = fluidProperties(config, { ...values, P: pipe.P, T: values.T, rho: pipe.rho }, pipe.V); if (!(properties.P > 0) || ![properties.rho, properties.a, properties.Mach, properties.h, properties.s].every(Number.isFinite)) throw new Error("The converging-pipe state became nonphysical."); return { u: pipe.V, v: 0, ...properties, pipe }; } const u = uEval(parcel.x); const v = vEval(parcel.x); const speed = Math.hypot(u, v) * config.field.scale; const P = pEval(parcel.x); const T = tEval(parcel.x); if (!Number.isFinite(P) || !Number.isFinite(T) || P <= 0 || T <= 0) throw new Error("Fluid field pressure and temperature must remain positive and finite."); const properties = fluidProperties(config, { ...values, P, T }, speed); if (![properties.rho, properties.a, properties.Mach, properties.h, properties.s].every(Number.isFinite)) throw new Error("Fluid thermodynamic properties are invalid."); return { u: u * config.field.scale, v: v * config.field.scale, ...properties }; };
            const colorFor = (properties) => { const value = config.display.colorBy === "mach" ? properties.Mach : config.display.colorBy === "pressure" ? properties.P / 200000 : config.display.colorBy === "temperature" ? properties.T / 500 : config.display.colorBy === "entropy" ? (properties.s + 1000) / 2000 : properties.V / 700; const hue = Math.max(0, Math.min(220, 220 - value * 220)); return `hsl(${hue} 85% 62%)`; };
            const draw = () => {
                const x0 = 40; const y0 = 28; const w = state.width - 80; const h = state.height - 70;
                const mapX = (x) => x0 + ((x - config.domain.x[0]) / (config.domain.x[1] - config.domain.x[0])) * w;
                const mapY = (y) => y0 + (1 - (y - config.domain.y[0]) / (config.domain.y[1] - config.domain.y[0])) * h;
                const pipe = config.geometry?.type === "converging-pipe";
                const wallTop = (x) => config.geometry ? config.geometry.center + fluidConvergingHeight(config, x) / 2 : config.domain.y[1];
                const wallBottom = (x) => config.geometry ? config.geometry.center - fluidConvergingHeight(config, x) / 2 : config.domain.y[0];
                context.clearRect(0, 0, state.width, state.height);
                context.fillStyle = "rgba(3, 17, 29, 0.82)"; context.fillRect(x0, y0, w, h);
                context.strokeStyle = "rgba(77,184,255,.75)"; context.lineWidth = 2;
                if (pipe) {
                    context.beginPath(); context.moveTo(mapX(config.domain.x[0]), mapY(wallTop(config.domain.x[0]))); context.lineTo(mapX(config.domain.x[1]), mapY(wallTop(config.domain.x[1]))); context.moveTo(mapX(config.domain.x[0]), mapY(wallBottom(config.domain.x[0]))); context.lineTo(mapX(config.domain.x[1]), mapY(wallBottom(config.domain.x[1]))); context.stroke();
                    if (config.display.showBoundaryLayer) { context.fillStyle = "rgba(189,92,255,.12)"; context.beginPath(); context.moveTo(mapX(config.domain.x[0]), mapY(wallTop(config.domain.x[0]))); context.lineTo(mapX(config.domain.x[1]), mapY(wallTop(config.domain.x[1]))); context.lineTo(mapX(config.domain.x[1]), mapY(wallTop(config.domain.x[1]) - 0.06)); context.lineTo(mapX(config.domain.x[0]), mapY(wallTop(config.domain.x[0]) - 0.06)); context.fill(); context.beginPath(); context.moveTo(mapX(config.domain.x[0]), mapY(wallBottom(config.domain.x[0]))); context.lineTo(mapX(config.domain.x[1]), mapY(wallBottom(config.domain.x[1]))); context.lineTo(mapX(config.domain.x[1]), mapY(wallBottom(config.domain.x[1]) + 0.06)); context.lineTo(mapX(config.domain.x[0]), mapY(wallBottom(config.domain.x[0]) + 0.06)); context.fill(); }
                } else { context.strokeRect(x0, y0, w, h); if (config.display.showBoundaryLayer) { context.fillStyle = "rgba(189,92,255,.12)"; if (config.domain.walls.bottom === "no-slip") context.fillRect(x0, y0 + h - 30, w, 30); if (config.domain.walls.top === "no-slip") context.fillRect(x0, y0, w, 30); } }
                context.fillStyle = "#91a0b6"; context.font = "12px sans-serif"; context.fillText("Inlet", x0 + 4, y0 - 9); context.fillText("Outlet", x0 + w - 42, y0 - 9);
                let firstProperties = null;
                state.parcels.forEach((parcel) => { const properties = evaluate(parcel); firstProperties ||= properties; const px = mapX(parcel.x); const py = mapY(parcel.y); context.fillStyle = colorFor(properties); if (config.display.showParticles) { context.beginPath(); context.arc(px, py, 4, 0, Math.PI * 2); context.fill(); } if (config.display.showVectors) { context.strokeStyle = context.fillStyle; context.beginPath(); context.moveTo(px, py); context.lineTo(px + Math.max(-28, Math.min(28, properties.u * 0.12)), py); context.stroke(); } });
                const readoutProperties = pipe ? evaluate({ x: config.domain.x[0] + (config.domain.x[1] - config.domain.x[0]) * 0.5, y: config.geometry.center }) : firstProperties;
                if (readoutProperties) { config.display.metrics.forEach((metric) => { const output = card.querySelector(`[data-fluid-metric="${metric}"]`); if (output) output.textContent = `${Number(readoutProperties[metric] ?? 0).toFixed(metric === "Mach" ? 2 : 1)}`; }); const difference = card.querySelector("[data-fluid-difference]"); if (difference) difference.textContent = `Delta V ${readoutProperties.DeltaV.toFixed(2)} m/s · Mach ${readoutProperties.Mach.toFixed(2)}`; const status = card.querySelector("[data-fluid-status]"); if (status) status.textContent = readoutProperties.Mach < 1 ? "Subsonic flow" : Math.abs(readoutProperties.Mach - 1) < 0.02 ? "Sonic transition" : "Supersonic visualization"; if (pipe) { const inlet = fluidConvergingState(config, values, config.domain.x[0]); const outlet = fluidConvergingState(config, values, config.domain.x[1]); card.querySelector("[data-fluid-inlet]")?.replaceChildren(document.createTextNode(`${inlet.P.toFixed(0)} Pa · ${inlet.V.toFixed(1)} m/s`)); card.querySelector("[data-fluid-outlet]")?.replaceChildren(document.createTextNode(`${outlet.P.toFixed(0)} Pa · ${outlet.V.toFixed(1)} m/s`)); card.querySelector("[data-fluid-delta-p]")?.replaceChildren(document.createTextNode(`${(outlet.P - inlet.P).toFixed(1)} Pa`)); card.querySelector("[data-fluid-delta-v]")?.replaceChildren(document.createTextNode(`${(outlet.V - inlet.V).toFixed(1)} m/s`)); card.querySelector("[data-fluid-conservation-check]")?.replaceChildren(document.createTextNode(`Continuity residual ${inlet.continuity.toExponential(2)} · Bernoulli residual ${outlet.bernoulli.toExponential(2)}`)); } }
            };
            const updateInputs = () => { Object.entries(values).forEach(([key, value]) => { const input = card.querySelector(`[data-fluid-input="${key}"]`); const output = card.querySelector(`[data-fluid-input-output="${key}"]`); if (input) input.value = String(value); if (output) output.textContent = String(value); }); draw(); };
            const step = (delta) => { state.elapsed += delta; state.parcels.forEach((parcel) => { const properties = evaluate(parcel); const pipe = config.geometry?.type === "converging-pipe"; const height = pipe ? fluidConvergingHeight(config, parcel.x) : config.domain.y[1] - config.domain.y[0]; const center = pipe ? config.geometry.center : (config.domain.y[0] + config.domain.y[1]) / 2; const distance = Math.abs(parcel.y - center) / Math.max(height / 2, 1e-6); const wallFactor = config.display.showBoundaryLayer && (pipe || config.domain.walls.bottom === "no-slip" || config.domain.walls.top === "no-slip") ? Math.max(0.08, Math.min(1, (1 - distance) / 0.18)) : 1; parcel.x += properties.u * wallFactor * delta * 0.01; if (pipe) { const nextHeight = fluidConvergingHeight(config, Math.min(config.domain.x[1], parcel.x)); parcel.y = Math.max(center - nextHeight * 0.46, Math.min(center + nextHeight * 0.46, parcel.y)); } else { parcel.y += properties.v * delta * 0.01 * wallFactor; if (parcel.y < config.domain.y[0]) parcel.y = config.domain.y[0] + 0.001; if (parcel.y > config.domain.y[1]) parcel.y = config.domain.y[1] - 0.001; } if (parcel.x > config.domain.x[1]) { const startX = config.domain.x[0] + 0.001; const startHeight = pipe ? fluidConvergingHeight(config, startX) : config.domain.y[1] - config.domain.y[0]; parcel.x = startX; parcel.y = pipe ? center + (Math.random() - 0.5) * startHeight * 0.82 : config.domain.y[0] + Math.random() * (config.domain.y[1] - config.domain.y[0]); } }); draw(); };
            const frame = (timestamp) => { if (!state.playing || !card.isConnected) { state.raf = 0; return; } try { const delta = Math.min(0.04, state.lastTime ? (timestamp - state.lastTime) / 1000 : 0.016); state.lastTime = timestamp; step(delta); state.raf = requestAnimationFrame(frame); } catch (error) { state.playing = false; const status = card.querySelector("[data-fluid-status]"); if (status) { status.textContent = `Fluid simulation stopped: ${error.message}`; status.setAttribute("role", "alert"); } } };
            card.querySelector("[data-fluid-play]")?.addEventListener("click", () => { if (!state.playing) { state.playing = true; state.lastTime = 0; state.raf = requestAnimationFrame(frame); } });
            card.querySelector("[data-fluid-pause]")?.addEventListener("click", () => { state.playing = false; });
            card.querySelector("[data-fluid-reset]")?.addEventListener("click", () => { resetParcels(); draw(); });
            card.querySelectorAll("[data-fluid-input]").forEach((input) => input.addEventListener("input", () => { try { values[input.dataset.fluidInput] = Number(input.value); resolveState(); resetParcels(); updateInputs(); } catch (error) { const status = card.querySelector("[data-fluid-status]"); if (status) status.textContent = error.message; } }));
            resize(); resolveState(); resetParcels(); updateInputs(); if (typeof ResizeObserver === "function") new ResizeObserver(resize).observe(canvas);
        } catch (error) { const status = card.querySelector("[data-fluid-status]"); if (status) { status.textContent = `Fluid card unavailable: ${error.message}`; status.setAttribute("role", "alert"); } card.classList.add("fluid-control-error-state"); }
    });
}

function hydrateVariableBehaviorCard(card, config) {
    const values = Object.fromEntries(config.variables.map((variable) => [variable.symbol, variable.value]));
    const activeVariables = config.behavior.activeVariables;
    const ductScene = config.behaviorMode === "duct-particle" ? hydrateDuctParticleScene(card, config, values) : null;
    const showSelectionError = () => {
        config.variables.filter((variable) => variable.interactive).forEach((variable) => {
            const symbol = variable.symbol;
            const row = card.querySelector(`[data-equation-variable="${symbol}"]`);
            const input = card.querySelector(`[data-equation-input="${symbol}"]`);
            const selector = card.querySelector(`[data-equation-select-variable="${symbol}"]`);
            const isActive = activeVariables.includes(symbol);
            if (row) row.classList.toggle("is-active", isActive);
            if (input) input.disabled = !isActive;
            if (selector) {
                selector.setAttribute("aria-pressed", String(isActive));
                selector.classList.toggle("is-active", isActive);
            }
        });
        const status = card.querySelector("[data-equation-status]");
        if (status) {
            status.textContent = "Select exactly two active variables.";
            status.classList.add("is-selection-error");
        }
    };
    const update = (sourceSymbol = activeVariables[0]) => {
        try {
            if (activeVariables.length !== 2) {
                showSelectionError();
                return;
            }
            const targetSymbol = activeVariables.find((symbol) => symbol !== sourceSymbol) || activeVariables[1];
            values[targetSymbol] = solveVariableBehaviorPartner(config, values, sourceSymbol, targetSymbol);
            const leftValue = createInteractiveEquationExpression(config.graph.relationship.left, values)(0);
            const rightValue = createInteractiveEquationExpression(config.graph.relationship.right, values)(0);
            if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) throw new Error("The relationship produced an invalid conservation value.");
            config.variables.forEach((variable) => {
                const value = Number(values[variable.symbol]);
                const output = card.querySelector(`[data-equation-value="${variable.symbol}"]`);
                const controlOutput = card.querySelector(`[data-equation-control-value="${variable.symbol}"]`);
                const row = card.querySelector(`[data-equation-variable="${variable.symbol}"]`);
                const input = card.querySelector(`[data-equation-input="${variable.symbol}"]`);
                const range = variable.interactive ? variableBehaviorRange(config, variable, value) : null;
                const isActive = activeVariables.includes(variable.symbol);
                const outsideRange = variable.interactive && (value < variable.min || value > variable.max);
                if (output) output.textContent = equationDisplayValue(value, variable.unit);
                if (controlOutput) controlOutput.textContent = equationDisplayValue(value, variable.unit);
                if (row) row.classList.toggle("is-active", isActive);
                if (row) row.classList.toggle("is-out-of-range", outsideRange);
                if (input) {
                    input.disabled = !isActive;
                    input.min = String(range.min);
                    input.max = String(range.max);
                    input.value = String(value);
                    const progress = ((value - range.min) / Math.max(1e-9, range.max - range.min)) * 100;
                    input.style.setProperty("--equation-progress", `${Math.max(0, Math.min(100, progress))}%`);
                }
                const selector = card.querySelector(`[data-equation-select-variable="${variable.symbol}"]`);
                if (selector) {
                    selector.setAttribute("aria-pressed", String(isActive));
                    selector.classList.toggle("is-active", isActive);
                }
            });
            const leftOutput = card.querySelector('[data-equation-side="left"]');
            const rightOutput = card.querySelector('[data-equation-side="right"]');
            if (leftOutput) leftOutput.textContent = equationDisplayValue(leftValue);
            if (rightOutput) rightOutput.textContent = equationDisplayValue(rightValue);
            const graph = card.querySelector("[data-equation-graph]");
            if (graph) graph.innerHTML = renderVariableBehaviorGraph(config.graph, config.variables, values, activeVariables);
            if (ductScene) ductScene.draw();
            const status = card.querySelector("[data-equation-status]");
            if (status) {
                status.textContent = "";
                status.classList.remove("is-selection-error");
            }
        } catch (error) {
            const status = card.querySelector("[data-equation-status]");
            if (status) status.textContent = error.message || "Unable to solve the conservation relationship.";
        }
    };
    card.querySelectorAll("[data-equation-select-variable]").forEach((button) => {
        button.addEventListener("click", () => {
            const symbol = button.dataset.equationSelectVariable;
            const existingIndex = activeVariables.indexOf(symbol);
            if (existingIndex >= 0) {
                activeVariables.splice(existingIndex, 1);
            } else {
                if (activeVariables.length >= 2) {
                    showSelectionError();
                    return;
                }
                activeVariables.push(symbol);
            }
            if (ductScene) ductScene.reset();
            update(activeVariables[0]);
        });
    });
    card.querySelectorAll("[data-equation-input]").forEach((input) => {
        input.addEventListener("input", () => {
            const symbol = input.dataset.equationInput;
            if (!activeVariables.includes(symbol)) return;
            values[symbol] = Number(input.value);
            if (ductScene) ductScene.reset();
            update(symbol);
        });
    });
    update(activeVariables[0]);
}

function hydrateEquationCards(container) {
    container.querySelectorAll("[data-equation-card]").forEach((card) => {
        const config = EQUATION_CARD_CONFIGS.get(card.dataset.equationCard);
        if (!config) return;
        if (config.behaviorMode === "variable-behavior" || config.behaviorMode === "duct-particle") {
            hydrateVariableBehaviorCard(card, config);
            return;
        }
        const values = Object.fromEntries(config.variables.map((variable) => [variable.symbol, variable.value]));
        const update = () => {
            try {
                const allValues = evaluateInteractiveEquationValues(config, values);
                config.variables.forEach((variable) => {
                    const output = card.querySelector(`[data-equation-value="${variable.symbol}"]`);
                    if (output) output.textContent = equationDisplayValue(values[variable.symbol], variable.unit);
                    if (variable.interactive) {
                        const input = card.querySelector(`[data-equation-input="${variable.symbol}"]`);
                        const progress = ((values[variable.symbol] - variable.min) / (variable.max - variable.min)) * 100;
                        if (input) input.style.setProperty("--equation-progress", `${Math.max(0, Math.min(100, progress))}%`);
                    }
                });
                config.derived.forEach((item) => {
                    const output = card.querySelector(`[data-equation-derived="${item.symbol}"]`);
                    if (output) output.textContent = equationDisplayValue(allValues[item.symbol], item.unit);
                });
                const graph = card.querySelector("[data-equation-graph]");
                if (graph && config.graph) graph.innerHTML = renderInteractiveEquationGraph(config.graph, allValues);
                syncEquationGraphSizing(card);
                const status = card.querySelector("[data-equation-status]");
                if (status) status.textContent = "";
            } catch (error) {
                config.derived.forEach((item) => {
                    const output = card.querySelector(`[data-equation-derived="${item.symbol}"]`);
                    if (output) output.textContent = "Error";
                });
                const status = card.querySelector("[data-equation-status]");
                if (status) status.textContent = error.message;
            }
        };
        card.querySelectorAll("[data-equation-input]").forEach((input) => {
            input.addEventListener("input", () => {
                values[input.dataset.equationInput] = Number(input.value);
                update();
            });
        });
        update();
    });
    hydrateFullscreenButtons(container);
}

function renderModelCard(config, modelUrl, cardIndex) {
    if (!config || typeof config !== "object" || !modelUrl) {
        throw new Error("A safe model source is required.");
    }
    const annotations = Array.isArray(config.annotations) ? config.annotations.map((annotation, index) => {
        const entry = annotation && typeof annotation === "object" ? annotation : {};
        const id = text(entry.id);
        const label = text(entry.label);
        const description = text(entry.description);
        const position = text(entry.position);
        const normal = text(entry.normal);
        const coordinate = /^\s*[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:m)?\s+[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:m)?\s+[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:m)?\s*$/.test(position);
        const direction = /^\s*[-+]?(?:\d+(?:\.\d+)?|\.\d+)\s+[-+]?(?:\d+(?:\.\d+)?|\.\d+)\s+[-+]?(?:\d+(?:\.\d+)?|\.\d+)\s*$/.test(normal);
        if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id) || !label || !description || !coordinate || !direction) {
            throw new Error(`Annotation ${index + 1} must have a valid id, label, description, position, and normal.`);
        }
        return { id, label, description, position, normal };
    }) : [];
    const annotationIds = new Set();
    annotations.forEach((annotation) => {
        if (annotationIds.has(annotation.id)) throw new Error(`Duplicate model annotation id: ${annotation.id}.`);
        annotationIds.add(annotation.id);
    });
    const title = equationText(config.title || "Interactive 3D Model");
    const alt = equationText(config.alt || config.title || "Interactive 3D model");
    const cameraOrbit = config.cameraOrbit ? ` camera-orbit="${equationText(config.cameraOrbit)}"` : "";
    const exposure = Number.isFinite(Number(config.exposure)) ? ` exposure="${Math.max(0, Math.min(5, Number(config.exposure)))}"` : "";
    const controls = config.controls !== false ? " camera-controls" : "";
    const autoRotate = config.autoRotate === true ? " auto-rotate" : "";
    const hotspotMarkup = annotations.map((annotation) => `<button type="button" class="model-card-hotspot" slot="hotspot-${equationText(annotation.id)}" data-model-annotation="${equationText(annotation.id)}" data-position="${equationText(annotation.position)}" data-normal="${equationText(annotation.normal)}" data-annotation-label="${equationText(annotation.label)}" data-annotation-description="${equationText(annotation.description)}" aria-label="Show ${equationText(annotation.label)}" aria-selected="false"><span>${equationText(annotation.label)}</span></button>`).join("");
    const annotationInfo = annotations.length ? `<div class="model-card-annotation-info" data-model-annotation-info aria-live="polite"><strong data-model-annotation-title>Select a marker</strong><p data-model-annotation-description>Choose a labeled point on the model to see its description.</p></div>` : "";
    return `<article class="model-card" data-model-card="${equationText(cardIndex)}"><header class="model-card-header"><div><p class="section-label">Interactive 3D Model</p><h3>${title}</h3></div><button type="button" class="card-fullscreen-button" data-card-fullscreen aria-label="Enter fullscreen for 3D model" aria-pressed="false">Fullscreen</button></header><div class="model-card-viewport"><model-viewer src="${equationText(modelUrl)}" alt="${alt}" loading="lazy"${controls}${autoRotate}${cameraOrbit}${exposure} shadow-intensity="1">${hotspotMarkup}</model-viewer><p class="model-card-loading" data-model-loading>Loading 3D model...</p><p class="model-card-error" data-model-error hidden>3D model could not be loaded.</p></div>${annotationInfo}<p class="model-card-fullscreen-status" data-fullscreen-status aria-live="polite"></p></article>`;
}

function hydrateModelCards(container) {
    container.querySelectorAll("[data-model-card]").forEach((card) => {
        const viewer = card.querySelector("model-viewer");
        const loading = card.querySelector("[data-model-loading]");
        const error = card.querySelector("[data-model-error]");
        if (!viewer) return;
        const showError = (message) => {
            if (loading) loading.hidden = true;
            if (error) {
                error.hidden = false;
                error.textContent = message;
            }
        };
        viewer.addEventListener("load", () => {
            if (loading) loading.hidden = true;
        }, { once: true });
        viewer.addEventListener("error", () => showError("3D model could not be loaded. Check that the GLB file is committed and its path is correct."), { once: true });
        const annotationButtons = Array.from(card.querySelectorAll("[data-model-annotation]"));
        const annotationTitle = card.querySelector("[data-model-annotation-title]");
        const annotationDescription = card.querySelector("[data-model-annotation-description]");
        const selectAnnotation = (button) => {
            annotationButtons.forEach((candidate) => {
                const selected = candidate === button;
                candidate.setAttribute("aria-selected", String(selected));
                candidate.classList.toggle("is-selected", selected);
            });
            if (annotationTitle) annotationTitle.textContent = button.dataset.annotationLabel || "Selected marker";
            if (annotationDescription) annotationDescription.textContent = button.dataset.annotationDescription || "";
            if (button.dataset.position && "cameraTarget" in viewer) {
                try {
                    // Recenter the camera without changing its current orbit or zoom.
                    viewer.cameraTarget = button.dataset.position;
                } catch (_error) {
                    // Annotation selection remains useful when camera targeting is unavailable.
                }
            }
        };
        annotationButtons.forEach((button) => {
            button.addEventListener("click", () => selectAnnotation(button));
        });
        if (!globalThis.customElements?.get("model-viewer")) {
            showError("The local 3D viewer is unavailable in this browser.");
        }
    });
    hydrateFullscreenButtons(container);
}

function simpleMarkdownToHtml(md, options = {}) {
    const lines = String(md || "").split(/\r?\n/);
    const out = [];

    const normalizeMarkdownEscapes = (value) => String(value || "")
        .replace(/\\([\\`*_[\]()>#+.!-])/g, "$1");

    const escapeHtml = (value) => String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const resolveSafeUrl = (value) => {
        const candidate = String(value || "").trim();
        if (!candidate || /^\s*(javascript|vbscript|data):/i.test(candidate)) {
            return null;
        }

        try {
            const base = options.basePath
                ? new URL(options.basePath, window.location.href)
                : new URL(window.location.href);
            const resolved = new URL(candidate, base);
            if (!["http:", "https:"].includes(resolved.protocol)) {
                return null;
            }
            return resolved.href;
        } catch {
            return null;
        }
    };

    const renderInline = (text) => {
        const tokens = [];
        const tokenise = (html) => {
            const token = `\u0000${tokens.length}\u0000`;
            tokens.push(html);
            return token;
        };

        let source = normalizeMarkdownEscapes(text)
            .replace(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["']([^"']*)["'])?\s*\)/g, (match, alt, bracketedUrl, bareUrl, title) => {
                const url = bracketedUrl || bareUrl;
                const safeUrl = resolveSafeUrl(url);
                if (!safeUrl) {
                    return escapeHtml(match);
                }
                const sizeMatch = String(alt).match(/^(.*?),\s*(\d+(?:\.\d+)?)\s*$/);
                const requestedSize = sizeMatch ? Number(sizeMatch[2]) : null;
                const hasValidSize = Number.isFinite(requestedSize) && requestedSize >= 1 && requestedSize <= 100;
                const altText = hasValidSize ? sizeMatch[1].trim() : String(alt);
                const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
                const sizeAttrs = hasValidSize ? ` class="markdown-sized-image" style="width: ${requestedSize}%;"` : "";
                return tokenise(`<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(altText)}" loading="lazy"${sizeAttrs}${titleAttr}>`);
            })
            .replace(/\[([^\]]+)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/g, (match, label, url, title) => {
                const safeUrl = resolveSafeUrl(url);
                if (!safeUrl) {
                    return escapeHtml(match);
                }
                const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
                return tokenise(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${escapeHtml(label)}</a>`);
            });

        source = escapeHtml(source)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>');

        return source.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");
    };

    const isExampleDelimiter = (line) => /^\s*\\\\\s*$/.test(line);

    const renderExampleProblem = (regionLines) => {
        const headingPattern = /^\s*###\s+(.+?)\s*$/;
        const solutionPattern = /^\s*###\s+solution\s*:?[ \t]*$/i;
        const answerPattern = /^\s*###\s+answer\s*:?[ \t]*$/i;
        const firstHeadingIndex = regionLines.findIndex((entry) => headingPattern.test(entry));
        const solutionIndex = regionLines.findIndex((entry) => solutionPattern.test(entry));
        const answerIndex = regionLines.findIndex((entry, entryIndex) => entryIndex > solutionIndex && answerPattern.test(entry));
        const error = (message) => `<article class="notes-example-problem notes-example-error" role="alert"><p class="notes-example-error-message">Example problem error: ${escapeHtml(message)}</p></article>`;

        if (firstHeadingIndex < 0) return error("Add a ### heading for the example problem.");
        if (solutionIndex < 0) return error("Add a ### Solution: section before the closing delimiter.");
        const title = regionLines[firstHeadingIndex].replace(headingPattern, "$1").replace(/\s*:\s*$/, "").trim();
        const problemLines = regionLines.slice(firstHeadingIndex + 1, solutionIndex);
        const solutionLines = regionLines.slice(solutionIndex + 1, answerIndex >= 0 ? answerIndex : regionLines.length);
        if (!solutionLines.some((entry) => entry.trim())) return error("The Solution section cannot be empty.");
        const answerLines = answerIndex >= 0 ? regionLines.slice(answerIndex + 1) : [];
        const renderSection = (sectionLines) => simpleMarkdownToHtml(sectionLines.join("\n"), { ...options, disableExampleRegions: true });
        const problem = problemLines.some((entry) => entry.trim()) ? `<section class="notes-example-question"><p class="notes-example-section-label">Problem</p>${renderSection(problemLines)}</section>` : "";
        const solution = `<section class="notes-example-solution"><p class="notes-example-section-label">Solution</p>${renderSection(solutionLines)}</section>`;
        const answer = answerIndex >= 0 ? `<details class="notes-example-answer"><summary>Show Answer</summary><div class="notes-example-answer-body">${renderSection(answerLines)}</div></details>` : "";
        return `<article class="notes-example-problem"><header class="notes-example-header"><p class="section-label">Example Problem</p><h3>${renderInline(title)}</h3></header>${problem}${solution}${answer}</article>`;
    };

    const parseTableRow = (row) => {
        return row
            .replace(/^(\||\s*)/, "")
            .replace(/(\||\s*)$/, "")
            .split("|")
            .map((cell) => cell.trim());
    };

    const parseAlignment = (cell) => {
        const trimmed = cell.trim();
        if (/^:\s*-+\s*:$/.test(trimmed)) return "center";
        if (/^:\s*-+\s*$/.test(trimmed)) return "left";
        if (/^\s*-+\s*:$/.test(trimmed)) return "right";
        return null;
    };

    const renderTableHtml = (headerCells, alignments, rows) => {
        const ths = headerCells.map((cell, index) => {
            const align = alignments[index];
            const attrs = align ? ` align="${align}"` : "";
            return `<th${attrs}>${renderInline(cell)}</th>`;
        }).join("");

        const tbody = rows.map((row) => {
            const cells = row.map((cell, index) => {
                const align = alignments[index];
                const attrs = align ? ` align="${align}"` : "";
                return `<td${attrs}>${renderInline(cell)}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
        }).join("\n");

        return `<table><thead><tr>${ths}</tr></thead><tbody>${tbody}</tbody></table>`;
    };

    const renderYoutubeCard = (config) => {
        if (!config || typeof config !== "object" || Array.isArray(config)) {
            throw new Error("YouTube card configuration must be a JSON object.");
        }
        const source = String(config.url || "").trim();
        if (!source) throw new Error("A YouTube URL is required.");

        let parsed;
        try {
            parsed = new URL(source);
        } catch {
            throw new Error("The YouTube URL is invalid.");
        }
        const host = parsed.hostname.toLowerCase();
        const allowedHosts = new Set([
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtube-nocookie.com",
            "www.youtube-nocookie.com",
            "youtu.be",
            "www.youtu.be"
        ]);
        if (parsed.protocol !== "https:" || !allowedHosts.has(host) || parsed.username || parsed.password || parsed.port) {
            throw new Error("Only secure YouTube URLs are supported.");
        }

        let videoId = "";
        if (host === "youtu.be" || host === "www.youtu.be") {
            videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
        } else if (parsed.pathname === "/watch") {
            videoId = parsed.searchParams.get("v") || "";
        } else if (/^\/(?:embed|shorts)\//.test(parsed.pathname)) {
            videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
        }
        if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
            throw new Error("The YouTube URL does not contain a valid video ID.");
        }

        const readTimestamp = (key) => {
            if (!Object.prototype.hasOwnProperty.call(config, key)) return null;
            if (!Number.isInteger(config[key]) || config[key] < 0) {
                throw new Error(`${key} must be a non-negative whole number of seconds.`);
            }
            return config[key];
        };
        const start = readTimestamp("start");
        const end = readTimestamp("end");
        if (start !== null && end !== null && end < start) {
            throw new Error("end must be greater than or equal to start.");
        }

        const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
        if (start !== null) embedUrl.searchParams.set("start", String(start));
        if (end !== null) embedUrl.searchParams.set("end", String(end));
        const title = String(config.title || "YouTube video").trim();
        if (!title) throw new Error("The YouTube card title cannot be empty.");
        const safeTitle = escapeHtml(title);
        return `<article class="youtube-card"><header class="youtube-card-header"><p class="section-label">YouTube Video</p><h3>${safeTitle}</h3></header><div class="youtube-card-frame"><iframe src="${escapeHtml(embedUrl.href)}" title="${safeTitle}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div></article>`;
    };

    let index = 0;
    while (index < lines.length) {
        let line = lines[index];
        const nextLine = lines[index + 1] || "";

        // Fenced code block: ```lang\n...\n``` -> <pre><code class="language-lang">...</code></pre>
        if (/^\s*```/.test(line)) {
            const lang = (line.replace(/^\s*```/, "") || "").trim();
            index += 1;
            const codeLines = [];
            while (index < lines.length && !/^\s*```/.test(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }
            // skip closing fence if present
            if (index < lines.length && /^\s*```/.test(lines[index])) {
                index += 1;
            }
            if (lang.toLowerCase() === "equation-card") {
                try {
                    out.push(renderEquationCard(JSON.parse(codeLines.join("\n")), index));
                } catch (error) {
                    out.push(`<article class="equation-card equation-card-error-state"><p class="equation-card-error">Equation card error: ${equationText(error.message || "Invalid JSON payload.")}</p></article>`);
                }
                continue;
            }
            if (lang.toLowerCase() === "model-card") {
                try {
                    const config = JSON.parse(codeLines.join("\n"));
                    const modelUrl = resolveSafeUrl(config?.src);
                    if (!modelUrl) throw new Error("The model source is missing or uses an unsafe URL.");
                    out.push(renderModelCard(config, modelUrl, index));
                } catch (error) {
                    out.push(`<article class="model-card model-card-error-state"><p class="model-card-error">3D model card error: ${equationText(error.message || "Invalid JSON payload.")}</p></article>`);
                }
                continue;
            }
            if (lang.toLowerCase() === "particle-card") {
                try {
                    out.push(renderParticleCard(JSON.parse(codeLines.join("\n")), index));
                } catch (error) {
                    out.push(`<article class="particle-card particle-card-error-state"><p class="particle-card-error">Particle card error: ${equationText(error.message || "Invalid JSON payload.")}</p></article>`);
                }
                continue;
            }
            if (lang.toLowerCase() === "particle-physics-card") {
                try {
                    out.push(renderParticlePhysicsCard(JSON.parse(codeLines.join("\n")), index));
                } catch (error) {
                    out.push(`<article class="particle-physics-card particle-physics-error-state"><p class="particle-physics-error">Particle physics card error: ${equationText(error.message || "Invalid JSON payload.")}</p></article>`);
                }
                continue;
            }
            if (lang.toLowerCase() === "fluid-control-volume-card") {
                try {
                    out.push(renderFluidControlVolumeCard(JSON.parse(codeLines.join("\n")), index));
                } catch (error) {
                    out.push(`<article class="fluid-control-volume-card fluid-control-error-state"><p class="fluid-control-error">Fluid control-volume card error: ${equationText(error.message || "Invalid JSON payload.")}</p></article>`);
                }
                continue;
            }
            if (lang.toLowerCase() === "youtube-card") {
                try {
                    out.push(renderYoutubeCard(JSON.parse(codeLines.join("\n"))));
                } catch (error) {
                    out.push(`<article class="youtube-card youtube-card-error-state"><p class="youtube-card-error">YouTube card error: ${equationText(error.message || "Invalid JSON payload.")}</p></article>`);
                }
                continue;
            }
            const code = String(codeLines.join("\n"))
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            const cls = lang ? `language-${lang}` : "";
            out.push(`<pre><code class="${cls}">${code}</code></pre>`);
            continue;
        }

        if (!options.disableExampleRegions && isExampleDelimiter(line)) {
            let endIndex = index + 1;
            let insideFence = false;
            while (endIndex < lines.length) {
                if (/^\s*```/.test(lines[endIndex])) insideFence = !insideFence;
                if (!insideFence && isExampleDelimiter(lines[endIndex])) break;
                endIndex += 1;
            }
            if (endIndex >= lines.length) {
                out.push(`<article class="notes-example-problem notes-example-error" role="alert"><p class="notes-example-error-message">Example problem error: add a closing \\\\ delimiter on its own line.</p></article>`);
                index = lines.length;
                continue;
            }
            out.push(renderExampleProblem(lines.slice(index + 1, endIndex)));
            index = endIndex + 1;
            continue;
        }

        // Keep display-math delimiters together so KaTeX can parse multiline equations.
        const trimmedLine = line.trim();
        const singleLineMath = trimmedLine.match(/^\$\$([\s\S]+)\$\$$/);
        if (singleLineMath) {
            out.push(`<div class="markdown-math-block">$$${escapeHtml(singleLineMath[1])}$$</div>`);
            index += 1;
            continue;
        }
        if (trimmedLine === "$$") {
            const mathLines = [];
            let mathIndex = index + 1;
            while (mathIndex < lines.length && lines[mathIndex].trim() !== "$$") {
                mathLines.push(lines[mathIndex]);
                mathIndex += 1;
            }
            if (mathIndex < lines.length) {
                out.push(`<div class="markdown-math-block">$$${escapeHtml(mathLines.join("\n"))}$$</div>`);
                index = mathIndex + 1;
                continue;
            }
        }

        const isTableHeader = /^\s*\|?[^|\n]+\|.+$/.test(line);
        const isTableDivider = /^\s*\|?\s*[:\- ]+\s*(\|\s*[:\- ]+\s*)+\|?\s*$/.test(nextLine);

        if (isTableHeader && isTableDivider) {
            const headerCells = parseTableRow(line);
            const alignCells = parseTableRow(nextLine).map(parseAlignment);
            const rows = [];
            index += 2;
            while (index < lines.length && /^\s*\|?.+\|.*$/.test(lines[index]) && lines[index].trim() !== "") {
                rows.push(parseTableRow(lines[index]));
                index += 1;
            }
            out.push(renderTableHtml(headerCells, alignCells, rows));
            continue;
        }

        // Blockquote: consecutive lines starting with '>' form a blockquote
        if (/^\s*>/.test(line)) {
            const blockLines = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                blockLines.push(lines[index].replace(/^\s*>\s?/, ""));
                index += 1;
            }

            const inner = [];
            let bi = 0;
            while (bi < blockLines.length) {
                const raw = blockLines[bi].trim();
                if (raw === "") {
                    inner.push("<p></p>");
                    bi += 1;
                    continue;
                }
                const paraLines = [raw];
                bi += 1;
                while (bi < blockLines.length && blockLines[bi].trim() !== "") {
                    paraLines.push(blockLines[bi].trim());
                    bi += 1;
                }
                inner.push(`<p>${paraLines.map(renderInline).join(" ")}</p>`);
            }

            out.push(`<blockquote>${inner.join("")}</blockquote>`);
            continue;
        }

        line = normalizeMarkdownEscapes(line).trim();
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
            out.push("<hr>");
        } else {
            line = renderInline(line);
            if (/^#{1}\s+(.*)/.test(line)) {
                out.push(`<h1>${line.replace(/^#{1}\s+/, "")}</h1>`);
            } else if (/^#{2}\s+(.*)/.test(line)) {
                out.push(`<h2>${line.replace(/^#{2}\s+/, "")}</h2>`);
            } else if (/^#{3}\s+(.*)/.test(line)) {
                out.push(`<h3>${line.replace(/^#{3}\s+/, "")}</h3>`);
            } else if (/^(?:\*|-)\s+/.test(line)) {
                out.push(`<li>${line.replace(/^(?:\*|-)\s+/, "")}</li>`);
            } else if (line === "") {
                out.push(`<p></p>`);
            } else {
                out.push(`<p>${line}</p>`);
            }
        }
        index += 1;
    }

    const html = out.join("\n").replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
    return html;
}

export function renderMarkdownPreview(markdown, options = {}) {
    return simpleMarkdownToHtml(markdown, options);
}

export function hydrateMarkdownPreview(container) {
    if (!container) return;
    hydrateEquationCards(container);
    hydrateModelCards(container);
    hydrateParticleCards(container);
    hydrateParticlePhysicsCards(container);
    hydrateFluidControlVolumeCards(container);
    try {
        renderMath(container);
    } catch (_) {
        // Keep the preview usable when an optional math renderer is unavailable.
    }
}

function noteHeadingLevel(node) {
    if (!(node instanceof HTMLElement)) {
        return 0;
    }
    const match = node.tagName.match(/^H([1-6])$/);
    return match ? Number(match[1]) : 0;
}

function noteHeadingSlug(value, usedIds) {
    const base = String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";

    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }
    usedIds.add(id);
    return id;
}

function wrapNoteSections(nodes, level, selectedTitle, usedIds) {
    const fragment = document.createDocumentFragment();
    let index = 0;

    while (index < nodes.length) {
        const node = nodes[index];
        const headingLevel = noteHeadingLevel(node);

        if (headingLevel !== level) {
            fragment.appendChild(node);
            index += 1;
            continue;
        }

        const heading = node;
        const sectionId = noteHeadingSlug(heading.textContent, usedIds);
        heading.id = `note-${sectionId}`;

        const details = document.createElement("details");
        details.className = `notes-section notes-section-level-${level}`;
        details.dataset.noteSectionId = sectionId;
        details.dataset.noteHeading = heading.textContent.trim();

        const summary = document.createElement("summary");
        summary.className = "notes-section-summary";
        summary.appendChild(heading);

        const content = document.createElement("div");
        content.className = "notes-section-content";

        const bodyNodes = [];
        index += 1;
        while (index < nodes.length) {
            const nextLevel = noteHeadingLevel(nodes[index]);
            if (nextLevel > 0 && nextLevel <= level) {
                break;
            }
            bodyNodes.push(nodes[index]);
            index += 1;
        }

        bodyNodes.forEach((bodyNode) => content.appendChild(bodyNode));

        details.append(summary, content);
        details.open = level === 2 && heading.textContent.trim() === selectedTitle;
        fragment.appendChild(details);
    }

    return fragment;
}

function enhanceNotesDocument(container, selectedTitle = "") {
    const nodes = Array.from(container.childNodes);
    const usedIds = new Set();
    const transformed = wrapNoteSections(nodes, 2, selectedTitle, usedIds);
    container.replaceChildren(transformed);

    container.querySelectorAll("h1, h2, h3").forEach((heading) => {
        if (!heading.id) {
            heading.id = `note-${noteHeadingSlug(heading.textContent, usedIds)}`;
        }
    });
}

function activateNotesChapter(container, chapterTitle, shouldScroll = true) {
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const target = headings.find((heading) => heading.textContent.trim() === String(chapterTitle || "").trim());

    container.querySelectorAll("details[data-note-section-id]").forEach((section) => {
        section.dataset.noteSelected = "false";
    });
    container.querySelectorAll(".highlight-target").forEach((heading) => heading.classList.remove("highlight-target"));

    if (!target) {
        return null;
    }

    let section = target.closest("details");
    while (section) {
        section.open = true;
        section.dataset.noteSelected = "true";
        section = section.parentElement?.closest("details") || null;
    }

    target.classList.add("highlight-target");
    if (shouldScroll) {
        requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    return target;
}

function renderNoteStage(stage, subject, chapter, session) {
    stage.replaceChildren();

    if (!subject) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.append(
            Object.assign(document.createElement("h4"), { textContent: "No subject selected." }),
            Object.assign(document.createElement("p"), { textContent: "Select a subject to view notes." })
        );
        stage.appendChild(empty);
        return;
    }

    const notesWorkspace = document.createElement("div");
    notesWorkspace.className = "notes-workspace";

    const notesContainer = document.createElement("article");
    notesContainer.className = "notes-view";

    notesWorkspace.appendChild(notesContainer);
    stage.appendChild(notesWorkspace);

    const notesPath = resolveSubjectNotesPath(subject);
    loadSubjectMarkdown(subject).then((markdown) => {
        notesContainer.replaceChildren();
        if (!markdown) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.append(
                Object.assign(document.createElement("h4"), { textContent: notesPath ? "Unable to load notes." : "No notes available." }),
                Object.assign(document.createElement("p"), { textContent: notesPath ? `Could not load ${notesPath}. Check that the Markdown file is committed and its path is correct.` : "There are no notes attached to this subject yet." })
            );
            notesContainer.appendChild(empty);
            return;
        }

        notesContainer.innerHTML = simpleMarkdownToHtml(markdown, {
            basePath: resolveSubjectNotesPath(subject)
        });
        hydrateEquationCards(notesContainer);
        hydrateModelCards(notesContainer);
        hydrateParticleCards(notesContainer);
        hydrateParticlePhysicsCards(notesContainer);
        hydrateFluidControlVolumeCards(notesContainer);
        enhanceNotesDocument(notesContainer, chapter?.title || "");
        try {
            renderMath(notesContainer);
        } catch (_error) {
            // ignore math render failures
        }

        // Highlight code blocks if Prism is available
        try {
            if (window.Prism && typeof window.Prism.highlightAll === "function") {
                window.Prism.highlightAll();
            }
        } catch (_e) {
            // ignore highlighting failures
        }

        if (chapter && chapter.title) {
            activateNotesChapter(notesContainer, chapter.title, true);
        }
    }).catch(() => {
        notesContainer.replaceChildren();
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.append(
            Object.assign(document.createElement("h4"), { textContent: "Unable to load notes." }),
            Object.assign(document.createElement("p"), { textContent: notesPath ? `Could not load ${notesPath}. Check that the Markdown file is committed and its path is correct.` : "Try again or check that the notes file exists in markdowns/." })
        );
        notesContainer.appendChild(empty);
    });
}

function countAnsweredQuestions(session) {
    return session?.answers?.filter((entry) => Boolean(entry)).length || 0;
}

function renderProgress(fill, session) {
    const track = fill?.parentElement;
    track?.querySelectorAll(".learn-checkpoint-marker").forEach((marker) => marker.remove());

    if (!session || session.questions.length === 0) {
        fill.style.width = "0%";
        return;
    }

    const current = session.mode === "quiz" || session.mode === "exam" || session.mode === "learn"
        ? countAnsweredQuestions(session)
        : session.index;
    const percent = session.complete ? 100 : Math.round((current / session.questions.length) * 100);
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;

    if (session.mode === "learn" && track) {
        const checkpointCount = Math.ceil(session.questions.length / LEARN_BATCH_SIZE);
        for (let checkpoint = 1; checkpoint <= checkpointCount; checkpoint += 1) {
            const questionCount = Math.min(checkpoint * LEARN_BATCH_SIZE, session.questions.length);
            const marker = document.createElement("span");
            marker.className = "learn-checkpoint-marker";
            if (checkpoint === checkpointCount) {
                marker.classList.add("is-final");
            }
            marker.style.left = `${(questionCount / session.questions.length) * 100}%`;
            marker.title = `Checkpoint ${checkpoint}`;
            marker.setAttribute("aria-label", `Checkpoint ${checkpoint}`);
            if (questionCount <= current || session.complete) {
                marker.classList.add("is-reached");
            }
            track.appendChild(marker);
        }
    }
}

let feedbackExplanationSequence = 0;

function createFeedbackCard(result, options = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = `feedback-card ${result.correct ? "is-correct" : "is-wrong"}`;

    const title = document.createElement("strong");
    title.textContent = result.correct ? "Correct" : "Not quite";

    const answer = document.createElement("p");
    answer.textContent = `Correct answer: ${result.correctAnswer}`;

    const details = document.createElement("p");
    details.textContent = result.correct
        ? "Nice work — that one is locked in."
        : `You answered ${text(result.userAnswer) || "nothing"}; keep this one in review.`;

    wrapper.append(title, answer, details);

    const explanationText = formatExplanationText(result.explanation || result.explaination);
    if (explanationText && options.includeExplanation !== false) {
        const explanationLabel = document.createElement("strong");
        explanationLabel.className = "feedback-explanation-label";
        explanationLabel.textContent = "Explanation";

        const explanation = createFormattedTextElement(explanationText, "feedback-explanation");
        wrapper.append(explanationLabel, explanation);
    } else if (explanationText && options.explanationToggle === true) {
        const explanationId = `quiz-explanation-${++feedbackExplanationSequence}`;
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "feedback-explanation-toggle ghost-button";
        toggle.textContent = "Show Explanation";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", explanationId);

        const explanation = createFormattedTextElement(explanationText, "feedback-explanation");
        explanation.id = explanationId;
        explanation.hidden = true;

        toggle.addEventListener("click", () => {
            const isExpanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!isExpanded));
            toggle.textContent = isExpanded ? "Show Explanation" : "Hide Explanation";
            explanation.hidden = isExpanded;
            if (!isExpanded) {
                try { renderMath(explanation); } catch (_) {}
            }
        });

        wrapper.append(toggle, explanation);
    }

    return wrapper;
}

function createExplanationCallout(result) {
    const explanationText = formatExplanationText(result?.explanation || result?.explaination);
    if (!explanationText) {
        return null;
    }

    const callout = document.createElement("div");
    callout.className = "learn-explanation";

    const title = document.createElement("strong");
    title.textContent = "Why this matters";

    const body = createFormattedTextElement(explanationText);

    callout.append(title, body);
    return callout;
}

function appendLearnExplanation(container, result) {
    const explanation = createExplanationCallout(result);
    if (explanation) {
        container.appendChild(explanation);
        try { renderMath(explanation); } catch (_) {}
    }
}

function createAssessmentChart(segments, centerValue, centerLabel, ariaLabel) {
    const chartCard = document.createElement("div");
    chartCard.className = "assessment-chart-card";

    const chartPanel = document.createElement("div");
    chartPanel.className = "assessment-chart-panel";

    const chart = document.createElement("div");
    chart.className = "assessment-chart";
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", ariaLabel);

    const total = segments.reduce((sum, segment) => sum + Math.max(0, Number(segment.value) || 0), 0);
    if (total > 0) {
        let cursor = 0;
        const stops = [];
        segments.forEach((segment) => {
            const value = Math.max(0, Number(segment.value) || 0);
            if (!value) {
                return;
            }
            const start = cursor;
            const end = cursor + (value / total) * 100;
            stops.push(`${segment.color} ${start}% ${end}%`);
            cursor = end;
        });
        chart.style.background = `conic-gradient(${stops.join(", ")})`;
    } else {
        chart.classList.add("is-empty");
    }

    const chartCore = document.createElement("div");
    chartCore.className = "assessment-chart-core";

    const chartValue = document.createElement("strong");
    chartValue.className = "assessment-chart-value";
    chartValue.textContent = centerValue;

    const chartLabel = document.createElement("span");
    chartLabel.className = "assessment-chart-label";
    chartLabel.textContent = centerLabel;

    chartCore.append(chartValue, chartLabel);
    chart.appendChild(chartCore);

    const legend = document.createElement("div");
    legend.className = "assessment-legend";

    segments.forEach((segment) => {
        const item = document.createElement("div");
        item.className = "assessment-legend-item";
        item.style.setProperty("--legend-fill", `${Math.max(0, Number(segment.fillPercent) || 0)}%`);
        item.style.setProperty("--legend-fill-color", segment.color);

        const copy = document.createElement("div");
        copy.className = "assessment-legend-copy";

        const swatch = document.createElement("span");
        swatch.className = "assessment-legend-swatch";
        swatch.style.background = segment.color;

        const label = document.createElement("span");
        label.className = "assessment-legend-label";
        label.textContent = segment.label;

        copy.append(swatch, label);

        const meta = document.createElement("span");
        meta.className = "assessment-legend-meta";
        meta.textContent = `${Math.max(0, Number(segment.value) || 0)}${segment.meta ? ` • ${segment.meta}` : ""}`;

        item.append(copy, meta);
        legend.appendChild(item);
    });

    chartPanel.append(chart, legend);
    chartCard.append(chartPanel);
    return chartCard;
}

function createAccuracyAttemptChartCard(quizEntries, examEntries) {
    const card = document.createElement("div");
    card.className = "progress-summary-card progress-chart-card full-width";

    const header = document.createElement("div");
    header.className = "progress-summary-card-header";
    const titleEl = document.createElement("h3");
    titleEl.textContent = "Attempt History";
    const metaEl = document.createElement("p");
    metaEl.className = "progress-summary-card-meta";
    metaEl.textContent = "Quiz and exam sessions";
    header.append(titleEl, metaEl);

    const legend = document.createElement("div");
    legend.className = "accuracy-chart-legend";
    legend.append(
        Object.assign(document.createElement("span"), {
            className: "accuracy-chart-legend-item",
            innerHTML: '<span class="accuracy-chart-legend-swatch quiz"></span>Quiz'
        }),
        Object.assign(document.createElement("span"), {
            className: "accuracy-chart-legend-item",
            innerHTML: '<span class="accuracy-chart-legend-swatch exam"></span>Exam'
        })
    );

    const chartWrap = document.createElement("div");
    chartWrap.className = "accuracy-chart-wrapper";
    chartWrap.appendChild(createAccuracyAttemptChart(quizEntries, examEntries));

    const note = document.createElement("p");
    note.className = "progress-summary-card-note";
    note.textContent = "Each completed quiz or exam session contributes one point on the timeline.";

    card.append(header, legend, chartWrap, note);
    return card;
}

function createAccuracyAttemptChart(quizEntries, examEntries) {
    const width = 760;
    const height = 260;
    const padding = { top: 24, right: 24, bottom: 64, left: 64 };
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = 34;
    const barGap = 18;

    const combinedEntries = [
        ...(Array.isArray(quizEntries) ? quizEntries : []),
        ...(Array.isArray(examEntries) ? examEntries : [])
    ]
        .filter(Boolean)
        .map((entry) => {
            const parsedTime = entry?.timestamp ? Date.parse(entry.timestamp) : Number.NaN;
            return {
                ...entry,
                timestampValue: Number.isFinite(parsedTime) ? parsedTime : 0
            };
        })
        .sort((left, right) => left.timestampValue - right.timestampValue || String(left?.id || "").localeCompare(String(right?.id || "")))
        .map((entry, index) => ({
            attempt: index + 1,
            accuracy: Math.max(0, Math.min(100, Number(entry?.accuracy) || 0)),
            mode: text(entry?.mode) === "exam" ? "exam" : "quiz"
        }));

    const totalPlotWidth = Math.max(
        width,
        padding.left + padding.right + combinedEntries.length * (barWidth + barGap)
    );
    const chartWidth = totalPlotWidth - padding.left - padding.right;
    const buildBars = (entries) => entries.map((entry) => {
        const x = padding.left + (entry.attempt - 1) * (barWidth + barGap);
        const barHeight = (entry.accuracy / 100) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        return {
            x,
            y,
            width: barWidth,
            height: barHeight,
            accuracy: entry.accuracy,
            attempt: entry.attempt,
            mode: entry.mode,
            color: entry.mode === "exam" ? "#f59e0b" : "#3b82f6"
        };
    });

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${totalPlotWidth} ${height}`);
    svg.setAttribute("width", String(totalPlotWidth));
    svg.setAttribute("height", String(height));
    svg.setAttribute("class", "accuracy-chart-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Accuracy by quiz and exam attempt");

    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute("width", String(totalPlotWidth));
    background.setAttribute("height", String(height));
    background.setAttribute("rx", "18");
    background.setAttribute("fill", "rgba(255,255,255,0.03)");
    svg.appendChild(background);

    const axisColor = "rgba(255,255,255,0.16)";
    const textColor = "#94a3b8";
    const yTicks = [0, 25, 50, 75, 100];
    yTicks.forEach((tick) => {
        const y = padding.top + chartHeight - (tick / 100) * chartHeight;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", padding.left);
        line.setAttribute("x2", totalPlotWidth - padding.right);
        line.setAttribute("y1", y);
        line.setAttribute("y2", y);
        line.setAttribute("stroke", axisColor);
        line.setAttribute("stroke-dasharray", "3 4");
        svg.appendChild(line);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", padding.left - 10);
        label.setAttribute("y", y + 4);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("font-size", "10");
        label.setAttribute("fill", textColor);
        label.textContent = `${tick}`;
        svg.appendChild(label);
    });

    const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisX.setAttribute("x1", padding.left);
    axisX.setAttribute("x2", totalPlotWidth - padding.right);
    axisX.setAttribute("y1", height - padding.bottom);
    axisX.setAttribute("y2", height - padding.bottom);
    axisX.setAttribute("stroke", "rgba(255,255,255,0.24)");
    svg.appendChild(axisX);

    const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisY.setAttribute("x1", padding.left);
    axisY.setAttribute("x2", padding.left);
    axisY.setAttribute("y1", padding.top);
    axisY.setAttribute("y2", height - padding.bottom);
    axisY.setAttribute("stroke", "rgba(255,255,255,0.24)");
    svg.appendChild(axisY);

    const axisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const axisTitleX = 24;
    const axisTitleY = padding.top + chartHeight / 2;
    axisTitle.setAttribute("x", axisTitleX);
    axisTitle.setAttribute("y", axisTitleY);
    axisTitle.setAttribute("text-anchor", "middle");
    axisTitle.setAttribute("dominant-baseline", "middle");
    axisTitle.setAttribute("transform", `rotate(-90 ${axisTitleX} ${axisTitleY})`);
    axisTitle.setAttribute("font-size", "11");
    axisTitle.setAttribute("fill", textColor);
    axisTitle.textContent = "Accuracy %";
    svg.appendChild(axisTitle);

    const xTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xTitle.setAttribute("x", totalPlotWidth / 2);
    xTitle.setAttribute("y", height - 2);
    xTitle.setAttribute("text-anchor", "middle");
    xTitle.setAttribute("font-size", "10");
    xTitle.setAttribute("fill", textColor);
    xTitle.textContent = "Attempt";
    svg.appendChild(xTitle);

    const bars = buildBars(combinedEntries);
    bars.forEach((bar) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", bar.x);
        rect.setAttribute("y", bar.y);
        rect.setAttribute("width", bar.width);
        rect.setAttribute("height", Math.max(2, bar.height));
        rect.setAttribute("rx", "8");
        rect.setAttribute("fill", bar.color);
        rect.setAttribute("opacity", "0.92");
        rect.setAttribute("stroke", "rgba(255,255,255,0.2)");
        rect.setAttribute("stroke-width", "1");
        group.appendChild(rect);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", bar.x + bar.width / 2);
        label.setAttribute("y", height - padding.bottom + 18);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "10");
        label.setAttribute("fill", textColor);
        label.textContent = `${bar.attempt}`;
        group.appendChild(label);

        const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        valueLabel.setAttribute("x", bar.x + bar.width / 2);
        valueLabel.setAttribute("y", Math.max(padding.top + 10, bar.y - 8));
        valueLabel.setAttribute("text-anchor", "middle");
        valueLabel.setAttribute("font-size", "9");
        valueLabel.setAttribute("fill", textColor);
        valueLabel.textContent = `${bar.accuracy}%`;
        group.appendChild(valueLabel);

        svg.appendChild(group);
    });

    return svg;
}

function createProgressSummaryCard(title, summary, description) {
    const card = document.createElement("div");
    card.className = "progress-summary-card";

    const header = document.createElement("div");
    header.className = "progress-summary-card-header";
    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    const metaEl = document.createElement("p");
    metaEl.className = "progress-summary-card-meta";
    metaEl.textContent = summary.attemptCount
        ? `${summary.attemptCount} attempts`
        : "No attempts yet";
    header.append(titleEl, metaEl);

    const chart = createAssessmentChart(
        [
            {
                label: "Correct",
                value: summary.correct,
                color: "var(--success)",
                fillPercent: summary.attempted ? Math.round((summary.correct / summary.attempted) * 100) : 0,
                meta: `${summary.correct}/${summary.attempted}`
            },
            {
                label: "Missed",
                value: Math.max(0, summary.attempted - summary.correct),
                color: "var(--danger)",
                fillPercent: summary.attempted ? Math.max(0, 100 - Math.round((summary.correct / summary.attempted) * 100)) : 0,
                meta: `${Math.max(0, summary.attempted - summary.correct)}/${summary.attempted}`
            }
        ],
        `${summary.accuracy}%`,
        "Accuracy",
        `${title} breakdown`
    );

    const note = document.createElement("p");
    note.className = "progress-summary-card-note";
    note.textContent = summary.attemptCount
        ? `${summary.accuracy}% accuracy from ${summary.correct}/${summary.attempted} total questions in ${summary.attemptCount} sessions.`
        : description;

    const footer = document.createElement("div");
    footer.className = "progress-summary-card-footer";
    footer.textContent = summary.attemptCount
        ? `${summary.attemptCount} completed session${summary.attemptCount === 1 ? "" : "s"} over the last ${summary.days} days.`
        : `No ${summary.mode} session attempts recorded in the last ${summary.days} days.`;

    card.append(header, chart, note, footer);
    return card;
}

function createLearningProgressSummaryCard(summary) {
    const card = document.createElement("div");
    card.className = "progress-summary-card learn-progress-summary-card";

    const header = document.createElement("div");
    header.className = "progress-summary-card-header";
    header.append(
        Object.assign(document.createElement("h3"), { textContent: "Learning progress" }),
        Object.assign(document.createElement("p"), { className: "progress-summary-card-meta", textContent: summary.attemptCount ? `${summary.attemptCount} active session${summary.attemptCount === 1 ? "" : "s"}` : "No Learn sessions yet" })
    );

    const chart = createAssessmentChart(
        [
            { label: "Mastery progress", value: summary.learningProgress, color: "var(--secondary)", fillPercent: summary.learningProgress, meta: `${summary.learningProgress}%` },
            { label: "Remaining progress", value: Math.max(0, 100 - summary.learningProgress), color: "rgba(255,255,255,0.18)", fillPercent: Math.max(0, 100 - summary.learningProgress), meta: `${Math.max(0, 100 - summary.learningProgress)}%` }
        ],
        `${summary.learningProgress}%`,
        "Learning Progress",
        "Learn mastery progress"
    );

    const note = document.createElement("p");
    note.className = "progress-summary-card-note";
    note.textContent = summary.attemptCount
        ? `${summary.attempted} questions completed across the latest Learn sessions.`
        : "Complete Learn checkpoints to begin tracking mastery progress.";

    card.append(header, chart, note);
    return card;
}

function createQuizAssessmentModal(summary, session, state, selectChapter, startSession) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    
    const modal = document.createElement("div");
    modal.className = "assessment-modal";
    
    const header = document.createElement("div");
    header.className = "assessment-modal-header";

    const headerCopy = document.createElement("div");
    headerCopy.className = "assessment-modal-header-copy";
    headerCopy.innerHTML = `
        <h3>Results for ${session.chapterTitle}</h3>
        <p>${summary.accuracy}% • ${summary.correctCount}/${summary.total} correct</p>
    `;

    const headerChart = document.createElement("div");
    headerChart.className = "assessment-modal-header-chart";

    const headerPie = document.createElement("div");
    headerPie.className = "assessment-chart header-chart";
    headerPie.setAttribute("role", "img");
    headerPie.setAttribute("aria-label", `Accuracy breakdown: ${summary.correctCount} correct and ${summary.missed.length} missed.`);

    const total = summary.correctCount + summary.missed.length;
    if (total > 0) {
        const correctPercent = Math.round((summary.correctCount / total) * 100);
        headerPie.style.background = `conic-gradient(var(--success) 0% ${correctPercent}%, var(--danger) ${correctPercent}% 100%)`;
    } else {
        headerPie.classList.add("is-empty");
    }

    const headerPieCore = document.createElement("div");
    headerPieCore.className = "assessment-chart-core";
    headerPieCore.innerHTML = `<strong class="assessment-chart-value">${summary.accuracy}%</strong><span class="assessment-chart-label">Accuracy</span>`;
    headerPie.appendChild(headerPieCore);
    headerChart.appendChild(headerPie);

    header.append(headerCopy, headerChart);

    const content = document.createElement("div");
    content.className = "assessment-modal-content";
    
    // Score card
    const scoreCard = document.createElement("div");
    scoreCard.className = "assessment-score-card";
    scoreCard.innerHTML = `
        <h4>${summary.correctCount} correct out of ${summary.total}</h4>
        <p>Accuracy: ${summary.accuracy}%</p>
    `;
    
    // Weak areas
    const weakCard = document.createElement("div");
    weakCard.className = "assessment-block";
    weakCard.innerHTML = `<h4>Weak areas</h4>`;
    const weakList = document.createElement("div");
    weakList.className = "tag-row";
    if (summary.weakAreas && summary.weakAreas.length) {
        summary.weakAreas.forEach((weakArea) => {
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = `${weakArea.name} (${weakArea.count})`;
            weakList.appendChild(pill);
        });
    } else {
        weakList.innerHTML = '<span class="tag-pill">No weak areas</span>';
    }
    weakCard.appendChild(weakList);
    
    // Missed questions
    const reviewCard = document.createElement("div");
    reviewCard.className = "assessment-block";
    reviewCard.innerHTML = `<h4>Missed questions (${summary.missed.length})</h4>`;
    if (summary.missed.length === 0) {
        reviewCard.innerHTML += "<p>Perfect session — nothing to review.</p>";
    } else {
        const list = document.createElement("div");
        list.className = "review-list compact";
        summary.missed.forEach((entry) => {
            const item = document.createElement("article");
            item.className = "review-item compact";
            item.innerHTML = `
                <h5>${entry.questionText}</h5>
                <p><strong>Correct:</strong> ${entry.correctAnswer}</p>
            `;
            list.appendChild(item);
        });
        reviewCard.appendChild(list);
    }
    
    content.append(scoreCard, weakCard, reviewCard);
    
    // Action buttons
    const actions = document.createElement("div");
    actions.className = "assessment-modal-actions";
    
    const retakeBtn = document.createElement("button");
    retakeBtn.className = "primary-button";
    retakeBtn.textContent = "Retake Chapter";
    retakeBtn.addEventListener("click", () => {
        backdrop.remove();
        startSession(session.mode);
    });
    
    const learnBtn = document.createElement("button");
    learnBtn.className = "secondary-button";
    learnBtn.textContent = "Practice Missed in Learn Mode";
    learnBtn.addEventListener("click", () => {
        backdrop.remove();
        const payload = createReviewSessionPayload(session, summary);
        saveReviewSession(payload);
        syncSelection(session.subjectId, session.chapterTitle, "learn");
        window.location.href = "learn.html";
    });
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "ghost-button";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => {
        backdrop.remove();
    });
    
    actions.append(retakeBtn);
    if (summary.missed.length > 0) {
        actions.append(learnBtn);
    }
    actions.append(closeBtn);
    
    modal.append(header, content, actions);
    backdrop.appendChild(modal);

    session.assessmentModalShown = true;
    saveQuizSession(session);
    
    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
            backdrop.remove();
        }
    });
    
    document.body.appendChild(backdrop);
}

function renderLearnAssessment(_summary, session, title, score, content, startSession) {
    const summary = summarizeLearnProgress(session);
    title.textContent = `Learning progress for ${session.chapterTitle}`;
    score.textContent = `${summary.learningProgress}% • ${summary.answered}/${summary.total}`;
    content.replaceChildren();

    const card = document.createElement("div");
    card.className = "assessment-score-card learn-assessment-card";
    card.append(
        Object.assign(document.createElement("h4"), { textContent: `${summary.learningProgress}% learning progress` }),
        Object.assign(document.createElement("p"), { textContent: `${summary.answered} of ${summary.total} questions completed.` }),
        createAssessmentChart(
            [
                { label: "First-try correct", value: summary.firstAttemptCorrect, color: "var(--success)", fillPercent: summary.total ? Math.round((summary.firstAttemptCorrect / summary.total) * 100) : 0, meta: `${summary.firstAttemptCorrect}` },
                { label: "Mistakes reviewed", value: summary.mistakesReviewed, color: "var(--secondary)", fillPercent: summary.total ? Math.round((summary.mistakesReviewed / summary.total) * 100) : 0, meta: `${summary.mistakesReviewed}` },
                { label: "Remaining", value: summary.remaining, color: "var(--muted)", fillPercent: summary.total ? Math.round((summary.remaining / summary.total) * 100) : 0, meta: `${summary.remaining}` }
            ],
            `${summary.learningProgress}%`,
            "Learning Progress",
            "Learn mastery breakdown"
        )
    );

    const details = document.createElement("p");
    details.className = "learn-assessment-details";
    details.textContent = `${summary.checkpointsCompleted} checkpoint${summary.checkpointsCompleted === 1 ? "" : "s"} completed. First-try answers count as 1 point; reviewed mistakes count as 0.5 points.`;

    const actions = document.createElement("div");
    actions.className = "question-actions";
    const retakeButton = document.createElement("button");
    retakeButton.type = "button";
    retakeButton.className = "primary-button";
    retakeButton.textContent = "Restart Learn mode";
    retakeButton.addEventListener("click", () => startSession(session.mode));
    actions.appendChild(retakeButton);

    content.append(card, details, actions);
}

function renderAssessment(summary, session, title, score, content, startSession) {
    if (session?.mode === "learn") {
        renderLearnAssessment(summary, session, title, score, content, startSession);
        return;
    }
    title.textContent = `Results for ${session.chapterTitle}`;
    score.textContent = `${summary.accuracy}% • ${summary.correctCount}/${summary.total}`;
    content.replaceChildren();

    const scoreCard = document.createElement("div");
    scoreCard.className = "assessment-score-card";

    const chartColors = [
        "var(--success)",
        "var(--primary)",
        "var(--warning)",
        "var(--danger)",
        "var(--secondary)",
        "var(--info)",
        "var(--accent)",
        "var(--tertiary)"
    ];

    const chartSegments = session.mode === "exam" && Array.isArray(summary.tagBreakdown) && summary.tagBreakdown.length
        ? summary.tagBreakdown.map((entry, index) => ({
            label: entry.tag,
            value: entry.correct,
            color: chartColors[index % chartColors.length],
            fillPercent: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0,
            meta: `${entry.correct}/${entry.total} correct`
        }))
        : [
            {
                label: "Correct",
                value: summary.correctCount,
                color: "var(--success)",
                meta: "locked in"
            },
            {
                label: "Missed",
                value: summary.missed.length,
                color: "var(--danger)",
                meta: "needs review"
            }
        ];

    scoreCard.append(
        Object.assign(document.createElement("h4"), { textContent: `${summary.correctCount} correct out of ${summary.total}` }),
        Object.assign(document.createElement("p"), { textContent: `Accuracy: ${summary.accuracy}%` }),
        createAssessmentChart(
            chartSegments,
            `${summary.accuracy}%`,
            session.mode === "exam" ? "Tag accuracy" : "Accuracy",
            session.mode === "exam"
                ? `Tag accuracy breakdown: ${summary.tagBreakdown.map((entry) => `${entry.tag} ${entry.correct}/${entry.total}`).join(", ")}`
                : `Accuracy breakdown: ${summary.correctCount} correct and ${summary.missed.length} missed.`
        )
    );

    const weakCard = document.createElement("div");
    weakCard.className = "assessment-block";
    weakCard.appendChild(Object.assign(document.createElement("h4"), { textContent: "Weak areas" }));
    const weakList = document.createElement("div");
    weakList.className = "tag-row";
    if (summary.weakAreas.length) {
        summary.weakAreas.forEach((weakArea) => {
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = `${weakArea.name} (${weakArea.count})`;
            weakList.appendChild(pill);
        });
    } else {
        weakList.appendChild(Object.assign(document.createElement("span"), { className: "tag-pill", textContent: "No weak areas recorded" }));
    }
    weakCard.appendChild(weakList);

    const actions = document.createElement("div");
    actions.className = "question-actions";
    const retakeButton = document.createElement("button");
    retakeButton.type = "button";
    retakeButton.className = "primary-button";
    retakeButton.textContent = "Retake chapter";
    retakeButton.addEventListener("click", () => startSession(session.mode));
    actions.appendChild(retakeButton);

    if (session.mode === "quiz" && summary.missed.length) {
        const reviewButton = document.createElement("button");
        reviewButton.type = "button";
        reviewButton.className = "ghost-button";
        reviewButton.textContent = "Practice missed in Learn mode";
        reviewButton.addEventListener("click", () => {
            const payload = createReviewSessionPayload(session, summary);
            saveReviewSession(payload);
            syncSelection(session.subjectId, session.chapterTitle, "learn");
            window.location.href = "learn.html";
        });
        actions.appendChild(reviewButton);
    }

    content.append(scoreCard, weakCard, actions);

    if (session.mode === "exam") {
        const reviewCard = document.createElement("div");
        reviewCard.className = "assessment-block";
        reviewCard.appendChild(Object.assign(document.createElement("h4"), { textContent: "Missed questions" }));
        if (!summary.missed.length) {
            reviewCard.appendChild(Object.assign(document.createElement("p"), { textContent: "Perfect session — nothing to review." }));
        } else {
            const list = document.createElement("div");
            list.className = "review-list";
            summary.missed.forEach((entry) => {
                const item = document.createElement("article");
                item.className = "review-item";
                const explanation = document.createElement("p");
                explanation.textContent = formatExplanationText(entry.explanation || entry.explaination || "Revisit this topic in the chapter list.");
                explanation.style.whiteSpace = "pre-wrap";
                item.append(
                    Object.assign(document.createElement("h5"), { textContent: entry.questionText }),
                    Object.assign(document.createElement("p"), { textContent: `Correct answer: ${entry.correctAnswer}` }),
                    explanation
                );
                list.appendChild(item);
            });
            reviewCard.appendChild(list);
        }
        content.appendChild(reviewCard);
    }
}

function renderAssessmentPlaceholder(title, score, content, message = "Your results will appear here after each session.") {
    title.textContent = message;
    score.textContent = "Pending";
    content.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty-state compact";
    empty.append(
        Object.assign(document.createElement("h4"), { textContent: "Nothing to review here" }),
        Object.assign(document.createElement("p"), { textContent: "The assessment modal contains your final results for this completed quiz." })
    );
    content.appendChild(empty);
}

function formatMinutesSeconds(value) {
    const totalSeconds = Math.max(0, Number(value) || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseMinutesSecondsInput(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return 0;
    }

    const parts = raw.split(":").map((part) => part.trim());
    if (parts.length === 1) {
        const parsed = Number(parts[0]);
        return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    }

    const minutes = Number(parts[0]) || 0;
    const seconds = Number(parts[1]) || 0;
    return Math.max(0, Math.round(minutes * 60 + seconds));
}

function activateLearnCheckpoint(session, batchEnd) {
    const start = Math.max(0, Number(session.learnBatchStart) || 0);
    const end = Math.max(start, Math.min(Number(batchEnd) || 0, session.questions.length));
    session.learnBatchEnd = end;
    session.learnCheckpointNumber = Math.max(0, Number(session.learnCheckpointNumber) || 0) + 1;
    session.learnCheckpointActive = true;
    session.learnCheckpointSummarySeen = false;
    session.learnReviewQueue = session.answers
        .slice(start, end)
        .map((result, offset) => result && !result.correct ? start + offset : null)
        .filter((index) => Number.isInteger(index));
    session.learnReviewPosition = 0;
}

function renderLearnReviewControls(container, question, questionIndex, session, onSubmit) {
    const form = document.createElement("form");
    form.className = "answer-form learn-review-answer-form";
    const storedAnswer = session.learnReviewDrafts?.[questionIndex];

    if (question.questionType === "numeric") {
        const input = document.createElement("input");
        input.type = "number";
        input.className = "answer-input";
        input.placeholder = "Enter your answer again";
        input.value = storedAnswer ?? "";
        input.setAttribute("aria-label", "Review answer");
        input.addEventListener("input", () => {
            session.learnReviewDrafts[questionIndex] = input.value;
        });
        form.appendChild(input);
    } else {
        const choices = document.createElement("div");
        choices.className = "choice-grid";
        getOrderedChoices(question).forEach(({ displayIndex, originalIndex, choice }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "choice-button";
            button.textContent = `${displayIndex < 26 ? String.fromCharCode(65 + displayIndex) : String(displayIndex + 1)}. ${choice}`;
            button.setAttribute("aria-pressed", String(Number(storedAnswer) === originalIndex));
            if (Number(storedAnswer) === originalIndex) {
                button.classList.add("is-selected");
            }
            button.addEventListener("click", () => {
                session.learnReviewDrafts[questionIndex] = originalIndex;
                choices.querySelectorAll(".choice-button").forEach((entry) => {
                    const selected = entry === button;
                    entry.classList.toggle("is-selected", selected);
                    entry.setAttribute("aria-pressed", String(selected));
                });
            });
            choices.appendChild(button);
        });
        form.appendChild(choices);
    }

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "primary-button";
    submit.textContent = "Check Review Answer";
    form.appendChild(submit);
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const answer = session.learnReviewDrafts?.[questionIndex];
        if (question.questionType === "numeric" && !text(answer)) {
            return;
        }
        if (question.questionType !== "numeric" && (answer === undefined || answer === null || answer === "")) {
            return;
        }
        onSubmit(questionIndex, answer);
    });
    container.appendChild(form);
}

function renderLearnCheckpointStage(stage, progressFill, session, onReviewSubmit, onNextReview, onContinue, onContinueReview) {
    const summary = summarizeLearnProgress(session);
    const checkpoint = document.createElement("article");
    checkpoint.className = "question-card learn-checkpoint-card";
    checkpoint.setAttribute("aria-live", "polite");

    const header = document.createElement("div");
    header.className = "question-card-header";
    header.append(
        Object.assign(document.createElement("div"), {
            className: "question-counter-inline",
            textContent: `Checkpoint ${session.learnCheckpointNumber}`
        }),
        Object.assign(document.createElement("div"), {
            className: "mode-badge",
            textContent: `${summary.answered}/${summary.total} completed`
        })
    );

    if (!session.learnCheckpointSummarySeen) {
        const batchStart = Math.max(0, Number(session.learnBatchStart) || 0);
        const batchEnd = Math.max(batchStart, Number(session.learnBatchEnd) || 0);
        const batchResults = session.answers.slice(batchStart, batchEnd).filter(Boolean);
        const batchCorrect = batchResults.filter((result) => result.correct).length;
        const batchTotal = Math.max(0, batchEnd - batchStart);
        const summaryCard = document.createElement("div");
        summaryCard.className = "learn-checkpoint-summary-card";
        summaryCard.append(
            Object.assign(document.createElement("p"), { className: "section-label", textContent: "Checkpoint summary" }),
            Object.assign(document.createElement("h4"), { textContent: `${batchCorrect}/${batchTotal} correct on this checkpoint` }),
            Object.assign(document.createElement("p"), { className: "learn-summary-lead", textContent: `${summary.firstAttemptCorrect} first-try correct across ${summary.answered} completed questions.` })
        );

        const summaryStats = document.createElement("div");
        summaryStats.className = "learn-checkpoint-summary-stats";
        summaryStats.append(
            Object.assign(document.createElement("span"), { textContent: `${summary.learningProgress}% overall progress` }),
            Object.assign(document.createElement("span"), { textContent: `${session.learnReviewQueue.length} mistake${session.learnReviewQueue.length === 1 ? "" : "s"} to review` }),
            Object.assign(document.createElement("span"), { textContent: `${summary.remaining} question${summary.remaining === 1 ? "" : "s"} remaining` })
        );
        summaryCard.appendChild(summaryStats);

        const summaryActions = document.createElement("div");
        summaryActions.className = "question-actions";
        const continueButton = document.createElement("button");
        continueButton.type = "button";
        continueButton.className = "primary-button";
        if (session.learnReviewQueue.length) {
            continueButton.textContent = `Review ${session.learnReviewQueue.length} mistake${session.learnReviewQueue.length === 1 ? "" : "s"}`;
            continueButton.addEventListener("click", () => {
                session.learnCheckpointSummarySeen = true;
                onContinueReview();
            });
        } else {
            continueButton.textContent = session.learnBatchEnd >= session.questions.length ? "Finish Learning" : "Continue Learning";
            continueButton.addEventListener("click", onContinue);
        }
        summaryActions.appendChild(continueButton);
        checkpoint.append(header, summaryCard, summaryActions);
        stage.appendChild(checkpoint);
        try { renderMath(checkpoint); } catch (_) {}
        requestAnimationFrame(() => continueButton.focus());
        renderProgress(progressFill, session);
        return;
    }

    const title = document.createElement("h4");
    title.textContent = session.learnReviewPosition < session.learnReviewQueue.length
        ? "Review this mistake before continuing"
        : "Checkpoint complete";

    const stats = document.createElement("div");
    stats.className = "learn-checkpoint-stats";
    stats.append(
        Object.assign(document.createElement("span"), { textContent: `${summary.firstAttemptCorrect} first-try correct` }),
        Object.assign(document.createElement("span"), { textContent: `${session.learnReviewQueue.length} mistakes to review` }),
        Object.assign(document.createElement("span"), { textContent: `${summary.learningProgress}% learning progress` })
    );

    const content = document.createElement("div");
    content.className = "learn-checkpoint-content";
    if (session.learnReviewPosition < session.learnReviewQueue.length) {
        const questionIndex = session.learnReviewQueue[session.learnReviewPosition];
        const question = session.questions[questionIndex];
        const questionText = document.createElement("h5");
        questionText.textContent = question.question;
        const reviewResult = session.learnReviewResults?.[questionIndex];
        content.appendChild(questionText);
        if (reviewResult) {
            const status = document.createElement("p");
            status.className = "learn-review-status";
            status.setAttribute("role", "status");
            status.textContent = "Review answer submitted. Read the explanation before continuing.";
            content.append(status, createFeedbackCard(reviewResult, { includeExplanation: true }));
        } else {
            const prompt = document.createElement("p");
            prompt.className = "question-hint";
            prompt.textContent = "Answer this review question to see the explanation.";
            content.appendChild(prompt);
            renderLearnReviewControls(content, question, questionIndex, session, onReviewSubmit);
        }
    } else {
        const message = document.createElement("p");
        message.textContent = session.learnReviewQueue.length
            ? "You reviewed every mistake from this checkpoint."
            : "No mistakes to review in this checkpoint.";
        content.appendChild(message);
    }

    const actions = document.createElement("div");
    actions.className = "question-actions";
    const action = document.createElement("button");
    action.type = "button";
    action.className = "primary-button";
    const currentReviewIndex = session.learnReviewQueue[session.learnReviewPosition];
    if (session.learnReviewPosition < session.learnReviewQueue.length && session.learnReviewResults?.[currentReviewIndex]) {
        action.textContent = "Next Review";
        action.addEventListener("click", onNextReview);
    } else if (session.learnReviewPosition >= session.learnReviewQueue.length) {
        action.textContent = session.learnBatchEnd >= session.questions.length ? "Finish Learning" : "Continue Learning";
        action.addEventListener("click", onContinue);
    }
    if (action.parentElement !== actions && action.textContent) {
        actions.appendChild(action);
    }

    checkpoint.append(header, title, stats, content, actions);
    stage.appendChild(checkpoint);
    try { renderMath(checkpoint); } catch (_) {}
    requestAnimationFrame(() => {
        const focusTarget = checkpoint.querySelector(
            session.learnReviewPosition < session.learnReviewQueue.length && !session.learnReviewResults?.[currentReviewIndex]
                ? "input, .choice-button"
                : ".question-actions button"
        );
        focusTarget?.focus();
    });
    renderProgress(progressFill, session);
}

function buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, submitExamAnswer = null) {
    const { stage, progressFill } = elements;
    const examStarter = typeof globalThis.__beginExamSession === "function" ? globalThis.__beginExamSession : null;
    const examSubmitter = typeof submitExamAnswer === "function"
        ? submitExamAnswer
        : (typeof globalThis.__submitExamAnswer === "function" ? globalThis.__submitExamAnswer : null);
    const examFinisher = typeof globalThis.__finishExamSession === "function" ? globalThis.__finishExamSession : null;
    const renderHeaderRenderer = typeof globalThis.__renderHeader === "function"
        ? globalThis.__renderHeader
        : null;
    stage.replaceChildren();

    const subject = state.activeSubject;
    const chapter = state.activeChapter;
    const session = state.session;

    if (session && !Array.isArray(session.unsureFlags)) {
        session.unsureFlags = session.questions.map(() => false);
    }

    if (session?.mode === "learn" && session.learnCheckpointActive) {
        renderLearnCheckpointStage(
            stage,
            progressFill,
            session,
            (questionIndex, answer) => {
                const question = session.questions[questionIndex];
                const correct = isQuestionCorrect(question, answer);
                const reviewResult = buildQuestionResult(question, session, answer, correct);
                session.learnReviewResults[questionIndex] = reviewResult;
                if (!session.learnReviewSubmittedIndexes.includes(questionIndex)) {
                    session.learnReviewSubmittedIndexes.push(questionIndex);
                }
                if (!session.learnReviewedMistakeIndexes.includes(questionIndex)) {
                    session.learnReviewedMistakeIndexes.push(questionIndex);
                    session.learnMistakesReviewedCount += 1;
                }
                saveModeSession(session);
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            },
            () => {
                session.learnReviewPosition += 1;
                saveModeSession(session);
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            },
            () => {
                session.learnCheckpointActive = false;
                session.learnBatchStart = session.learnBatchEnd;
                session.learnReviewQueue = [];
                session.learnReviewPosition = 0;
                const isFinalCheckpoint = session.learnBatchEnd >= session.questions.length;
                recordLearnCheckpointProgress(session, false);
                if (isFinalCheckpoint) {
                    recordLearnCheckpointProgress(session, true);
                }
                if (isFinalCheckpoint) {
                    session.complete = true;
                    session.currentSummary = summarizeLearnProgress(session);
                    renderLearnAssessment(session.currentSummary, session, elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent, startSession);
                }
                saveModeSession(session);
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            },
            () => {
                saveModeSession(session);
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            }
        );
        return;
    }

    if (session?.mode === "note") {
        renderNoteStage(stage, subject, chapter, session);
        return;
    }

    if (!subject || !chapter || !session) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.append(
            Object.assign(document.createElement("h4"), { textContent: subject ? "Choose a chapter" : "No subject loaded yet" }),
            Object.assign(document.createElement("p"), {
                textContent: subject
                    ? "Pick a chapter from the strip above to begin."
                    : "Use the hidden admin page to add a quiz, then choose it from the subject drawer."
            })
        );
        stage.appendChild(empty);
        renderProgress(progressFill, session);
        return;
    }

    if (session.mode === "exam") {
        if (!session.questions.length) {
            const setup = document.createElement("div");
            setup.className = "question-card";
            setup.append(
                Object.assign(document.createElement("h4"), { textContent: "Exam setup" }),
                Object.assign(document.createElement("p"), { className: "question-hint", textContent: "Choose your chapter coverage, how many questions to include, and an optional timer before you begin." }),
                Object.assign(document.createElement("form"), {
                    innerHTML: ""
                })
            );
            const form = document.createElement("form");
            form.className = "answer-form";

            const chapterList = document.createElement("div");
            chapterList.className = "review-list";
            const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
            chapters.forEach((chapterEntry) => {
                const label = document.createElement("label");
                label.className = "tag-pill";
                label.style.display = "flex";
                label.style.justifyContent = "space-between";
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = chapterEntry.title;
                checkbox.checked = state.session?.selectedChapterTitles?.includes(chapterEntry.title) || chapterEntry.title === state.activeChapter?.title;
                label.append(document.createTextNode(chapterEntry.title), checkbox);
                chapterList.appendChild(label);
            });

            const selectAllChapters = document.createElement("button");
            selectAllChapters.type = "button";
            selectAllChapters.className = "ghost-button";
            selectAllChapters.textContent = "Select all";
            selectAllChapters.addEventListener("click", (event) => {
                event.preventDefault();
                Array.from(chapterList.querySelectorAll("input[type='checkbox']")).forEach((checkbox) => {
                    checkbox.checked = true;
                });
            });

            const chapterHeader = document.createElement("div");
            chapterHeader.className = "question-row";
            chapterHeader.style.display = "flex";
            chapterHeader.style.gap = "0.75rem";
            chapterHeader.style.alignItems = "center";
            chapterHeader.append(
                Object.assign(document.createElement("p"), { className: "section-label", textContent: "Chapters" }),
                selectAllChapters
            );

            const countInput = Object.assign(document.createElement("input"), {
                className: "answer-input",
                type: "number",
                min: "1",
                max: "100",
                value: session.questionCount || 10,
                placeholder: "Number of questions"
            });
            const timeInput = Object.assign(document.createElement("input"), {
                className: "answer-input",
                type: "text",
                inputMode: "numeric",
                value: formatMinutesSeconds(session.timeLimitSeconds || 600),
                placeholder: "mm:ss"
            });

            const actionRow = document.createElement("div");
            actionRow.className = "question-actions";
            const startButton = document.createElement("button");
            startButton.type = "submit";
            startButton.className = "primary-button";
            startButton.textContent = "Start exam";
            actionRow.appendChild(startButton);

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                const selected = Array.from(chapterList.querySelectorAll("input[type='checkbox']:checked")).map((entry) => entry.value).filter(Boolean);
                const questionCount = Math.max(1, Math.min(Number(countInput.value) || 10, 100));
                const timeLimitSeconds = parseMinutesSecondsInput(timeInput.value);
                if (typeof examStarter === "function") {
                    examStarter({
                        chapters: selected.length ? selected : [state.activeChapter?.title || subject.chapters[0]?.title || ""],
                        questionCount,
                        timeLimitSeconds
                    });
                }
            });

            form.append(
                chapterHeader,
                chapterList,
                Object.assign(document.createElement("p"), { className: "section-label", textContent: "Question count" }),
                countInput,
                Object.assign(document.createElement("p"), { className: "section-label", textContent: "Timer (mm:ss, optional)" }),
                timeInput,
                actionRow
            );
            setup.appendChild(form);
            if (session.setupError) {
                setup.appendChild(Object.assign(document.createElement("p"), { className: "answer-hint", textContent: session.setupError }));
            }
            stage.appendChild(setup);
            renderProgress(progressFill, session);
            return;
        }

        if (session.complete || session.submitted) {
            const completeCard = document.createElement("div");
            completeCard.className = "question-card completion-card";
            completeCard.append(
                Object.assign(document.createElement("h4"), { textContent: `Exam complete for ${session.chapterTitle}` }),
                Object.assign(document.createElement("p"), { textContent: "Review your tag-based results and missed questions in the assessment panel below." })
            );
            stage.appendChild(completeCard);
            renderProgress(progressFill, session);
            return;
        }

        if (session.reviewingAnswers) {
            const sheet = document.createElement("div");
            sheet.className = "quiz-sheet";

            const intro = document.createElement("section");
            intro.className = "quiz-sheet-intro";
            const introHeader = document.createElement("div");
            introHeader.className = "quiz-sheet-intro-top";
            const introCopy = document.createElement("div");
            introCopy.className = "quiz-sheet-intro-copy";
            introCopy.append(
                Object.assign(document.createElement("p"), { className: "section-label", textContent: "Review mode" }),
                Object.assign(document.createElement("h3"), { textContent: "Verify every answer before final submission" }),
                Object.assign(document.createElement("p"), {
                    className: "hero-meta",
                    textContent: "Each question shows your chosen answer so you can switch to a different choice quickly."
                })
            );
            const timerPill = Object.assign(document.createElement("div"), {
                className: "review-timer-badge mode-badge",
                textContent: `⏱ ${formatMinutesSeconds(Math.max(0, session.timeRemainingSeconds))}`
            });
            timerPill.setAttribute("data-exam-timer-badge", "true");
            introHeader.append(introCopy, timerPill);

            const flaggedCount = session.answers.filter(Boolean).filter((entry) => entry.isUnsure).length;
            const introMeta = document.createElement("div");
            introMeta.className = "quiz-sheet-meta";
            introMeta.append(
                Object.assign(document.createElement("div"), {
                    className: "summary-pill",
                    textContent: `${session.questions.length} questions reviewed`
                }),
                Object.assign(document.createElement("div"), {
                    className: "summary-pill",
                    textContent: `${session.answers.filter(Boolean).length}/${session.questions.length} answered`
                }),
                Object.assign(document.createElement("div"), {
                    className: "summary-pill",
                    textContent: `${flaggedCount} unsure`
                })
            );
            const filterButton = document.createElement("button");
            filterButton.type = "button";
            filterButton.className = `ghost-button ${session.reviewOnlyUnsure ? "is-active" : ""}`.trim();
            filterButton.textContent = session.reviewOnlyUnsure ? "Showing unsure only" : "Show unsure only";
            filterButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                session.reviewOnlyUnsure = !session.reviewOnlyUnsure;
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
            });
            introMeta.append(filterButton);
            intro.append(introHeader, introMeta);

            const reviewList = document.createElement("div");
            reviewList.className = "quiz-sheet-list";

            const updateReviewAnswer = (question, questionIndex, answer) => {
                const result = buildQuestionResult(
                    question,
                    session,
                    answer,
                    isQuestionCorrect(question, answer),
                    session.unsureFlags[questionIndex]
                );
                session.answers[questionIndex] = result;
                session.drafts[questionIndex] = question.questionType === "numeric"
                    ? String(answer)
                    : String(answer);
            };

            const visibleQuestions = session.reviewOnlyUnsure
                ? session.questions
                    .map((question, index) => ({ question, index, result: session.answers[index] || null }))
                    .filter((entry) => entry.result?.isUnsure)
                : session.questions.map((question, index) => ({ question, index, result: session.answers[index] || null }));

            visibleQuestions.forEach(({ question, index, result }) => {
                const item = document.createElement("article");
                item.className = "question-card";

                const itemHeader = document.createElement("div");
                itemHeader.className = "question-card-header";
                itemHeader.append(
                    Object.assign(document.createElement("div"), {
                        className: "question-counter-inline",
                        textContent: `Question ${index + 1}`
                    })
                );
                if (result?.isUnsure) {
                    itemHeader.append(
                        Object.assign(document.createElement("div"), {
                            className: "summary-pill",
                            textContent: "Unsure"
                        })
                    );
                }
                item.append(itemHeader);
                item.append(
                    Object.assign(document.createElement("h5"), { textContent: question.question })
                );

                if (question.questionType === "numeric") {
                    const reviewInput = document.createElement("input");
                    reviewInput.type = "number";
                    reviewInput.className = "answer-input";
                    reviewInput.value = result?.userAnswer || "";
                    reviewInput.placeholder = "Enter numeric answer";
                    reviewInput.addEventListener("input", () => {
                        session.drafts[index] = reviewInput.value;
                    });

                    const saveButton = document.createElement("button");
                    saveButton.type = "button";
                    saveButton.className = "ghost-button";
                    saveButton.textContent = "Update answer";
                    saveButton.addEventListener("click", (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        updateReviewAnswer(question, index, reviewInput.value);
                        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
                    });

                    const numericArea = document.createElement("div");
                    numericArea.className = "answer-area";
                    numericArea.append(reviewInput, saveButton);
                    item.appendChild(numericArea);
                } else {
                    const choices = document.createElement("div");
                    choices.className = "choice-grid";
                    getOrderedChoices(question).forEach(({ displayIndex, originalIndex, choice }) => {
                        const choiceButton = document.createElement("button");
                        choiceButton.type = "button";
                        choiceButton.className = "choice-button";
                        const label = displayIndex < 26 ? String.fromCharCode(65 + displayIndex) : String(displayIndex + 1);
                        if (typeof choice === 'string') {
                            const escaped = escapeHtml(choice).replace(/\$\$/g, '$$').replace(/\$/g, '$');
                            choiceButton.innerHTML = `${escapeHtml(label + '. ')}${escaped}`;
                        } else {
                            choiceButton.textContent = `${label}. ${String(choice)}`;
                        }
                        if (result?.userAnswerIndex === originalIndex) {
                            choiceButton.classList.add("is-selected");
                        }
                        choiceButton.addEventListener("click", (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            updateReviewAnswer(question, index, originalIndex);
                            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
                        });
                        choices.appendChild(choiceButton);
                    });
                    // Render any math in the review choices
                    try { renderMath(choices); } catch (_) {}
                    item.appendChild(choices);
                }

                const reviewActions = document.createElement("div");
                reviewActions.className = "question-actions";
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "ghost-button";
                editButton.textContent = "Open question";
                editButton.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    session.reviewingAnswers = false;
                    session.index = index;
                    if (typeof renderHeaderRenderer === "function") {
                        renderHeaderRenderer();
                    }
                    buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
                });
                reviewActions.appendChild(editButton);
                const flagButton = document.createElement("button");
                flagButton.type = "button";
                flagButton.className = "ghost-button";
                flagButton.textContent = result?.isUnsure ? "Unmark unsure" : "Mark unsure";
                flagButton.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    session.unsureFlags[index] = !session.unsureFlags[index];
                    if (result) {
                        result.isUnsure = session.unsureFlags[index];
                        session.answers[index] = result;
                    }
                    buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
                });
                reviewActions.appendChild(flagButton);
                item.appendChild(reviewActions);

                reviewList.appendChild(item);
            });

            const actions = document.createElement("div");
            actions.className = "question-actions";
            const continueButton = document.createElement("button");
            continueButton.type = "button";
            continueButton.className = "ghost-button";
            continueButton.textContent = "Back to questions";
            continueButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                session.reviewingAnswers = false;
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
            });
            const finishButton = document.createElement("button");
            finishButton.type = "button";
            finishButton.className = "primary-button";
            finishButton.textContent = "Submit final answers";
            finishButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                session.reviewingAnswers = false;
                if (typeof examFinisher === "function") {
                    examFinisher();
                }
            });
            actions.append(continueButton, finishButton);

            sheet.append(intro, reviewList, actions);
            stage.appendChild(sheet);
            renderProgress(progressFill, session);
            return;
        }

        const question = session.questions[session.index];
        if (!question) {
            return;
        }

        const card = document.createElement("article");
        card.className = "question-card";

        const header = document.createElement("div");
        header.className = "question-card-header";
        const counterBadge = Object.assign(document.createElement("div"), {
            className: "question-counter-inline",
            textContent: `Question ${session.index + 1} out of ${session.questions.length}`
        });
        const statusGroup = document.createElement("div");
        statusGroup.className = "question-card-meta";
        statusGroup.append(
            Object.assign(document.createElement("div"), { className: "mode-badge", textContent: "Exam mode" })
        );
        if (session.timeLimitSeconds > 0) {
            const timerBadge = Object.assign(document.createElement("div"), {
                className: "mode-badge",
                textContent: `⏱ ${formatMinutesSeconds(Math.max(0, session.timeRemainingSeconds))}`
            });
            timerBadge.setAttribute("data-exam-timer-badge", "true");
            statusGroup.append(timerBadge);
        }
        if (session.unsureFlags[session.index]) {
            statusGroup.append(
                Object.assign(document.createElement("div"), {
                    className: "mode-badge",
                    textContent: "Unsure"
                })
            );
        }
        header.append(counterBadge, statusGroup);

        const questionText = document.createElement("h4");
        questionText.textContent = question.question;

        const hint = document.createElement("p");
        hint.className = "question-hint";
        hint.textContent = question.questionType === "numeric"
            ? "Enter your answer and submit it to move on. No feedback is shown until the end."
            : "Choose the best answer, then submit it to move on. No feedback is shown until the end.";

        const answerArea = document.createElement("div");
        answerArea.className = "answer-area";

        if (question.questionType === "numeric") {
            const input = document.createElement("input");
            input.type = "number";
            input.className = "answer-input";
            input.placeholder = "Enter your answer";
            input.value = session.drafts?.[session.index] || "";
            input.addEventListener("input", () => {
                session.drafts[session.index] = input.value;
                session.typedAnswer = input.value;
            });
            answerArea.appendChild(input);
        } else {
            const choices = document.createElement("div");
            choices.className = "choice-grid";
            getOrderedChoices(question).forEach(({ displayIndex, originalIndex, choice }) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "choice-button";
                const label = displayIndex < 26 ? String.fromCharCode(65 + displayIndex) : String(displayIndex + 1);
                if (typeof choice === 'string') {
                    const escapedChoice = escapeHtml(choice).replace(/\$\$/g, '$$').replace(/\$/g, '$');
                    button.innerHTML = `${escapeHtml(label + '. ')}${escapedChoice}`;
                } else {
                    button.textContent = `${label}. ${String(choice)}`;
                }
                if (session.selectedChoice === originalIndex) {
                    button.classList.add("is-selected");
                }
                button.addEventListener("click", () => {
                    session.selectedChoice = originalIndex;
                    session.drafts[session.index] = String(originalIndex);
                    buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
                });
                choices.appendChild(button);
            });
            // Ensure math is rendered for all newly-added choice buttons
            try { renderMath(choices); } catch (_) {}
            answerArea.appendChild(choices);
        }

        const actions = document.createElement("div");
        actions.className = "question-actions";
        if (session.index > 0) {
            const backButton = document.createElement("button");
            backButton.type = "button";
            backButton.className = "ghost-button";
            backButton.textContent = "Back";
            backButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (session.index > 0) {
                    session.reviewingAnswers = false;
                    session.index -= 1;
                    if (typeof renderHeaderRenderer === "function") {
                        renderHeaderRenderer();
                    }
                    buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
                }
            });
            actions.appendChild(backButton);
        }
        const unsureButton = document.createElement("button");
        unsureButton.type = "button";
        unsureButton.className = "ghost-button";
        unsureButton.textContent = session.unsureFlags[session.index] ? "Unmark unsure" : "Mark unsure";
        unsureButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            session.unsureFlags[session.index] = !session.unsureFlags[session.index];
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
        });

        const submitButton = document.createElement("button");
        submitButton.type = "button";
        submitButton.className = "primary-button";
        submitButton.textContent = session.index + 1 >= session.questions.length ? "Finish exam" : "Submit answer";
        submitButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof examSubmitter === "function") {
                examSubmitter();
            }
        });
        actions.append(unsureButton, submitButton);

        if (session.setupError) {
            answerArea.appendChild(Object.assign(document.createElement("p"), { className: "answer-hint", textContent: session.setupError }));
        }

        card.append(header, questionText, hint, answerArea, actions);
        stage.appendChild(card);
        try { renderMath(card); } catch (_) {}
        renderProgress(progressFill, session);
        return;
    }

    if (session.mode === "exam" && session.reviewingAnswers) {
        const sheet = document.createElement("div");
        sheet.className = "quiz-sheet";

        const intro = document.createElement("section");
        intro.className = "quiz-sheet-intro";
        const introCopy = document.createElement("div");
        introCopy.className = "quiz-sheet-intro-copy";
        introCopy.append(
            Object.assign(document.createElement("p"), { className: "section-label", textContent: "Review mode" }),
            Object.assign(document.createElement("h3"), { textContent: "Verify every answer before final submission" }),
            Object.assign(document.createElement("p"), {
                className: "hero-meta",
                textContent: "Browse your selected answers, jump back to edit any question, then submit when you’re ready."
            })
        );
        const introMeta = document.createElement("div");
        introMeta.className = "quiz-sheet-meta";
        introMeta.append(
            Object.assign(document.createElement("div"), {
                className: "summary-pill",
                textContent: `${session.questions.length} questions reviewed`
            }),
            Object.assign(document.createElement("div"), {
                className: "summary-pill",
                textContent: `${session.answers.filter(Boolean).length}/${session.questions.length} answered`
            })
        );
        intro.append(introCopy, introMeta);

        const reviewList = document.createElement("div");
        reviewList.className = "quiz-sheet-list";

        const formatReviewSummary = (question, index) => {
            const result = session.answers[index];
            if (!result) {
                return "No answer recorded";
            }
            if (question.questionType === "numeric") {
                return result.userAnswer || "No answer recorded";
            }
            if (result.userAnswerIndex !== null && result.userAnswerIndex !== undefined) {
                return result.userAnswer || "No answer recorded";
            }
            return result.userAnswer || "No answer recorded";
        };

        session.questions.forEach((question, index) => {
            const item = document.createElement("div");
            item.className = "review-item";
            item.append(
                Object.assign(document.createElement("h5"), { textContent: question.question }),
                Object.assign(document.createElement("p"), { textContent: `Answer: ${formatReviewSummary(question, index)}` })
            );
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "ghost-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                session.reviewingAnswers = false;
                session.index = index;
                if (typeof renderHeaderRenderer === "function") {
                    renderHeaderRenderer();
                }
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
            });
            item.appendChild(editButton);
            reviewList.appendChild(item);
        });

        const actions = document.createElement("div");
        actions.className = "question-actions";
        const continueButton = document.createElement("button");
        continueButton.type = "button";
        continueButton.className = "ghost-button";
        continueButton.textContent = "Back to questions";
        continueButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            session.reviewingAnswers = false;
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
        });
        const finishButton = document.createElement("button");
        finishButton.type = "button";
        finishButton.className = "primary-button";
        finishButton.textContent = "Submit final answers";
        finishButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            session.reviewingAnswers = false;
            if (typeof examFinisher === "function") {
                examFinisher();
            }
        });
        actions.append(continueButton, finishButton);

        sheet.append(intro, reviewList, actions);
        stage.appendChild(sheet);
        // Render any math expressions added to the sheet
        try { renderMath(sheet); } catch (_) {}
        renderProgress(progressFill, session);
        return;
    }

    if (session.mode === "quiz") {
        const beforeSession = state.session;
        if (elements.summaryPill) {
            const answeredCount = countAnsweredQuestions(session);
            elements.summaryPill.textContent = `${answeredCount}/${session.questions.length} answered`;
        }
        if (elements.chapterSubtitle) {
            elements.chapterSubtitle.textContent = "All questions are visible at once. Answer each row for immediate feedback.";
        }
        if (elements.counter) {
            const answeredCount = countAnsweredQuestions(session);
            elements.counter.textContent = session.complete
                ? "Worksheet complete"
                : `Answered ${answeredCount} of ${session.questions.length}`;
        }
        if (typeof renderQuizSheetStage === "function") {
            renderQuizSheetStage();
        }
        if (beforeSession !== state.session && typeof renderHeaderRenderer === "function") {
            renderHeaderRenderer();
        }
        return;
    }

    if (session.complete) {
        console.log("Session complete triggered. Mode:", session.mode);
        renderProgress(progressFill, session);
        
        if (session.mode === "quiz") {
            console.log("Creating quiz assessment modal");
            const summary = summarizeResults(session);
            createQuizAssessmentModal(summary, session, state, selectChapter, startSession);
            return;
        }
        
        const completeCard = document.createElement("div");
        completeCard.className = "question-card completion-card";
        completeCard.append(
            Object.assign(document.createElement("h4"), { textContent: `Session complete for ${session.chapterTitle}` }),
            Object.assign(document.createElement("p"), { textContent: "Check the assessment panel below for score, missed questions, and weak areas." })
        );

        const actions = document.createElement("div");
        actions.className = "question-actions";
        const retakeButton = document.createElement("button");
        retakeButton.type = "button";
        retakeButton.className = "primary-button";
        retakeButton.textContent = "Retake chapter";
        retakeButton.addEventListener("click", () => startSession(session.mode));
        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "ghost-button";
        nextButton.textContent = "Choose another chapter";
        nextButton.addEventListener("click", () => {
            const currentIndex = subject.chapters.findIndex((entry) => entry.title === chapter.title);
            const nextChapter = subject.chapters[(currentIndex + 1) % subject.chapters.length];
            selectChapter(nextChapter.title);
        });
        actions.append(retakeButton, nextButton);
        completeCard.appendChild(actions);
        stage.appendChild(completeCard);
        return;
    }

    const question = session.questions[session.index];
    if (!question) {
        return;
    }

    const card = document.createElement("article");
    card.className = session.mode === "learn"
        ? "question-card learn-question-card"
        : "question-card";
    if (session.mode === "learn" && session.reviewed && session.lastResult) {
        card.classList.add(session.lastResult.correct ? "is-correct" : "is-wrong");
    }
    const header = document.createElement("div");
    header.className = "question-card-header";
    header.append(
        Object.assign(document.createElement("div"), { className: "question-counter-inline", textContent: `Question ${session.index + 1} out of ${session.questions.length}` }),
        Object.assign(document.createElement("div"), { className: "mode-badge", textContent: `${capitalize(session.mode)} mode` })
    );

    const questionText = document.createElement("h4");
    questionText.textContent = question.question;

    const hint = document.createElement("p");
    hint.className = "question-hint";
    hint.textContent = question.questionType === "numeric"
        ? session.mode === "learn"
            ? session.learnTransitioning
                ? "Next question will open automatically."
                : "Answer the question; the next question will open automatically."
            : "Enter a number and submit your answer."
        : session.mode === "flashcards"
            ? "Reveal the answer, then mark whether you knew it."
            : session.mode === "learn"
                ? session.learnTransitioning
                    ? "Next question will open automatically."
                    : "Choose an answer; the next question will open automatically."
                : "Choose the best answer and check your result.";

    const answerArea = document.createElement("div");
    answerArea.className = "answer-area";

    if (session.mode === "flashcards") {
        const flashcard = document.createElement("div");
        flashcard.className = "flashcard";
        const flashcardInner = document.createElement("div");
        flashcardInner.className = "flashcard-inner";
        const flashcardTransition = session.flashcardTransition || "";
        session.flashcardTransition = "";
        const shouldAnimateReveal = session.revealed && flashcardTransition === "reveal";
        const shouldAnimateHide = !session.revealed && flashcardTransition === "hide";
        if (!shouldAnimateReveal && (session.revealed || shouldAnimateHide)) {
            flashcardInner.classList.add("is-flipped");
        }

        const flashcardFront = document.createElement("div");
        flashcardFront.className = "flashcard-face flashcard-front";
        flashcardFront.append(
            Object.assign(document.createElement("span"), { className: "flashcard-side-label", textContent: "Question" }),
            Object.assign(document.createElement("div"), { className: "flashcard-face-text", textContent: question.question })
        );

        const flashcardBack = document.createElement("div");
        flashcardBack.className = "flashcard-face flashcard-back";
        flashcardBack.append(
            Object.assign(document.createElement("span"), { className: "flashcard-side-label", textContent: "Answer" }),
            Object.assign(document.createElement("div"), { className: "flashcard-face-text", textContent: question.answerText })
        );

        flashcardInner.append(flashcardFront, flashcardBack);
        flashcard.appendChild(flashcardInner);
        if (shouldAnimateReveal) {
            requestAnimationFrame(() => {
                flashcardInner.classList.add("is-flipped");
            });
        } else if (shouldAnimateHide) {
            requestAnimationFrame(() => {
                flashcardInner.classList.remove("is-flipped");
            });
        }
        flashcard.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            session.flashcardTransition = session.revealed ? "hide" : "reveal";
            session.revealed = !session.revealed;
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
        });

        const controls = document.createElement("div");
        controls.className = "flashcard-controls";
        if (!session.revealed) {
            const revealButton = document.createElement("button");
            revealButton.type = "button";
            revealButton.className = "primary-button";
            revealButton.textContent = "Flip card";
            revealButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                session.flashcardTransition = "reveal";
                session.revealed = true;
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            });
            controls.appendChild(revealButton);
        } else {
            const knewButton = document.createElement("button");
            knewButton.type = "button";
            knewButton.className = "primary-button";
            knewButton.textContent = "I knew it";
            knewButton.addEventListener("click", () => submitCurrentQuestion({ correct: true, advanceImmediately: true }));

            const flipBackButton = document.createElement("button");
            flipBackButton.type = "button";
            flipBackButton.className = "ghost-button";
            flipBackButton.textContent = "Flip back";
            flipBackButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                session.flashcardTransition = "hide";
                session.revealed = false;
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            });

            const reviewButton = document.createElement("button");
            reviewButton.type = "button";
            reviewButton.className = "ghost-button";
            reviewButton.textContent = "Review later";
            reviewButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                submitCurrentQuestion({ correct: false, advanceImmediately: true });
            });
            controls.append(knewButton, flipBackButton, reviewButton);
        }

        flashcard.appendChild(controls);
        answerArea.appendChild(flashcard);
    } else if (question.questionType === "numeric") {
        const form = document.createElement("form");
        form.className = "answer-form";

        const input = document.createElement("input");
        input.type = "number";
        input.className = "answer-input";
        input.placeholder = "Enter your answer";
        input.value = session.typedAnswer;
        input.disabled = session.reviewed;
        input.addEventListener("input", () => {
            session.typedAnswer = input.value;
        });

        const feedback = document.createElement("div");
        feedback.className = "feedback-block";
        if (session.reviewed && session.lastResult) {
            feedback.appendChild(createFeedbackCard(session.lastResult, {
                includeExplanation: false,
                explanationToggle: session.mode === "quiz"
            }));
        }

        const button = document.createElement("button");
        button.type = "submit";
        button.className = "primary-button";
        button.textContent = session.reviewed ? "Next question" : "Check answer";

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!text(session.typedAnswer)) {
                return;
            }
            submitCurrentQuestion();
        });

        if (session.mode === "learn" && session.reviewed) {
            const status = document.createElement("p");
            status.className = "learn-transition-status";
            status.setAttribute("role", "status");
            status.textContent = session.learnTransitioning
                ? "Answer recorded. Next question will open automatically."
                : "Use Next question to continue.";
            answerArea.appendChild(status);
        }
        form.append(input, button);
        answerArea.append(form, feedback);
        } else {
            const choices = document.createElement("div");
            choices.className = "choice-grid";
            getOrderedChoices(question).forEach(({ displayIndex, originalIndex, choice }) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "choice-button";
                const label = displayIndex < 26 ? String.fromCharCode(65 + displayIndex) : String(displayIndex);
                button.textContent = `${label}. ${choice}`;
                button.disabled = session.reviewed;
                if (session.selectedChoice === originalIndex) {
                    button.classList.add("is-selected");
                }
                if (session.mode !== "learn" && session.reviewed && session.lastResult) {
                    if (originalIndex === question.answerIndex) {
                        button.classList.add("is-correct");
                    }
                    if (Number(session.lastResult.userAnswerIndex) === originalIndex && !session.lastResult.correct) {
                        button.classList.add("is-wrong");
                    }
                }
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    session.selectedChoice = originalIndex;
                    submitCurrentQuestion();
                });
                choices.appendChild(button);
            });

        const feedback = document.createElement("div");
        feedback.className = "feedback-block";
        if (session.reviewed && session.lastResult) {
            feedback.appendChild(createFeedbackCard(session.lastResult, {
                includeExplanation: false,
                explanationToggle: session.mode === "quiz"
            }));
        }

        const actions = document.createElement("div");
        actions.className = "question-actions";
        if (session.reviewed) {
            const submitButton = document.createElement("button");
            submitButton.type = "button";
            submitButton.className = "primary-button";
            submitButton.textContent = session.mode === "learn" ? "Continue" : "Next question";
            submitButton.addEventListener("click", () => submitCurrentQuestion());
            actions.appendChild(submitButton);
        } else {
            actions.appendChild(Object.assign(document.createElement("span"), { className: "answer-hint", textContent: "Click a choice to get instant feedback." }));
        }

        answerArea.append(choices, feedback, actions);

        if (session.mode === "learn" && session.reviewed) {
            answerArea.insertBefore(
                Object.assign(document.createElement("p"), {
                    className: "learn-transition-status",
                    role: "status",
                    textContent: session.learnTransitioning
                        ? "Answer recorded. Next question will open automatically."
                        : "Use Next question to continue."
                }),
                feedback
            );
        }
    }

    if (session.mode === "flashcards") {
        card.append(header, answerArea);
    } else {
        card.append(header, questionText, hint, answerArea);
    }
    if (session.mode === "learn" && session.learnSlideNext) {
        card.classList.add("learn-slide-left");
        session.learnSlideNext = false;
    }
    stage.appendChild(card);
    try { renderMath(card); } catch (_) {}
    renderProgress(progressFill, session);
}

export async function initHomePage() {

    if (!document.body.classList.contains("home-page")) {
        return;
    }

    const pageMap = {
        quiz: "quiz.html",
        learn: "learn.html",
        flashcards: "flashcards.html",
        exam: "exam.html",
        note: "note.html"
    };

    const elements = {
        title: document.getElementById("subject-title"),
        meta: document.getElementById("subject-meta"),
        carousel: document.getElementById("home-subject-carousel"),
        prev: document.getElementById("home-carousel-prev"),
        next: document.getElementById("home-carousel-next"),
        refresh: document.getElementById("refresh-button"),
        progress: document.getElementById("progress-button"),
        modeLinks: document.querySelectorAll("[data-home-mode]"),
        updateLog: document.getElementById("home-update-log"),
        examDays: document.getElementById("home-exam-days"),
        examCountdownLabel: document.getElementById("home-exam-countdown-label"),
        examCountdownCard: document.getElementById("home-exam-countdown"),
        progressOverviewValue: document.getElementById("home-progress-overview-value"),
        progressBarFill: document.getElementById("home-progress-bar-fill"),
        progressEmpty: document.getElementById("home-progress-empty"),
        subjectProgressList: document.getElementById("home-subject-progress-list"),
        continuationMark: document.getElementById("home-continuation-mark"),
        continuationSubject: document.querySelector(".home-continuation-subject"),
        continuationStatus: document.getElementById("home-continuation-status"),
        continuationChapter: document.querySelector(".home-continuation-chapter"),
        continuationDetail: document.querySelector(".home-continuation-detail"),
        continuationProgress: document.getElementById("home-continuation-progress"),
        continuationProgressCount: document.getElementById("home-continuation-progress-count"),
        continuationRemaining: document.getElementById("home-continuation-remaining"),
        continuationProgressFill: document.getElementById("home-continuation-progress-fill"),
        continuationAction: document.getElementById("home-continuation-action"),
        continuationNotes: document.getElementById("home-continuation-notes"),
        continuationBrowse: document.getElementById("home-continuation-browse"),
        continuationCard: document.querySelector(".home-continuation-card"),
        continuationContent: document.getElementById("home-continuation-content"),
        learnContinuationContent: document.getElementById("home-continuation-learn-content"),
        learnContinuationSubject: document.getElementById("home-learn-continuation-subject"),
        learnContinuationStatus: document.getElementById("home-learn-continuation-status"),
        learnContinuationChapter: document.getElementById("home-learn-continuation-chapter"),
        learnContinuationDetail: document.getElementById("home-learn-continuation-detail"),
        learnContinuationProgress: document.getElementById("home-learn-continuation-progress"),
        learnContinuationProgressCount: document.getElementById("home-learn-continuation-progress-count"),
        learnContinuationRemaining: document.getElementById("home-learn-continuation-remaining"),
        learnContinuationProgressFill: document.getElementById("home-learn-continuation-progress-fill"),
        learnContinuationAction: document.getElementById("home-learn-continuation-action"),
        learnContinuationBrowse: document.getElementById("home-learn-continuation-browse")
    };
    const summaryElements = {
        subjects: document.getElementById("home-subject-count"),
        chapters: document.getElementById("home-chapter-count"),
        questions: document.getElementById("home-question-count")
    };

    const state = {
        subjects: [],
        activeSubject: null,
        activeChapter: null,
        mode: "quiz",
        carouselIndex: 0
    };

    const renderModeLinks = () => {
        elements.modeLinks.forEach((button) => {
            button.classList.remove("is-active");
        });
    };

    elements.modeLinks.forEach((button) => {
        button.addEventListener("click", () => {
            const nextMode = button.dataset.homeMode;
            if (!nextMode || !pageMap[nextMode]) {
                return;
            }
            state.mode = nextMode;
            syncSelection(state.activeSubject?.id || "", state.activeChapter?.title || "", state.mode);
            renderModeLinks();
            window.location.href = pageMap[nextMode];
        });
    });

    if (elements.progress) {
        elements.progress.addEventListener("click", () => {
            window.location.href = "progress.html";
        });
    }

    const updateCarouselButtons = () => {
        if (!elements.carousel) {
            return;
        }
        const cards = Array.from(elements.carousel.children);
        if (!cards.length) {
            return;
        }
        state.carouselIndex = Math.max(0, Math.min(state.carouselIndex, cards.length - 1));
        if (elements.prev) {
            elements.prev.disabled = state.carouselIndex <= 0;
        }
        if (elements.next) {
            elements.next.disabled = state.carouselIndex >= cards.length - 1;
        }
    };

    const scrollCarouselToIndex = (index, options = {}) => {
        if (!elements.carousel) {
            return;
        }
        const cards = Array.from(elements.carousel.children);
        if (!cards.length) {
            return;
        }
        const targetIndex = Math.max(0, Math.min(index, cards.length - 1));
        const targetCard = cards[targetIndex];
        if (!targetCard) {
            return;
        }
        state.carouselIndex = targetIndex;
        updateCarouselButtons();
        targetCard.scrollIntoView({ behavior: options.behavior || "smooth", inline: "start", block: "nearest" });
    };

    const handleCarouselNavigation = (direction) => {
        if (!elements.carousel) {
            return;
        }
        const cards = Array.from(elements.carousel.children);
        if (!cards.length) {
            return;
        }
        const nextIndex = Math.max(0, Math.min(state.carouselIndex + direction, cards.length - 1));
        if (nextIndex === state.carouselIndex) {
            return;
        }
        scrollCarouselToIndex(nextIndex);
    };

    if (elements.prev) {
        elements.prev.addEventListener("click", (event) => {
            event.preventDefault();
            handleCarouselNavigation(-1);
        });
    }

    if (elements.next) {
        elements.next.addEventListener("click", (event) => {
            event.preventDefault();
            handleCarouselNavigation(1);
        });
    }

    const renderUpdateLog = () => {
        if (!elements.updateLog) {
            return;
        }

        const entries = Array.isArray(state.updateEntries) ? state.updateEntries : [];
        elements.updateLog.replaceChildren();

        if (!entries.length) {
            const empty = document.createElement("p");
            empty.className = "home-update-log-empty";
            empty.textContent = "No recent updates are available yet.";
            elements.updateLog.appendChild(empty);
            return;
        }

        entries.slice(0, 6).forEach((entry) => {
            const item = document.createElement("div");
            item.className = "update-entry-row";

            const marker = document.createElement("span");
            marker.className = "update-entry-marker";

            const date = document.createElement("span");
            date.className = "update-entry-date";
            date.textContent = entry.date || "Unknown date";

            const message = document.createElement("span");
            message.className = "update-entry-message";
            message.textContent = entry.message || entry.commit || "Update details unavailable.";

            item.append(marker, date, message);
            elements.updateLog.appendChild(item);
        });
    };

    const renderExamCountdown = () => {
        const countdown = getBoardExamCountdown();
        if (elements.examDays) {
            elements.examDays.textContent = countdown.status === "upcoming" ? String(countdown.daysUntilStart) : "—";
        }
        if (elements.examCountdownLabel) {
            elements.examCountdownLabel.textContent = countdown.daysLabel;
        }
        if (elements.examCountdownCard) {
            elements.examCountdownCard.dataset.examStatus = countdown.status;
        }
    };

    const renderLearnContinuation = (progress) => {
        const continuation = getDashboardLearnContinuation(state.subjects, progress);
        const learnElements = elements;
        if (learnElements.learnContinuationContent) {
            learnElements.learnContinuationContent.dataset.continuationState = continuation.type;
        }
        if (learnElements.learnContinuationStatus) {
            learnElements.learnContinuationStatus.textContent = continuation.status;
        }
        if (learnElements.learnContinuationBrowse) {
            learnElements.learnContinuationBrowse.onclick = () => {
                if (continuation.subject) {
                    syncSelection(continuation.subject.id, continuation.chapter?.title || "", "learn");
                }
                window.location.href = pageMap.learn;
            };
        }

        if (continuation.type === "complete") {
            if (learnElements.learnContinuationSubject) learnElements.learnContinuationSubject.textContent = "All chapters complete";
            if (learnElements.learnContinuationChapter) learnElements.learnContinuationChapter.textContent = "Keep learning to maintain your progress.";
            if (learnElements.learnContinuationDetail) learnElements.learnContinuationDetail.textContent = "Start a fresh Learn session whenever you want to revisit the material.";
            if (learnElements.learnContinuationProgress) learnElements.learnContinuationProgress.hidden = true;
            if (learnElements.learnContinuationAction) learnElements.learnContinuationAction.hidden = true;
            return;
        }

        if (learnElements.learnContinuationSubject) learnElements.learnContinuationSubject.textContent = continuation.subject.name || "Selected subject";
        if (learnElements.learnContinuationChapter) learnElements.learnContinuationChapter.textContent = continuation.chapter.title || "Next chapter";
        if (learnElements.learnContinuationDetail) {
            learnElements.learnContinuationDetail.textContent = continuation.type === "resume"
                ? "Continue your spaced review where you left off."
                : "Build understanding chapter by chapter in Learn mode.";
        }
        if (learnElements.learnContinuationProgress) {
            learnElements.learnContinuationProgress.hidden = continuation.type !== "resume";
        }
        if (continuation.type === "resume") {
            if (learnElements.learnContinuationProgressCount) {
                learnElements.learnContinuationProgressCount.textContent = `${continuation.answeredCount} of ${continuation.questionCount} questions answered`;
            }
            if (learnElements.learnContinuationRemaining) {
                learnElements.learnContinuationRemaining.textContent = `${continuation.remainingCount} remaining`;
            }
            if (learnElements.learnContinuationProgressFill) {
                learnElements.learnContinuationProgressFill.style.width = `${continuation.percent}%`;
            }
        }
        if (learnElements.learnContinuationAction) {
            learnElements.learnContinuationAction.hidden = false;
            learnElements.learnContinuationAction.textContent = continuation.type === "resume" ? "Resume Learn" : "Start Learn";
            learnElements.learnContinuationAction.onclick = () => {
                syncSelection(continuation.subject.id, continuation.chapter.title, "learn");
                window.location.href = pageMap.learn;
            };
        }
    };

    const renderDashboardProgress = () => {
        const progress = getDashboardProgress(state.subjects);
        renderLearnContinuation(progress);
        const formatCount = (value) => Number(value || 0).toLocaleString();
        if (elements.progressOverviewValue) elements.progressOverviewValue.textContent = `${progress.percent}%`;
        if (elements.progressBarFill) elements.progressBarFill.style.width = `${progress.percent}%`;
        if (elements.progressEmpty) elements.progressEmpty.hidden = progress.answered > 0 || progress.completedChapters > 0;
        if (!elements.subjectProgressList) return;

        elements.subjectProgressList.replaceChildren();
        const activeId = state.activeSubject?.id || "";
        const sortedSubjects = [...progress.subjects].sort((left, right) => {
            if (left.id === activeId) return -1;
            if (right.id === activeId) return 1;
            return left.name.localeCompare(right.name);
        });
        sortedSubjects.forEach((subject) => {
            const item = document.createElement("div");
            item.className = "home-subject-progress";
            if (subject.id === activeId) item.classList.add("is-active");

            const heading = document.createElement("div");
            heading.className = "home-subject-progress-heading";
            const name = document.createElement("strong");
            name.textContent = subject.name;
            const percent = document.createElement("span");
            percent.textContent = `${subject.percent}%`;
            heading.append(name, percent);

            const track = document.createElement("div");
            track.className = "home-subject-progress-track";
            const fill = document.createElement("span");
            fill.style.width = `${subject.percent}%`;
            track.appendChild(fill);

            const detail = document.createElement("span");
            detail.className = "home-subject-progress-detail";
            detail.textContent = `${subject.completedChapters}/${subject.totalChapters} chapters • ${formatCount(subject.answered)} answered • ${formatCount(subject.correct)} correct`;
            item.append(heading, track, detail);
            elements.subjectProgressList.appendChild(item);
        });

        const continuation = getDashboardContinuation(state.subjects, progress);
        if (elements.continuationAction) {
            elements.continuationAction.onclick = null;
        }
        if (elements.continuationNotes) {
            elements.continuationNotes.onclick = null;
        }
        if (elements.continuationBrowse) {
            elements.continuationBrowse.onclick = () => {
                if (continuation.subject) {
                    syncSelection(continuation.subject.id, continuation.chapter?.title || "", "quiz");
                }
                window.location.href = pageMap.quiz;
            };
        }
        if (elements.continuationCard) {
            elements.continuationCard.dataset.continuationState = continuation.type;
        }
        if (elements.continuationStatus) elements.continuationStatus.textContent = continuation.status;
        if (continuation.type === "complete") {
            if (elements.continuationMark) elements.continuationMark.textContent = "✓";
            if (elements.continuationSubject) elements.continuationSubject.textContent = "All chapters complete";
            if (elements.continuationChapter) elements.continuationChapter.textContent = "You have covered every available chapter.";
            if (elements.continuationDetail) elements.continuationDetail.textContent = "Keep reviewing to maintain your progress.";
            if (elements.continuationProgress) elements.continuationProgress.hidden = true;
            if (elements.continuationAction) {
                elements.continuationAction.hidden = true;
            }
            if (elements.continuationNotes) {
                elements.continuationNotes.hidden = true;
            }
            return;
        }

        const subjectName = continuation.subject.name || "Selected subject";
        const chapterTitle = continuation.chapter.title || "Next chapter";
        if (elements.continuationMark) elements.continuationMark.textContent = continuation.type === "resume" ? "↗" : "→";
        if (elements.continuationSubject) elements.continuationSubject.textContent = subjectName;
        if (elements.continuationChapter) elements.continuationChapter.textContent = chapterTitle;
        if (elements.continuationDetail) {
            elements.continuationDetail.textContent = continuation.type === "resume"
                ? "Continue where you left off."
                : "Next incomplete chapter for this subject.";
        }
        if (elements.continuationProgress) {
            elements.continuationProgress.hidden = continuation.type !== "resume";
        }
        if (continuation.type === "resume") {
            if (elements.continuationProgressCount) {
                elements.continuationProgressCount.textContent = `${continuation.answeredCount} of ${continuation.questionCount} questions answered`;
            }
            if (elements.continuationRemaining) {
                elements.continuationRemaining.textContent = `${continuation.remainingCount} remaining`;
            }
            if (elements.continuationProgressFill) {
                elements.continuationProgressFill.style.width = `${continuation.percent}%`;
            }
        }
        if (elements.continuationAction) {
            elements.continuationAction.hidden = false;
            elements.continuationAction.textContent = continuation.type === "resume" ? "Resume Quiz" : "Start Quiz";
            elements.continuationAction.onclick = () => {
                syncSelection(continuation.subject.id, continuation.chapter.title, "quiz");
                window.location.href = pageMap.quiz;
            };
        }
        if (elements.continuationNotes) {
            elements.continuationNotes.hidden = false;
            elements.continuationNotes.onclick = () => {
                syncSelection(continuation.subject.id, continuation.chapter.title, "note");
                window.location.href = pageMap.note;
            };
        }
    };

    const render = () => {

        const chapterCount = state.subjects.reduce((total, subject) => total + subject.chapters.length, 0);
        const questionCount = state.subjects.reduce((total, subject) => total + tallyQuestionCount(subject), 0);
        if (summaryElements.subjects) summaryElements.subjects.textContent = state.subjects.length;
        if (summaryElements.chapters) summaryElements.chapters.textContent = chapterCount;
        if (summaryElements.questions) summaryElements.questions.textContent = questionCount;

        if (elements.title) {
            elements.title.textContent = state.activeSubject ? state.activeSubject.name : "Upload a quiz to begin";
        }
        if (elements.meta) {
            elements.meta.textContent = state.activeSubject
                ? `${state.activeSubject.chapters.length} chapter${state.activeSubject.chapters.length === 1 ? "" : "s"} • ${tallyQuestionCount(state.activeSubject)} questions loaded from subjects.json.`
                : "This GitHub Pages version loads subjects from subjects.json.";

        }

        renderModeLinks();
        renderUpdateLog();
        renderExamCountdown();
        renderDashboardProgress();

        if (elements.carousel) {
            renderHomeCarousel(elements.carousel, state.subjects, "", (subjectId) => {
                state.activeSubject = getSubjectById(state.subjects, subjectId);
                state.activeChapter = state.activeSubject ? getUsableChapter(state.activeSubject, state.activeSubject.selectedChapter || state.activeSubject.chapters[0]?.title || "") : null;
                state.mode = "quiz";
                syncSelection(state.activeSubject?.id || "", state.activeChapter?.title || "", state.mode);
                window.location.href = pageMap.quiz;
            });
            const activeIndex = Math.max(0, state.subjects.findIndex((subject) => subject.id === state.activeSubject?.id));
            state.carouselIndex = activeIndex >= 0 ? activeIndex : 0;
            updateCarouselButtons();
            if (activeIndex >= 0) {
                requestAnimationFrame(() => scrollCarouselToIndex(activeIndex));
            }
        }
    };

    const loadUpdateEntries = async () => {
        try {
            const response = await fetch(UPDATE_LOG_API, { cache: "no-store" });
            if (response.ok) {
                const payload = await response.json();
                const entries = Array.isArray(payload.entries) ? payload.entries : [];
                if (entries.length) {
                    return entries.map((entry) => ({
                        date: text(entry.date || entry.dateKey || ""),
                        hash: text(entry.hash || entry.id || ""),
                        message: text(entry.message || entry.subject || "Update entry")
                    }));
                }
            }
        } catch {
            // Fallback to built-in update log.
        }
        return DEFAULT_UPDATE_LOG;
    };

    const refresh = async () => {
        const fresh = await storageSelectState();

        state.subjects = fresh.subjects;
        state.activeSubject = fresh.activeSubject;
        state.activeChapter = fresh.activeChapter;
        state.mode = fresh.mode;
        state.updateEntries = await loadUpdateEntries();
        render();
    };

    await refresh();
    try { renderMath(document.body); } catch (_) {}

    window.addEventListener("storage", async (event) => {
        if ([STORAGE_KEY, ACTIVE_SUBJECT_KEY, ACTIVE_CHAPTER_KEY, ACTIVE_MODE_KEY].includes(event.key)) {
            await refresh();

        }
    });
}

function generatePieChartSVG(percentage, size = 100) {
    const radius = size / 2;
    const circumference = 2 * Math.PI * (radius - 8);
    const strokeDashoffset = circumference * (1 - percentage / 100);

    const color = percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";

    return `
        <svg viewBox="0 0 ${size} ${size}" class="assessment-chart-svg" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${radius}" cy="${radius}" r="${radius - 8}" fill="rgba(255,255,255,0.05)" stroke="none"/>
            <circle 
                cx="${radius}" 
                cy="${radius}" 
                r="${radius - 8}" 
                fill="none" 
                stroke="${color}" 
                stroke-width="8"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${strokeDashoffset}"
                stroke-linecap="round"
                transform="rotate(-90 ${radius} ${radius})"
                style="transition: stroke-dashoffset 0.3s ease;"
            />
            <text 
                x="${radius}" 
                y="${radius}" 
                text-anchor="middle" 
                dy="0.3em" 
                font-size="18" 
                font-weight="700" 
                fill="white"
            >${percentage}%</text>
        </svg>
    `;
}

export function initProgressPage() {
    if (!document.body.classList.contains("progress-page")) {
        return;
    }

    const elements = {
        title: document.getElementById("progress-title"),
        summary: document.getElementById("progress-summary"),
        container: document.getElementById("assessment-container"),
        home: document.getElementById("progress-home"),
        reset: document.getElementById("progress-reset")
    };

    if (elements.reset) {
        elements.reset.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset all assessment data? This cannot be undone.")) {
                storageRemove(PROGRESS_HISTORY_KEY);
                location.reload();
            }
        });
    }

    const assessments = getAssessmentsBySubject();
    const subjectNames = Object.keys(assessments).sort();

    if (elements.title) {
        elements.title.textContent = "Assessment";
    }

    if (elements.summary) {
        const totalSessions = Object.values(assessments).reduce((sum, s) => sum + s.entries.length, 0);
        const totalAttempted = Object.values(assessments).reduce((sum, s) => sum + s.totalAttempted, 0);
        const totalCorrect = Object.values(assessments).reduce((sum, s) => sum + s.totalCorrect, 0);
        
        if (totalAttempted) {
            const overallAccuracy = Math.round((totalCorrect / totalAttempted) * 100);
            elements.summary.textContent = `${totalSessions} sessions • ${totalAttempted} questions • ${overallAccuracy}% accuracy overall`;
        } else {
            elements.summary.textContent = "No assessment data yet. Complete quiz or exam sessions to see your performance.";
        }
    }

    const summaryCards = document.getElementById("progress-summary-cards");
    if (summaryCards) {
        const quizSummary = getRecentModeSummary("quiz", 7);
        const examSummary = getRecentModeSummary("exam", 7);
        const learnSummary = getRecentLearnSummary(7);
        const progressEntries = getProgressEntries().filter((entry) => text(entry.mode) === "quiz" || text(entry.mode) === "exam");
        const quizAttempts = progressEntries.filter((entry) => text(entry.mode) === "quiz" && text(entry.summaryType) === "session");
        const examAttempts = progressEntries.filter((entry) => text(entry.mode) === "exam" && text(entry.summaryType) === "session");
        summaryCards.replaceChildren(
            createAccuracyAttemptChartCard(quizAttempts, examAttempts),
            createProgressSummaryCard("Quiz accuracy", quizSummary, "Recent quiz performance across the last 7 days."),
            createProgressSummaryCard("Exam accuracy", examSummary, "Recent exam performance across the last 7 days."),
            createLearningProgressSummaryCard(learnSummary)
        );
    }

    if (elements.container) {
        elements.container.replaceChildren();

        if (!subjectNames.length) {
            const empty = document.createElement("div");
            empty.className = "progress-empty";
            empty.textContent = "No assessment data yet. Complete a quiz or exam to populate your assessments.";
            empty.style.padding = "40px 20px";
            empty.style.textAlign = "center";
            elements.container.appendChild(empty);
            return;
        }

        subjectNames.forEach((subjectName) => {
            const subject = assessments[subjectName];
            const card = document.createElement("div");
            card.className = "assessment-card";
            
            const chapterNames = Object.keys(subject.chapters).sort();
            const isExpandable = chapterNames.length > 0;

            card.innerHTML = `
                <div class="assessment-card-header">
                    <div class="assessment-chart-container">
                        ${generatePieChartSVG(subject.accuracy)}
                    </div>
                    <div class="assessment-info">
                        <div class="assessment-subject-info">
                            <h3>${subjectName}</h3>
                            <div class="assessment-stats">
                                <div class="assessment-stat">
                                    <strong>${subject.totalAttempted}</strong>
                                    <span>questions attempted</span>
                                </div>
                                <div class="assessment-stat">
                                    <strong>${subject.totalCorrect}</strong>
                                    <span>correct</span>
                                </div>
                            </div>
                        </div>
                        <div class="assessment-accuracy">
                            <span class="assessment-accuracy-value">${subject.accuracy}%</span>
                            <span class="assessment-accuracy-label">Accuracy</span>
                        </div>
                    </div>
                </div>
                <div class="assessment-chapters">
                    ${chapterNames.map((chapterName) => {
                        const chapter = subject.chapters[chapterName];
                        const fillPercent = Math.max(0, Math.min(100, Number(chapter.accuracy) || 0));
                        return `
                            <div class="assessment-chapter-item" style="background: linear-gradient(90deg, rgba(54, 217, 132, 0.18) 0%, rgba(54, 217, 132, 0.18) ${fillPercent}%, rgba(255, 255, 255, 0.02) ${fillPercent}%, rgba(255, 255, 255, 0.02) 100%);">
                                <div class="assessment-chapter-name">
                                    <strong>${chapterName}</strong>
                                    <div class="assessment-chapter-stats">
                                        <span>${chapter.attempted} • ${chapter.correct} correct</span>
                                    </div>
                                </div>
                                <div class="assessment-chapter-accuracy">
                                    <strong>${chapter.accuracy}%</strong>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            `;

            if (isExpandable) {
                const chaptersDiv = card.querySelector(".assessment-chapters");
                card.style.cursor = "pointer";
                card.addEventListener("click", (event) => {
                    event.preventDefault();
                    chaptersDiv.classList.toggle("expanded");
                    card.classList.toggle("expanded");
                });
            }

            elements.container.appendChild(card);
        });
    }
}


export async function initModePage(mode) {

    if (!document.body.classList.contains("mode-page")) {
        return;
    }

    const pageMap = {
        quiz: "quiz.html",
        learn: "learn.html",
        flashcards: "flashcards.html",
        exam: "exam.html",
        note: "note.html"
    };

    const elements = {
        backdrop: document.getElementById("drawer-backdrop"),
        drawerOpen: document.getElementById("drawer-open"),
        drawerClose: document.getElementById("drawer-close"),
        subjectSelect: document.getElementById("subject-select"),
        subjectList: document.getElementById("subject-list"),
        title: document.getElementById("subject-title"),
        meta: document.getElementById("subject-meta"),
        summaryPill: document.getElementById("summary-pill"),
        chapterTitle: document.getElementById("chapter-title"),
        chapterSubtitle: document.getElementById("chapter-subtitle"),
        modeLabel: document.getElementById("mode-label"),
        counter: document.getElementById("question-counter"),
        progressFill: document.getElementById("progress-fill"),
        chapterStrip: document.getElementById("chapter-strip"),
        stage: document.getElementById("question-stage"),
        assessmentTitle: document.querySelector("#assessment-panel h3"),
        assessmentScore: document.getElementById("assessment-score"),
        assessmentContent: document.getElementById("assessment-content"),
        modeButtons: document.querySelectorAll(".mode-button"),
        refresh: document.getElementById("refresh-button"),
        shuffle: document.getElementById("shuffle-button")
    };

    const state = {
        subjects: [],
        activeSubject: null,
        activeChapter: null,

        mode,
        session: null,
        reviewSession: loadReviewSession(),
        drawerExpandedSubjectId: ""
    };

    const handleShuffleSession = () => {
        if (!state.session || !["quiz", "learn", "flashcards"].includes(state.session.mode)) {
            return;
        }

        const shuffled = shuffleSessionQuestions(state.session);
        if (!shuffled) {
            return;
        }

        saveModeSession(state.session);
        renderHeader();
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
    };

    let examTimerId = null;
    globalThis.__beginExamSession = null;

    const createExamPlaceholderSession = (subject) => ({
        subjectId: subject?.id || "",
        subjectName: subject?.name || "",
        chapterTitle: text(state.activeChapter?.title || subject?.chapters?.[0]?.title || "Exam"),
        mode: "exam",
        questions: [],
        index: 0,
        answers: [],
        drafts: [],
        revealed: false,
        reviewed: false,
        busy: false,
        lastResult: null,
        selectedChoice: null,
        typedAnswer: "",
        complete: false,
        currentSummary: null,
        reviewLabel: "Exam review",
        reviewSource: "exam",
        selectedChapterTitles: [],
        questionCount: 0,
        timeLimitSeconds: 0,
        timeRemainingSeconds: 0,
        startedAt: null,
        submitted: false,
        timerStarted: false,
        reviewingAnswers: false,
        setupError: ""
    });

    const clearExamTimer = () => {
        if (examTimerId !== null) {
            window.clearInterval(examTimerId);
            examTimerId = null;
        }
    };

    const updateExamTimerBadge = () => {
        const session = state.session;
        if (!session || session.mode !== "exam" || session.complete || session.submitted) {
            return;
        }
        const badge = document.querySelector("[data-exam-timer-badge]");
        if (badge && session.timeLimitSeconds > 0) {
            badge.textContent = `⏱ ${formatMinutesSeconds(Math.max(0, session.timeRemainingSeconds))}`;
        }
    };

    const startExamTimer = () => {
        const session = state.session;
        if (!session || session.mode !== "exam" || session.complete || session.submitted || !session.timeLimitSeconds) {
            clearExamTimer();
            return;
        }
        if (session.timerStarted) {
            return;
        }
        session.timerStarted = true;
        session.startedAt = session.startedAt || Date.now();
        examTimerId = window.setInterval(() => {
            const activeSession = state.session;
            if (!activeSession || activeSession.mode !== "exam" || activeSession.complete || activeSession.submitted) {
                clearExamTimer();
                return;
            }
            const elapsed = Math.max(0, Math.floor((Date.now() - (activeSession.startedAt || Date.now())) / 1000));
            activeSession.timeRemainingSeconds = Math.max(0, activeSession.timeLimitSeconds - elapsed);
            renderHeader();
            updateExamTimerBadge();
            if (activeSession.timeRemainingSeconds <= 0) {
                clearExamTimer();
                finishExamSession(true);
                return;
            }
        }, 1000);
    };

    function beginExamSession(config = {}) {
        const subject = state.activeSubject;
        if (!subject) {
            return;
        }

        const selectedChapters = Array.isArray(config.chapters) && config.chapters.length
            ? config.chapters
            : state.activeChapter?.title
                ? [state.activeChapter.title]
                : subject.chapters.map((chapter) => chapter.title);

        const questionCount = Math.max(1, Math.min(Number(config.questionCount) || 10, 100));
        const timeLimitSeconds = Math.max(0, Number(config.timeLimitSeconds) || 0);
        const chapterTitles = selectedChapters.filter(Boolean);

        state.session = createExamSession(subject, chapterTitles, questionCount, {
            chapterTitle: chapterTitles[0] || state.activeChapter?.title || subject.chapters[0]?.title || "Exam",
            timeLimitSeconds
        });
        state.session.startedAt = Date.now();
        state.session.timerStarted = false;
        state.session.submitted = false;
        state.session.complete = false;
        state.session.reviewingAnswers = false;
        state.session.setupError = "";
        state.activeChapter = getChapterByTitle(subject, chapterTitles[0]) || state.activeChapter || subject.chapters[0] || null;
        syncSelection(subject.id, state.activeChapter?.title || "", "exam");
        renderModeSwitcher();
        renderHeader();
        renderChapters();
        clearExamTimer();
        startExamTimer();
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
    };

    globalThis.__beginExamSession = beginExamSession;

    const finishExamSession = (force = false) => {
        const session = state.session;
        if (!session || session.mode !== "exam") {
            return;
        }

        const unanswered = session.questions.some((_, index) => !session.answers[index]);
        if (unanswered && !force) {
            session.setupError = "Answer every question before you finish the exam.";
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            return;
        }

        session.submitted = true;
        session.complete = true;
        session.currentSummary = summarizeResults(session);
        recordSessionProgress(session);
        clearExamTimer();
        renderHeader();
        renderAssessment(session.currentSummary, session, elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent, startSession);
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
    };

    globalThis.__finishExamSession = finishExamSession;

    const submitExamAnswer = () => {
        const session = state.session;
        if (!session || session.mode !== "exam" || session.busy) {
            return;
        }

        const question = session.questions[session.index];
        if (!question) {
            return;
        }

        const answer = question.questionType === "numeric"
            ? text(session.typedAnswer)
            : session.selectedChoice;

        if (question.questionType === "numeric") {
            if (!text(answer)) {
                session.setupError = "Enter an answer before submitting.";
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
                return;
            }
        } else if (answer === null || answer === undefined) {
            session.setupError = "Pick an answer before submitting.";
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            return;
        }

        session.busy = true;
        const result = buildQuestionResult(
            question,
            session,
            answer,
            isQuestionCorrect(question, answer),
            session.unsureFlags[session.index]
        );
        session.answers[session.index] = result;
        session.drafts[session.index] = text(question.questionType === "numeric" ? session.typedAnswer : answer);
        session.selectedChoice = null;
        session.typedAnswer = "";
        session.busy = false;
        session.setupError = "";

        if (session.index + 1 >= session.questions.length) {
            if (session.timeLimitSeconds > 0 && session.timeRemainingSeconds <= 0) {
                finishExamSession();
            } else {
                session.reviewingAnswers = true;
                renderHeader();
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            }
            return;
        }

        session.index += 1;
        renderHeader();
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
    };

    globalThis.__submitExamAnswer = submitExamAnswer;

    const isDesktopDrawerMode = () => document.fullscreenElement || window.innerWidth > 900;

    const setDrawerBackdropHidden = (hidden) => {
        if (elements.backdrop) {
            elements.backdrop.hidden = hidden;
        }
    };

    const dismissDrawerOverlay = () => {
        document.body.classList.remove("drawer-open");
        setDrawerBackdropHidden(true);
    };

    const openDrawer = () => {
        if (isDesktopDrawerMode()) {
            document.body.classList.remove("drawer-collapsed");
            document.body.classList.remove("drawer-open");
            setDrawerBackdropHidden(true);
            return;
        }

        document.body.classList.add("drawer-open");
        setDrawerBackdropHidden(false);
    };

    const closeDrawer = () => {
        if (isDesktopDrawerMode()) {
            document.body.classList.add("drawer-collapsed");
            dismissDrawerOverlay();
            return;
        }

        dismissDrawerOverlay();
    };

    const syncDrawerVisibility = () => {
        if (isDesktopDrawerMode()) {
            dismissDrawerOverlay();
            return;
        }

        setDrawerBackdropHidden(!document.body.classList.contains("drawer-open"));
    };

    if (elements.shuffle) {
        elements.shuffle.addEventListener("click", handleShuffleSession);
    }

    const renderHeader = () => {
        const subject = state.activeSubject;
        const chapter = state.activeChapter;

        if (!subject) {
            if (elements.title) {
                elements.title.textContent = "Upload a quiz to begin";
            }
            if (elements.meta) {
                elements.meta.textContent = "Open the hidden admin page to edit subjects.json or load a new quiz file into the repo-backed library.";

            }
            if (elements.summaryPill) {
                elements.summaryPill.textContent = "No subject loaded";
            }
            if (elements.chapterTitle) {
                elements.chapterTitle.textContent = "No chapter selected";
            }
            if (elements.chapterSubtitle) {
                elements.chapterSubtitle.textContent = "Use the admin page to add your own subject banks.";
            }
            if (elements.modeLabel) {
                elements.modeLabel.textContent = `${capitalize(state.mode)} mode`;
            }
            if (elements.counter) {
                elements.counter.textContent = "Waiting for a subject";
            }
            return;
        }

        const chapterCount = subject.chapters.length;
        const questionCount = tallyQuestionCount(subject);
        if (elements.title) {
            elements.title.textContent = subject.name;
        }
        if (elements.meta) {
            elements.meta.textContent = `${chapterCount} chapter${chapterCount === 1 ? "" : "s"} • ${questionCount} question${questionCount === 1 ? "" : "s"} loaded from subjects.json.`;

        }
        if (elements.summaryPill) {
            elements.summaryPill.textContent = `${chapterCount} chapters • ${questionCount} questions`;
        }
        if (elements.chapterTitle) {
            elements.chapterTitle.textContent = state.mode === "exam"
                ? (state.session?.questions?.length ? `${state.session.questions.length} question${state.session.questions.length === 1 ? "" : "s"} exam` : "Exam setup")
                : (chapter ? chapter.title : "No chapter selected");
        }
        if (elements.chapterSubtitle) {
            if (state.mode === "exam") {
                if (state.session?.questions?.length) {
                    const remaining = Math.max(0, state.session.questions.length - state.session.answers.filter(Boolean).length);
                    const timerText = state.session.timeLimitSeconds > 0
                        ? ` • ${formatMinutesSeconds(Math.max(0, state.session.timeRemainingSeconds))} remaining`
                        : "";
                    elements.chapterSubtitle.textContent = `${state.session.questions.length} questions • ${remaining} left${timerText}`;
                } else {
                    elements.chapterSubtitle.textContent = "Choose chapters, number of questions, and an optional timer to begin your exam.";
                }
            } else if (state.session?.reviewLabel) {
                elements.chapterSubtitle.textContent = `${state.session.reviewLabel}: ${state.session.questions.length} question${state.session.questions.length === 1 ? "" : "s"} from this chapter.`;
            } else {
                elements.chapterSubtitle.textContent = chapter
                    ? `${collectChapterQuestions(chapter).length} question${collectChapterQuestions(chapter).length === 1 ? "" : "s"} in this chapter`
                    : "Choose a chapter to start.";
            }
        }
        if (elements.modeLabel) {
            elements.modeLabel.textContent = `${capitalize(state.mode)} mode`;
        }
        if (elements.counter) {
            if (state.session && !state.session.complete) {
                if (state.mode === "exam" && state.session.questions.length === 0) {
                    const questionCount = tallyQuestionCount(subject);
                    elements.counter.textContent = `Available ${questionCount} question${questionCount === 1 ? "" : "s"}`;
                } else {
                    elements.counter.textContent = `Question ${state.session.index + 1} out of ${state.session.questions.length}`;
                }
            } else if (state.session && state.session.complete) {
                elements.counter.textContent = "Quiz complete";
            } else {
                elements.counter.textContent = "Ready to start";
            }
        }
    };

    globalThis.__renderHeader = renderHeader;

    const renderDrawer = () => {
        renderSubjectDrawer(
            state.subjects,
            state.activeSubject?.id || "",
            state.activeChapter?.title || "",
            state.drawerExpandedSubjectId || "",
            elements.subjectList,
            elements.subjectSelect,
            (subjectId, chapterTitle = "") => selectSubject(subjectId, chapterTitle),
            (subjectId) => toggleSubject(subjectId),
            dismissDrawerOverlay
        );
    };

    const renderChapters = () => {
        if (!elements.chapterStrip) {
            return;
        }
        renderChapterStrip(state.activeSubject, state.activeChapter?.title || "", elements.chapterStrip, (chapterTitle) => selectChapter(chapterTitle));
    };

    const renderModeSwitcher = () => {
        renderModeButtons(elements.modeButtons, state.mode);
    };

    const renderQuizLiveSummary = () => {
        const session = state.session;
        if (!elements.assessmentTitle || !elements.assessmentScore || !elements.assessmentContent) {
            return;
        }

        if (!session) {
            renderAssessmentPlaceholder(elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent);
            return;
        }

        const answeredCount = countAnsweredQuestions(session);
        const correctCount = session.answers.filter((entry) => entry && entry.correct).length;
        const missedCount = Math.max(0, answeredCount - correctCount);
        const openCount = Math.max(0, session.questions.length - answeredCount);

        elements.assessmentTitle.textContent = "Live worksheet summary";
        elements.assessmentScore.textContent = `${answeredCount}/${session.questions.length} answered`;
        elements.assessmentContent.replaceChildren();

        const summary = document.createElement("div");
        summary.className = "assessment-block";
        summary.append(
            Object.assign(document.createElement("h4"), {
                textContent: answeredCount === 0 ? "Start anywhere" : "Progress so far"
            }),
            Object.assign(document.createElement("p"), {
                textContent: `${correctCount} correct, ${missedCount} missed, ${openCount} still open.`
            }),
            Object.assign(document.createElement("p"), {
                textContent: "Every row locks after you answer so feedback stays visible while you keep working."
            }),
            createAssessmentChart(
                [
                    {
                        label: "Correct",
                        value: correctCount,
                        color: "var(--success)",
                        meta: "answered right"
                    },
                    {
                        label: "Missed",
                        value: missedCount,
                        color: "var(--danger)",
                        meta: "answered wrong"
                    },
                    {
                        label: "Open",
                        value: openCount,
                        color: "var(--primary)",
                        meta: "not answered yet"
                    }
                ],
                `${answeredCount}/${session.questions.length}`,
                "Answered",
                `Live progress breakdown: ${correctCount} correct, ${missedCount} missed, ${openCount} still open.`
            )
        );

        elements.assessmentContent.appendChild(summary);
    };

    const submitQuizAnswer = (questionIndex, question, answer) => {
        const session = state.session;
        if (!session || session.answers[questionIndex]) {
            return;
        }

        if (question.questionType === "numeric" && !text(answer)) {
            return;
        }

        session.drafts[questionIndex] = text(answer);
        const result = buildQuestionResult(question, session, answer, isQuestionCorrect(question, answer));
        session.answers[questionIndex] = result;

        const answeredCount = countAnsweredQuestions(session);
        session.complete = answeredCount >= session.questions.length;
        session.currentSummary = session.complete ? summarizeResults(session) : null;

        saveQuizSession(session);
        renderHeader();
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
    };

    const renderQuizQuestionCard = (question, index) => {
        const session = state.session;
        const result = session?.answers?.[index] || null;
        const answered = Boolean(result);

        const card = document.createElement("article");
        card.className = "question-card quiz-question-card";
        if (answered) {
            card.classList.add(result.correct ? "is-correct" : "is-wrong");
        }

        const header = document.createElement("div");
        header.className = "question-card-header";

        const counter = document.createElement("div");
        counter.className = "question-counter-inline";
        counter.textContent = `Question ${index + 1} out of ${session.questions.length}`;

        const status = document.createElement("div");
        status.className = "mode-badge quiz-status";
        status.textContent = answered ? (result.correct ? "Correct" : "Needs review") : "Unanswered";

        header.append(counter, status);

        const questionText = document.createElement("h4");
        questionText.textContent = question.question;

        const hint = document.createElement("p");
        hint.className = "question-hint";
        hint.textContent = question.questionType === "numeric"
            ? "Type your answer and press Check."
            : "Tap a choice for instant feedback.";

        const answerArea = document.createElement("div");
        answerArea.className = "answer-area quiz-answer-area";

        if (question.questionType === "numeric") {
            const form = document.createElement("form");
            form.className = "answer-form";

            const input = document.createElement("input");
            input.type = "number";
            input.className = "answer-input";
            input.placeholder = "Enter your answer";
            input.value = session.drafts?.[index] || "";
            input.disabled = answered;
            input.addEventListener("input", () => {
                session.drafts[index] = input.value;
            });

            const button = document.createElement("button");
            button.type = "submit";
            button.className = "primary-button";
            button.textContent = answered ? "Locked" : "Check answer";
            button.disabled = answered;

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                submitQuizAnswer(index, question, input.value);
            });

            form.append(input, button);
            answerArea.appendChild(form);
        } else {
            const choices = document.createElement("div");
            choices.className = "choice-grid";

            getOrderedChoices(question).forEach(({ displayIndex, originalIndex, choice }) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "choice-button";
                const label = displayIndex < 26 ? String.fromCharCode(65 + displayIndex) : String(displayIndex + 1);
                if (typeof choice === 'string') {
                    const escaped = escapeHtml(choice).replace(/\$\$/g, '$$').replace(/\$/g, '$');
                    button.innerHTML = `${escapeHtml(label + '. ')}${escaped}`;
                } else {
                    button.textContent = `${label}. ${String(choice)}`;
                }
                button.disabled = answered;

                if (answered) {
                    if (originalIndex === question.answerIndex) {
                        button.classList.add("is-correct");
                    }
                    if (Number(result.userAnswerIndex) === originalIndex) {
                        button.classList.add(result.correct ? "is-correct" : "is-wrong");
                    }
                }

                button.addEventListener("click", () => submitQuizAnswer(index, question, originalIndex));
                choices.appendChild(button);
            });
            // Render math for all choices once appended
            try { renderMath(choices); } catch (_) {}

            answerArea.appendChild(choices);
        }

        const feedback = document.createElement("div");
        feedback.className = "feedback-block";
        if (answered) {
            feedback.appendChild(createFeedbackCard(result, {
                includeExplanation: false,
                explanationToggle: session.mode === "quiz"
            }));
        } else {
            feedback.appendChild(Object.assign(document.createElement("p"), {
                className: "answer-hint",
                textContent: question.questionType === "numeric"
                    ? "You can answer this row whenever you’re ready."
                    : "Choose one option to lock in feedback for this row."
            }));
        }

        answerArea.appendChild(feedback);
        card.append(header, questionText, hint, answerArea);
        try { renderMath(answerArea); } catch (_) {}
        try { renderMath(feedback); } catch (_) {}
        return card;
    };

    const renderQuizSheetStage = () => {
        const subject = state.activeSubject;
        const chapter = state.activeChapter;
        const chapterQuestions = collectChapterQuestions(chapter);
        if (subject && chapter && chapterQuestions.length) {
            const session = state.session;
            const sessionQuestionCount = Array.isArray(session?.questions) ? session.questions.length : 0;
            if (!session || session.subjectId !== subject.id || session.chapterTitle !== chapter.title || sessionQuestionCount !== chapterQuestions.length) {
                state.session = createSession(subject, chapter, state.mode);
            }
        }

        const session = state.session;
        const { stage, progressFill } = elements;

        stage.replaceChildren();

        if (!subject || !chapter || !session) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.append(
                Object.assign(document.createElement("h4"), { textContent: subject ? "Choose a chapter" : "No subject loaded yet" }),
                Object.assign(document.createElement("p"), {
                    textContent: subject
                        ? "Pick a chapter from the strip above to open the worksheet."
                        : "Use the hidden admin page to add a quiz, then choose it from the subject drawer."
                })
            );
            stage.appendChild(empty);
            renderProgress(progressFill, session);
            renderQuizLiveSummary();
            return;
        }

        const sheet = document.createElement("div");
        sheet.className = "quiz-sheet";

        const intro = document.createElement("section");
        intro.className = "quiz-sheet-intro";

        const introCopy = document.createElement("div");
        introCopy.className = "quiz-sheet-intro-copy";
        introCopy.append(
            Object.assign(document.createElement("p"), { className: "section-label", textContent: "Live worksheet" }),
            Object.assign(document.createElement("h3"), { textContent: "All questions are visible at once" }),
            Object.assign(document.createElement("p"), {
                className: "hero-meta",
                textContent: "Answer each row like a sheet. Every response is checked immediately, and the feedback stays on the page."
            })
        );

        const introMeta = document.createElement("div");
        introMeta.className = "quiz-sheet-meta";
        introMeta.append(
            Object.assign(document.createElement("div"), {
                className: "summary-pill",
                textContent: `${countAnsweredQuestions(session)}/${session.questions.length} answered`
            }),
            Object.assign(document.createElement("div"), {
                className: "summary-pill",
                textContent: `${chapterQuestions.length} row${chapterQuestions.length === 1 ? "" : "s"}`
            })
        );

        intro.append(introCopy, introMeta);

        if (!session.questions.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.append(
                Object.assign(document.createElement("h4"), { textContent: "No questions found in this chapter" }),
                Object.assign(document.createElement("p"), {
                    textContent: "This chapter did not load any usable question rows. Re-import the quiz JSON or pick a different chapter."
                })
            );
            sheet.append(intro, empty);
            stage.appendChild(sheet);
            renderProgress(progressFill, session);
            renderQuizLiveSummary();
            return;
        }

        const list = document.createElement("div");
        list.className = "quiz-sheet-list";
        session.questions.forEach((question, index) => {
            list.appendChild(renderQuizQuestionCard(question, index));
        });

        sheet.append(intro, list);

        if (session.complete && session.currentSummary) {
            const completionCard = document.createElement("div");
            completionCard.className = "question-card completion-card";
            completionCard.append(
                Object.assign(document.createElement("h4"), { textContent: `Worksheet complete for ${session.chapterTitle}` }),
                Object.assign(document.createElement("p"), { textContent: "Review the feedback cards above, then use the assessment panel for your score and missed questions." })
            );

            const actions = document.createElement("div");
            actions.className = "question-actions";
            const retakeButton = document.createElement("button");
            retakeButton.type = "button";
            retakeButton.className = "primary-button";
            retakeButton.textContent = "Retake worksheet";
            retakeButton.addEventListener("click", () => startSession(session.mode));
            const nextButton = document.createElement("button");
            nextButton.type = "button";
            nextButton.className = "ghost-button";
            nextButton.textContent = "Choose another chapter";
            nextButton.addEventListener("click", () => {
                const currentIndex = subject.chapters.findIndex((entry) => entry.title === chapter.title);
                const nextChapter = subject.chapters[(currentIndex + 1) % subject.chapters.length];
                selectChapter(nextChapter.title);
            });
            actions.append(retakeButton, nextButton);
            completionCard.appendChild(actions);
            sheet.appendChild(completionCard);
            
            // Show assessment modal once per completed quiz session
            if (!session.assessmentModalShown) {
                createQuizAssessmentModal(session.currentSummary, session, state, selectChapter, startSession);
                renderAssessment(session.currentSummary, session, elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent, startSession);
            } else {
                renderAssessmentPlaceholder(
                    elements.assessmentTitle,
                    elements.assessmentScore,
                    elements.assessmentContent,
                    "Quiz complete — final results were shown in the assessment popup."
                );
            }
            recordQuizSessionProgress(session);
        } else {
            renderQuizLiveSummary();
        }

        stage.appendChild(sheet);
        try { renderMath(sheet); } catch (_) {}
        renderProgress(progressFill, session);
    };

    const startSession = (nextMode = state.mode) => {
        cancelLearnAutoAdvance();
        const subject = state.activeSubject;
        if (!subject) {
            state.session = null;
            renderHeader();
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            renderAssessmentPlaceholder(elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent);
            return;
        }

        const chapter = getUsableChapter(subject, state.activeChapter?.title || subject.selectedChapter || subject.chapters[0]?.title || "");
        if (!chapter) {
            state.session = null;
            renderHeader();
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            renderAssessmentPlaceholder(elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent);
            return;
        }

        state.mode = nextMode;
        state.activeChapter = chapter;
        if (nextMode === "exam") {
            clearExamTimer();
            state.session = createExamPlaceholderSession(subject);
            state.session.chapterTitle = chapter.title;
            state.session.selectedChapterTitles = [chapter.title];
            state.session.setupError = "";
        } else {
            if (nextMode === "quiz") {
                const restored = restoreQuizSession(subject, chapter);
                if (restored) {
                    state.session = restored;
                } else {
                    clearQuizSession();
                    state.session = createSession(subject, chapter, nextMode, {});
                }
            } else {
                const reviewSession = nextMode === "learn" ? state.reviewSession : null;
                const reviewQuestions = Array.isArray(reviewSession?.questions) && reviewSession.questions.length ? reviewSession.questions : null;
                if (nextMode === "learn" && reviewQuestions) {
                    state.session = createSession(subject, chapter, nextMode, {
                        questions: reviewQuestions,
                        chapterTitle: reviewSession.chapterTitle || chapter.title,
                        reviewLabel: reviewSession.reviewLabel || "Missed questions",
                        reviewSource: reviewSession.reviewSource || "quiz"
                    });
                    state.session.reviewLabel = reviewSession.reviewLabel || "Missed questions";
                    state.session.reviewSource = reviewSession.reviewSource || "quiz";
                } else {
                    if (nextMode !== "learn" || (reviewSession && !reviewQuestions)) {
                        state.reviewSession = null;
                        clearReviewSession();
                    }

                    const restored = restoreModeSession(subject, chapter, nextMode);
                    if (restored) {
                        state.session = restored;
                    } else {
                        clearModeSession(nextMode);
                        state.session = createSession(subject, chapter, nextMode, {});
                    }
                }
            }
        }
        syncSelection(subject.id, chapter.title, nextMode);
        renderModeSwitcher();
        renderHeader();
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
        if (nextMode !== "quiz") {
            renderAssessmentPlaceholder(elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent);
        }
    };

    const advanceSession = () => {
        const session = state.session;
        if (!session) {
            return;
        }

        cancelLearnAutoAdvance();
        const shouldSlideLearnQuestion = session.mode === "learn" && session.learnTransitioning;
        session.learnTransitioning = false;
        session.learnSlideNext = shouldSlideLearnQuestion;

        session.index += 1;
        session.selectedChoice = null;
        session.typedAnswer = "";
        session.revealed = false;
        session.reviewed = false;
        session.busy = false;
        session.lastResult = null;

        if (session.index >= session.questions.length) {
            session.complete = true;
            session.currentSummary = summarizeResults(session);
            recordSessionProgress(session);
        }

        if (["quiz", "learn", "flashcards"].includes(session.mode)) {
            saveModeSession(session);
        }

        if (session.complete) {
            renderAssessment(session.currentSummary, session, elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent, startSession);
        }

        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
        renderHeader();
    };

    const submitCurrentQuestion = (extra = {}) => {
        const session = state.session;
        const question = session?.questions?.[session.index];
        if (!session || !question || session.busy) {
            return;
        }

        if (session.mode === "learn" && session.reviewed) {
            advanceSession();
            return;
        }

        session.busy = true;
        const answer = getAnswerForQuestion(question, session);
        const correct = extra.correct !== undefined ? extra.correct : isQuestionCorrect(question, answer);
        const result = buildQuestionResult(question, session, answer, correct);

        if (session.mode === "learn") {
            session.answers[session.index] = result;
            session.reviewed = true;
            session.lastResult = result;
            session.busy = false;
            if (result.correct) {
                session.learnFirstAttemptCorrectCount += 1;
            }

            const completedCount = session.index + 1;
            const isCheckpoint = completedCount % LEARN_BATCH_SIZE === 0 || completedCount >= session.questions.length;
            if (isCheckpoint) {
                cancelLearnAutoAdvance();
                activateLearnCheckpoint(session, completedCount);
                saveModeSession(session);
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            } else {
                session.learnTransitioning = true;
                saveModeSession(session);
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
                learnAutoAdvanceTimer = setTimeout(() => {
                    learnAutoAdvanceTimer = null;
                    if (state.session === session && session.mode === "learn" && session.learnTransitioning && !session.learnCheckpointActive) {
                        advanceSession();
                    }
                }, LEARN_AUTO_ADVANCE_MS);
            }
            renderHeader();
            return;
        }

        if (extra.advanceImmediately || session.mode === "flashcards") {
            session.answers[session.index] = result;
            session.busy = false;
            advanceSession();
            return;
        }

        if (!session.reviewed) {
            session.answers[session.index] = result;
            session.reviewed = true;
            session.lastResult = result;
            saveModeSession(session);
            session.busy = false;
            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            renderHeader();
            return;
        }

        session.busy = false;
        advanceSession();
    };

    function selectSubject(subjectId, chapterTitle = "") {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject) {
            return;
        }

        state.activeSubject = subject;
        const nextChapterTitle = text(chapterTitle || subject.selectedChapter || subject.chapters[0]?.title || "");
        state.activeChapter = getUsableChapter(subject, nextChapterTitle) || subject.chapters[0] || null;

        state.drawerExpandedSubjectId = subject.id;
        state.reviewSession = null;
        clearReviewSession();
        syncSelection(subject.id, state.activeChapter?.title || "", state.mode);

        renderDrawer();
        renderChapters();
        startSession(state.mode);
    }

    function selectChapter(chapterTitle) {
        const subject = state.activeSubject;
        if (!subject) {
            return;
        }

        const chapter = getChapterByTitle(subject, chapterTitle);
        if (!chapter) {
            return;
        }

        state.activeChapter = chapter;

        state.drawerExpandedSubjectId = subject.id;
        state.reviewSession = null;
        clearReviewSession();
        syncSelection(subject.id, chapter.title, state.mode);

        renderDrawer();
        renderChapters();
        startSession(state.mode);
    }

    function toggleSubject(subjectId) {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject) {
            return;
        }

        if (state.activeSubject?.id === subject.id) {
            state.drawerExpandedSubjectId = state.drawerExpandedSubjectId === subject.id ? "" : subject.id;
            renderDrawer();
            return;
        }

        selectSubject(subject.id);
    }

    const renderAll = () => {
        renderModeSwitcher();
        renderDrawer();
        renderChapters();
        renderHeader();
        buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
    };

    elements.drawerOpen?.addEventListener("click", openDrawer);
    elements.drawerClose?.addEventListener("click", closeDrawer);
    elements.backdrop?.addEventListener("click", closeDrawer);
    elements.subjectSelect?.addEventListener("change", (event) => selectSubject(event.target.value));
    const refresh = async () => {
        const fresh = await storageSelectState();

        state.subjects = fresh.subjects;
        state.activeSubject = fresh.activeSubject;
        state.activeChapter = fresh.activeChapter;
        state.mode = mode;
        state.drawerExpandedSubjectId = state.activeSubject?.id || "";
        if (state.mode !== "learn") {
            state.reviewSession = null;
            clearReviewSession();
        }
        syncSelection(state.activeSubject?.id || "", state.activeChapter?.title || "", state.mode);
        renderAll();
        startSession(mode);
    };

    elements.refresh?.addEventListener("click", async () => {
        try {
            if (mode === "quiz") {
                clearQuizSession();
            }

            // Clear learn/flashcards sessions so refresh shows a fresh state
            if (mode === "learn") {
                clearReviewSession();
                clearModeSession("learn");
            }
            if (mode === "flashcards") {
                clearModeSession("flashcards");
            }

            await refresh();
        } catch (err) {
            // If something goes wrong (e.g. fetch failure), fall back to a full reload
            console.error("Refresh failed:", err);
            location.reload();
        }
    });

    elements.modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const nextMode = button.dataset.mode || mode;
            if (nextMode !== "learn") {
                state.reviewSession = null;
                clearReviewSession();
            }
            syncSelection(state.activeSubject?.id || "", state.activeChapter?.title || "", nextMode);
            window.location.href = pageMap[nextMode] || "quiz.html";
        });
    });

    await refresh();

    window.addEventListener("storage", async (event) => {
        if ([STORAGE_KEY, ACTIVE_SUBJECT_KEY, ACTIVE_CHAPTER_KEY, ACTIVE_MODE_KEY].includes(event.key)) {
            await refresh();

        }
    });

    window.addEventListener("resize", syncDrawerVisibility);
    document.addEventListener("fullscreenchange", syncDrawerVisibility);
    syncDrawerVisibility();
}

export function initAdminPage() {
    if (!document.body.classList.contains("admin-page")) {
        return;
    }

    const lockForm = document.getElementById("admin-lock-form");
    const passwordInput = document.getElementById("admin-password");
    const lockStatus = document.getElementById("admin-lock-status");
    const lockPanel = document.getElementById("admin-lock-panel");
    const adminApp = document.getElementById("admin-app");
    const uploadForm = document.getElementById("upload-form");
    const previewButton = document.getElementById("preview-button");
    const fileInput = document.getElementById("quiz-file");
    const subjectInput = document.getElementById("subject-name");
    const previewStatus = document.getElementById("upload-status");
    const previewContent = document.getElementById("preview-content");

    if (!lockForm || !lockPanel || !adminApp || !uploadForm || !previewButton || !fileInput || !subjectInput) {
        return;
    }

    if (isAdminUnlocked()) {
        lockPanel.hidden = true;
        adminApp.hidden = false;
    }

    const renderPreview = async () => {
        const file = fileInput.files?.[0];
        if (!file || !previewStatus || !previewContent) {
            return null;
        }

        const quiz = await previewQuizFile(file, subjectInput.value);
        const chapterCount = quiz.chapters.length;
        const questionCount = quiz.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
        previewStatus.textContent = `${chapterCount} chapters • ${questionCount} questions`;
        previewContent.replaceChildren();

        const summary = document.createElement("div");
        summary.className = "assessment-block";
        summary.append(
            Object.assign(document.createElement("p"), { textContent: `Subject: ${quiz.subject}` }),
            Object.assign(document.createElement("p"), { textContent: `Selected chapter: ${quiz.selected_chapter}` }),
            Object.assign(document.createElement("p"), { textContent: `Quiz type: ${quiz.quiz_type}` })
        );

        const chapterList = document.createElement("div");
        chapterList.className = "review-list";
        quiz.chapters.forEach((chapter) => {
            const chapterCard = document.createElement("article");
            chapterCard.className = "review-item";
            chapterCard.append(
                Object.assign(document.createElement("h5"), { textContent: chapter.title }),
                Object.assign(document.createElement("p"), { textContent: `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}` })
            );
            chapterList.appendChild(chapterCard);
        });

        previewContent.append(summary, chapterList);
        return quiz;
    };

    lockForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (text(passwordInput.value) === ADMIN_PASSWORD) {
            setAdminUnlocked();
            lockStatus.textContent = "";
            lockPanel.hidden = true;
            adminApp.hidden = false;
            passwordInput.value = "";
            return;
        }
        lockStatus.textContent = "Wrong password. Try again.";
    });

    previewButton.addEventListener("click", async () => {
        try {
            await renderPreview();
        } catch (error) {
            if (previewStatus) {
                previewStatus.textContent = "Invalid file";
            }
            if (previewContent) {
                previewContent.replaceChildren();
                const errorBox = document.createElement("div");
                errorBox.className = "empty-state compact";
                errorBox.append(
                    Object.assign(document.createElement("h4"), { textContent: "Could not parse this file" }),
                    Object.assign(document.createElement("p"), { textContent: error.message || "The JSON file does not match the quiz format." })
                );
                previewContent.appendChild(errorBox);
            }
        }
    });

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = fileInput.files?.[0];
        if (!file) {
            return;
        }

        try {
            const quiz = await renderPreview();
            if (!quiz) {
                return;
            }
            const subjectRecord = createSubjectRecord(quiz, subjectInput.value || quiz.subject);
            const subjects = saveSubjects([...loadSubjects().filter((subject) => subject.id !== subjectRecord.id), subjectRecord]);
            syncSelection(subjectRecord.id, subjectRecord.selectedChapter, "quiz");
            previewStatus.textContent = "Saved to browser";
            uploadForm.reset();
            subjectInput.value = subjectRecord.name;
            if (previewContent) {
                previewContent.replaceChildren();
                previewContent.appendChild(
                    Object.assign(document.createElement("div"), {
                        className: "empty-state compact",
                        innerHTML: "<h4>Saved successfully</h4><p>The subject is now available in the home carousel and mode pages.</p>"
                    })
                );
            }
            return subjects;
        } catch {
            return;
        }
    });
}



