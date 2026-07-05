export const STORAGE_KEY = "prepcore.web.subjects.v1";
export const ACTIVE_SUBJECT_KEY = "prepcore.web.activeSubject.v1";
export const ACTIVE_CHAPTER_KEY = "prepcore.web.activeChapter.v1";
export const ACTIVE_MODE_KEY = "prepcore.web.activeMode.v1";
export const REVIEW_SESSION_KEY = "prepcore.web.reviewSession.v1";
export const ADMIN_UNLOCK_KEY = "prepcore.web.adminUnlocked.v1";
export const ADMIN_PASSWORD = "prepcore";
const SUBJECTS_PATH = "./subjects.json";

const text = (value) => String(value ?? "").trim();

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
    return text(value)
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\r\n?/g, "\n");
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
                if (Array.isArray(payload)) {
                    return {
                        title: text(entry.title || entry.chapter || entry.name || "Imported"),
                        questions: collectQuestionEntries(payload),
                        file
                    };
                }

                if (payload && typeof payload === "object") {
                    return {
                        title: text(payload.title || payload.chapter || payload.name || entry.title || entry.chapter || entry.name || "Imported"),
                        questions: collectQuestionEntries(payload.questions ?? payload.questionList ?? payload.items ?? payload.question ?? payload.rows ?? payload.cards),
                        file
                    };
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

        return resolvedSubjects.sort((left, right) => text(left.name).localeCompare(text(right.name)));
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
        reviewLabel: text(options.reviewLabel),
        reviewSource: text(options.reviewSource)
    };
}

export function buildQuestionResult(question, session, answer, correct) {
    const userAnswerIndex = question.questionType === "multiple_choice" ? Number(answer) : null;
    const userAnswer = question.questionType === "multiple_choice"
        ? question.choices?.[Number(answer)] ?? (answer === null || answer === undefined ? "" : String(answer))
        : answer === null || answer === undefined ? "" : String(answer);

    return {
        questionText: question.question,
        chapterTitle: session.chapterTitle,
        correctAnswer: question.answerText,
        userAnswer,
        userAnswerIndex,
        correct,
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
    missed.forEach((entry) => {
        const tags = entry.tags && entry.tags.length ? entry.tags : [entry.chapterTitle || "Untagged"];
        tags.forEach((tag) => {
            weakAreaCounts.set(tag, (weakAreaCounts.get(tag) || 0) + 1);
        });
    });

    const weakAreas = [...weakAreaCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

    return { correctCount, total, accuracy, missed, weakAreas };
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
        meta.textContent = `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"} â€¢ ${tallyQuestionCount(subject)} questions`;

        const tags = document.createElement("div");
        tags.className = "subject-carousel-tags";
        subject.chapters.slice(0, 3).forEach((chapter) => {
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = chapter.title;
            tags.appendChild(pill);
        });

        const actions = document.createElement("div");
        actions.className = "subject-carousel-actions";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary-button";
        button.textContent = subject.id === activeSubjectId ? "Selected" : "Select subject";
        button.disabled = subject.id === activeSubjectId;
        button.addEventListener("click", () => selectSubject(subject.id));
        actions.appendChild(button);

        card.addEventListener("click", (event) => {
            if (event.target === button) {
                return;
            }
            selectSubject(subject.id);
        });

        card.append(title, meta, tags, actions);
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
        caret.textContent = "â–¾";
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

    const current = session.mode === "quiz" ? countAnsweredQuestions(session) : session.index;
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
        ? "Nice work â€” that one is locked in."
        : `You answered ${text(result.userAnswer) || "nothing"}; keep this one in review.`;

    wrapper.append(title, answer, details);

    const explanationText = formatExplanationText(result.explanation || result.explaination);
    if (explanationText && options.includeExplanation !== false) {
        const explanationLabel = document.createElement("strong");
        explanationLabel.className = "feedback-explanation-label";
        explanationLabel.textContent = "Explanation";

        const explanation = document.createElement("p");
        explanation.className = "feedback-explanation";
        explanation.textContent = explanationText;
        explanation.style.whiteSpace = "pre-wrap";
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

    const body = document.createElement("p");
    body.textContent = explanationText;
    body.style.whiteSpace = "pre-wrap";

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
        meta.textContent = `${Math.max(0, Number(segment.value) || 0)}${segment.meta ? ` â€¢ ${segment.meta}` : ""}`;

        item.append(copy, meta);
        legend.appendChild(item);
    });

    chartPanel.append(chart, legend);
    chartCard.append(chartPanel);
    return chartCard;
}

function renderAssessment(summary, session, title, score, content, startSession) {
    title.textContent = `Results for ${session.chapterTitle}`;
    score.textContent = `${summary.accuracy}% â€¢ ${summary.correctCount}/${summary.total}`;
    content.replaceChildren();

    const scoreCard = document.createElement("div");
    scoreCard.className = "assessment-score-card";
    scoreCard.append(
        Object.assign(document.createElement("h4"), { textContent: `${summary.correctCount} correct out of ${summary.total}` }),
        Object.assign(document.createElement("p"), { textContent: `Accuracy: ${summary.accuracy}%` }),
        createAssessmentChart(
            [
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
            ],
            `${summary.accuracy}%`,
            "Accuracy",
            `Accuracy breakdown: ${summary.correctCount} correct and ${summary.missed.length} missed.`
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

    const reviewCard = document.createElement("div");
    reviewCard.className = "assessment-block";
    reviewCard.appendChild(Object.assign(document.createElement("h4"), { textContent: "Missed questions" }));
    if (!summary.missed.length) {
        reviewCard.appendChild(Object.assign(document.createElement("p"), { textContent: "Perfect session â€” nothing to review." }));
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

    content.append(scoreCard, weakCard, reviewCard, actions);
}

function renderAssessmentPlaceholder(title, score, content) {
    title.textContent = "Your results will appear here after each session.";
    score.textContent = "Pending";
    content.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty-state compact";
    empty.append(
        Object.assign(document.createElement("h4"), { textContent: "Nothing to review yet" }),
        Object.assign(document.createElement("p"), { textContent: "Complete a chapter to see score, missed questions, and weak areas." })
    );
    content.appendChild(empty);
}

function buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage) {
    const { stage, progressFill } = elements;
    stage.replaceChildren();

    const subject = state.activeSubject;
    const chapter = state.activeChapter;
    const session = state.session;

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
        if (beforeSession !== state.session) {
            renderHeader();
        }
        return;
    }

    if (session.complete) {
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
        renderProgress(progressFill, session);
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
            revealButton.addEventListener("click", () => {
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
            flipBackButton.addEventListener("click", () => {
                session.flashcardTransition = "hide";
                session.revealed = false;
                buildModeQuestionStage(state, elements, selectSubject, selectChapter, startSession, advanceSession, submitCurrentQuestion, renderQuizSheetStage);
            });

            const reviewButton = document.createElement("button");
            reviewButton.type = "button";
            reviewButton.className = "ghost-button";
            reviewButton.textContent = "Review later";
            reviewButton.addEventListener("click", () => submitCurrentQuestion({ correct: false, advanceImmediately: true }));
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
                button.textContent = `${index + 1}. ${choice}`;
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
                button.addEventListener("click", () => {
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
        flashcards: "flashcards.html"
    };

    const elements = {
        title: document.getElementById("subject-title"),
        meta: document.getElementById("subject-meta"),
        carousel: document.getElementById("home-subject-carousel"),
        prev: document.getElementById("home-carousel-prev"),
        next: document.getElementById("home-carousel-next"),
        refresh: document.getElementById("refresh-button"),
        modeLinks: document.querySelectorAll("[data-home-mode]")
    };

    const state = {
        subjects: [],
        activeSubject: null,
        activeChapter: null,
        mode: "quiz"
    };


    const renderModeLinks = () => {
        elements.modeLinks.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.homeMode === state.mode);
        });
    };

    const render = () => {

        if (elements.title) {
            elements.title.textContent = state.activeSubject ? state.activeSubject.name : "Upload a quiz to begin";
        }
        if (elements.meta) {
            elements.meta.textContent = state.activeSubject
                ? `${state.activeSubject.chapters.length} chapter${state.activeSubject.chapters.length === 1 ? "" : "s"} â€¢ ${tallyQuestionCount(state.activeSubject)} questions loaded from subjects.json.`
                : "This GitHub Pages version loads subjects from subjects.json.";

        }

        renderModeLinks();

        if (elements.carousel) {
            renderHomeCarousel(elements.carousel, state.subjects, state.activeSubject?.id || "", (subjectId) => {
                state.activeSubject = getSubjectById(state.subjects, subjectId);
                state.activeChapter = state.activeSubject ? getUsableChapter(state.activeSubject, state.activeSubject.selectedChapter || state.activeSubject.chapters[0]?.title || "") : null;
                syncSelection(state.activeSubject?.id || "", state.activeChapter?.title || "", state.mode);
                render();
            });
        }
    };

    const refresh = async () => {
        const fresh = await storageSelectState();

        state.subjects = fresh.subjects;
        state.activeSubject = fresh.activeSubject;
        state.activeChapter = fresh.activeChapter;
        state.mode = fresh.mode;
        render();
    await refresh();

    window.addEventListener("storage", async (event) => {
        if ([STORAGE_KEY, ACTIVE_SUBJECT_KEY, ACTIVE_CHAPTER_KEY, ACTIVE_MODE_KEY].includes(event.key)) {
            await refresh();

        }
    });
}

export async function initModePage(mode) {

    if (!document.body.classList.contains("mode-page")) {
        return;
    }

    const pageMap = {
        quiz: "quiz.html",
        learn: "learn.html",
        flashcards: "flashcards.html"
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
        refresh: document.getElementById("refresh-button")
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
            elements.meta.textContent = `${chapterCount} chapter${chapterCount === 1 ? "" : "s"} â€¢ ${questionCount} question${questionCount === 1 ? "" : "s"} loaded from subjects.json.`;

        }
        if (elements.summaryPill) {
            elements.summaryPill.textContent = `${chapterCount} chapters â€¢ ${questionCount} questions`;
        }
        if (elements.chapterTitle) {
            elements.chapterTitle.textContent = chapter ? chapter.title : "No chapter selected";
        }
        if (elements.chapterSubtitle) {
            if (state.session?.reviewLabel) {
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
                elements.counter.textContent = `Question ${state.session.index + 1} of ${state.session.questions.length}`;
            } else if (state.session && state.session.complete) {
                elements.counter.textContent = "Quiz complete";
            } else {
                elements.counter.textContent = "Ready to start";
            }
        }
    };

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
            feedback.appendChild(createFeedbackCard(result));
        } else {
            feedback.appendChild(Object.assign(document.createElement("p"), {
                className: "answer-hint",
                textContent: question.questionType === "numeric"
                    ? "You can answer this row whenever youâ€™re ready."
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
            renderAssessment(session.currentSummary, session, elements.assessmentTitle, elements.assessmentScore, elements.assessmentContent, startSession);
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
        const reviewSession = nextMode === "learn" ? state.reviewSession : null;
        const reviewQuestions = Array.isArray(reviewSession?.questions) && reviewSession.questions.length ? reviewSession.questions : null;
        if (nextMode !== "learn" || (reviewSession && !reviewQuestions)) {
            state.reviewSession = null;
            clearReviewSession();
        }
        state.session = createSession(subject, chapter, nextMode, reviewQuestions ? {
            questions: reviewQuestions,
            chapterTitle: reviewSession.chapterTitle || chapter.title,
            reviewLabel: reviewSession.reviewLabel || "Missed questions",
            reviewSource: reviewSession.reviewSource || "quiz"
        } : {});
        if (reviewQuestions) {
            state.session.reviewLabel = reviewSession.reviewLabel || "Missed questions";
            state.session.reviewSource = reviewSession.reviewSource || "quiz";
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
        previewStatus.textContent = `${chapterCount} chapters â€¢ ${questionCount} questions`;
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



