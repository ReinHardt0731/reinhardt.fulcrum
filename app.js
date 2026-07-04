(() => {
    const STORAGE_KEY = "prepcore.web.subjects.v1";
    const ACTIVE_SUBJECT_KEY = "prepcore.web.activeSubject.v1";
    const ACTIVE_CHAPTER_KEY = "prepcore.web.activeChapter.v1";
    const ACTIVE_MODE_KEY = "prepcore.web.activeMode.v1";
    const ADMIN_UNLOCK_KEY = "prepcore.web.adminUnlocked.v1";
    const ADMIN_PASSWORD = "prepcore";

    const SAMPLE_QUIZ = {
        schema_version: 1,
        quiz_type: "short_quiz",
        subject: "Aviation Basics",
        selected_chapter: "Forces in Flight",
        chapters: [
            {
                title: "Forces in Flight",
                questions: [
                    {
                        question: "What force opposes thrust?",
                        choices: ["Lift", "Weight", "Drag", "Gravity"],
                        answer_index: 2,
                        answer_text: "Drag",
                        explanation: "Drag resists forward motion through the air.",
                        tags: ["aerodynamics", "forces"]
                    },
                    {
                        question: "Which force keeps an aircraft up?",
                        choices: ["Lift", "Drag", "Weight", "Yaw"],
                        answer_index: 0,
                        answer_text: "Lift",
                        explanation: "Lift acts upward and balances weight in steady flight.",
                        tags: ["aerodynamics", "forces"]
                    }
                ]
            },
            {
                title: "Controls",
                questions: [
                    {
                        question: "Which control mainly changes roll?",
                        choices: ["Ailerons", "Elevator", "Rudder", "Flaps"],
                        answer_index: 0,
                        answer_text: "Ailerons",
                        explanation: "Ailerons control roll by changing lift on each wing.",
                        tags: ["controls"]
                    },
                    {
                        question: "How many degrees are in a full circle?",
                        question_type: "numeric",
                        expected_answer: 360,
                        answer_text: "360",
                        explanation: "A full turn is 360 degrees.",
                        tags: ["math", "angles"]
                    }
                ]
            }
        ]
    };

    const state = {
        subjects: [],
        activeSubjectId: "",
        activeChapterTitle: "",
        mode: "quiz",
        session: null,
        publicUi: null,
        adminUi: null
    };

    const text = (value) => String(value ?? "").trim();
    const slugify = (value) =>
        text(value)
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "subject";

    const readJson = (raw) => JSON.parse(raw);

    const safeParse = (raw, fallback) => {
        try {
            return readJson(raw);
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

    function normalizeTags(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.map((entry) => text(entry)).filter(Boolean);
    }

    function formatNumericAnswer(value) {
        if (value === null || value === undefined || value === "") {
            return "";
        }
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue)) {
            return text(value);
        }
        return Number.isInteger(numberValue) ? String(numberValue) : String(numberValue);
    }

    function parseNumericAnswer(entry) {
        const candidates = [
            entry?.expected_answer,
            entry?.numeric_answer,
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

    function normalizeQuestion(entry, position) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error(`Question ${position} must be an object.`);
        }

        const question = text(entry.question);
        if (!question) {
            throw new Error(`Question ${position} is missing text.`);
        }

        const questionTypeRaw = text(
            entry.questionType
                || entry.question_type
                || (entry.expectedAnswer !== undefined || entry.expected_answer !== undefined || entry.numeric_answer !== undefined ? "numeric" : "multiple_choice")
        ).toLowerCase();
        const explanation = text(entry.explanation);
        const tags = normalizeTags(entry.tags);

        if (questionTypeRaw === "numeric") {
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

        const choicesSource = Array.isArray(entry.choices) ? entry.choices : [];
        const choices = choicesSource.map((choice) => text(choice)).filter(Boolean);
        if (choices.length < 2) {
            throw new Error(`Question ${position} needs at least two choices.`);
        }

        let answerIndex = Number.isInteger(Number(entry.answerIndex ?? entry.answer_index)) ? Number(entry.answerIndex ?? entry.answer_index) : -1;
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

    function normalizeChapter(entry, position) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error(`Chapter ${position} must be an object.`);
        }

        const title = text(entry.title || entry.chapter || entry.name);
        if (!title) {
            throw new Error(`Chapter ${position} is missing a title.`);
        }

        const questionsSource = Array.isArray(entry.questions) ? entry.questions : [];
        if (!questionsSource.length) {
            throw new Error(`Chapter "${title}" needs at least one question.`);
        }

        return {
            title,
            questions: questionsSource.map((question, index) => normalizeQuestion(question, index + 1))
        };
    }

    function normalizeQuizPayload(payload, subjectOverride = "") {
        if (!payload || typeof payload !== "object") {
            throw new Error("Quiz file must be a JSON object.");
        }

        let chaptersSource = [];
        if (Array.isArray(payload.chapters)) {
            chaptersSource = payload.chapters;
        } else if (Array.isArray(payload) && payload.length) {
            const firstEntry = payload[0];
            if (firstEntry && typeof firstEntry === "object" && !Array.isArray(firstEntry) && Array.isArray(firstEntry.questions)) {
                chaptersSource = payload;
            } else {
                const chapterTitle = text(payload.selected_chapter || payload.title || payload.chapter || subjectOverride || payload.subject || "Imported");
                chaptersSource = [
                    {
                        title: chapterTitle,
                        questions: payload
                    }
                ];
            }
        } else if (Array.isArray(payload.questions) && (payload.title || payload.chapter || payload.name)) {
            chaptersSource = [payload];
        }

        if (!chaptersSource.length) {
            throw new Error("Quiz file needs a chapters array with questions.");
        }

        const subject = text(subjectOverride || payload.subject);
        if (!subject) {
            throw new Error("Please provide a subject name.");
        }

        const quizType = text(payload.quiz_type || "short_quiz").toLowerCase();
        if (quizType && quizType !== "short_quiz") {
            throw new Error("This site only accepts short quiz files.");
        }

        const chapters = chaptersSource.map((chapter, index) => normalizeChapter(chapter, index + 1));
        const selectedChapter = text(payload.selected_chapter) || chapters[0].title;

        return {
            schema_version: 1,
            quiz_type: "short_quiz",
            subject,
            selected_chapter: selectedChapter,
            chapters
        };
    }

    function createSubjectRecord(rawQuiz, subjectOverride = "") {
        const quiz = normalizeQuizPayload(rawQuiz, subjectOverride);
        return {
            id: slugify(quiz.subject),
            name: quiz.subject,
            quizType: quiz.quiz_type,
            selectedChapter: quiz.selected_chapter,
            chapters: quiz.chapters,
            updatedAt: Date.now()
        };
    }

    function seedSubjectsIfNeeded() {
        const stored = storageGet(STORAGE_KEY, null);
        if (Array.isArray(stored) && stored.length) {
            return stored;
        }

        const sample = createSubjectRecord(SAMPLE_QUIZ, SAMPLE_QUIZ.subject);
        const subjects = [sample];
        storageSet(STORAGE_KEY, subjects);
        storageSet(ACTIVE_SUBJECT_KEY, sample.id);
        storageSet(ACTIVE_CHAPTER_KEY, sample.selectedChapter);
        return subjects;
    }

    function loadSubjects() {
        const stored = storageGet(STORAGE_KEY, null);
        if (Array.isArray(stored) && stored.length) {
            return stored.map((subject) => ({
                id: text(subject.id) || slugify(subject.name),
                name: text(subject.name) || "Untitled",
                quizType: text(subject.quizType || subject.quiz_type || "short_quiz"),
                selectedChapter: text(subject.selectedChapter || subject.selected_chapter),
                chapters: Array.isArray(subject.chapters)
                    ? subject.chapters.map((chapter, chapterIndex) => normalizeChapter(chapter, chapterIndex + 1))
                    : [],
                updatedAt: Number(subject.updatedAt) || Date.now()
            })).filter((subject) => subject.chapters.length).sort((left, right) => left.name.localeCompare(right.name));
        }

        return seedSubjectsIfNeeded();
    }

    function getSubjectById(subjectId) {
        return state.subjects.find((subject) => subject.id === subjectId) || state.subjects[0] || null;
    }

    function getChapterByTitle(subject, chapterTitle) {
        if (!subject) {
            return null;
        }
        return subject.chapters.find((chapter) => chapter.title === chapterTitle) || subject.chapters[0] || null;
    }

    function saveActiveSelection(subjectId, chapterTitle, mode) {
        storageSet(ACTIVE_SUBJECT_KEY, subjectId);
        storageSet(ACTIVE_CHAPTER_KEY, chapterTitle);
        storageSet(ACTIVE_MODE_KEY, mode);
    }

    function tallyQuestionCount(subject) {
        return subject.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
    }

    function buildSession(subject, chapter, mode) {
        const questions = chapter.questions.map((question) => ({ ...question }));
        return {
            subjectId: subject.id,
            subjectName: subject.name,
            chapterTitle: chapter.title,
            mode,
            questions,
            index: 0,
            answers: [],
            revealed: false,
            reviewed: false,
            busy: false,
            lastResult: null,
            selectedChoice: null,
            typedAnswer: "",
            complete: false,
            currentSummary: null
        };
    }

    function currentQuestion() {
        if (!state.session) {
            return null;
        }
        return state.session.questions[state.session.index] || null;
    }

    function buildQuestionResult(question, session, answer, correct) {
        return {
            questionText: question.question,
            chapterTitle: session.chapterTitle,
            correctAnswer: question.answerText,
            userAnswer: answer === null || answer === undefined ? "" : String(answer),
            correct,
            explanation: question.explanation,
            tags: question.tags
        };
    }

    function advanceQuestion() {
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
            renderAssessment(session.currentSummary, session);
        }

        renderQuestionStage();
    }

    function resetSession() {
        const subject = getSubjectById(state.activeSubjectId);
        if (!subject) {
            state.session = null;
            return;
        }

        const chapter = getChapterByTitle(subject, state.activeChapterTitle) || subject.chapters[0];
        if (!chapter) {
            state.session = null;
            return;
        }

        state.activeChapterTitle = chapter.title;
        saveActiveSelection(subject.id, chapter.title, state.mode);
        state.session = buildSession(subject, chapter, state.mode);
    }

    function getAnswerForQuestion(question, session) {
        if (question.questionType === "numeric") {
            const value = text(session.typedAnswer);
            return value ? Number(value) : null;
        }
        return session.selectedChoice;
    }

    function isQuestionCorrect(question, answer) {
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

    function summarizeResults(session) {
        const correctCount = session.answers.filter((entry) => entry.correct).length;
        const total = session.questions.length;
        const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
        const missed = session.answers.filter((entry) => !entry.correct);

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

        return {
            correctCount,
            total,
            accuracy,
            missed,
            weakAreas
        };
    }

    function submitCurrentQuestion(extra = {}) {
        const session = state.session;
        const question = currentQuestion();
        if (!session || !question) {
            return;
        }

        if (session.busy) {
            return;
        }
        session.busy = true;

        const answer = getAnswerForQuestion(question, session);
        const correct = extra.correct !== undefined ? extra.correct : isQuestionCorrect(question, answer);
        const result = buildQuestionResult(question, session, answer, correct);

        if (extra.advanceImmediately || session.mode === "flashcards") {
            session.answers[session.index] = result;
            advanceQuestion();
            session.busy = false;
            return;
        }

        if (!session.reviewed) {
            session.answers[session.index] = result;
            session.reviewed = true;
            session.lastResult = result;
            renderQuestionStage();
            session.busy = false;
            return;
        }

        advanceQuestion();
        session.busy = false;
    }

    function renderHeader() {
        const subject = getSubjectById(state.activeSubjectId);
        const title = document.getElementById("subject-title");
        const meta = document.getElementById("subject-meta");
        const summaryPill = document.getElementById("summary-pill");
        const chapterTitle = document.getElementById("chapter-title");
        const chapterSubtitle = document.getElementById("chapter-subtitle");
        const modeLabel = document.getElementById("mode-label");
        const counter = document.getElementById("question-counter");

        if (!title || !meta || !summaryPill || !chapterTitle || !chapterSubtitle || !modeLabel || !counter) {
            return;
        }

        if (!subject) {
            title.textContent = "Upload a quiz to begin";
            meta.textContent = "Open the hidden admin page to add quiz JSON, or keep the browser-local sample subject.";
            summaryPill.textContent = "No subject loaded";
            chapterTitle.textContent = "No chapter selected";
            chapterSubtitle.textContent = "Use the admin page to add your own subject banks.";
            modeLabel.textContent = "Quiz mode";
            counter.textContent = "Waiting for a subject";
            return;
        }

        const chapterCount = subject.chapters.length;
        const questionCount = tallyQuestionCount(subject);
        const chapter = getChapterByTitle(subject, state.activeChapterTitle);

        title.textContent = subject.name;
        meta.textContent = `${chapterCount} chapter${chapterCount === 1 ? "" : "s"} • ${questionCount} question${questionCount === 1 ? "" : "s"} stored in your browser.`;
        summaryPill.textContent = `${chapterCount} chapters • ${questionCount} questions`;
        chapterTitle.textContent = chapter ? chapter.title : "No chapter selected";
        chapterSubtitle.textContent = chapter
            ? `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"} in this chapter`
            : "Choose a chapter to start.";
        modeLabel.textContent = `${capitalize(state.mode)} mode`;

        if (state.session && !state.session.complete) {
            counter.textContent = `Question ${state.session.index + 1} of ${state.session.questions.length}`;
        } else if (state.session && state.session.complete) {
            counter.textContent = "Quiz complete";
        } else {
            counter.textContent = "Ready to start";
        }
    }

    function capitalize(value) {
        const raw = text(value);
        return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
    }

    function renderSubjectDrawer() {
        const list = document.getElementById("subject-list");
        const select = document.getElementById("subject-select");
        if (!list || !select) {
            return;
        }

        list.replaceChildren();
        select.replaceChildren();

        state.subjects.forEach((subject) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "subject-item";
            button.dataset.subjectId = subject.id;
            if (subject.id === state.activeSubjectId) {
                button.classList.add("is-active");
            }

            const titleRow = document.createElement("span");
            titleRow.className = "subject-item-title";
            titleRow.textContent = subject.name;

            const countRow = document.createElement("span");
            countRow.className = "subject-item-meta";
            countRow.textContent = `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"}`;

            button.append(titleRow, countRow);
            button.addEventListener("click", () => setActiveSubject(subject.id));
            list.appendChild(button);

            const option = document.createElement("option");
            option.value = subject.id;
            option.textContent = subject.name;
            if (subject.id === state.activeSubjectId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    function renderHomeSubjectCarousel() {
        const track = document.getElementById("home-subject-carousel");
        if (!track) {
            return;
        }

        track.replaceChildren();

        state.subjects.forEach((subject) => {
            const card = document.createElement("article");
            card.className = "subject-carousel-card";
            if (subject.id === state.activeSubjectId) {
                card.classList.add("is-active");
            }

            const title = document.createElement("h4");
            title.textContent = subject.name;

            const meta = document.createElement("p");
            meta.className = "subject-carousel-meta";
            meta.textContent = `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"} • ${tallyQuestionCount(subject)} questions`;

            const chapterList = document.createElement("div");
            chapterList.className = "subject-carousel-tags";
            subject.chapters.slice(0, 3).forEach((chapter) => {
                const tag = document.createElement("span");
                tag.className = "tag-pill";
                tag.textContent = chapter.title;
                chapterList.appendChild(tag);
            });

            const actionRow = document.createElement("div");
            actionRow.className = "subject-carousel-actions";
            const startButton = document.createElement("button");
            startButton.type = "button";
            startButton.className = "primary-button";
            startButton.textContent = "Open subject";
            startButton.addEventListener("click", () => setActiveSubject(subject.id));
            actionRow.appendChild(startButton);

            card.addEventListener("click", (event) => {
                if (event.target === startButton) {
                    return;
                }
                setActiveSubject(subject.id);
            });

            card.append(title, meta, chapterList, actionRow);
            track.appendChild(card);
        });
    }

    function renderChapterStrip() {
        const strip = document.getElementById("chapter-strip");
        if (!strip) {
            return;
        }

        const subject = getSubjectById(state.activeSubjectId);
        strip.replaceChildren();

        if (!subject) {
            return;
        }

        subject.chapters.forEach((chapter) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chapter-chip";
            chip.textContent = chapter.title;
            if (chapter.title === state.activeChapterTitle) {
                chip.classList.add("is-active");
            }
            chip.addEventListener("click", () => setActiveChapter(chapter.title));
            strip.appendChild(chip);
        });
    }

    function renderProgress() {
        const fill = document.getElementById("progress-fill");
        if (!fill) {
            return;
        }

        const session = state.session;
        if (!session || session.questions.length === 0) {
            fill.style.width = "0%";
            return;
        }

        const percent = session.complete ? 100 : Math.round((session.index / session.questions.length) * 100);
        fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }

    function renderQuestionStage() {
        const stage = document.getElementById("question-stage");
        if (!stage) {
            return;
        }

        stage.replaceChildren();

        const session = state.session;
        const subject = getSubjectById(state.activeSubjectId);
        const chapter = subject ? getChapterByTitle(subject, state.activeChapterTitle) : null;

        if (!subject || !chapter || !session) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            const heading = document.createElement("h4");
            heading.textContent = subject ? "Choose a chapter" : "No subject loaded yet";
            const paragraph = document.createElement("p");
            paragraph.textContent = subject
                ? "Pick a chapter from the strip above to begin."
                : "Use the hidden admin page to add a quiz, then choose it from the drawer.";
            empty.append(heading, paragraph);
            stage.appendChild(empty);
            renderProgress();
            return;
        }

        if (session.complete) {
            const completeCard = document.createElement("div");
            completeCard.className = "question-card completion-card";
            const heading = document.createElement("h4");
            heading.textContent = `Session complete for ${session.chapterTitle}`;
            const paragraph = document.createElement("p");
            paragraph.textContent = "Check the assessment panel below for score, missed questions, and weak areas.";
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
                const nextChapter = subject.chapters[(subject.chapters.findIndex((entry) => entry.title === chapter.title) + 1) % subject.chapters.length];
                setActiveChapter(nextChapter.title);
            });
            actions.append(retakeButton, nextButton);
            completeCard.append(heading, paragraph, actions);
            stage.appendChild(completeCard);
            renderProgress();
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
        const counter = document.createElement("div");
        counter.className = "question-counter-inline";
        counter.textContent = `Question ${session.index + 1} of ${session.questions.length}`;
        const modeBadge = document.createElement("div");
        modeBadge.className = "mode-badge";
        modeBadge.textContent = `${capitalize(session.mode)} mode`;
        header.append(counter, modeBadge);

        const questionText = document.createElement("h4");
        questionText.textContent = question.question;

        const hint = document.createElement("p");
        hint.className = "question-hint";
        hint.textContent = question.questionType === "numeric"
            ? "Enter a number and submit your answer."
            : session.mode === "flashcards"
                ? "Reveal the answer, then mark whether you knew it."
                : "Choose the best answer and check your result.";

        const answerArea = document.createElement("div");
        answerArea.className = "answer-area";

        if (session.mode === "flashcards") {
            renderFlashcardsMode(answerArea, question, session);
        } else if (question.questionType === "numeric") {
            renderNumericMode(answerArea, question, session);
        } else {
            renderChoiceMode(answerArea, question, session);
        }

        card.append(header, questionText, hint, answerArea);
        stage.appendChild(card);
        renderProgress();
    }

    function renderChoiceMode(answerArea, question, session) {
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
            button.addEventListener("click", () => {
                session.selectedChoice = index;
                submitCurrentQuestion();
            });
            choices.appendChild(button);
        });

        const feedback = document.createElement("div");
        feedback.className = "feedback-block";

        const isAnswered = session.reviewed;
        if (isAnswered && session.lastResult) {
            feedback.appendChild(buildFeedbackCard(session.lastResult));
        }

        const actions = document.createElement("div");
        actions.className = "question-actions";

        if (isAnswered) {
            const submitButton = document.createElement("button");
            submitButton.type = "button";
            submitButton.className = "primary-button";
            submitButton.textContent = session.mode === "learn" ? "Continue" : "Next question";
            submitButton.addEventListener("click", () => {
                submitCurrentQuestion();
            });
            actions.appendChild(submitButton);
        } else {
            const hint = document.createElement("span");
            hint.className = "answer-hint";
            hint.textContent = "Click a choice to get instant feedback.";
            actions.appendChild(hint);
        }
        answerArea.append(choices, feedback, actions);

        if (session.mode === "learn" && isAnswered) {
            const note = document.createElement("p");
            note.className = "learn-note";
            note.textContent = "Use the result to reinforce the correct answer before continuing.";
            answerArea.insertBefore(note, feedback);
        }
    }

    function renderNumericMode(answerArea, question, session) {
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
            feedback.appendChild(buildFeedbackCard(session.lastResult));
        }

        const button = document.createElement("button");
        button.type = "submit";
        button.className = "primary-button";
        button.textContent = session.reviewed ? (session.mode === "learn" ? "Continue" : "Next question") : "Check answer";
        button.disabled = false;

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!text(session.typedAnswer)) {
                return;
            }
            submitCurrentQuestion();
        });

        form.append(input, button);
        answerArea.append(form, feedback);
    }

    function renderFlashcardsMode(answerArea, question, session) {
        const card = document.createElement("div");
        card.className = "flashcard";

        const face = document.createElement("div");
        face.className = "flashcard-face";
        face.textContent = session.revealed ? `Answer: ${question.answerText}` : question.question;

        const explanation = document.createElement("p");
        explanation.className = "flashcard-explanation";
        explanation.textContent = session.revealed && question.explanation ? question.explanation : "";

        const controls = document.createElement("div");
        controls.className = "flashcard-controls";

        if (!session.revealed) {
            const revealButton = document.createElement("button");
            revealButton.type = "button";
            revealButton.className = "primary-button";
            revealButton.textContent = "Reveal answer";
            revealButton.addEventListener("click", () => {
                session.revealed = true;
                renderQuestionStage();
            });
            controls.appendChild(revealButton);
        } else {
            const knewButton = document.createElement("button");
            knewButton.type = "button";
            knewButton.className = "primary-button";
            knewButton.textContent = "I knew it";
            knewButton.addEventListener("click", () => {
                submitCurrentQuestion({ correct: true, advanceImmediately: true });
            });

            const reviewButton = document.createElement("button");
            reviewButton.type = "button";
            reviewButton.className = "ghost-button";
            reviewButton.textContent = "Review later";
            reviewButton.addEventListener("click", () => {
                submitCurrentQuestion({ correct: false, advanceImmediately: true });
            });
            controls.append(knewButton, reviewButton);
        }

        card.append(face, explanation, controls);
        answerArea.appendChild(card);
    }

    function buildFeedbackCardLegacy(question, isCorrect, userAnswer) {
        const wrapper = document.createElement("div");
        wrapper.className = `feedback-card ${isCorrect ? "is-correct" : "is-wrong"}`;

        const title = document.createElement("strong");
        title.textContent = isCorrect ? "Correct" : "Not quite";

        const answer = document.createElement("p");
        answer.textContent = question.questionType === "numeric"
            ? `Answer: ${question.answerText}`
            : `Correct answer: ${question.answerText}`;

        const details = document.createElement("p");
        details.textContent = isCorrect
            ? "Nice work — that one is locked in."
            : `You answered ${text(userAnswer) || "nothing"}; keep this one in review.`;

        wrapper.append(title, answer, details);

        if (question.explanation) {
            const explanation = document.createElement("p");
            explanation.className = "feedback-explanation";
            explanation.textContent = question.explanation;
            wrapper.appendChild(explanation);
        }

        return wrapper;
    }

    function buildFeedbackCard(result) {
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

        if (result.explanation) {
            const explanation = document.createElement("p");
            explanation.className = "feedback-explanation";
            explanation.textContent = result.explanation;
            wrapper.appendChild(explanation);
        }

        return wrapper;
    }

    function renderAssessment(summary, session) {
        const title = document.querySelector("#assessment-panel h3");
        const score = document.getElementById("assessment-score");
        const content = document.getElementById("assessment-content");

        if (!title || !score || !content) {
            return;
        }

        title.textContent = `Results for ${session.chapterTitle}`;
        score.textContent = `${summary.accuracy}% • ${summary.correctCount}/${summary.total}`;

        content.replaceChildren();

        const scoreCard = document.createElement("div");
        scoreCard.className = "assessment-score-card";
        const scoreHeading = document.createElement("h4");
        scoreHeading.textContent = `${summary.correctCount} correct out of ${summary.total}`;
        const scoreParagraph = document.createElement("p");
        scoreParagraph.textContent = `Accuracy: ${summary.accuracy}%`;
        scoreCard.append(scoreHeading, scoreParagraph);

        const weakCard = document.createElement("div");
        weakCard.className = "assessment-block";
        const weakHeading = document.createElement("h4");
        weakHeading.textContent = "Weak areas";
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
            const pill = document.createElement("span");
            pill.className = "tag-pill";
            pill.textContent = "No weak areas recorded";
            weakList.appendChild(pill);
        }
        weakCard.append(weakHeading, weakList);

        const reviewCard = document.createElement("div");
        reviewCard.className = "assessment-block";
        const reviewHeading = document.createElement("h4");
        reviewHeading.textContent = "Missed questions";
        reviewCard.appendChild(reviewHeading);

        if (!summary.missed.length) {
            const paragraph = document.createElement("p");
            paragraph.textContent = "Perfect session — nothing to review.";
            reviewCard.appendChild(paragraph);
        } else {
            const list = document.createElement("div");
            list.className = "review-list";
            summary.missed.forEach((entry) => {
                const item = document.createElement("article");
                item.className = "review-item";
                const question = document.createElement("h5");
                question.textContent = entry.questionText;
                const answer = document.createElement("p");
                answer.textContent = `Correct answer: ${entry.correctAnswer}`;
                const note = document.createElement("p");
                note.textContent = entry.explanation || "Revisit this topic in the chapter list.";
                item.append(question, answer, note);
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

        content.append(scoreCard, weakCard, reviewCard, actions);
        updateQuestionCount();
    }

    function startSession(mode) {
        const subject = getSubjectById(state.activeSubjectId);
        if (!subject) {
            state.session = null;
            renderHeader();
            renderQuestionStage();
            return;
        }

        const chapter = getChapterByTitle(subject, state.activeChapterTitle) || subject.chapters[0];
        if (!chapter) {
            state.session = null;
            renderHeader();
            renderQuestionStage();
            return;
        }

        state.mode = mode;
        state.activeChapterTitle = chapter.title;
        saveActiveSelection(subject.id, chapter.title, mode);
        state.session = buildSession(subject, chapter, mode);
        renderModeButtons();
        renderHeader();
        renderQuestionStage();
        renderAssessmentPlaceholder();
    }

    function renderAssessmentPlaceholder() {
        const title = document.querySelector("#assessment-panel h3");
        const score = document.getElementById("assessment-score");
        const content = document.getElementById("assessment-content");
        if (!title || !score || !content) {
            return;
        }

        title.textContent = "Your results will appear here after each session.";
        score.textContent = "Pending";
        content.replaceChildren();
        const empty = document.createElement("div");
        empty.className = "empty-state compact";
        const heading = document.createElement("h4");
        heading.textContent = "Nothing to review yet";
        const paragraph = document.createElement("p");
        paragraph.textContent = "Complete a chapter to see score, missed questions, and weak areas.";
        empty.append(heading, paragraph);
        content.appendChild(empty);
    }

    function renderModeButtons() {
        document.querySelectorAll(".mode-button, .mode-launch-card").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.mode === state.mode);
        });
    }

    function updateQuestionCount() {
        const counter = document.getElementById("question-counter");
        if (!counter) {
            return;
        }
        if (!state.session) {
            counter.textContent = state.subjects.length ? "Ready to start" : "Waiting for a subject";
            return;
        }
        if (state.session.complete) {
            counter.textContent = "Quiz complete";
            return;
        }
        counter.textContent = `Question ${state.session.index + 1} of ${state.session.questions.length}`;
    }

    function setActiveSubject(subjectId) {
        const subject = getSubjectById(subjectId);
        if (!subject) {
            return;
        }

        state.activeSubjectId = subject.id;
        state.activeChapterTitle = subject.selectedChapter || subject.chapters[0]?.title || "";
        storageSet(ACTIVE_SUBJECT_KEY, state.activeSubjectId);
        storageSet(ACTIVE_CHAPTER_KEY, state.activeChapterTitle);
        renderSubjectDrawer();
        renderChapterStrip();
        startSession(state.mode);
        closeDrawer();
    }

    function setActiveChapter(chapterTitle) {
        const subject = getSubjectById(state.activeSubjectId);
        if (!subject) {
            return;
        }
        const chapter = getChapterByTitle(subject, chapterTitle);
        if (!chapter) {
            return;
        }

        state.activeChapterTitle = chapter.title;
        storageSet(ACTIVE_CHAPTER_KEY, chapter.title);
        renderChapterStrip();
        startSession(state.mode);
    }

    function closeDrawer() {
        document.body.classList.remove("drawer-open");
        const backdrop = document.getElementById("drawer-backdrop");
        if (backdrop) {
            backdrop.hidden = true;
        }
    }

    function openDrawer() {
        document.body.classList.add("drawer-open");
        const backdrop = document.getElementById("drawer-backdrop");
        if (backdrop) {
            backdrop.hidden = false;
        }
    }

    function syncStateFromStorage() {
        state.subjects = seedSubjectsIfNeeded();
        state.subjects = loadSubjects();

        const storedSubjectId = text(storageGet(ACTIVE_SUBJECT_KEY, ""));
        const storedChapterTitle = text(storageGet(ACTIVE_CHAPTER_KEY, ""));
        const storedMode = text(storageGet(ACTIVE_MODE_KEY, "quiz")) || "quiz";

        state.activeSubjectId = getSubjectById(storedSubjectId)?.id || state.subjects[0]?.id || "";
        state.mode = ["quiz", "learn", "flashcards"].includes(storedMode) ? storedMode : "quiz";

        const subject = getSubjectById(state.activeSubjectId);
        if (subject) {
            state.activeChapterTitle = getChapterByTitle(subject, storedChapterTitle)?.title || subject.selectedChapter || subject.chapters[0]?.title || "";
            resetSession();
        } else {
            state.activeChapterTitle = "";
            state.session = null;
        }
    }

    function renderPublicPage() {
        renderModeButtons();
        renderSubjectDrawer();
        renderHomeSubjectCarousel();
        renderChapterStrip();
        renderHeader();
        renderQuestionStage();
        renderAssessmentPlaceholder();
    }

    function parseUploadedFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    resolve(readJson(String(reader.result || "")));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error("Unable to read the selected file."));
            reader.readAsText(file, "utf-8");
        });
    }

    async function previewQuizFile(file, subjectOverride = "") {
        const previewStatus = document.getElementById("upload-status");
        const previewContent = document.getElementById("preview-content");
        if (!previewStatus || !previewContent) {
            return;
        }

        try {
            const raw = await parseUploadedFile(file);
            const quiz = normalizeQuizPayload(raw, subjectOverride);
            const chapterCount = quiz.chapters.length;
            const questionCount = quiz.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
            previewStatus.textContent = `${chapterCount} chapters • ${questionCount} questions`;
            previewContent.replaceChildren();

            const summary = document.createElement("div");
            summary.className = "assessment-block";
            summary.innerHTML = "";

            const subjectLine = document.createElement("p");
            subjectLine.textContent = `Subject: ${quiz.subject}`;
            const chapterLine = document.createElement("p");
            chapterLine.textContent = `Selected chapter: ${quiz.selected_chapter}`;
            const typeLine = document.createElement("p");
            typeLine.textContent = `Quiz type: ${quiz.quiz_type}`;
            summary.append(subjectLine, chapterLine, typeLine);

            const chapterList = document.createElement("div");
            chapterList.className = "review-list";
            quiz.chapters.forEach((chapter) => {
                const chapterCard = document.createElement("article");
                chapterCard.className = "review-item";
                const title = document.createElement("h5");
                title.textContent = chapter.title;
                const details = document.createElement("p");
                details.textContent = `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}`;
                chapterCard.append(title, details);
                chapterList.appendChild(chapterCard);
            });

            previewContent.append(summary, chapterList);
            return quiz;
        } catch (error) {
            previewStatus.textContent = "Invalid file";
            previewContent.replaceChildren();
            const errorBox = document.createElement("div");
            errorBox.className = "empty-state compact";
            const heading = document.createElement("h4");
            heading.textContent = "Could not parse this file";
            const paragraph = document.createElement("p");
            paragraph.textContent = error.message || "The JSON file does not match the quiz format.";
            errorBox.append(heading, paragraph);
            previewContent.appendChild(errorBox);
            throw error;
        }
    }

    function replaceSubjectRecord(subjectRecord) {
        const index = state.subjects.findIndex((subject) => subject.id === subjectRecord.id);
        if (index >= 0) {
            state.subjects[index] = subjectRecord;
        } else {
            state.subjects.push(subjectRecord);
        }

        state.subjects.sort((left, right) => left.name.localeCompare(right.name));
        storageSet(STORAGE_KEY, state.subjects);
        storageSet(ACTIVE_SUBJECT_KEY, subjectRecord.id);
        storageSet(ACTIVE_CHAPTER_KEY, subjectRecord.selectedChapter);
    }

    function initPublicPage() {
        const drawerOpen = document.getElementById("drawer-open");
        const drawerClose = document.getElementById("drawer-close");
        const drawerBackdrop = document.getElementById("drawer-backdrop");
        const subjectSelect = document.getElementById("subject-select");
        const refreshButton = document.getElementById("refresh-button");
        const modeButtons = document.querySelectorAll(".mode-button, .mode-launch-card");
        const homeCarouselPrev = document.getElementById("home-carousel-prev");
        const homeCarouselNext = document.getElementById("home-carousel-next");
        const homeCarousel = document.getElementById("home-subject-carousel");

        if (!document.getElementById("subject-drawer")) {
            return;
        }

        syncStateFromStorage();
        renderPublicPage();

        drawerOpen?.addEventListener("click", openDrawer);
        drawerClose?.addEventListener("click", closeDrawer);
        drawerBackdrop?.addEventListener("click", closeDrawer);
        subjectSelect?.addEventListener("change", (event) => setActiveSubject(event.target.value));
        refreshButton?.addEventListener("click", () => {
            syncStateFromStorage();
            renderPublicPage();
        });

        modeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const nextMode = button.dataset.mode;
                if (!nextMode) {
                    return;
                }
                state.mode = nextMode;
                saveActiveSelection(state.activeSubjectId, state.activeChapterTitle, state.mode);
                renderModeButtons();
                startSession(nextMode);
                document.getElementById("question-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        const scrollHomeCarousel = (direction) => {
            if (!homeCarousel) {
                return;
            }
            const delta = Math.max(260, homeCarousel.clientWidth * 0.75) * direction;
            homeCarousel.scrollBy({ left: delta, behavior: "smooth" });
        };

        homeCarouselPrev?.addEventListener("click", () => scrollHomeCarousel(-1));
        homeCarouselNext?.addEventListener("click", () => scrollHomeCarousel(1));

        window.addEventListener("storage", (event) => {
            if ([STORAGE_KEY, ACTIVE_SUBJECT_KEY, ACTIVE_CHAPTER_KEY, ACTIVE_MODE_KEY].includes(event.key)) {
                syncStateFromStorage();
                renderPublicPage();
            }
        });

        if (window.matchMedia("(min-width: 901px)").matches) {
            closeDrawer();
        }
    }

    function initAdminPage() {
        const lockForm = document.getElementById("admin-lock-form");
        const passwordInput = document.getElementById("admin-password");
        const lockStatus = document.getElementById("admin-lock-status");
        const lockPanel = document.getElementById("admin-lock-panel");
        const adminApp = document.getElementById("admin-app");
        const uploadForm = document.getElementById("upload-form");
        const previewButton = document.getElementById("preview-button");
        const fileInput = document.getElementById("quiz-file");
        const subjectInput = document.getElementById("subject-name");

        if (!lockForm || !lockPanel || !adminApp || !uploadForm || !previewButton || !fileInput || !subjectInput) {
            return;
        }

        const unlocked = sessionGet(ADMIN_UNLOCK_KEY, false);
        if (unlocked) {
            lockPanel.hidden = true;
            adminApp.hidden = false;
        }

        lockForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            const entered = text(passwordInput.value);
            if (entered === ADMIN_PASSWORD) {
                sessionSet(ADMIN_UNLOCK_KEY, true);
                lockStatus.textContent = "";
                lockPanel.hidden = true;
                adminApp.hidden = false;
                passwordInput.value = "";
                return;
            }
            lockStatus.textContent = "Wrong password. Try again.";
        });

        previewButton.addEventListener("click", async () => {
            const file = fileInput.files?.[0];
            if (!file) {
                return;
            }
            await previewQuizFile(file, subjectInput.value);
        });

        uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const file = fileInput.files?.[0];
            if (!file) {
                return;
            }

            try {
                const quiz = await previewQuizFile(file, subjectInput.value);
                const subjectRecord = createSubjectRecord(quiz, subjectInput.value || quiz.subject);
                replaceSubjectRecord(subjectRecord);
                state.subjects = loadSubjects();
                state.activeSubjectId = subjectRecord.id;
                state.activeChapterTitle = subjectRecord.selectedChapter;
                state.mode = text(storageGet(ACTIVE_MODE_KEY, "quiz")) || "quiz";
                storageSet(ACTIVE_SUBJECT_KEY, state.activeSubjectId);
                storageSet(ACTIVE_CHAPTER_KEY, state.activeChapterTitle);
                storageSet(ACTIVE_MODE_KEY, state.mode);
                const previewStatus = document.getElementById("upload-status");
                if (previewStatus) {
                    previewStatus.textContent = "Saved to browser";
                }
                uploadForm.reset();
                subjectInput.value = subjectRecord.name;
                if (document.body.classList.contains("public-page")) {
                    syncStateFromStorage();
                    renderPublicPage();
                }
            } catch {
                // Preview already showed the error.
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initPublicPage();
        initAdminPage();
    });
})();
