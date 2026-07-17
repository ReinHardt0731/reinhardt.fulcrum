import {
    ACTIVE_CHAPTER_KEY,
    ACTIVE_MODE_KEY,
    ACTIVE_SUBJECT_KEY,
    ADMIN_PASSWORD,
    buildChapterFilePath,
    getChapterByTitle,
    getSubjectById,
    isAdminUnlocked,
    previewQuizFile,
    saveSubjects,
    serializeSubjects,
    setAdminUnlocked,
    storageSelectState,
    syncSelection,
    tallyQuestionCount,
    textValue
} from "./shared.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("admin.js start", {
        bodyClass: document.body.className,
        hasAdminPageClass: document.body.classList.contains("admin-page")
    });
    if (!document.body.classList.contains("admin-page")) {
        console.warn("Admin page logic skipped because body does not have admin-page class.");
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
        sidebarCard: document.getElementById("admin-sidebar-card"),
        sidebarBody: document.getElementById("admin-sidebar-body"),
        sidebarToggle: document.getElementById("admin-sidebar-toggle"),
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
        exportButton: document.getElementById("admin-export-button"),
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
        ,notesUploadForm: document.getElementById("notes-upload-form")
        ,notesFileInput: document.getElementById("notes-file-input")
        ,notesPreviewButton: document.getElementById("notes-preview-button")
        ,notesUploadButton: document.getElementById("notes-upload-button")
        ,notesPreviewStatus: document.getElementById("notes-upload-status")
        ,notesPreviewContent: document.getElementById("notes-preview-content")
    };

    if (!elements.lockForm || !elements.lockPanel || !elements.adminApp) {
        return;
    }

    const state = {
        subjects: [],
        activeSubjectId: "",
        activeChapterTitle: "",
        activeMode: "quiz",
        expandedSubjectId: "",
        sidebarExpanded: true
    };

    const now = () => new Date().toISOString();
    const text = (value) => String(value ?? "").trim();
    const slugify = (value) =>
        text(value)
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

    const getActiveSubject = () => getSubjectById(state.subjects, state.activeSubjectId) || state.subjects[0] || null;
    const getActiveChapter = () => {
        const subject = getActiveSubject();
        if (!subject) {
            return null;
        }
        return getChapterByTitle(subject, state.activeChapterTitle) || subject.chapters[0] || null;
    };
    const persistSelection = () => syncSelection(state.activeSubjectId, state.activeChapterTitle, state.activeMode);

    const uniqueSubjectName = (subjects, rawName, excludedId = "") => {
        const value = text(rawName);
        if (!value) {
            return "";
        }
        const existing = new Set(subjects.filter((subject) => subject.id !== excludedId).map((subject) => text(subject.name).toLowerCase()));
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
        const existing = new Set(subjects.filter((subject) => subject.id !== excludedId).map((subject) => text(subject.id)));
        if (!existing.has(base)) {
            return base;
        }
        let suffix = 2;
        while (existing.has(`${base}-${suffix}`)) {
            suffix += 1;
        }
        return `${base}-${suffix}`;
    };

    const uniqueChapterFilePath = (subject, rawTitle, excludedTitle = "") => {
        const basePath = buildChapterFilePath(rawTitle || "chapter");
        const existing = new Set(
            subject?.chapters
                ?.filter((chapter) => chapter.title !== excludedTitle)
                .map((chapter) => text(chapter.file))
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

    const uniqueChapterTitle = (subject, rawTitle, excludedTitle = "") => {
        const value = text(rawTitle);
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

    const setStatus = (message) => {
        if (elements.statusLine) {
            elements.statusLine.textContent = message;
        }
    };

    const showAdminApp = () => {
        elements.adminApp.hidden = false;
        elements.lockPanel.hidden = true;
    };
    const hideAdminApp = () => {
        elements.adminApp.hidden = true;
        elements.lockPanel.hidden = false;
    };

    const setSidebarExpanded = (expanded) => {
        state.sidebarExpanded = expanded;
        if (elements.sidebarBody) {
            elements.sidebarBody.hidden = !expanded;
        }
        if (elements.sidebarToggle) {
            elements.sidebarToggle.setAttribute("aria-expanded", String(expanded));
            elements.sidebarToggle.setAttribute("aria-label", expanded ? "Collapse subject sidebar" : "Expand subject sidebar");
            elements.sidebarToggle.textContent = expanded ? "▾" : "▸";
        }
        if (elements.sidebarCard) {
            elements.sidebarCard.classList.toggle("is-collapsed", !expanded);
        }
    };

    const toggleSidebar = () => setSidebarExpanded(!state.sidebarExpanded);

    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener("click", toggleSidebar);
    }
    setSidebarExpanded(state.sidebarExpanded);

    const renderSummary = () => {
        if (elements.librarySummary) {
            const chapterCount = state.subjects.reduce((sum, subject) => sum + subject.chapters.length, 0);
            const questionCount = state.subjects.reduce((sum, subject) => sum + tallyQuestionCount(subject), 0);
            elements.librarySummary.textContent = `${state.subjects.length} subjects | ${chapterCount} chapters | ${questionCount} questions`;
        }
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
            const isActive = subject.id === state.activeSubjectId;
            const isExpanded = subject.id === state.expandedSubjectId;
            const card = document.createElement("div");
            card.className = "subject-card";
            card.dataset.subjectId = subject.id;
            const header = document.createElement("button");
            header.type = "button";
            header.className = "subject-item";
            if (isActive) {
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
                Object.assign(document.createElement("span"), { className: "subject-item-meta", textContent: `${subject.chapters.length} chapter${subject.chapters.length === 1 ? "" : "s"} | ${tallyQuestionCount(subject)} questions` })
            );
            const caret = document.createElement("span");
            caret.className = "subject-item-caret";
            caret.textContent = "▾";
            const actionGroup = document.createElement("div");
            actionGroup.className = "subject-item-actions";
            const moveUpButton = document.createElement("button");
            moveUpButton.type = "button";
            moveUpButton.className = "icon-button subject-item-order-button";
            moveUpButton.disabled = state.subjects[0]?.id === subject.id;
            moveUpButton.setAttribute("aria-label", `Move ${subject.name} up`);
            moveUpButton.textContent = "▲";
            moveUpButton.addEventListener("click", (event) => {
                event.stopPropagation();
                moveSubject(subject.id, -1);
            });
            const moveDownButton = document.createElement("button");
            moveDownButton.type = "button";
            moveDownButton.className = "icon-button subject-item-order-button";
            moveDownButton.disabled = state.subjects[state.subjects.length - 1]?.id === subject.id;
            moveDownButton.setAttribute("aria-label", `Move ${subject.name} down`);
            moveDownButton.textContent = "▼";
            moveDownButton.addEventListener("click", (event) => {
                event.stopPropagation();
                moveSubject(subject.id, 1);
            });
            actionGroup.append(moveUpButton, moveDownButton);
            header.append(copy, caret);
            header.addEventListener("click", () => toggleSubject(subject.id));
            const headerShell = document.createElement("div");
            headerShell.className = "subject-item-shell";
            headerShell.append(header, actionGroup);
            const chapterList = document.createElement("div");
            chapterList.className = "subject-chapters";
            chapterList.id = `admin-subject-chapters-${subject.id}`;
            chapterList.hidden = !isExpanded;
            header.setAttribute("aria-controls", chapterList.id);
            card.append(headerShell, chapterList);
            subject.chapters.forEach((chapter, chapterIndex) => {
                const chapterRow = document.createElement("div");
                chapterRow.className = "subject-chapter-entry";
                const chapterButton = document.createElement("button");
                chapterButton.type = "button";
                chapterButton.className = "subject-chapter-item";
                if (isActive && chapter.title === state.activeChapterTitle) {
                    chapterButton.classList.add("is-active");
                }
                chapterButton.textContent = chapter.title;
                chapterButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    selectSubject(subject.id, chapter.title);
                });
                const chapterActions = document.createElement("div");
                chapterActions.className = "chapter-item-actions";
                const chapterMoveUp = document.createElement("button");
                chapterMoveUp.type = "button";
                chapterMoveUp.className = "icon-button chapter-item-order-button";
                chapterMoveUp.disabled = chapterIndex === 0;
                chapterMoveUp.setAttribute("aria-label", `Move ${chapter.title} up`);
                chapterMoveUp.textContent = "▲";
                chapterMoveUp.addEventListener("click", (event) => {
                    event.stopPropagation();
                    moveChapter(subject.id, chapter.title, -1);
                });
                const chapterMoveDown = document.createElement("button");
                chapterMoveDown.type = "button";
                chapterMoveDown.className = "icon-button chapter-item-order-button";
                chapterMoveDown.disabled = chapterIndex === subject.chapters.length - 1;
                chapterMoveDown.setAttribute("aria-label", `Move ${chapter.title} down`);
                chapterMoveDown.textContent = "▼";
                chapterMoveDown.addEventListener("click", (event) => {
                    event.stopPropagation();
                    moveChapter(subject.id, chapter.title, 1);
                });
                chapterActions.append(chapterMoveUp, chapterMoveDown);
                chapterRow.append(chapterButton, chapterActions);
                chapterList.appendChild(chapterRow);
            });
            elements.subjectList.appendChild(card);
        });
    };

    const moveChapter = (subjectId, chapterTitle, direction) => {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject) {
            return;
        }
        const index = subject.chapters.findIndex((chapter) => chapter.title === chapterTitle);
        if (index < 0) {
            return;
        }
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= subject.chapters.length) {
            return;
        }
        const nextSubjects = state.subjects.map((entry) => {
            if (entry.id !== subject.id) {
                return entry;
            }
            const nextChapters = [...entry.chapters];
            const [movedChapter] = nextChapters.splice(index, 1);
            nextChapters.splice(nextIndex, 0, movedChapter);
            return { ...entry, chapters: nextChapters, updatedAt: now() };
        });
        commitSubjects(nextSubjects, subjectId, chapterTitle);
        setStatus(`Moved chapter “${chapterTitle}” ${direction < 0 ? "up" : "down"}.`);
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
            elements.chapterCarousel.appendChild(emptyState("No subject selected", "Choose a branch from the sidebar to manage its leaves."));
            return;
        }
        if (!subject.chapters.length) {
            elements.chapterCarousel.appendChild(emptyState("No chapters yet", "Add the first leaf using the form below."));
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
                Object.assign(document.createElement("span"), { className: "chapter-carousel-meta", textContent: `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}` })
            );
            card.addEventListener("click", () => selectChapter(chapter.title));
            elements.chapterCarousel.appendChild(card);
        });
    };

    const moveChapterSelection = (direction) => {
        const subject = getActiveSubject();
        if (!subject || !subject.chapters.length) {
            return;
        }
        const currentIndex = subject.chapters.findIndex((chapter) => chapter.title === state.activeChapterTitle);
        const nextIndex = currentIndex < 0
            ? 0
            : (currentIndex + direction + subject.chapters.length) % subject.chapters.length;
        selectChapter(subject.chapters[nextIndex].title);
    };

    const moveSubject = (subjectId, direction) => {
        const index = state.subjects.findIndex((subject) => subject.id === subjectId);
        if (index < 0) {
            return;
        }
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= state.subjects.length) {
            return;
        }
        const nextSubjects = [...state.subjects];
        const [movedSubject] = nextSubjects.splice(index, 1);
        nextSubjects.splice(nextIndex, 0, movedSubject);
        commitSubjects(nextSubjects, subjectId, state.activeChapterTitle);
        setStatus(`Moved subject “${movedSubject.name}” ${direction < 0 ? "up" : "down"}.`);
    };

    const renderChapterEditor = () => {
        const subject = getActiveSubject();
        const chapter = getActiveChapter();
        const hasSubject = Boolean(subject);
        const hasChapter = Boolean(chapter);
        const hasCarouselChapters = Boolean(subject && subject.chapters.length > 1);
        if (elements.activeSubjectTitle) {
            elements.activeSubjectTitle.textContent = subject ? subject.name : "No subject selected";
        }
        if (elements.chapterSummary) {
            elements.chapterSummary.textContent = subject ? `${subject.chapters.length} chapters | ${tallyQuestionCount(subject)} questions` : "No chapters";
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
        if (elements.notesFileInput) {
            elements.notesFileInput.disabled = !hasSubject;
        }
        if (elements.notesPreviewButton) {
            elements.notesPreviewButton.disabled = !hasSubject;
        }
        if (elements.notesUploadButton) {
            elements.notesUploadButton.disabled = !hasSubject;
        }
    };

    const renderAll = () => {
        renderSummary();
        renderSubjectList();
        renderSubjectEditor();
        renderChapterCarousel();
        renderChapterEditor();
        renderNotesPreviewStatus();
    };

    const renderNotesPreviewStatus = () => {
        const subject = getActiveSubject();
        if (elements.notesPreviewStatus) {
            elements.notesPreviewStatus.textContent = subject && subject.notesPath ? "Attached" : "No notes";
        }
    };

    // Resize handler: compute branch/leaves distribution (40% / 60%) for desktop
    const applyAdminLayoutVars = (width) => {
        // Only apply dynamic widths for widths >= 768px (desktop/tablet)
        if (width >= 768) {
            const branchPx = Math.max(280, Math.round(width * 0.36));
            const leavesPx = Math.max(420, Math.round(width * 0.64));
            document.documentElement.style.setProperty("--admin-branch-width", `${branchPx}px`);
            document.documentElement.style.setProperty("--admin-leaves-width", `${leavesPx}px`);
        } else {
            document.documentElement.style.removeProperty("--admin-branch-width");
            document.documentElement.style.removeProperty("--admin-leaves-width");
        }
    };

    const debouncedApply = (() => {
        let t = null;
        return () => {
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                applyAdminLayoutVars(window.innerWidth);
                t = null;
            }, 120);
        };
    })();

    window.addEventListener("resize", debouncedApply);
    // apply once on load
    applyAdminLayoutVars(window.innerWidth);

    // Carousel column count: choose a sensible number of cards per row based on window width
    const applyCarouselCount = (width) => {
        let count = 1;
        if (width >= 1400) count = 3;
        else if (width >= 1024) count = 2;
        else if (width >= 768) count = 2;
        document.documentElement.style.setProperty("--admin-carousel-count", String(count));
    };

    const debouncedCarousel = (() => {
        let t = null;
        return () => {
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                applyCarouselCount(window.innerWidth);
                t = null;
            }, 120);
        };
    })();

    window.addEventListener("resize", debouncedCarousel);
    applyCarouselCount(window.innerWidth);

    const selectSubject = (subjectId, chapterTitle = "") => {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject) {
            return;
        }
        const resolvedChapterTitle = text(chapterTitle || subject.selectedChapter || subject.chapters[0]?.title || "");
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
            previewContent.replaceChildren(emptyState("Could not parse this file", error?.message || "The JSON file does not match the quiz format."));
        }
    };

    const loadState = async () => {
        const fresh = await storageSelectState();
        state.subjects = fresh.subjects;
        state.activeSubjectId = fresh.activeSubject?.id || state.subjects[0]?.id || "";
        state.activeMode = fresh.mode || "quiz";
        const subject = getActiveSubject();
        state.activeChapterTitle = subject ? getChapterByTitle(subject, fresh.activeChapter?.title || subject.selectedChapter || subject.chapters[0]?.title || "")?.title || subject.selectedChapter || subject.chapters[0]?.title || "" : "";
        state.expandedSubjectId = state.activeSubjectId;
    };

    const resolveNotesPath = (notesPath) => {
        if (!notesPath || typeof notesPath !== "string") {
            return null;
        }
        const trimmed = notesPath.trim();
        if (!trimmed) {
            return null;
        }
        return (trimmed.includes("/") || trimmed.startsWith("./") || trimmed.startsWith("../"))
            ? trimmed
            : `markdowns/${trimmed}`;
    };

    const persistLibraryToServer = async (subjects) => {
        const payload = serializeSubjects(subjects);
        const notes = {};

        await Promise.all(subjects.map(async (subject) => {
            const path = resolveNotesPath(subject.notesPath);
            if (!path) {
                return;
            }
            try {
                const response = await fetch(path, { cache: "no-store" });
                if (!response.ok) {
                    return;
                }
                const text = await response.text();
                if (text.trim()) {
                    notes[subject.id] = text;
                }
            } catch {
                // ignore missing note files
            }
        }));

        try {
            const response = await fetch("/api/save-library", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subjects: saveSubjects(subjects), payload, notes })
            });
            if (!response.ok) {
                throw new Error(`Save failed with HTTP ${response.status}`);
            }
            return await response.json().catch(() => ({ saved: true }));
        } catch (error) {
            console.warn("Unable to save the library to the repo-backed file:", error);
            return { saved: false, error };
        }
    };

    const commitSubjects = (subjects, subjectId = state.activeSubjectId, chapterTitle = state.activeChapterTitle) => {
        state.subjects = saveSubjects(subjects);
        const subject = getSubjectById(state.subjects, subjectId) || state.subjects[0] || null;
        state.activeSubjectId = subject ? subject.id : "";
        state.activeChapterTitle = subject ? getChapterByTitle(subject, chapterTitle)?.title || subject.selectedChapter || subject.chapters[0]?.title || "" : "";
        state.expandedSubjectId = subject ? subject.id : "";
        persistSelection();
        renderAll();
        void persistLibraryToServer(state.subjects);
    };

    const renderQuizPreview = async ({ fileInput, previewStatus, previewContent, subjectOverride = "", note = "" }) => {
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
                Object.assign(document.createElement("p"), { textContent: `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}` })
            );
            chapterCards.appendChild(chapterCard);
        });
        previewContent.append(summary, chapterCards);
        return quiz;
    };

    // Notes helpers
    const parseMarkdownFile = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Unable to read markdown file."));
        reader.readAsText(file, "utf-8");
    });

    elements.notesPreviewButton?.addEventListener("click", async () => {
        try {
            const subject = getActiveSubject();
            if (!subject) throw new Error("Select a subject first.");
            const file = elements.notesFileInput?.files?.[0];
            if (!file) throw new Error("Choose a Markdown file first.");
            const md = await parseMarkdownFile(file);
            elements.notesPreviewContent.replaceChildren();
            const pre = document.createElement("pre");
            pre.textContent = md.slice(0, 10000);
            elements.notesPreviewContent.appendChild(pre);
            if (elements.notesPreviewStatus) elements.notesPreviewStatus.textContent = "Preview ready";
        } catch (err) {
            if (elements.notesPreviewContent) elements.notesPreviewContent.replaceChildren(emptyState("Could not preview notes", err.message));
            if (elements.notesPreviewStatus) elements.notesPreviewStatus.textContent = "Preview failed";
        }
    });

    elements.notesUploadForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const subject = getActiveSubject();
            if (!subject) throw new Error("Select a subject first.");
            const file = elements.notesFileInput?.files?.[0];
            if (!file) throw new Error("Choose a Markdown file first.");
            const md = await parseMarkdownFile(file);
            const fileName = file.name.trim() || `${subject.id}.md`;
            const notesPath = fileName.toLowerCase().endsWith(".md") ? fileName : `${fileName}.md`;
            const nextSubjects = state.subjects.map((s) => s.id === subject.id ? { ...s, notesPath, updatedAt: now() } : s);
            commitSubjects(nextSubjects, subject.id, state.activeChapterTitle);
            // Persist notes and static path to server via save-library API
            const body = { subjects: saveSubjects(nextSubjects), payload: serializeSubjects(nextSubjects), notes: { [subject.id]: md } };
            try {
                await fetch("/api/save-library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            } catch (err) {
                // ignore server errors; still attach locally
            }
            setStatus(`Attached notes to “${subject.name}”.`);
            if (elements.notesPreviewStatus) elements.notesPreviewStatus.textContent = "Attached";
        } catch (err) {
            setStatus(err.message || "Unable to attach notes.");
            if (elements.notesPreviewStatus) elements.notesPreviewStatus.textContent = "Attach failed";
        }
    });

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
        const note = chapterName ? `This chapter will be added to "${subject.name}" as "${chapterName}".` : `Enter a chapter title to save it into "${subject.name}".`;
        return renderQuizPreview({ fileInput: elements.chapterFileInput, previewStatus: elements.chapterPreviewStatus, previewContent: elements.chapterPreviewContent, note });
    };

    if (isAdminUnlocked()) {
        showAdminApp();
    } else {
        hideAdminApp();
    }

    elements.lockForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const enteredPassword = textValue(elements.passwordInput.value);
            console.log("admin login attempt", { enteredPassword, expectedPassword: ADMIN_PASSWORD });
            if (enteredPassword === ADMIN_PASSWORD) {
                setAdminUnlocked();
                elements.lockStatus.textContent = "";
                showAdminApp();
                elements.passwordInput.value = "";
                await loadState();
                renderAll();
                return;
            }
            elements.lockStatus.textContent = "Wrong password. Try again.";
        } catch (error) {
            console.error("Admin login handler failed", error);
            elements.lockStatus.textContent = "Unable to process login. Check console for details.";
        }
    });

    elements.subjectAddToggle.addEventListener("click", () => {
        if (elements.subjectCreateForm?.hidden !== false) {
            openSubjectCreate();
            setStatus("Enter a subject name and create the branch.");
            return;
        }
        elements.subjectCreateName?.focus();
    });
    elements.subjectCreateCancel.addEventListener("click", () => {
        closeSubjectCreate();
        setStatus("Subject creation cancelled.");
    });
    elements.subjectCreateForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const subjectName = textValue(elements.subjectCreateName.value);
        if (!subjectName) {
            setStatus("Enter a subject name.");
            return;
        }
        const subjectRecord = createEmptySubjectRecord(state.subjects, subjectName);
        commitSubjects([...state.subjects, subjectRecord], subjectRecord.id, "");
        closeSubjectCreate();
        setStatus(`Created subject “${subjectRecord.name}”.`);
    });
    elements.subjectSaveButton.addEventListener("click", () => {
        const subject = getActiveSubject();
        if (!subject) {
            return;
        }
        const nextName = textValue(elements.subjectRenameInput.value);
        if (!nextName) {
            setStatus("Enter a subject name.");
            return;
        }
        const nextSubjects = state.subjects.map((entry) => entry.id === subject.id ? { ...entry, name: nextName, updatedAt: now() } : entry);
        commitSubjects(nextSubjects, subject.id, state.activeChapterTitle);
        setStatus(`Renamed subject to “${nextName}”.`);
    });
    elements.subjectDeleteButton.addEventListener("click", () => {
        const subject = getActiveSubject();
        if (!subject || state.subjects.length <= 1) {
            return;
        }
        const nextSubjects = state.subjects.filter((entry) => entry.id !== subject.id);
        commitSubjects(nextSubjects, nextSubjects[0]?.id || "", "");
        setStatus(`Deleted subject “${subject.name}”.`);
    });
    elements.chapterPreviewButton.addEventListener("click", async () => {
        try {
            await renderChapterPreview();
        } catch (error) {
            renderPreviewError(elements.chapterPreviewStatus, elements.chapterPreviewContent, error);
        }
    });
    elements.chapterImportForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const subject = getActiveSubject();
            if (!subject) {
                throw new Error("Select a subject first.");
            }
            const preview = await renderChapterPreview();
            if (!preview) {
                return;
            }
            const chapterTitle = uniqueChapterTitle(subject, textValue(elements.chapterNameInput.value), "");
            const chapterFile = uniqueChapterFilePath(subject, chapterTitle, "");
            const nextChapter = {
                title: chapterTitle,
                file: chapterFile,
                questions: preview.chapters.flatMap((chapter) => chapter.questions || []),
                updatedAt: now()
            };
            const nextSubjects = state.subjects.map((entry) => entry.id === subject.id ? { ...entry, chapters: [...entry.chapters, nextChapter], selectedChapter: chapterTitle, updatedAt: now() } : entry);
            commitSubjects(nextSubjects, subject.id, chapterTitle);
            setStatus(`Added chapter “${chapterTitle}” to “${subject.name}”.`);
        } catch (error) {
            renderPreviewError(elements.chapterPreviewStatus, elements.chapterPreviewContent, error);
        }
    });
    elements.chapterSaveButton.addEventListener("click", () => {
        const chapter = getActiveChapter();
        if (!chapter) {
            return;
        }
        const nextName = textValue(elements.chapterRenameInput.value);
        if (!nextName) {
            setStatus("Enter a chapter name.");
            return;
        }
        const nextSubjects = state.subjects.map((subject) => subject.id === state.activeSubjectId ? { ...subject, chapters: subject.chapters.map((entry) => entry.title === chapter.title ? { ...entry, title: nextName, updatedAt: now() } : entry), updatedAt: now() } : subject);
        commitSubjects(nextSubjects, state.activeSubjectId, nextName);
        setStatus(`Renamed chapter to “${nextName}”.`);
    });
    elements.chapterDeleteButton.addEventListener("click", () => {
        const chapter = getActiveChapter();
        if (!chapter) {
            return;
        }
        const nextSubjects = state.subjects.map((subject) => subject.id === state.activeSubjectId ? { ...subject, chapters: subject.chapters.filter((entry) => entry.title !== chapter.title), updatedAt: now() } : subject);
        commitSubjects(nextSubjects, state.activeSubjectId, "");
        setStatus(`Deleted chapter “${chapter.title}”.`);
    });
    elements.exportButton.addEventListener("click", async () => {
        const payload = serializeSubjects(state.subjects);
        const blob = new Blob([payload], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "subjects.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        const saveResult = await persistLibraryToServer(state.subjects);
        setStatus(saveResult?.saved ? "Downloaded subjects.json and saved the repo-backed library." : "Downloaded subjects.json. Auto-save to the repo was not available.");
    });
    elements.chapterPrev.addEventListener("click", () => moveChapterSelection(-1));
    elements.chapterNext.addEventListener("click", () => moveChapterSelection(1));

    await loadState();
    renderAll();
});
