export const STORAGE_KEY = "prepcore.web.subjects.v1";
export const ACTIVE_SUBJECT_KEY = "prepcore.web.activeSubject.v1";
export const ACTIVE_CHAPTER_KEY = "prepcore.web.activeChapter.v1";
export const ACTIVE_MODE_KEY = "prepcore.web.activeMode.v1";
export const REVIEW_SESSION_KEY = "prepcore.web.reviewSession.v1";
export const QUIZ_SESSION_KEY = "prepcore.web.quizSession.v1";
export const PROGRESS_HISTORY_KEY = "prepcore.web.progressHistory.v1";
export const ADMIN_UNLOCK_KEY = "prepcore.web.adminUnlocked.v1";
export const ADMIN_PASSWORD = "prepcore";
const SUBJECTS_PATH = "./subjects.json";
const VALID_MODES = new Set(["quiz", "learn", "flashcards", "exam"]);
const SUBJECTS_CACHE_KEY = "prepcore.web.subjectsCache.v1";
const CHAPTER_CACHE_KEY = "prepcore.web.chapterCache.v1";
const LEARN_SESSION_KEY = "prepcore.web.learnSession.v1";
const FLASHCARDS_SESSION_KEY = "prepcore.web.flashcardsSession.v1";
const MODE_SESSION_KEYS = {
    quiz: QUIZ_SESSION_KEY,
    learn: LEARN_SESSION_KEY,
    flashcards: FLASHCARDS_SESSION_KEY
};

const text = (value) => String(value ?? "").trim();

function shuffleArray(values) {
    const next = [...values];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
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

    session.questions = shuffledEntries.map((entry) => entry.question);
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
    }

    if (result) {
        session.progressRecorded = true;
        if (session.mode === "quiz") {
            saveQuizSession(session);
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
        && text(entry.summaryType) === "session"
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

    entries.forEach((entry) => {
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

    return {
        id: text(entry.id) || slugify(name),
        name,
        quizType: text(entry.quizType || entry.quiz_type || "short_quiz"),
        schemaVersion: Number(entry.schemaVersion || entry.schema_version || 1),
        selectedChapter: text(entry.selectedChapter || entry.selected_chapter || chapters[0]?.title || ""),
        chapters,
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

export function saveSubjects(subjects) {
    return normalizeSubjectCollection(subjects);
}

export function serializeSubjects(subjects) {
    const normalizedSubjects = saveSubjects(subjects);
    const chapterData = {};
    const exportSubjects = normalizedSubjects.map((subject) => ({
        ...subject,
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

export function tallyQuestionCount(subject) {
    return subject.chapters.reduce((sum, chapter) => sum + collectChapterQuestions(chapter).length, 0);
}

export function createSession(subject, chapter, mode, options = {}) {
    const questionsSource = Array.isArray(options.questions) && options.questions.length
        ? options.questions
        : collectChapterQuestions(chapter);
    const questions = questionsSource.map((question, index) => coerceQuestion(question, index + 1));
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
        reviewSource: text(options.reviewSource)
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
            const normalizedQuestion = coerceQuestion(question, index + 1);
            questionPool.push({
                ...normalizedQuestion,
                chapterTitle: chapter.title
            });
        });
    });

    const questions = shuffleArray(questionPool)
        .slice(0, Math.max(1, Math.min(Number(questionCount) || 1, questionPool.length)));

    return {
        subjectId: subject.id,
        subjectName: subject.name,
        chapterTitle: text(options.chapterTitle || (selectedChapters[0] || subject.chapters[0]?.title || "Exam")),
        mode: "exam",
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

    const session = createSession(subject, chapter, "quiz");
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
        reviewSource: text(session.reviewSource)
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
        reviewSource: saved.reviewSource
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
    sessionSet(ADMIN_UNLOCK_KEY, true);
}

export function isAdminUnlocked() {
    return sessionGet(ADMIN_UNLOCK_KEY, false);
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

export function textValue(value) {
    return text(value);
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

        card.append(title, meta, actions);
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

function countAnsweredQuestions(session) {
    return session?.answers?.filter((entry) => Boolean(entry)).length || 0;
}

function renderProgress(fill, session) {
    if (!session || session.questions.length === 0) {
        fill.style.width = "0%";
        return;
    }

    const current = session.mode === "quiz" || session.mode === "exam"
        ? countAnsweredQuestions(session)
        : session.index;
    const percent = session.complete ? 100 : Math.round((current / session.questions.length) * 100);
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

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

function renderAssessment(summary, session, title, score, content, startSession) {
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
                label.append(checkbox, document.createTextNode(chapterEntry.title));
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
                    question.choices.forEach((choice, choiceIndex) => {
                        const choiceButton = document.createElement("button");
                        choiceButton.type = "button";
                        choiceButton.className = "choice-button";
                        const label = choiceIndex < 26 ? String.fromCharCode(65 + choiceIndex) : String(choiceIndex + 1);
                        choiceButton.textContent = `${label}. ${choice}`;
                        if (result?.userAnswerIndex === choiceIndex) {
                            choiceButton.classList.add("is-selected");
                        }
                        choiceButton.addEventListener("click", (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            updateReviewAnswer(question, index, choiceIndex);
                            buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage, examSubmitter);
                        });
                        choices.appendChild(choiceButton);
                    });
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
            textContent: `Question ${session.index + 1} of ${session.questions.length}`
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
            question.choices.forEach((choice, index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "choice-button";
                button.textContent = choice;
                if (session.selectedChoice === index) {
                    button.classList.add("is-selected");
                }
                button.addEventListener("click", () => {
                    session.selectedChoice = index;
                    session.drafts[session.index] = String(index);
                    buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
                });
                choices.appendChild(button);
            });
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
    card.className = "question-card";
    if (session.mode === "learn" && session.reviewed && session.lastResult) {
        card.classList.add("learn-question-card", session.lastResult.correct ? "is-correct" : "is-wrong");
    }

    const header = document.createElement("div");
    header.className = "question-card-header";
    header.append(
        Object.assign(document.createElement("div"), { className: "question-counter-inline", textContent: `Question ${session.index + 1} of ${session.questions.length}` }),
        Object.assign(document.createElement("div"), { className: "mode-badge", textContent: `${capitalize(session.mode)} mode` })
    );

    const questionText = document.createElement("h4");
    questionText.textContent = question.question;

    const hint = document.createElement("p");
    hint.className = "question-hint";
    hint.textContent = question.questionType === "numeric"
        ? session.mode === "learn"
            ? "Answer the question, then read the explanation before moving on."
            : "Enter a number and submit your answer."
        : session.mode === "flashcards"
            ? "Reveal the answer, then mark whether you knew it."
            : session.mode === "learn"
                ? "Choose an answer, then study the explanation before continuing."
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
            feedback.appendChild(createFeedbackCard(session.lastResult, { includeExplanation: false }));
            if (session.mode === "learn") {
                appendLearnExplanation(feedback, session.lastResult);
            }
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

        form.append(input, button);
        answerArea.append(form, feedback);
        } else {
            const choices = document.createElement("div");
            choices.className = "choice-grid";
            question.choices.forEach((choice, index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "choice-button";
                const label = index < 26 ? String.fromCharCode(65 + index) : String(index);
                button.textContent = `${label}. ${choice}`;
                button.disabled = session.reviewed;
                if (session.selectedChoice === index) {
                    button.classList.add("is-selected");
                }
                if (session.reviewed && session.lastResult) {
                    if (index === question.answerIndex) {
                        button.classList.add("is-correct");
                    }
                    if (Number(session.lastResult.userAnswerIndex) === index && !session.lastResult.correct) {
                        button.classList.add("is-wrong");
                    }
                }
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    session.selectedChoice = index;
                    submitCurrentQuestion();
                });
                choices.appendChild(button);
        });

        const feedback = document.createElement("div");
        feedback.className = "feedback-block";
        if (session.reviewed && session.lastResult) {
            feedback.appendChild(createFeedbackCard(session.lastResult, { includeExplanation: false }));
            if (session.mode === "learn") {
                appendLearnExplanation(feedback, session.lastResult);
            }
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
                    className: "learn-note",
                    textContent: "Read the explanation, lock in the correct answer, then continue."
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
    stage.appendChild(card);
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
        exam: "exam.html"
    };

    const elements = {
        title: document.getElementById("subject-title"),
        meta: document.getElementById("subject-meta"),
        carousel: document.getElementById("home-subject-carousel"),
        prev: document.getElementById("home-carousel-prev"),
        next: document.getElementById("home-carousel-next"),
        refresh: document.getElementById("refresh-button"),
        progress: document.getElementById("progress-button"),
        modeLinks: document.querySelectorAll("[data-home-mode]")
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
            button.classList.toggle("is-active", button.dataset.homeMode === state.mode);
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

    const render = () => {

        if (elements.title) {
            elements.title.textContent = state.activeSubject ? state.activeSubject.name : "Upload a quiz to begin";
        }
        if (elements.meta) {
            elements.meta.textContent = state.activeSubject
                ? `${state.activeSubject.chapters.length} chapter${state.activeSubject.chapters.length === 1 ? "" : "s"} • ${tallyQuestionCount(state.activeSubject)} questions loaded from subjects.json.`
                : "This GitHub Pages version loads subjects from subjects.json.";

        }

        renderModeLinks();

        if (elements.carousel) {
            renderHomeCarousel(elements.carousel, state.subjects, state.activeSubject?.id || "", (subjectId) => {
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

    const refresh = async () => {
        const fresh = await storageSelectState();

        state.subjects = fresh.subjects;
        state.activeSubject = fresh.activeSubject;
        state.activeChapter = fresh.activeChapter;
        state.mode = fresh.mode;
        render();
    };

    await refresh();

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
        const progressEntries = getProgressEntries().filter((entry) => text(entry.mode) === "quiz" || text(entry.mode) === "exam");
        const quizAttempts = progressEntries.filter((entry) => text(entry.mode) === "quiz" && text(entry.summaryType) === "session");
        const examAttempts = progressEntries.filter((entry) => text(entry.mode) === "exam" && text(entry.summaryType) === "session");
        summaryCards.replaceChildren(
            createAccuracyAttemptChartCard(quizAttempts, examAttempts),
            createProgressSummaryCard("Quiz accuracy", quizSummary, "Recent quiz performance across the last 7 days."),
            createProgressSummaryCard("Exam accuracy", examSummary, "Recent exam performance across the last 7 days.")
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
        exam: "exam.html"
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
                    elements.counter.textContent = `Question ${state.session.index + 1} of ${state.session.questions.length}`;
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
        counter.textContent = `Question ${index + 1} of ${session.questions.length}`;

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

            question.choices.forEach((choice, choiceIndex) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "choice-button";
                button.textContent = choice;
                button.disabled = answered;

                if (answered) {
                    if (choiceIndex === question.answerIndex) {
                        button.classList.add("is-correct");
                    }
                    if (Number(result.userAnswerIndex) === choiceIndex) {
                        button.classList.add(result.correct ? "is-correct" : "is-wrong");
                    }
                }

                button.addEventListener("click", () => submitQuizAnswer(index, question, choiceIndex));
                choices.appendChild(button);
            });

            answerArea.appendChild(choices);
        }

        const feedback = document.createElement("div");
        feedback.className = "feedback-block";
        if (answered) {
            feedback.appendChild(createFeedbackCard(result, { includeExplanation: false }));
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
        renderProgress(progressFill, session);
    };

    const startSession = (nextMode = state.mode) => {
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

        session.busy = true;
        const answer = getAnswerForQuestion(question, session);
        const correct = extra.correct !== undefined ? extra.correct : isQuestionCorrect(question, answer);
        const result = buildQuestionResult(question, session, answer, correct);

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

    elements.refresh?.addEventListener("click", () => {
        if (mode === "quiz") {
            clearQuizSession();
        }
        refresh();
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



