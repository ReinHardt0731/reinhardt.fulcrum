import {
    ACTIVE_CHAPTER_KEY,
    ACTIVE_MODE_KEY,
    ACTIVE_SUBJECT_KEY,
    ADMIN_PASSWORD,
<<<<<<< HEAD
=======
    buildChapterFilePath,
>>>>>>> 0ee96ad (Add admin chapter import workflow)
    getChapterByTitle,
    getSubjectById,
    isAdminUnlocked,
    previewQuizFile,
    saveSubjects,
<<<<<<< HEAD
=======
    serializeSubjects,
>>>>>>> 0ee96ad (Add admin chapter import workflow)
    setAdminUnlocked,
    storageSelectState,
    syncSelection,
    tallyQuestionCount,
    textValue
} from "./shared.js";

<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", () => {
=======
document.addEventListener("DOMContentLoaded", async () => {
>>>>>>> 0ee96ad (Add admin chapter import workflow)
    if (!document.body.classList.contains("admin-page")) {
        return;
    }

    const elements = {
        lockForm: document.getElementById("admin-lock-form"),
        passwordInput: document.getElementById("admin-password"),
        lockStatus: document.getElementById("admin-lock-status"),
        lockPanel: document.getElementById("admin-lock-panel"),
        adminApp: document.getElementById("admin-app"),
        statusLine: document.getElementById("admin-status"),
        librarySummary: document.getElementById("admin-library-summary"),
        subjectPanel: document.getElementById("admin-subject-panel"),
        subjectAddToggle: document.getElementById("admin-subject-add-toggle"),
        subjectCreateForm: document.getElementById("admin-subject-create-form"),
        subjectCreateName: document.getElementById("admin-subject-create-name"),
        subjectCreateCancel: document.getElementById("admin-subject-create-cancel"),
        subjectList: document.getElementById("admin-subject-list"),
        subjectEditorShell: document.getElementById("admin-subject-editor-shell"),
        subjectRenameInput: document.getElementById("admin-subject-name"),
        subjectSaveButton: document.getElementById("admin-subject-save"),
        subjectDeleteButton: document.getElementById("admin-subject-delete"),
        activeSubjectTitle: document.getElementById("admin-active-subject-title"),
<<<<<<< HEAD
=======
        exportButton: document.getElementById("admin-export-button"),
>>>>>>> 0ee96ad (Add admin chapter import workflow)
        chapterSummary: document.getElementById("admin-chapter-summary"),
        chapterCarousel: document.getElementById("admin-chapter-carousel"),
        chapterPrev: document.getElementById("admin-chapter-prev"),
        chapterNext: document.getElementById("admin-chapter-next"),
        chapterImportForm: document.getElementById("chapter-import-form"),
        chapterPreviewButton: document.getElementById("chapter-preview-button"),
        chapterNameInput: document.getElementById("chapter-name"),
        chapterFileInput: document.getElementById("chapter-quiz-file"),
        chapterPreviewStatus: document.getElementById("chapter-upload-status"),
        chapterPreviewContent: document.getElementById("chapter-preview-content"),
        chapterImportButton: document.getElementById("chapter-import-button"),
        chapterRenameInput: document.getElementById("admin-chapter-name"),
        chapterSaveButton: document.getElementById("admin-chapter-save"),
        chapterDeleteButton: document.getElementById("admin-chapter-delete")
    };

    if (
        !elements.lockForm ||
        !elements.lockPanel ||
        !elements.adminApp ||
        !elements.subjectAddToggle ||
        !elements.subjectCreateForm ||
        !elements.chapterImportForm
    ) {
        return;
    }

    const state = {
        subjects: [],
        activeSubjectId: "",
        activeChapterTitle: "",
        activeMode: "quiz",
        expandedSubjectId: ""
    };

    const now = () => new Date().toISOString();

    const slugify = (value) =>
        textValue(value)
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "subject";

    const emptyState = (headingText, bodyText) => {
        const box = document.createElement("div");
        box.className = "empty-state compact";
        box.append(
            Object.assign(document.createElement("h4"), { textContent: headingText }),
            Object.assign(document.createElement("p"), { textContent: bodyText })
        );
        return box;
    };

    const cloneQuestions = (questions) =>
        questions.map((question) => ({
            ...question,
            choices: Array.isArray(question.choices) ? [...question.choices] : [],
            tags: Array.isArray(question.tags) ? [...question.tags] : []
        }));

    const uniqueSubjectName = (subjects, rawName, excludedId = "") => {
        const value = textValue(rawName);
        if (!value) {
            return "";
        }

        const existing = new Set(
            subjects
                .filter((subject) => subject.id !== excludedId)
                .map((subject) => textValue(subject.name).toLowerCase())
        );
        const normalized = value.toLowerCase();
        if (!existing.has(normalized)) {
            return value;
        }

        let suffix = 2;
        while (existing.has(`${normalized} ${suffix}`)) {
            suffix += 1;
        }
        return `${value} ${suffix}`;
    };

    const uniqueSubjectId = (subjects, rawName, excludedId = "") => {
        const base = slugify(rawName);
        const existing = new Set(subjects.filter((subject) => subject.id !== excludedId).map((subject) => textValue(subject.id)));
        if (!existing.has(base)) {
            return base;
        }

        let suffix = 2;
        while (existing.has(`${base}-${suffix}`)) {
            suffix += 1;
        }
        return `${base}-${suffix}`;
    };

<<<<<<< HEAD
=======
    const uniqueChapterFilePath = (subject, rawTitle, excludedTitle = "") => {
        const basePath = buildChapterFilePath(rawTitle || "chapter");
        const existing = new Set(
            subject?.chapters
                ?.filter((chapter) => chapter.title !== excludedTitle)
                .map((chapter) => textValue(chapter.file))
                .filter(Boolean) || []
        );

        if (!existing.has(basePath)) {
            return basePath;
        }

        const [directory, filename] = basePath.split(/\/(.+)/);
        const [name, extension] = filename.split(/\.(?=[^.]+$)/);
        let suffix = 2;
        while (existing.has(`${directory}/${name}-${suffix}.${extension}`)) {
            suffix += 1;
        }
        return `${directory}/${name}-${suffix}.${extension}`;
    };

>>>>>>> 0ee96ad (Add admin chapter import workflow)
    const createEmptySubjectRecord = (subjects, rawName) => {
        const name = uniqueSubjectName(subjects, rawName);
        if (!name) {
            throw new Error("Enter a subject name.");
        }

        return {
            id: uniqueSubjectId(subjects, name),
            name,
            quizType: "short_quiz",
            schemaVersion: 1,
            selectedChapter: "",
            chapters: [],
            updatedAt: now()
        };
    };

    const uniqueChapterTitle = (subject, rawTitle, excludedTitle = "") => {
        const value = textValue(rawTitle);
        if (!value) {
            return "";
        }

        const existing = new Set(subject.chapters.map((chapter) => chapter.title).filter((title) => title !== excludedTitle));
        if (!existing.has(value)) {
            return value;
        }

        let suffix = 2;
        while (existing.has(`${value} ${suffix}`)) {
            suffix += 1;
        }
        return `${value} ${suffix}`;
    };

    const setStatus = (message) => {
        if (elements.statusLine) {
            elements.statusLine.textContent = message;
        }
    };

<<<<<<< HEAD
=======
    const downloadTextFile = (filename, content) => {
        const blob = new Blob([content], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

>>>>>>> 0ee96ad (Add admin chapter import workflow)
    const getActiveSubject = () => getSubjectById(state.subjects, state.activeSubjectId) || state.subjects[0] || null;

    const getActiveChapter = () => {
        const subject = getActiveSubject();
        return subject ? getChapterByTitle(subject, state.activeChapterTitle) || subject.chapters[0] || null : null;
    };

    const persistSelection = () => {
        syncSelection(state.activeSubjectId, state.activeChapterTitle, state.activeMode);
    };

    const showAdminApp = () => {
        elements.lockPanel.hidden = true;
        elements.adminApp.hidden = false;
    };

    const hideAdminApp = () => {
        elements.lockPanel.hidden = false;
        elements.adminApp.hidden = true;
    };

<<<<<<< HEAD
    const loadState = () => {
        const fresh = storageSelectState();
=======
    const loadState = async () => {
        const fresh = await storageSelectState();
>>>>>>> 0ee96ad (Add admin chapter import workflow)
        state.subjects = fresh.subjects;
        state.activeSubjectId = fresh.activeSubject?.id || state.subjects[0]?.id || "";
        state.activeMode = fresh.mode || "quiz";

        const subject = getActiveSubject();
        state.activeChapterTitle = subject
            ? getChapterByTitle(subject, fresh.activeChapter?.title || subject.selectedChapter || subject.chapters[0]?.title || "")?.title || subject.selectedChapter || subject.chapters[0]?.title || ""
            : "";
        state.expandedSubjectId = state.activeSubjectId;
    };

    const commitSubjects = (subjects, subjectId = state.activeSubjectId, chapterTitle = state.activeChapterTitle) => {
        state.subjects = saveSubjects(subjects);
        const subject = getSubjectById(state.subjects, subjectId) || state.subjects[0] || null;
        state.activeSubjectId = subject ? subject.id : "";
        state.activeChapterTitle = subject
            ? getChapterByTitle(subject, chapterTitle)?.title || subject.selectedChapter || subject.chapters[0]?.title || ""
            : "";
        state.expandedSubjectId = subject ? subject.id : "";
        persistSelection();
        renderAll();
    };

    const renderQuizPreview = async ({
        fileInput,
        previewStatus,
        previewContent,
        subjectOverride = "",
        note = ""
    }) => {
        const file = fileInput?.files?.[0];
        if (!file || !previewStatus || !previewContent) {
            return null;
        }

        const quiz = await previewQuizFile(file, subjectOverride);
        const chapterCount = quiz.chapters.length;
        const questionCount = quiz.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
        previewStatus.textContent = `${chapterCount} chapters | ${questionCount} questions`;
        previewContent.replaceChildren();

        const summary = document.createElement("div");
        summary.className = "assessment-block";
        const lines = [];
        if (note) {
            lines.push(note);
        }
        lines.push(`Subject: ${quiz.subject}`);
        lines.push(`Selected chapter: ${quiz.selected_chapter}`);
        lines.push(`Quiz type: ${quiz.quiz_type}`);
        lines.forEach((line) => {
            summary.appendChild(Object.assign(document.createElement("p"), { textContent: line }));
        });

        const chapterCards = document.createElement("div");
        chapterCards.className = "review-list";
        quiz.chapters.forEach((chapter) => {
            const chapterCard = document.createElement("article");
            chapterCard.className = "review-item";
            chapterCard.append(
                Object.assign(document.createElement("h5"), { textContent: chapter.title }),
                Object.assign(document.createElement("p"), {
                    textContent: `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}`
                })
            );
            chapterCards.appendChild(chapterCard);
        });

        previewContent.append(summary, chapterCards);
        return quiz;
    };

    const renderChapterPreview = async () => {
        const subject = getActiveSubject();
        if (!subject) {
            throw new Error("Select a subject first.");
        }

        const file = elements.chapterFileInput?.files?.[0];
        if (!file) {
            throw new Error("Choose a quiz JSON file first.");
        }

        const chapterName = textValue(elements.chapterNameInput?.value);
        const note = chapterName
            ? `This chapter will be added to "${subject.name}" as "${chapterName}".`
            : `Enter a chapter title to save it into "${subject.name}".`;

        return renderQuizPreview({
            fileInput: elements.chapterFileInput,
            previewStatus: elements.chapterPreviewStatus,
            previewContent: elements.chapterPreviewContent,
            note
        });
    };

    const renderSummary = () => {
        if (!elements.librarySummary) {
            return;
        }

        const chapterCount = state.subjects.reduce((sum, subject) => sum + subject.chapters.length, 0);
        const questionCount = state.subjects.reduce((sum, subject) => sum + tallyQuestionCount(subject), 0);
        elements.librarySummary.textContent = `${state.subjects.length} subjects | ${chapterCount} chapters | ${questionCount} questions`;
    };

    const renderSubjectList = () => {
        if (!elements.subjectList) {
            return;
        }

        elements.subjectList.replaceChildren();
        if (!state.subjects.length) {
            elements.subjectList.appendChild(emptyState("No subjects yet", "Use Add subject to create the first branch."));
            return;
        }

        state.subjects.forEach((subject) => {
            const isActiveSubject = subject.id === state.activeSubjectId;
            const isExpanded = subject.id === state.expandedSubjectId;

            const card = document.createElement("div");
            card.className = "subject-card";
            card.dataset.subjectId = subject.id;

            const header = document.createElement("button");
            header.type = "button";
            header.className = "subject-item";
            if (isActiveSubject) {
                header.classList.add("is-active");
            }
            if (isExpanded) {
                header.classList.add("is-open");
            }
            header.setAttribute("aria-expanded", String(isExpanded));

            const copy = document.createElement("span");
            copy.className = "subject-item-copy";
            copy.append(
                Object.assign(document.createElement("span"), { className: "subject-item-title", textContent: subject.name }),
                Object.assign(document.createElement("span"), {
                    className: "subject-item-meta",
                    textContent: `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"} | ${tallyQuestionCount(subject)} questions`
                })
            );

            const caret = document.createElement("span");
            caret.className = "subject-item-caret";
            caret.textContent = "\u25BE";

            header.append(copy, caret);
            header.addEventListener("click", () => toggleSubject(subject.id));

            const chapterList = document.createElement("div");
            chapterList.className = "subject-chapters";
            chapterList.id = `admin-subject-chapters-${subject.id}`;
            chapterList.hidden = !isExpanded;
            header.setAttribute("aria-controls", chapterList.id);

            subject.chapters.forEach((chapter) => {
                const chapterButton = document.createElement("button");
                chapterButton.type = "button";
                chapterButton.className = "subject-chapter-item";
                if (isActiveSubject && chapter.title === state.activeChapterTitle) {
                    chapterButton.classList.add("is-active");
                }
                chapterButton.textContent = chapter.title;
                chapterButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    selectSubject(subject.id, chapter.title);
                });
                chapterList.appendChild(chapterButton);
            });

            card.append(header, chapterList);
            elements.subjectList.appendChild(card);
        });
    };

    const renderSubjectEditor = () => {
        const subject = getActiveSubject();
        if (elements.subjectEditorShell) {
            elements.subjectEditorShell.hidden = !subject;
        }
        if (elements.subjectRenameInput) {
            elements.subjectRenameInput.value = subject?.name || "";
            elements.subjectRenameInput.disabled = !subject;
        }
        if (elements.subjectSaveButton) {
            elements.subjectSaveButton.disabled = !subject;
        }
        if (elements.subjectDeleteButton) {
            elements.subjectDeleteButton.disabled = !subject || state.subjects.length <= 1;
        }
    };

    const renderChapterCarousel = () => {
        if (!elements.chapterCarousel) {
            return;
        }

        const subject = getActiveSubject();
        elements.chapterCarousel.replaceChildren();

        if (!subject) {
            elements.chapterCarousel.appendChild(
                emptyState("No subject selected", "Choose a branch from the sidebar to manage its leaves.")
            );
            return;
        }

        if (!subject.chapters.length) {
            elements.chapterCarousel.appendChild(
                emptyState("No chapters yet", "Add the first leaf using the form below.")
            );
            return;
        }

        subject.chapters.forEach((chapter) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "chapter-carousel-card";
            if (chapter.title === state.activeChapterTitle) {
                card.classList.add("is-active");
            }

            card.append(
                Object.assign(document.createElement("span"), { className: "chapter-carousel-title", textContent: chapter.title }),
                Object.assign(document.createElement("span"), {
                    className: "chapter-carousel-meta",
                    textContent: `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}`
                })
            );

            card.addEventListener("click", () => selectChapter(chapter.title));
            elements.chapterCarousel.appendChild(card);
        });
    };

    const renderChapterEditor = () => {
        const subject = getActiveSubject();
        const chapter = getActiveChapter();
        const hasSubject = Boolean(subject);
        const hasChapter = Boolean(chapter);
        const hasCarouselChapters = Boolean(subject && subject.chapters.length > 1);
        const hasChapterFile = Boolean(elements.chapterFileInput?.files?.length);

        if (elements.activeSubjectTitle) {
            elements.activeSubjectTitle.textContent = subject ? subject.name : "No subject selected";
        }
        if (elements.chapterSummary) {
            elements.chapterSummary.textContent = subject
                ? `${subject.chapters.length} chapters | ${tallyQuestionCount(subject)} questions`
                : "No chapters";
        }
        if (elements.chapterRenameInput) {
            elements.chapterRenameInput.value = chapter?.title || "";
            elements.chapterRenameInput.disabled = !hasChapter;
        }
        if (elements.chapterSaveButton) {
            elements.chapterSaveButton.disabled = !hasChapter;
        }
        if (elements.chapterDeleteButton) {
            elements.chapterDeleteButton.disabled = !hasChapter || (subject ? subject.chapters.length <= 1 : true);
        }
        if (elements.chapterNameInput) {
            elements.chapterNameInput.placeholder = hasSubject ? "New leaf title" : "Select a subject first";
            elements.chapterNameInput.disabled = !hasSubject;
        }
        if (elements.chapterFileInput) {
            elements.chapterFileInput.disabled = !hasSubject;
        }
        if (elements.chapterPreviewButton) {
            elements.chapterPreviewButton.disabled = !hasSubject;
        }
        if (elements.chapterImportButton) {
            elements.chapterImportButton.disabled = !hasSubject;
        }
        if (elements.chapterPrev) {
            elements.chapterPrev.disabled = !hasCarouselChapters;
        }
        if (elements.chapterNext) {
            elements.chapterNext.disabled = !hasCarouselChapters;
        }
        if (elements.chapterPreviewStatus && !hasChapterFile) {
            elements.chapterPreviewStatus.textContent = hasSubject ? "Waiting for a file" : "Select a subject first";
        }
        if (elements.chapterPreviewContent && !hasChapterFile) {
            elements.chapterPreviewContent.replaceChildren(
                emptyState(
                    hasSubject ? "No file previewed yet" : "No subject selected",
                    hasSubject
                        ? "Choose a JSON file to inspect the chapter before adding it to the selected subject."
                        : "Choose a branch before adding a leaf."
                )
            );
        }
    };

    const renderAll = () => {
        renderSummary();
        renderSubjectList();
        renderSubjectEditor();
        renderChapterCarousel();
        renderChapterEditor();
    };

    const selectSubject = (subjectId, chapterTitle = "") => {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject) {
            return;
        }

        closeSubjectCreate();
        const resolvedChapterTitle = textValue(chapterTitle || subject.selectedChapter || subject.chapters[0]?.title || "");
        const chapter = getChapterByTitle(subject, resolvedChapterTitle) || subject.chapters[0] || null;
        state.activeSubjectId = subject.id;
        state.activeChapterTitle = chapter?.title || "";
        state.expandedSubjectId = subject.id;
        persistSelection();
        renderAll();
    };

    const selectChapter = (chapterTitle) => {
        const subject = getActiveSubject();
        if (!subject) {
            return;
        }

        closeSubjectCreate();
        const chapter = getChapterByTitle(subject, chapterTitle);
        if (!chapter) {
            return;
        }

        state.activeSubjectId = subject.id;
        state.activeChapterTitle = chapter.title;
        state.expandedSubjectId = subject.id;
        persistSelection();
        renderAll();
    };

    const toggleSubject = (subjectId) => {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject) {
            return;
        }

        closeSubjectCreate();
        if (state.activeSubjectId === subject.id) {
            state.expandedSubjectId = state.expandedSubjectId === subject.id ? "" : subject.id;
            renderAll();
            return;
        }

        selectSubject(subject.id);
    };

    const openSubjectCreate = () => {
        if (elements.subjectCreateForm) {
            elements.subjectCreateForm.hidden = false;
        }
        elements.subjectCreateName?.focus();
    };

    const closeSubjectCreate = () => {
        if (elements.subjectCreateForm) {
            elements.subjectCreateForm.hidden = true;
        }
        if (elements.subjectCreateName) {
            elements.subjectCreateName.value = "";
        }
    };

    const renderPreviewError = (previewStatus, previewContent, error) => {
        if (previewStatus) {
            previewStatus.textContent = "Invalid file";
        }
        if (previewContent) {
            previewContent.replaceChildren(
                emptyState("Could not parse this file", error?.message || "The JSON file does not match the quiz format.")
            );
        }
    };

    if (isAdminUnlocked()) {
        showAdminApp();
    } else {
        hideAdminApp();
    }

    elements.lockForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (textValue(elements.passwordInput.value) === ADMIN_PASSWORD) {
            setAdminUnlocked();
            elements.lockStatus.textContent = "";
            showAdminApp();
            elements.passwordInput.value = "";
            renderAll();
            return;
        }

        elements.lockStatus.textContent = "Wrong password. Try again.";
    });

    elements.subjectAddToggle.addEventListener("click", () => {
        if (elements.subjectCreateForm?.hidden !== false) {
            openSubjectCreate();
            setStatus("Enter a subject name and create the branch.");
            return;
        }

        elements.subjectCreateName?.focus();
    });

    elements.subjectCreateCancel?.addEventListener("click", () => {
        closeSubjectCreate();
        setStatus("Subject creation cancelled.");
    });

    elements.subjectCreateForm.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
            const subjectRecord = createEmptySubjectRecord(state.subjects, elements.subjectCreateName?.value);
            state.subjects = saveSubjects([...state.subjects, subjectRecord]);
            state.activeSubjectId = subjectRecord.id;
            state.activeChapterTitle = "";
            state.activeMode = "quiz";
            state.expandedSubjectId = subjectRecord.id;
            persistSelection();
            closeSubjectCreate();
<<<<<<< HEAD
            setStatus(`Created subject "${subjectRecord.name}".`);
=======
            setStatus(`Created subject "${subjectRecord.name}". Use Export JSON to save it to the repo file.`);
>>>>>>> 0ee96ad (Add admin chapter import workflow)
            renderAll();
        } catch (error) {
            setStatus(error?.message || "Could not create subject.");
            elements.subjectCreateName?.focus();
        }
    });

<<<<<<< HEAD
=======
    elements.exportButton?.addEventListener("click", () => {
        try {
            const payload = serializeSubjects(state.subjects);
            const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "subjects.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setStatus("Downloaded subjects.json.");
        } catch (error) {
            setStatus(error?.message || "Could not export subjects.json.");
        }
    });

>>>>>>> 0ee96ad (Add admin chapter import workflow)
    elements.subjectSaveButton?.addEventListener("click", () => {
        const subject = getActiveSubject();
        const nextName = uniqueSubjectName(state.subjects, elements.subjectRenameInput?.value, subject?.id || "");
        if (!subject || !nextName) {
            setStatus("Choose a subject and enter a name first.");
            return;
        }

        const nextSubjects = state.subjects.map((entry) =>
            entry.id === subject.id
                ? { ...entry, name: nextName, updatedAt: now() }
                : entry
        );
        commitSubjects(nextSubjects, subject.id, state.activeChapterTitle);
<<<<<<< HEAD
        setStatus(`Renamed subject to "${nextName}".`);
=======
        setStatus(`Renamed subject to "${nextName}". Use Export JSON to save it to the repo file.`);
>>>>>>> 0ee96ad (Add admin chapter import workflow)
    });

    elements.subjectDeleteButton?.addEventListener("click", () => {
        const subject = getActiveSubject();
        if (!subject || state.subjects.length <= 1) {
            setStatus("Keep at least one subject available.");
            return;
        }

        const remainingSubjects = state.subjects.filter((entry) => entry.id !== subject.id);
        const nextSubject = remainingSubjects[0] || null;
        state.subjects = saveSubjects(remainingSubjects);
        state.activeSubjectId = nextSubject?.id || "";
        state.activeChapterTitle = nextSubject?.selectedChapter || nextSubject?.chapters[0]?.title || "";
        state.expandedSubjectId = nextSubject?.id || "";
        persistSelection();
        renderAll();
<<<<<<< HEAD
        setStatus(`Deleted subject "${subject.name}".`);
=======
        setStatus(`Deleted subject "${subject.name}". Use Export JSON to save the change to the repo file.`);
>>>>>>> 0ee96ad (Add admin chapter import workflow)
    });

    elements.chapterPreviewButton?.addEventListener("click", async () => {
        closeSubjectCreate();
        try {
            await renderChapterPreview();
            setStatus("");
        } catch (error) {
            renderPreviewError(elements.chapterPreviewStatus, elements.chapterPreviewContent, error);
        }
    });

    elements.chapterFileInput?.addEventListener("change", () => {
        closeSubjectCreate();
        const subject = getActiveSubject();
        if (!subject) {
            return;
        }

        const hasFile = Boolean(elements.chapterFileInput?.files?.length);
        if (elements.chapterPreviewStatus) {
            elements.chapterPreviewStatus.textContent = hasFile ? "Ready to preview" : "Waiting for a file";
        }
        if (elements.chapterPreviewContent) {
            elements.chapterPreviewContent.replaceChildren(
                emptyState(
                    hasFile ? "File selected" : "No file previewed yet",
                    hasFile
                        ? "Click Preview file to inspect the chapter before adding it."
                        : "Choose a JSON file to inspect the chapter before adding it."
                )
            );
        }
    });

    elements.chapterImportForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        closeSubjectCreate();
        const subject = getActiveSubject();
        if (!subject) {
            setStatus("Select a subject first.");
            return;
        }

        try {
            const quiz = await renderChapterPreview();
            if (!quiz) {
                return;
            }

            const sourceChapterTitle = textValue(quiz.selected_chapter) || quiz.chapters[0]?.title || "";
            const sourceChapter = quiz.chapters.find((chapter) => chapter.title === sourceChapterTitle) || quiz.chapters[0] || null;
            if (!sourceChapter) {
                setStatus("The selected file does not contain a usable chapter.");
                return;
            }

            const customChapterName = textValue(elements.chapterNameInput?.value);
            const uniqueTitle = uniqueChapterTitle(subject, customChapterName || sourceChapter.title);
<<<<<<< HEAD
            const importedChapter = {
                title: uniqueTitle,
                questions: cloneQuestions(sourceChapter.questions)
            };
=======
            const chapterFilePath = uniqueChapterFilePath(subject, uniqueTitle);
            const chapterPayload = {
                title: uniqueTitle,
                questions: cloneQuestions(sourceChapter.questions)
            };
            const importedChapter = {
                title: uniqueTitle,
                questions: cloneQuestions(sourceChapter.questions),
                file: chapterFilePath
            };

            const chapterDownloadName = chapterFilePath.split("/").pop() || "chapter.json";
            downloadTextFile(chapterDownloadName, `${JSON.stringify(chapterPayload, null, 2)}\n`);
>>>>>>> 0ee96ad (Add admin chapter import workflow)

            const nextSubjects = state.subjects.map((entry) =>
                entry.id === subject.id
                    ? {
                        ...entry,
                        chapters: [...entry.chapters, importedChapter],
                        selectedChapter: uniqueTitle,
                        updatedAt: now()
                    }
                    : entry
            );

            commitSubjects(nextSubjects, subject.id, uniqueTitle);
            elements.chapterImportForm.reset();
            if (elements.chapterNameInput) {
                elements.chapterNameInput.value = "";
            }
            if (elements.chapterPreviewStatus) {
                elements.chapterPreviewStatus.textContent = "Saved to browser";
            }
            if (elements.chapterPreviewContent) {
                elements.chapterPreviewContent.replaceChildren(
                    emptyState("Saved successfully", `The chapter was added to "${subject.name}".`)
                );
            }
<<<<<<< HEAD
            setStatus(`Added chapter "${uniqueTitle}" to "${subject.name}".`);
=======
            setStatus(`Added chapter "${uniqueTitle}" to "${subject.name}" and downloaded ${chapterDownloadName}. Use Export JSON to save the manifest to the repo file.`);
>>>>>>> 0ee96ad (Add admin chapter import workflow)
        } catch (error) {
            renderPreviewError(elements.chapterPreviewStatus, elements.chapterPreviewContent, error);
        }
    });

    elements.chapterSaveButton?.addEventListener("click", () => {
        const subject = getActiveSubject();
        const chapter = getActiveChapter();
        const nextTitle = textValue(elements.chapterRenameInput?.value);
        if (!subject || !chapter || !nextTitle) {
            setStatus("Choose a chapter and enter a title first.");
            return;
        }

        const uniqueTitle = uniqueChapterTitle(subject, nextTitle, chapter.title);
        const nextSubjects = state.subjects.map((entry) => {
            if (entry.id !== subject.id) {
                return entry;
            }

            const nextChapters = entry.chapters.map((chapterEntry) =>
                chapterEntry.title === chapter.title ? { ...chapterEntry, title: uniqueTitle } : chapterEntry
            );

            return {
                ...entry,
                selectedChapter: entry.selectedChapter === chapter.title ? uniqueTitle : entry.selectedChapter,
                chapters: nextChapters,
                updatedAt: now()
            };
        });

        commitSubjects(nextSubjects, subject.id, uniqueTitle);
        setStatus(`Renamed chapter to "${uniqueTitle}".`);
    });

    elements.chapterDeleteButton?.addEventListener("click", () => {
        const subject = getActiveSubject();
        const chapter = getActiveChapter();
        if (!subject || !chapter || subject.chapters.length <= 1) {
            setStatus("Keep at least one chapter in a subject.");
            return;
        }

        const chapterIndex = subject.chapters.findIndex((entry) => entry.title === chapter.title);
        const nextChapters = subject.chapters.filter((entry) => entry.title !== chapter.title);
        const fallbackChapter = nextChapters[Math.min(chapterIndex, nextChapters.length - 1)] || nextChapters[0] || null;

        const nextSubjects = state.subjects.map((entry) =>
            entry.id === subject.id
                ? {
                    ...entry,
                    selectedChapter: fallbackChapter?.title || "",
                    chapters: nextChapters,
                    updatedAt: now()
                }
                : entry
        );

        commitSubjects(nextSubjects, subject.id, fallbackChapter?.title || "");
        setStatus(`Deleted chapter "${chapter.title}".`);
    });

    elements.chapterNameInput?.addEventListener("input", () => {
        closeSubjectCreate();
        const subject = getActiveSubject();
        if (!subject) {
            setStatus("Select a subject first.");
            return;
        }

        setStatus(`Preparing to add a leaf to "${subject.name}".`);
    });

    elements.subjectRenameInput?.addEventListener("input", () => {
        const subject = getActiveSubject();
        if (subject) {
            setStatus(`Editing subject "${subject.name}".`);
        }
    });

    elements.chapterRenameInput?.addEventListener("input", () => {
        const chapter = getActiveChapter();
        if (chapter) {
            setStatus(`Editing chapter "${chapter.title}".`);
        }
    });

    elements.chapterPrev?.addEventListener("click", () => {
        const carousel = elements.chapterCarousel;
        if (!carousel) {
            return;
        }
        carousel.scrollBy({ left: -Math.max(260, carousel.clientWidth * 0.7), behavior: "smooth" });
    });

    elements.chapterNext?.addEventListener("click", () => {
        const carousel = elements.chapterCarousel;
        if (!carousel) {
            return;
        }
        carousel.scrollBy({ left: Math.max(260, carousel.clientWidth * 0.7), behavior: "smooth" });
    });

<<<<<<< HEAD
    window.addEventListener("storage", (event) => {
        if ([ACTIVE_SUBJECT_KEY, ACTIVE_CHAPTER_KEY, ACTIVE_MODE_KEY].includes(event.key)) {
            loadState();
=======
    window.addEventListener("storage", async (event) => {
        if ([ACTIVE_SUBJECT_KEY, ACTIVE_CHAPTER_KEY, ACTIVE_MODE_KEY].includes(event.key)) {
            await loadState();
>>>>>>> 0ee96ad (Add admin chapter import workflow)
            renderAll();
        }
    });

<<<<<<< HEAD
    loadState();
=======
    await loadState();
>>>>>>> 0ee96ad (Add admin chapter import workflow)
    if (isAdminUnlocked()) {
        showAdminApp();
    } else {
        hideAdminApp();
    }
    renderAll();
});
