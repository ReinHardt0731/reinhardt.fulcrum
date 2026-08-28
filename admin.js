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
    textValue,
    hydrateMarkdownPreview,
    renderMarkdownPreview,
    renderForceSystemModelCard
} from "./shared.js";
import { initAdminShell } from "./admin-shell.js";

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
        subjectRail: document.getElementById("admin-subject-rail"),
        drawerOpen: document.getElementById("admin-drawer-open"),
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
        libraryQuestionSummary: document.getElementById("admin-library-question-summary"),
        libraryNotesSummary: document.getElementById("admin-library-notes-summary"),
        exportButton: document.getElementById("admin-export-button"),
        exportCard: document.getElementById("admin-export-card"),
        chapterSummary: document.getElementById("admin-chapter-summary"),
        chapterCarousel: document.getElementById("admin-chapter-carousel"),
        chapterOrderList: document.getElementById("admin-chapter-order-list"),
        chapterReorderAnnouncer: document.getElementById("admin-chapter-reorder-announcer"),
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
        ,contextSubject: document.getElementById("admin-context-subject")
        ,contextChapter: document.getElementById("admin-context-chapter")
        ,contextNotes: document.getElementById("admin-context-notes")
        ,contextSave: document.getElementById("admin-context-save")
        ,sectionNav: document.querySelectorAll("[data-admin-target]")
        ,notesSourceEditor: document.getElementById("notes-source-editor")
        ,notesLoadAttachedButton: document.getElementById("notes-load-attached-button")
        ,notesEditorPreviewButton: document.getElementById("notes-editor-preview-button")
        ,notesSaveButton: document.getElementById("notes-save-button")
        ,notesEditorPreview: document.getElementById("notes-editor-preview")
        ,notesPreviewModes: document.querySelectorAll("[data-notes-preview-mode]")
        ,assistantForm: document.getElementById("equation-assistant-form")
        ,assistantTitle: document.getElementById("assistant-title")
        ,assistantSubtitle: document.getElementById("assistant-subtitle")
        ,assistantDisplayEquation: document.getElementById("assistant-display-equation")
        ,assistantDefinition: document.getElementById("assistant-definition")
        ,assistantDefinitionField: document.querySelector(".assistant-definition-field")
        ,assistantGraphXVariable: document.getElementById("assistant-graph-x-variable")
        ,assistantGraphXLabel: document.getElementById("assistant-graph-x-label")
        ,assistantGraphYLabel: document.getElementById("assistant-graph-y-label")
        ,assistantGraphXMin: document.getElementById("assistant-graph-x-min")
        ,assistantGraphXMax: document.getElementById("assistant-graph-x-max")
        ,assistantGraphYMin: document.getElementById("assistant-graph-y-min")
        ,assistantGraphYMax: document.getElementById("assistant-graph-y-max")
        ,assistantNotes: document.getElementById("assistant-notes")
        ,assistantViewMarkdownButton: document.getElementById("assistant-view-markdown-button")
        ,assistantPreviewButton: document.getElementById("assistant-preview-button")
        ,assistantResetButton: document.getElementById("assistant-reset-button")
        ,assistantStatus: document.getElementById("assistant-status")
        ,assistantPreview: document.getElementById("assistant-preview")
        ,forceSystemModelJson: document.getElementById("force-system-model-json")
        ,forceSystemModelPreviewButton: document.getElementById("force-system-model-preview-button")
        ,forceSystemModelStatus: document.getElementById("force-system-model-status")
        ,forceSystemModelPreview: document.getElementById("force-system-model-preview")
    };

    if (!elements.exportButton && document.body.dataset.adminPage === "notes") {
        const notesHeaderActions = document.querySelector(".admin-notes-page .hero-actions");
        if (notesHeaderActions) {
            const notesExportButton = document.createElement("button");
            notesExportButton.type = "button";
            notesExportButton.id = "admin-export-button";
            notesExportButton.className = "ghost-button admin-topbar-export";
            notesExportButton.textContent = "Export JSON";
            notesHeaderActions.prepend(notesExportButton);
            elements.exportButton = notesExportButton;
        }
    }

    if (!elements.lockForm || !elements.lockPanel || !elements.adminApp) {
        return;
    }

    let loadFluidConvergingDefaults = null;
    const ensureAssistantModeControls = () => {
        const form = elements.assistantForm;
        if (!form || form.querySelector("#assistant-card-mode")) return;
        const modeLabel = document.createElement("label");
        modeLabel.innerHTML = '<span class="section-label">Card mode</span><select id="assistant-card-mode"><option value="standard">Standard equation card</option><option value="variable-behavior">Conservation variable behavior</option><option value="particle-physics">Particle physics collision lab</option><option value="fluid-control-volume">Fluid control-volume thermodynamics</option></select>';
        const settings = document.createElement("div");
        settings.id = "assistant-conservation-settings";
        settings.className = "admin-assistant-grid assistant-conservation-settings";
        settings.innerHTML = '<label><span class="section-label">Active variables</span><input id="assistant-active-variables" type="text" value="A_1, V_2" placeholder="A_1, V_2"><small>Select exactly two adjustable symbols.</small></label><label><span class="section-label">Left axis label</span><input id="assistant-left-axis-label" type="text" value="Area"></label><label><span class="section-label">Left axis unit</span><input id="assistant-left-axis-unit" type="text" value="m^2"></label><label><span class="section-label">Right axis label</span><input id="assistant-right-axis-label" type="text" value="Velocity"></label><label><span class="section-label">Right axis unit</span><input id="assistant-right-axis-unit" type="text" value="m/s"></label><p class="hero-meta compact-note assistant-conservation-help">Use the first definition line as the relationship. Adjustable syntax is <code>A_1(m^2,5.8,10,1,0.1,left,Inlet Area) = (A_1)</code>; fixed constants use <code>rho(fixed,1.225,kg/m^3,Air density) = (rho)</code>.</p>';
        const particleSettings = document.createElement("div");
        settings.insertAdjacentHTML("beforeend", '<label><span class="section-label">Visualization</span><select id="assistant-conservation-visualization"><option value="variable-behavior">Bar Graph</option><option value="duct-particle">Duct Particle Windows</option></select></label>');
        const ductSettings = document.createElement("div");
        ductSettings.id = "assistant-duct-particle-settings";
        ductSettings.className = "assistant-duct-particle-settings";
        ductSettings.hidden = true;
        ductSettings.innerHTML = '<div class="admin-assistant-grid"><label>Particle count<input id="assistant-duct-particle-count" type="number" min="8" max="100" step="1" value="24"></label><label>Speed scale<input id="assistant-duct-particle-speed" type="number" min="0.1" step="0.1" value="1"></label><label>Trails<select id="assistant-duct-particle-trails"><option value="true">Show</option><option value="false">Hide</option></select></label><label>Velocity vectors<select id="assistant-duct-particle-vectors"><option value="true">Show</option><option value="false">Hide</option></select></label></div><p class="hero-meta compact-note">Duct windows are a conceptual parcel-flow visualization, not a CFD simulation.</p>';
        particleSettings.id = "assistant-particle-physics-settings";
        particleSettings.className = "assistant-particle-physics-settings";
        particleSettings.hidden = true;
        particleSettings.innerHTML = '<div class="mode-header"><div><p class="section-label">Two-body collision</p><h4>Particle settings</h4></div></div><div class="admin-assistant-grid assistant-particle-global-grid"><label><span class="section-label">Restitution value</span><input id="assistant-particle-restitution-value" type="number" min="0" max="1" step="0.05" value="1"></label><label><span class="section-label">Restitution min</span><input id="assistant-particle-restitution-min" type="number" min="0" max="1" step="0.05" value="0"></label><label><span class="section-label">Restitution max</span><input id="assistant-particle-restitution-max" type="number" min="0" max="1" step="0.05" value="1"></label><label><span class="section-label">Restitution step</span><input id="assistant-particle-restitution-step" type="number" min="0.01" max="1" step="0.01" value="0.05"></label></div><div class="assistant-particle-authors"><div class="assistant-particle-author"><h4>Particle 1</h4><div class="admin-assistant-grid"><label>Name<input id="assistant-particle-p1-name" type="text" value="Particle 1"></label><label>Symbol<input id="assistant-particle-p1-symbol" type="text" value="m_1"></label><label>Color<input id="assistant-particle-p1-color" type="text" value="#4db8ff"></label><label>Position<input id="assistant-particle-p1-position" type="number" value="-4" step="0.1"></label><label>Mass value<input id="assistant-particle-p1-mass-value" type="number" value="2" step="0.1"></label><label>Mass min<input id="assistant-particle-p1-mass-min" type="number" value="0.5" step="0.1"></label><label>Mass max<input id="assistant-particle-p1-mass-max" type="number" value="5" step="0.1"></label><label>Mass step<input id="assistant-particle-p1-mass-step" type="number" value="0.1" step="0.1"></label><label>Velocity value<input id="assistant-particle-p1-velocity-value" type="number" value="3" step="0.1"></label><label>Velocity min<input id="assistant-particle-p1-velocity-min" type="number" value="-10" step="0.1"></label><label>Velocity max<input id="assistant-particle-p1-velocity-max" type="number" value="10" step="0.1"></label><label>Velocity step<input id="assistant-particle-p1-velocity-step" type="number" value="0.1" step="0.1"></label></div></div><div class="assistant-particle-author"><h4>Particle 2</h4><div class="admin-assistant-grid"><label>Name<input id="assistant-particle-p2-name" type="text" value="Particle 2"></label><label>Symbol<input id="assistant-particle-p2-symbol" type="text" value="m_2"></label><label>Color<input id="assistant-particle-p2-color" type="text" value="#bd5cff"></label><label>Position<input id="assistant-particle-p2-position" type="number" value="4" step="0.1"></label><label>Mass value<input id="assistant-particle-p2-mass-value" type="number" value="1" step="0.1"></label><label>Mass min<input id="assistant-particle-p2-mass-min" type="number" value="0.5" step="0.1"></label><label>Mass max<input id="assistant-particle-p2-mass-max" type="number" value="5" step="0.1"></label><label>Mass step<input id="assistant-particle-p2-mass-step" type="number" value="0.1" step="0.1"></label><label>Velocity value<input id="assistant-particle-p2-velocity-value" type="number" value="0" step="0.1"></label><label>Velocity min<input id="assistant-particle-p2-velocity-min" type="number" value="-10" step="0.1"></label><label>Velocity max<input id="assistant-particle-p2-velocity-max" type="number" value="10" step="0.1"></label><label>Velocity step<input id="assistant-particle-p2-velocity-step" type="number" value="0.1" step="0.1"></label></div></div></div><p class="hero-meta compact-note">Mass units are kg, velocity units are m/s, and restitution must be between 0 and 1. The exported card uses the built-in two-body collision model.</p>';
        const fluidSettings = document.createElement("div");
        fluidSettings.id = "assistant-fluid-settings";
        fluidSettings.className = "assistant-fluid-settings";
        fluidSettings.hidden = true;
        fluidSettings.innerHTML = '<div class="mode-header"><div><p class="section-label">2D fluid field</p><h4>Control-volume settings</h4></div></div><div class="assistant-fluid-grid"><label>Scenario<select id="assistant-fluid-preset"><option>compressible-flow</option><option>incompressible</option><option>bernoulli</option><option>isobaric</option><option>isentropic</option><option>subsonic</option><option>supersonic</option></select></label><label>Color by<select id="assistant-fluid-color"><option>mach</option><option>speed</option><option>pressure</option><option>temperature</option><option>entropy</option></select></label><label>Solver mode<select id="assistant-fluid-solver-mode"><option>target</option><option>system</option></select></label><label>Target<input id="assistant-fluid-target" value="P"></label></div><div class="assistant-fluid-grid"><label>X min<input id="assistant-fluid-x-min" type="number" value="0"></label><label>X max<input id="assistant-fluid-x-max" type="number" value="1"></label><label>Y min<input id="assistant-fluid-y-min" type="number" value="0"></label><label>Y max<input id="assistant-fluid-y-max" type="number" value="1"></label></div><div class="assistant-fluid-grid"><label>u(x,y,t)<input id="assistant-fluid-u" value="U0 * (1 - 0.5 * y^2)"></label><label>v(x,y,t)<input id="assistant-fluid-v" value="0"></label><label>P field, optional<input id="assistant-fluid-p-field" placeholder="P"></label><label>T field, optional<input id="assistant-fluid-t-field" placeholder="T"></label></div><div class="assistant-fluid-grid"><label>R (J/kg·K)<input id="assistant-fluid-r" type="number" value="287"></label><label>Gamma<input id="assistant-fluid-gamma" type="number" value="1.4" step="0.01"></label><label>cp (J/kg·K)<input id="assistant-fluid-cp" type="number" value="1004.5" step="0.1"></label><label>Reference P (Pa)<input id="assistant-fluid-ref-p" type="number" value="101325"></label><label>Reference T (K)<input id="assistant-fluid-ref-t" type="number" value="288.15" step="0.01"></label></div><div class="assistant-fluid-grid"><label>Input P<input id="assistant-fluid-input-p" type="number" value="101325"></label><label>Input T<input id="assistant-fluid-input-t" type="number" value="288.15" step="0.01"></label><label>Input U0<input id="assistant-fluid-input-u0" type="number" value="120"></label><label>Boundary layer<select id="assistant-fluid-boundary"><option value="true">Show</option><option value="false">Hide</option></select></label></div><div class="assistant-fluid-grid"><label>Equations<textarea id="assistant-fluid-equations" placeholder="P = P0\nT = T0"></textarea></label><label>System unknowns<textarea id="assistant-fluid-unknowns" placeholder="P\nT"></textarea></label><label>Metrics<textarea id="assistant-fluid-metrics">P, T, rho, V, Mach, h, s</textarea></label><label>Walls<textarea id="assistant-fluid-walls">left:inlet\nright:outlet\ntop:slip\nbottom:no-slip</textarea></label></div><p class="hero-meta compact-note">Use safe arithmetic and approved functions only. Coordinates are normalized x, y, with time t. SI units are used internally.</p>';
        fluidSettings.querySelector("#assistant-fluid-preset").insertAdjacentHTML("beforeend", '<option>incompressible-converging-pipe</option>');
        fluidSettings.insertAdjacentHTML("beforeend", '<div class="assistant-fluid-grid assistant-fluid-converging-fields"><label>Density rho (kg/m^3)<input id="assistant-fluid-rho" type="number" value="1.225" step="0.001"></label><label>Inlet height<input id="assistant-fluid-inlet-height" type="number" value="1" min="0.01" step="0.05"></label><label>Outlet height<input id="assistant-fluid-outlet-height" type="number" value="0.5" min="0.01" step="0.05"></label><label>Pipe center<input id="assistant-fluid-center" type="number" value="0.5" step="0.01"></label></div><p class="hero-meta compact-note assistant-fluid-converging-help">The converging-pipe preset uses fixed-density continuity and Bernoulli calculations. Height is proportional to cross-sectional area in this 2D visualization.</p>');
        form.prepend(fluidSettings, particleSettings, ductSettings, settings, modeLabel);
        elements.assistantCardMode = modeLabel.querySelector("#assistant-card-mode");
        elements.assistantConservationSettings = settings;
        elements.assistantDuctParticleSettings = ductSettings;
        elements.assistantConservationVisualization = settings.querySelector("#assistant-conservation-visualization");
        elements.assistantActiveVariables = settings.querySelector("#assistant-active-variables");
        elements.assistantLeftAxisLabel = settings.querySelector("#assistant-left-axis-label");
        elements.assistantLeftAxisUnit = settings.querySelector("#assistant-left-axis-unit");
        elements.assistantRightAxisLabel = settings.querySelector("#assistant-right-axis-label");
        elements.assistantRightAxisUnit = settings.querySelector("#assistant-right-axis-unit");
        elements.assistantParticleSettings = particleSettings;
        elements.assistantFluidSettings = fluidSettings;
        loadFluidConvergingDefaults = () => {
            const defaults = { "assistant-title": "Incompressible Flow Through a Converging Pipe", "assistant-subtitle": "Observe velocity increase and static-pressure decrease as an air-like incompressible flow enters a narrower section.", "assistant-notes": "The outlet area is half the inlet area, so ideal incompressible velocity doubles.\nBernoulli pressure decreases as velocity increases.\nThis is an idealized steady-flow visualization without viscous losses, turbulence, shocks, or separation.", "assistant-fluid-preset": "incompressible-converging-pipe", "assistant-fluid-color": "speed", "assistant-fluid-solver-mode": "target", "assistant-fluid-target": "outletPressure", "assistant-fluid-u": "U0", "assistant-fluid-v": "0", "assistant-fluid-p-field": "", "assistant-fluid-t-field": "", "assistant-fluid-input-p": "101325", "assistant-fluid-input-t": "288.15", "assistant-fluid-input-u0": "20", "assistant-fluid-rho": "1.225", "assistant-fluid-inlet-height": "1", "assistant-fluid-outlet-height": "0.5", "assistant-fluid-center": "0.5", "assistant-fluid-metrics": "P, V, DeltaV, rho, Mach, h, s", "assistant-fluid-walls": "left:inlet\nright:outlet\ntop:no-slip\nbottom:no-slip", "assistant-fluid-equations": "", "assistant-fluid-unknowns": "" };
            Object.entries(defaults).forEach(([id, value]) => { const input = document.getElementById(id); if (input) input.value = value; });
        };
        const standardDefinition = "F = 2Y**2 + 4X\nX(N,4,10,0,0.1) = (\\alpha)\nY(N,5,10,2,0.2) = (\\gamma)\nF(derived) = (\\Omega)";
        const conservationDefinition = "A_1 * V_1 = A_2 * V_2\nA_1(m^2,5.8,10,1,0.1,left,Inlet area) = (A_1)\nA_2(m^2,5.8,10,1,0.1,left,Outlet area) = (A_2)\nV_1(m/s,29.2,50,2,0.2,right,Inlet velocity) = (V_1)\nV_2(m/s,29.2,50,2,0.2,right,Outlet velocity) = (V_2)";
        const updateVisibility = () => {
            const mode = elements.assistantCardMode.value;
            settings.hidden = mode !== "variable-behavior";
            ductSettings.hidden = mode !== "variable-behavior" || elements.assistantConservationVisualization?.value !== "duct-particle";
            particleSettings.hidden = mode !== "particle-physics";
            fluidSettings.hidden = mode !== "fluid-control-volume";
            elements.assistantDisplayEquation?.closest(".assistant-display-equation-field")?.toggleAttribute("hidden", mode === "particle-physics" || mode === "fluid-control-volume");
            elements.assistantDefinitionField?.toggleAttribute("hidden", mode === "particle-physics" || mode === "fluid-control-volume");
            document.querySelector(".assistant-graph-section")?.toggleAttribute("hidden", mode !== "standard");
            document.querySelector(".assistant-syntax-help")?.toggleAttribute("hidden", mode === "particle-physics" || mode === "fluid-control-volume");
        };
        elements.assistantConservationVisualization?.addEventListener("change", updateVisibility);
        elements.assistantCardMode.addEventListener("change", () => {
            const mode = elements.assistantCardMode.value;
            if (mode === "fluid-control-volume") loadFluidConvergingDefaults?.();
            if (mode === "variable-behavior" && (elements.assistantDefinition?.value === standardDefinition || !elements.assistantDefinition?.value.trim())) {
                elements.assistantDefinition.value = conservationDefinition;
                if (elements.assistantDisplayEquation) elements.assistantDisplayEquation.value = "A_1 V_1 = A_2 V_2";
            } else if (mode === "standard" && (elements.assistantDefinition?.value === conservationDefinition || !elements.assistantDefinition?.value.trim())) {
                elements.assistantDefinition.value = standardDefinition;
                if (elements.assistantDisplayEquation) elements.assistantDisplayEquation.value = "2Y^{2} + 4X";
            }
            updateVisibility();
            assistantDefinitionEditor?.render?.();
        });
        updateVisibility();
    };
    ensureAssistantModeControls();

    if (!elements.drawerOpen) {
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "icon-button admin-mobile-drawer-open mobile-only";
        openButton.setAttribute("aria-label", "Open admin subjects");
        openButton.textContent = "☰";
        document.querySelector(".admin-main")?.prepend(openButton);
        elements.drawerOpen = openButton;
    }
    const drawerBackdrop = document.createElement("div");
    drawerBackdrop.className = "admin-drawer-backdrop";
    drawerBackdrop.addEventListener("click", () => document.body.classList.remove("admin-drawer-open"));
    document.body.appendChild(drawerBackdrop);

    const state = {
        subjects: [],
        activeSubjectId: "",
        activeChapterTitle: "",
        activeMode: "quiz",
        expandedSubjectId: "",
        sidebarExpanded: true,
        notesSource: "",
        notesDirty: false,
        notesPreviewMode: "split",
        drawerCollapsed: false,
        chapterDrag: null
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
            const value = String(message || "").toLowerCase();
            const tone = value.includes("fail") || value.includes("unable") || value.includes("invalid") ? "failed"
                : value.includes("saved") || value.includes("attached") || value.includes("created") ? "saved"
                    : value.includes("saving") ? "saving" : "ready";
            elements.statusLine.dataset.statusTone = tone;
            elements.statusLine.classList.toggle("is-visible", Boolean(message));
        }
    };

    const setSaveState = (message) => {
        if (elements.contextSave) {
            const value = String(message || "Ready");
            const normalized = value.toLowerCase().includes("unsaved") ? "Unsaved"
                : value.toLowerCase().includes("saving") ? "Saving"
                    : value.toLowerCase().includes("fail") ? "Failed"
                        : value.toLowerCase().includes("saved") ? "Saved" : value;
            elements.contextSave.textContent = normalized;
            elements.contextSave.dataset.saveState = normalized.toLowerCase();
        }
    };

    const renderAdminContext = () => {
        const subject = getActiveSubject();
        const chapter = getActiveChapter();
        if (elements.contextSubject) elements.contextSubject.textContent = subject?.name || "None selected";
        if (elements.contextChapter) elements.contextChapter.textContent = chapter?.title || "None selected";
        if (elements.contextNotes) elements.contextNotes.textContent = subject?.notesPath ? "Attached" : "No notes";
        setSaveState(state.notesDirty ? "Unsaved" : "Ready");
    };

    initAdminShell({
        elements,
        state,
        onNavigate: () => !state.notesDirty || window.confirm("You have unsaved Markdown changes. Leave this page and discard them?")
    });

    elements.sectionNav?.forEach((button) => {
        button.addEventListener("click", () => {
            elements.sectionNav.forEach((entry) => entry.classList.toggle("is-active", entry === button));
            document.getElementById(button.dataset.adminTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    document.querySelectorAll(".admin-page-nav a").forEach((link) => {
        link.addEventListener("click", (event) => {
            if (state.notesDirty && !window.confirm("You have unsaved Markdown changes. Leave this page and discard them?")) {
                event.preventDefault();
            }
        });
    });

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

    const renderSummary = () => {
        if (elements.librarySummary) {
            const chapterCount = state.subjects.reduce((sum, subject) => sum + subject.chapters.length, 0);
            const questionCount = state.subjects.reduce((sum, subject) => sum + tallyQuestionCount(subject), 0);
            elements.librarySummary.textContent = `${state.subjects.length} subjects | ${chapterCount} chapters | ${questionCount} questions`;
            const subject = getActiveSubject();
            if (elements.libraryQuestionSummary) elements.libraryQuestionSummary.textContent = subject ? `${tallyQuestionCount(subject)} questions` : "Select a subject";
            if (elements.libraryNotesSummary) elements.libraryNotesSummary.textContent = subject?.notesPath ? "Attached" : "No notes";
        }
    };

    const renderSubjectRail = () => {
        if (!elements.subjectRail) return;
        elements.subjectRail.replaceChildren();
        state.subjects.forEach((subject) => {
            const marker = document.createElement("button");
            marker.type = "button";
            marker.className = "admin-subject-rail-item";
            marker.classList.toggle("is-active", subject.id === state.activeSubjectId);
            marker.textContent = text(subject.name).slice(0, 1).toUpperCase() || "?";
            marker.title = subject.name;
            marker.setAttribute("aria-label", `Select ${subject.name}`);
            marker.addEventListener("click", () => selectSubject(subject.id));
            elements.subjectRail.appendChild(marker);
        });
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
            headerShell.append(header);
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
                chapterRow.append(chapterButton);
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

    const announceChapterReorder = (message) => {
        if (elements.chapterReorderAnnouncer) {
            elements.chapterReorderAnnouncer.textContent = message;
        }
        setStatus(message);
    };

    const clearChapterDrag = (announce = "") => {
        const drag = state.chapterDrag;
        if (!drag) return;
        drag.row?.classList.remove("is-dragging", "is-keyboard-pickup");
        drag.row?.querySelector(".admin-chapter-drag-handle")?.removeAttribute("aria-pressed");
        elements.chapterOrderList?.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
        drag.placeholder?.remove();
        state.chapterDrag = null;
        if (announce) announceChapterReorder(announce);
    };

    const reorderChapters = (subjectId, fromIndex, targetIndex) => {
        const subject = getSubjectById(state.subjects, subjectId);
        if (!subject || fromIndex < 0 || targetIndex < 0 || fromIndex >= subject.chapters.length || targetIndex >= subject.chapters.length) {
            return false;
        }
        if (fromIndex === targetIndex) return false;
        const nextChapters = [...subject.chapters];
        const [movedChapter] = nextChapters.splice(fromIndex, 1);
        nextChapters.splice(targetIndex, 0, movedChapter);
        const nextSubjects = state.subjects.map((entry) => entry.id === subjectId
            ? { ...entry, chapters: nextChapters, updatedAt: now() }
            : entry);
        commitSubjects(nextSubjects, subjectId, movedChapter.title);
        announceChapterReorder(`Saved. ${movedChapter.title} is now chapter ${targetIndex + 1} of ${nextChapters.length}.`);
        return true;
    };

    const renderChapterOrderList = () => {
        const list = elements.chapterOrderList;
        if (!list) return;
        list.replaceChildren();
        const listEmptyState = (heading, body) => {
            const item = document.createElement("li");
            item.className = "empty-state compact";
            item.append(Object.assign(document.createElement("h4"), { textContent: heading }), Object.assign(document.createElement("p"), { textContent: body }));
            return item;
        };
        const subject = getActiveSubject();
        if (!subject) {
            list.appendChild(listEmptyState("No subject selected", "Choose a subject from the drawer to arrange chapters."));
            return;
        }
        if (!subject.chapters.length) {
            list.appendChild(listEmptyState("No chapters yet", "Add a chapter from the Chapters workspace first."));
            return;
        }
        list.setAttribute("aria-setsize", String(subject.chapters.length));
        subject.chapters.forEach((chapter, index) => {
            const row = document.createElement("li");
            row.className = "admin-chapter-order-item";
            row.tabIndex = 0;
            row.dataset.chapterIndex = String(index);
            row.dataset.chapterTitle = chapter.title;
            row.setAttribute("aria-posinset", String(index + 1));
            row.setAttribute("aria-setsize", String(subject.chapters.length));
            row.classList.toggle("is-selected", chapter.title === state.activeChapterTitle);

            const handle = document.createElement("button");
            handle.type = "button";
            handle.className = "admin-chapter-drag-handle";
            handle.setAttribute("aria-label", `Drag to reorder ${chapter.title}`);
            handle.title = "Drag to reorder chapter";
            handle.textContent = "::";

            const chapterButton = document.createElement("button");
            chapterButton.type = "button";
            chapterButton.className = "admin-chapter-order-main";
            chapterButton.append(
                Object.assign(document.createElement("strong"), { textContent: chapter.title }),
                Object.assign(document.createElement("span"), { textContent: `${chapter.questions.length} question${chapter.questions.length === 1 ? "" : "s"}` })
            );
            chapterButton.addEventListener("click", () => selectChapter(chapter.title));

            const position = document.createElement("span");
            position.className = "admin-chapter-order-position";
            position.textContent = `#${index + 1}`;
            row.append(handle, chapterButton, position);

            const startPointerDrag = (event) => {
                if (!event.isPrimary || (event.button !== undefined && event.button !== 0) || state.chapterDrag) return;
                event.preventDefault();
                state.chapterDrag = { subjectId: subject.id, sourceIndex: index, targetIndex: index, pointerId: event.pointerId, row, handle, placeholder: null, keyboard: false };
                row.classList.add("is-dragging");
                handle.setAttribute("aria-pressed", "true");
                if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
                announceChapterReorder(`Picked up ${chapter.title}, chapter ${index + 1} of ${subject.chapters.length}. Move over a position and release to save.`);
            };
            handle.addEventListener("pointerdown", startPointerDrag);
            row.addEventListener("keydown", (event) => {
                const drag = state.chapterDrag;
                if (event.key === " " || event.key === "Spacebar") {
                    event.preventDefault();
                    if (!drag) {
                        state.chapterDrag = { subjectId: subject.id, sourceIndex: index, targetIndex: index, row, handle, placeholder: null, keyboard: true };
                        row.classList.add("is-keyboard-pickup");
                        handle.setAttribute("aria-pressed", "true");
                        announceChapterReorder(`Picked up ${chapter.title}, chapter ${index + 1} of ${subject.chapters.length}. Use ArrowUp or ArrowDown, then Space to drop.`);
                    } else if (drag.keyboard && drag.row === row) {
                        const saved = reorderChapters(drag.subjectId, drag.sourceIndex, drag.targetIndex);
                        clearChapterDrag(saved ? "" : `Dropped ${chapter.title} without changing its position.`);
                    }
                    return;
                }
                if (!drag || !drag.keyboard || drag.row !== row) return;
                if (event.key === "Escape") {
                    event.preventDefault();
                    clearChapterDrag(`Cancelled reordering ${chapter.title}.`);
                    return;
                }
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                event.preventDefault();
                const nextIndex = Math.max(0, Math.min(subject.chapters.length - 1, drag.targetIndex + (event.key === "ArrowUp" ? -1 : 1)));
                if (nextIndex === drag.targetIndex) return;
                drag.targetIndex = nextIndex;
                list.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
                list.querySelector(`[data-chapter-index="${nextIndex}"]`)?.classList.add("is-drop-target");
                announceChapterReorder(`${chapter.title} will be chapter ${nextIndex + 1} of ${subject.chapters.length}. Press Space to drop or Escape to cancel.`);
            });
            list.appendChild(row);
        });
    };

    const getPointerTarget = (event, drag) => {
        const rows = [...elements.chapterOrderList.querySelectorAll(".admin-chapter-order-item")].filter((item) => item !== drag.row);
        const before = rows.find((item) => {
            const rect = item.getBoundingClientRect();
            return event.clientY < rect.top + rect.height / 2;
        });
        const insertPosition = before ? rows.indexOf(before) : rows.length;
        // The dragged row is already excluded, so the remaining-row insertion
        // position is also the final array index in both directions.
        const targetIndex = insertPosition;
        return { before, targetIndex: Math.max(0, Math.min(rows.length, targetIndex)) };
    };

    const updatePointerTarget = (event) => {
        const drag = state.chapterDrag;
        if (!drag || drag.keyboard || drag.pointerId !== event.pointerId || !elements.chapterOrderList) return;
        const { before, targetIndex } = getPointerTarget(event, drag);
        drag.targetIndex = Math.min(targetIndex, getActiveSubject()?.chapters.length - 1);
        if (!drag.placeholder) {
            drag.placeholder = document.createElement("li");
            drag.placeholder.className = "chapter-drop-indicator";
            drag.placeholder.setAttribute("aria-hidden", "true");
        }
        elements.chapterOrderList.insertBefore(drag.placeholder, before || null);
        elements.chapterOrderList.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
        before?.classList.add("is-drop-target");
    };

    const finishPointerDrag = (event, cancelled = false) => {
        const drag = state.chapterDrag;
        if (!drag || drag.keyboard || (event && drag.pointerId !== event.pointerId)) return;
        if (cancelled) {
            clearChapterDrag("Cancelled chapter reordering.");
            return;
        }
        const subject = getActiveSubject();
        const validTarget = Number.isInteger(drag.targetIndex)
            && drag.targetIndex >= 0
            && drag.targetIndex < (subject?.chapters.length || 0);
        const moved = subject?.id === drag.subjectId
            && validTarget
            && reorderChapters(drag.subjectId, drag.sourceIndex, drag.targetIndex);
        clearChapterDrag(moved ? "" : "Dropped without changing the chapter order.");
    };

    document.addEventListener("pointermove", updatePointerTarget);
    document.addEventListener("pointerup", (event) => finishPointerDrag(event));
    document.addEventListener("pointercancel", (event) => finishPointerDrag(event, true));
    window.addEventListener("blur", () => finishPointerDrag(null, true));

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
        if (elements.notesSourceEditor) {
            elements.notesSourceEditor.disabled = !hasSubject;
        }
        if (elements.notesLoadAttachedButton) {
            elements.notesLoadAttachedButton.disabled = !hasSubject;
        }
        if (elements.notesEditorPreviewButton) {
            elements.notesEditorPreviewButton.disabled = !hasSubject;
        }
        if (elements.notesSaveButton) {
            elements.notesSaveButton.disabled = !hasSubject || !state.notesDirty;
        }
    };

    const renderAll = () => {
        renderSummary();
        renderSubjectRail();
        renderSubjectList();
        renderSubjectEditor();
        renderChapterCarousel();
        renderChapterOrderList();
        renderChapterEditor();
        renderNotesPreviewStatus();
        renderAdminContext();
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
        if (state.notesDirty && !window.confirm("You have unsaved Markdown changes. Switch context and discard them?")) return;
        if (state.chapterDrag) clearChapterDrag("Cancelled chapter reordering because the active subject changed.");
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
        void loadAttachedNotes().catch(() => {});
    };

    const selectChapter = (chapterTitle) => {
        if (state.notesDirty && !window.confirm("You have unsaved Markdown changes. Switch chapter and discard them?")) return;
        if (state.chapterDrag) clearChapterDrag("Cancelled chapter reordering because the active chapter changed.");
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
        void loadAttachedNotes().catch(() => {});
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

    const renderNotesDocument = (markdown = state.notesSource) => {
        if (!elements.notesEditorPreview) return;
        const subject = getActiveSubject();
        const basePath = resolveNotesPath(subject?.notesPath) || `markdowns/${subject?.id || "notes"}.md`;
        elements.notesEditorPreview.replaceChildren();
        if (state.notesPreviewMode === "source") {
            const source = document.createElement("pre");
            source.className = "admin-markdown-source-preview";
            source.textContent = markdown;
            elements.notesEditorPreview.appendChild(source);
            return;
        }
        if (state.notesPreviewMode === "split") {
            const sourcePanel = document.createElement("pre");
            sourcePanel.className = "admin-markdown-source-preview";
            sourcePanel.textContent = markdown;
            const renderedPanel = document.createElement("article");
            renderedPanel.className = "notes-view admin-rendered-preview";
            renderedPanel.innerHTML = renderMarkdownPreview(markdown, { basePath });
            elements.notesEditorPreview.append(sourcePanel, renderedPanel);
            hydrateMarkdownPreview(renderedPanel);
            return;
        }
        const rendered = document.createElement("article");
        rendered.className = "notes-view admin-rendered-preview";
        rendered.innerHTML = renderMarkdownPreview(markdown, { basePath });
        elements.notesEditorPreview.appendChild(rendered);
        hydrateMarkdownPreview(rendered);
    };

    const loadAttachedNotes = async () => {
        const subject = getActiveSubject();
        if (!subject) throw new Error("Select a subject first.");
        const path = resolveNotesPath(subject.notesPath);
        if (!path) {
            state.notesSource = "";
            state.notesDirty = false;
            if (elements.notesSourceEditor) elements.notesSourceEditor.value = "";
            if (elements.notesSaveButton) elements.notesSaveButton.disabled = true;
            renderNotesDocument("");
            setStatus("This subject has no attached Markdown file yet.");
            return;
        }
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load ${path}.`);
        state.notesSource = await response.text();
        state.notesDirty = false;
        if (elements.notesSourceEditor) elements.notesSourceEditor.value = state.notesSource;
        if (elements.notesSaveButton) elements.notesSaveButton.disabled = true;
        renderNotesDocument();
        renderAdminContext();
        setSaveState("Loaded");
    };

    const saveNotesSource = async () => {
        const subject = getActiveSubject();
        if (!subject) throw new Error("Select a subject first.");
        const markdown = String(elements.notesSourceEditor?.value || state.notesSource);
        const notesPath = resolveNotesPath(subject.notesPath) || `markdowns/${subject.id}.md`;
        const nextSubjects = state.subjects.map((entry) => entry.id === subject.id
            ? { ...entry, notesPath, updatedAt: now() }
            : entry);
        setSaveState("Saving");
        const response = await fetch("/api/save-library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subjects: saveSubjects(nextSubjects), payload: serializeSubjects(nextSubjects), notes: { [subject.id]: markdown } })
        });
        if (!response.ok) throw new Error(`Save failed with HTTP ${response.status}.`);
        state.subjects = saveSubjects(nextSubjects);
        state.notesSource = markdown;
        state.notesDirty = false;
        persistSelection();
        renderAll();
        renderNotesDocument(markdown);
        setSaveState("Saved");
        setStatus(`Saved Markdown notes for “${subject.name}”.`);
    };

    elements.notesSourceEditor?.addEventListener("input", () => {
        state.notesSource = elements.notesSourceEditor.value;
        state.notesDirty = true;
        if (elements.notesSaveButton) elements.notesSaveButton.disabled = false;
        renderAdminContext();
        setSaveState("Unsaved changes");
    });
    elements.notesLoadAttachedButton?.addEventListener("click", async () => {
        try { await loadAttachedNotes(); } catch (error) { setStatus(error.message); setSaveState("Load failed"); }
    });
    elements.notesEditorPreviewButton?.addEventListener("click", () => {
        state.notesSource = String(elements.notesSourceEditor?.value || "");
        renderNotesDocument();
        setSaveState(state.notesDirty ? "Preview ready" : "Ready");
    });
    elements.notesSaveButton?.addEventListener("click", async () => {
        try { await saveNotesSource(); } catch (error) { setStatus(error.message); setSaveState("Save failed"); }
    });
    elements.notesPreviewModes?.forEach((button) => button.addEventListener("click", () => {
        state.notesPreviewMode = button.dataset.notesPreviewMode || "split";
        elements.notesPreviewModes.forEach((entry) => entry.classList.toggle("is-active", entry === button));
        renderNotesDocument();
    }));

    elements.notesPreviewButton?.addEventListener("click", async () => {
        try {
            const subject = getActiveSubject();
            if (!subject) throw new Error("Select a subject first.");
            const file = elements.notesFileInput?.files?.[0];
            if (!file) throw new Error("Choose a Markdown file first.");
            const md = await parseMarkdownFile(file);
            state.notesSource = md;
            state.notesDirty = true;
            if (elements.notesSourceEditor) elements.notesSourceEditor.value = md;
            elements.notesPreviewContent.replaceChildren();
            const rendered = document.createElement("article");
            rendered.className = "notes-view admin-rendered-preview";
            rendered.innerHTML = renderMarkdownPreview(md, { basePath: `markdowns/${getActiveSubject()?.id || "notes"}.md` });
            elements.notesPreviewContent.appendChild(rendered);
            hydrateMarkdownPreview(rendered);
            renderNotesDocument(md);
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
            state.notesSource = md;
            state.notesDirty = false;
            if (elements.notesSourceEditor) elements.notesSourceEditor.value = md;
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
            renderNotesDocument(md);
            renderAdminContext();
        } catch (err) {
            setStatus(err.message || "Unable to attach notes.");
            if (elements.notesPreviewStatus) elements.notesPreviewStatus.textContent = "Attach failed";
        }
    });

    const defaultAssistantDefinition = `F = 2Y**2 + 4X
X(N,4,10,0,0.1) = (\\alpha)
Y(N,5,10,2,0.2) = (\\gamma)
F(derived) = (\\Omega)`;
    const defaultAssistantDisplayEquation = "2Y^{2} + 4X";

    const displaySymbol = (value) => {
        const result = text(value);
        return result.startsWith("(") && result.endsWith(")") ? result.slice(1, -1).trim() : result;
    };

    const parseAssistantDefinition = () => {
        const source = String(elements.assistantDefinition?.value || "");
        const lines = source.split(/\r?\n/).map((line, index) => ({ line: line.trim(), number: index + 1 })).filter((entry) => entry.line);
        if (!lines.length) throw new Error("Enter an equation definition.");
        if (elements.assistantCardMode?.value === "variable-behavior") {
            const declarationPattern = /^([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=\s*(.+)$/;
            const equationLines = lines.filter((entry) => !declarationPattern.test(entry.line));
            if (equationLines.length !== 1) throw new Error("Provide exactly one relationship equation.");
            const equalsIndex = equationLines[0].line.indexOf("=");
            if (equalsIndex <= 0 || equalsIndex >= equationLines[0].line.length - 1) throw new Error(`Line ${equationLines[0].number}: use <left expression> = <right expression>.`);
            const relationship = { left: equationLines[0].line.slice(0, equalsIndex).trim(), right: equationLines[0].line.slice(equalsIndex + 1).trim() };
            const variables = [];
            const symbols = new Set();
            lines.filter((entry) => entry !== equationLines[0]).forEach((entry) => {
                const match = entry.line.match(declarationPattern);
                if (!match) throw new Error(`Line ${entry.number}: use a variable declaration.`);
                const symbol = match[1];
                if (symbols.has(symbol)) throw new Error(`Line ${entry.number}: symbol ${symbol} is declared more than once.`);
                symbols.add(symbol);
                const fields = match[2].split(",").map((field) => field.trim());
                if (fields[0].toLowerCase() === "fixed") {
                    if (fields.length !== 3 && fields.length !== 4) throw new Error(`Line ${entry.number}: fixed variables require fixed, value, unit, and optional name.`);
                    const value = Number(fields[1]);
                    if (!fields[2] || !Number.isFinite(value)) throw new Error(`Line ${entry.number}: fixed variables require a unit and numeric value.`);
                    const shown = displaySymbol(match[3]);
                    if (!shown || shown.toLowerCase() === "none") throw new Error(`Line ${entry.number}: a display symbol is required.`);
                    variables.push({ symbol, displaySymbol: shown, name: fields[3] || symbol, unit: fields[2], value, interactive: false, fixed: true });
                    return;
                }
                if (fields.length < 5 || fields.length > 7) throw new Error(`Line ${entry.number}: variables require unit, initial, max, min, step, optional axis, and optional name.`);
                const [unit, initialText, maxText, minText, stepText, axisText = "left", name = symbol] = fields;
                const value = Number(initialText);
                const max = Number(maxText);
                const min = Number(minText);
                const step = Number(stepText);
                const axis = axisText.toLowerCase();
                if (!unit || ![value, max, min, step].every(Number.isFinite) || !(max > min) || !(step > 0) || value < min || value > max) throw new Error(`Line ${entry.number}: variable unit or range values are invalid.`);
                if (!["left", "right"].includes(axis)) throw new Error(`Line ${entry.number}: axis must be left or right.`);
                const shown = displaySymbol(match[3]);
                if (!shown || shown.toLowerCase() === "none") throw new Error(`Line ${entry.number}: a display symbol is required.`);
                variables.push({ symbol, displaySymbol: shown, name: name || symbol, unit, axis, value, min, max, step, interactive: true });
            });
            const activeVariables = String(elements.assistantActiveVariables?.value || "").split(",").map((value) => value.trim()).filter(Boolean);
            const interactiveSymbols = new Set(variables.filter((variable) => variable.interactive).map((variable) => variable.symbol));
            if (activeVariables.length !== 2 || new Set(activeVariables).size !== 2 || activeVariables.some((symbol) => !interactiveSymbols.has(symbol))) throw new Error("Select exactly two declared adjustable variables.");
            const relationshipSymbols = new Set(`${relationship.left} ${relationship.right}`.match(/[A-Za-z_]\w*/g) || []);
            const allowedNames = new Set(["e", "pi", "abs", "acos", "asin", "atan", "cos", "exp", "log", "sin", "sqrt", "tan"]);
            const unknownSymbols = [...relationshipSymbols].filter((symbol) => !symbols.has(symbol) && !allowedNames.has(symbol));
            if (unknownSymbols.length) throw new Error(`Relationship contains undeclared variable(s): ${unknownSymbols.join(", ")}.`);
            return { mode: "variable-behavior", equation: `${relationship.left} = ${relationship.right}`, relationship, variables, derived: [], activeVariables };
        }
        const equationLines = lines.filter((entry) => !/^\s*[A-Za-z_]\w*\s*\(/.test(entry.line));
        if (equationLines.length !== 1) throw new Error("Line 1: provide exactly one calculation equation.");
        const equationMatch = equationLines[0].line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (!equationMatch) throw new Error(`Line ${equationLines[0].number}: use <symbol> = <expression>.`);
        const outputSymbol = equationMatch[1];
        const executableExpression = equationMatch[2]
            .replace(/\*\*/g, "^")
            .replace(/(\d)\s*(?=[A-Za-z_])/g, "$1*")
            .trim();
        if (!executableExpression) throw new Error(`Line ${equationLines[0].number}: the calculation expression is required.`);
        const variables = [];
        let derived = null;
        const symbols = new Set();
        lines.filter((entry) => entry !== equationLines[0]).forEach((entry) => {
            const match = entry.line.match(/^([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=\s*(.+)$/);
            if (!match) throw new Error(`Line ${entry.number}: use a parameter or derived declaration.`);
            const symbol = match[1];
            if (symbols.has(symbol)) throw new Error(`Line ${entry.number}: symbol ${symbol} is declared more than once.`);
            symbols.add(symbol);
            const fields = match[2].split(",").map((field) => field.trim());
            const shown = displaySymbol(match[3]);
            if (!shown) throw new Error(`Line ${entry.number}: a LaTeX display symbol is required.`);
            const displaySymbolHidden = shown.toLowerCase() === "none";
            if (fields.length === 1 && fields[0].toLowerCase() === "derived") {
                if (symbol !== outputSymbol) throw new Error(`Line ${entry.number}: the derived symbol must match ${outputSymbol}.`);
                derived = { symbol, displaySymbol: displaySymbolHidden ? "" : shown, displaySymbolHidden, name: symbol, expression: executableExpression };
                return;
            }
            if (fields.length !== 5 && fields.length !== 6) throw new Error(`Line ${entry.number}: parameters require unit, initial, max, min, step, and optional name.`);
            const [unit, initialText, maxText, minText, stepText, name = symbol] = fields;
            const value = Number(initialText);
            const max = Number(maxText);
            const min = Number(minText);
            const step = Number(stepText);
            if (!unit || ![value, max, min, step].every(Number.isFinite)) throw new Error(`Line ${entry.number}: parameter unit and values must be valid.`);
            if (!(max > min) || !(step > 0)) throw new Error(`Line ${entry.number}: require Max > Min and Step > 0.`);
            if (value < min || value > max) throw new Error(`Line ${entry.number}: InitialValue must be between Min and Max.`);
            variables.push({ symbol, displaySymbol: displaySymbolHidden ? "" : shown, displaySymbolHidden, name: name || symbol, unit, value, min, max, step, interactive: true });
        });
        if (!derived) throw new Error(`Add a ${outputSymbol}(derived) declaration.`);
        return { equation: executableExpression, variables, derived: [derived] };
    };

    const escapeEditorHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
    const editorToken = (className, value) => `<span class="editor-token ${className}">${escapeEditorHtml(value)}</span>`;
    const highlightExpression = (value) => {
        const source = String(value || "");
        const pattern = /\*\*|[+\-*/^=]|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*/g;
        let result = "";
        let cursor = 0;
        for (const match of source.matchAll(pattern)) {
            const token = match[0];
            result += escapeEditorHtml(source.slice(cursor, match.index));
            const className = /^\d/.test(token) ? "number" : /^[+\-*/^=]$|^\*\*$/.test(token) ? "operator" : "identifier";
            result += editorToken(className, token);
            cursor = match.index + token.length;
        }
        return result + escapeEditorHtml(source.slice(cursor));
    };
    const highlightDefinitionLine = (line) => {
        const equation = line.match(/^(\s*)([A-Za-z_]\w*)(\s*)(=)(\s*)(.*)$/);
        const declaration = line.match(/^(\s*)([A-Za-z_]\w*)(\s*)(\(([^)]*)\))(\s*)(=)(\s*)(.*)$/);
        if (declaration) {
            const fields = declaration[5].split(",");
            const fieldMarkup = fields.map((field, index) => {
                const trimmed = field.trim();
                const spacing = escapeEditorHtml(field.slice(0, field.indexOf(trimmed) >= 0 ? field.indexOf(trimmed) : 0));
                const className = index === 0 ? "unit" : /^\d/.test(trimmed) || /^-?\d/.test(trimmed) ? "number" : trimmed.toLowerCase() === "derived" ? "keyword" : "punctuation";
                return `${spacing}${editorToken(className, trimmed)}`;
            }).join(editorToken("punctuation", ","));
            const display = declaration[9].trim();
            const displayMarkup = display.toLowerCase() === "none" ? editorToken("keyword", display) : highlightExpression(display);
            return `${escapeEditorHtml(declaration[1])}${editorToken("symbol", declaration[2])}${escapeEditorHtml(declaration[3])}${editorToken("punctuation", "(")}${fieldMarkup}${editorToken("punctuation", ")")}${escapeEditorHtml(declaration[6])}${editorToken("operator", "=")}${escapeEditorHtml(declaration[8])}${displayMarkup}`;
        }
        if (equation) return `${escapeEditorHtml(equation[1])}${editorToken("symbol", equation[2])}${escapeEditorHtml(equation[3])}${editorToken("operator", "=")}${escapeEditorHtml(equation[5])}${highlightExpression(equation[6])}`;
        return highlightExpression(line);
    };

    const setupAssistantDefinitionEditor = () => {
        const textarea = elements.assistantDefinition;
        if (!textarea || textarea.dataset.editorReady === "true") return;
        const field = elements.assistantDefinitionField || textarea.parentElement;
        if (!field) return;
        const shell = document.createElement("div");
        shell.className = "assistant-code-editor";
        const gutter = document.createElement("div");
        gutter.className = "assistant-code-gutter";
        gutter.setAttribute("aria-hidden", "true");
        const mirror = document.createElement("pre");
        mirror.className = "assistant-code-mirror";
        mirror.setAttribute("aria-hidden", "true");
        const diagnostic = document.createElement("div");
        diagnostic.className = "assistant-definition-diagnostic";
        diagnostic.id = "assistant-definition-diagnostic";
        diagnostic.setAttribute("role", "status");
        diagnostic.setAttribute("aria-live", "polite");
        textarea.parentElement.insertBefore(shell, textarea);
        shell.append(gutter, mirror, textarea);
        textarea.dataset.editorReady = "true";
        textarea.setAttribute("aria-describedby", "assistant-syntax-help assistant-definition-diagnostic");
        document.querySelector(".assistant-syntax-help")?.setAttribute("id", "assistant-syntax-help");
        field.appendChild(diagnostic);
        field.classList.add("has-code-editor");
        shell.classList.add("is-ready");

        let timer;
        let previousDiagnostic = "";
        const renderEditor = () => {
            const lines = String(textarea.value || "").split(/\r?\n/);
            let errorLine = 0;
            let errorMessage = "";
            try {
                parseAssistantDefinition();
            } catch (error) {
                const match = String(error.message || "").match(/^Line (\d+):\s*(.*)$/);
                errorLine = match ? Number(match[1]) : 1;
                errorMessage = error.message || "Invalid equation definition.";
            }
            mirror.innerHTML = lines.map((line, index) => `<span class="assistant-code-line${index + 1 === errorLine ? " is-error" : ""}">${highlightDefinitionLine(line) || " "}</span>`).join("");
            gutter.innerHTML = lines.map((_, index) => `<span class="assistant-code-line-number${index + 1 === errorLine ? " is-error" : ""}">${index + 1}${index + 1 === errorLine ? " !" : ""}</span>`).join("");
            diagnostic.textContent = errorMessage;
            diagnostic.toggleAttribute("hidden", !errorMessage);
            if (errorMessage && elements.assistantStatus) elements.assistantStatus.textContent = errorMessage;
            if (!errorMessage && previousDiagnostic && elements.assistantStatus?.textContent === previousDiagnostic) elements.assistantStatus.textContent = "";
            previousDiagnostic = errorMessage;
        };
        const scheduleRender = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(renderEditor, 120);
        };
        textarea.addEventListener("input", scheduleRender);
        textarea.addEventListener("change", renderEditor);
        textarea.addEventListener("scroll", () => {
            mirror.scrollTop = textarea.scrollTop;
            mirror.scrollLeft = textarea.scrollLeft;
            gutter.scrollTop = textarea.scrollTop;
        });
        renderEditor();
        return { render: renderEditor };
    };
    const assistantDefinitionEditor = setupAssistantDefinitionEditor();

    const readAssistantConfig = () => {
        const mode = elements.assistantCardMode?.value || "standard";
        if (mode === "particle-physics") {
            const field = (id) => document.getElementById(id);
            const number = (id, label) => {
                const value = Number(field(id)?.value);
                if (!Number.isFinite(value)) throw new Error(`${label} must be numeric.`);
                return value;
            };
            const range = (prefix, label, unit) => {
                const value = number(`${prefix}-value`, `${label} value`);
                const min = number(`${prefix}-min`, `${label} minimum`);
                const max = number(`${prefix}-max`, `${label} maximum`);
                const step = number(`${prefix}-step`, `${label} step`);
                if (!(max > min) || step <= 0 || value < min || value > max) throw new Error(`${label} needs Value within Min/Max and Max > Min.`);
                return { value, min, max, step, unit };
            };
            const particles = ["p1", "p2"].map((id, index) => {
                const prefix = `assistant-particle-${id}`;
                const symbol = text(field(`${prefix}-symbol`)?.value);
                const color = text(field(`${prefix}-color`)?.value);
                const position = number(`${prefix}-position`, `${id} position`);
                if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) throw new Error(`${id} needs a valid symbol.`);
                if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`${id} needs a six-digit hexadecimal color.`);
                const mass = range(`${prefix}-mass`, `${id} mass`, "kg");
                if (mass.min <= 0 || mass.value <= 0) throw new Error(`${id} mass must be positive.`);
                return { id, name: text(field(`${prefix}-name`)?.value) || `Particle ${index + 1}`, symbol, mass, velocity: range(`${prefix}-velocity`, `${id} velocity`, "m/s"), position, color };
            });
            if (particles[0].symbol === particles[1].symbol || particles[0].id === particles[1].id) throw new Error("Particles need unique ids and symbols.");
            if (Math.abs(particles[0].position - particles[1].position) < 0.001) throw new Error("Particle positions must be separated.");
            const restitution = {
                value: number("assistant-particle-restitution-value", "Restitution value"),
                min: number("assistant-particle-restitution-min", "Restitution minimum"),
                max: number("assistant-particle-restitution-max", "Restitution maximum"),
                step: number("assistant-particle-restitution-step", "Restitution step"),
                unit: ""
            };
            if (restitution.min < 0 || restitution.max > 1 || !(restitution.max > restitution.min) || restitution.step <= 0 || restitution.value < restitution.min || restitution.value > restitution.max) throw new Error("Restitution must be between 0 and 1 with a valid range.");
            return { title: text(elements.assistantTitle?.value) || "Two-Body Collision Lab", subtitle: text(elements.assistantSubtitle?.value), model: "two-body-collision", restitution, particles, notes: String(elements.assistantNotes?.value || "").split(/\r?\n/).map(text).filter(Boolean) };
        }
        if (mode === "fluid-control-volume") {
            const field = (id) => document.getElementById(id);
            const number = (id, label) => { const value = Number(field(id)?.value); if (!Number.isFinite(value)) throw new Error(`${label} must be numeric.`); return value; };
            const parseWalls = String(field("assistant-fluid-walls")?.value || "").split(/\r?\n/).map((line) => line.split(":" ).map(text)).filter((entry) => entry.length === 2).reduce((result, entry) => { result[entry[0]] = entry[1]; return result; }, {});
            const ranges = { P: { value: number("assistant-fluid-input-p", "Pressure"), min: 50000, max: 200000, step: 100, unit: "Pa" }, T: { value: number("assistant-fluid-input-t", "Temperature"), min: 200, max: 500, step: 1, unit: "K" }, U0: { value: number("assistant-fluid-input-u0", "Velocity"), min: 0, max: 700, step: 1, unit: "m/s" } };
            const preset = text(field("assistant-fluid-preset")?.value) || "compressible-flow";
            if (preset === "incompressible-converging-pipe") ranges.rho = { value: number("assistant-fluid-rho", "Density"), min: 0.05, max: 20, step: 0.001, unit: "kg/m^3" };
            const solverMode = text(field("assistant-fluid-solver-mode")?.value) || "target";
            const equations = String(field("assistant-fluid-equations")?.value || "").split(/\r?\n/).map(text).filter(Boolean);
            const unknowns = String(field("assistant-fluid-unknowns")?.value || "").split(/\r?\n/).map(text).filter(Boolean);
            const solver = { mode: solverMode, target: text(field("assistant-fluid-target")?.value), unknowns, equations, ranges: {} };
            if (solverMode === "target" && equations.length && !solver.target) throw new Error("Fluid target mode requires a target variable.");
            if (solverMode === "system" && equations.length !== unknowns.length) throw new Error("Fluid system mode requires one equation per unknown.");
            const converging = preset === "incompressible-converging-pipe";
            return { title: text(elements.assistantTitle?.value) || (converging ? "Incompressible Flow Through a Converging Pipe" : "Fluid Control Volume"), subtitle: text(elements.assistantSubtitle?.value), model: "fluid-control-volume", domain: { x: [number("assistant-fluid-x-min", "X minimum"), number("assistant-fluid-x-max", "X maximum")], y: [number("assistant-fluid-y-min", "Y minimum"), number("assistant-fluid-y-max", "Y maximum")], walls: parseWalls }, geometry: converging ? { type: "converging-pipe", inletHeight: number("assistant-fluid-inlet-height", "Inlet height"), outletHeight: number("assistant-fluid-outlet-height", "Outlet height"), center: number("assistant-fluid-center", "Pipe center"), wallMode: "no-slip" } : undefined, field: { u: text(field("assistant-fluid-u")?.value) || "0", v: text(field("assistant-fluid-v")?.value) || "0", P: text(field("assistant-fluid-p-field")?.value), T: text(field("assistant-fluid-t-field")?.value), scale: 1 }, thermodynamics: { model: converging ? "incompressible" : "ideal-gas", R: number("assistant-fluid-r", "R"), gamma: number("assistant-fluid-gamma", "Gamma"), cp: number("assistant-fluid-cp", "cp"), rho: converging ? ranges.rho.value : undefined, reference: { P: number("assistant-fluid-ref-p", "Reference pressure"), T: number("assistant-fluid-ref-t", "Reference temperature") } }, state: { inputs: { P: ranges.P.value, T: ranges.T.value, U0: ranges.U0.value, ...(converging ? { rho: ranges.rho.value } : {}) }, ranges }, scenario: { preset, solver }, display: { colorBy: text(field("assistant-fluid-color")?.value) || "mach", showParticles: true, showVectors: true, showBoundaryLayer: field("assistant-fluid-boundary")?.value !== "false", metrics: String(field("assistant-fluid-metrics")?.value || "P,T,rho,V,Mach,h,s").split(",").map(text).filter(Boolean) }, notes: String(elements.assistantNotes?.value || "").split(/\r?\n/).map(text).filter(Boolean) };
        }
        const parsed = parseAssistantDefinition();
        if (parsed.mode === "variable-behavior") {
            const visualization = elements.assistantConservationVisualization?.value || "variable-behavior";
            const graph = {
                type: visualization,
                relationship: parsed.relationship,
                axes: {
                    left: { label: text(elements.assistantLeftAxisLabel?.value) || "Left axis", unit: text(elements.assistantLeftAxisUnit?.value) },
                    right: { label: text(elements.assistantRightAxisLabel?.value) || "Right axis", unit: text(elements.assistantRightAxisUnit?.value) }
                }
            };
            if (visualization === "duct-particle") {
                const count = Number(document.getElementById("assistant-duct-particle-count")?.value);
                const speedScale = Number(document.getElementById("assistant-duct-particle-speed")?.value);
                if (!Number.isInteger(count) || count < 8 || count > 100) throw new Error("Duct particle count must be an integer from 8 to 100.");
                if (!Number.isFinite(speedScale) || speedScale <= 0) throw new Error("Duct particle speed scale must be positive.");
                graph.particles = {
                    count,
                    speedScale,
                    showTrails: document.getElementById("assistant-duct-particle-trails")?.value !== "false",
                    showVectors: document.getElementById("assistant-duct-particle-vectors")?.value !== "false"
                };
            }
            return { title: text(elements.assistantTitle?.value) || "Conservation Relationship", subtitle: text(elements.assistantSubtitle?.value), equation: text(elements.assistantDisplayEquation?.value) || parsed.equation, variables: parsed.variables, behavior: { activeVariables: parsed.activeVariables }, graph, notes: String(elements.assistantNotes?.value || "").split(/\r?\n/).map(text).filter(Boolean) };
        }
        const graph = { expression: parsed.equation, xVariable: text(elements.assistantGraphXVariable?.value), xLabel: text(elements.assistantGraphXLabel?.value) || "x", yLabel: text(elements.assistantGraphYLabel?.value) || "y", xMin: Number(elements.assistantGraphXMin?.value), xMax: Number(elements.assistantGraphXMax?.value), yMin: Number(elements.assistantGraphYMin?.value), yMax: Number(elements.assistantGraphYMax?.value) };
        if (graph && (!(graph.xMax > graph.xMin) || !(graph.yMax > graph.yMin))) throw new Error("Graph ranges must have maximum values greater than minimum values.");
        return { title: text(elements.assistantTitle?.value) || "Equation", subtitle: text(elements.assistantSubtitle?.value), ...parsed, equation: text(elements.assistantDisplayEquation?.value) || parsed.equation, ...(graph ? { graph } : {}), notes: String(elements.assistantNotes?.value || "").split(/\r?\n/).map(text).filter(Boolean) };
    };

    let assistantPreviewMode = "empty";
    const setAssistantPreviewMode = (mode) => {
        assistantPreviewMode = mode;
        elements.assistantViewMarkdownButton?.classList.toggle("is-active", mode === "markdown");
        elements.assistantPreviewButton?.classList.toggle("is-active", mode === "card");
    };
    const assistantMarkdown = () => {
        const mode = elements.assistantCardMode?.value || "standard";
        const fence = mode === "particle-physics" ? "particle-physics-card" : mode === "fluid-control-volume" ? "fluid-control-volume-card" : "equation-card";
        return `\`\`\`${fence}\n${JSON.stringify(readAssistantConfig(), null, 2)}\n\`\`\``;
    };
    const renderAssistantMarkdown = () => {
        const markdown = assistantMarkdown();
        elements.assistantPreview?.replaceChildren();
        const preview = document.createElement("pre");
        preview.className = "admin-markdown-source-preview assistant-markdown-preview";
        preview.textContent = markdown;
        elements.assistantPreview?.appendChild(preview);
        setAssistantPreviewMode("markdown");
        if (elements.assistantStatus) elements.assistantStatus.textContent = "Markdown snippet ready.";
        return markdown;
    };
    const renderAssistantPreview = () => {
        const markdown = assistantMarkdown();
        elements.assistantPreview?.replaceChildren();
        const preview = document.createElement("article");
        preview.className = "notes-view admin-rendered-preview";
        preview.innerHTML = renderMarkdownPreview(markdown, { basePath: "markdowns/aerodynamics.md" });
        elements.assistantPreview?.appendChild(preview);
        hydrateMarkdownPreview(preview);
        setAssistantPreviewMode("card");
        if (elements.assistantStatus) elements.assistantStatus.textContent = "Card preview ready.";
        return markdown;
    };
    document.querySelectorAll("[data-latex-insert]").forEach((button) => button.addEventListener("click", () => {
        const input = elements.assistantDefinition;
        if (!input) return;
        const insertion = button.dataset.latexInsert || "";
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        input.value = `${input.value.slice(0, start)}${insertion}${input.value.slice(end)}`;
        input.focus();
        input.setSelectionRange(start + insertion.length, start + insertion.length);
        assistantDefinitionEditor?.render();
    }));
    elements.assistantPreviewButton?.addEventListener("click", () => {
        try { renderAssistantPreview(); } catch (error) { if (elements.assistantStatus) elements.assistantStatus.textContent = error.message; }
    });
    elements.assistantViewMarkdownButton?.addEventListener("click", () => {
        try { renderAssistantMarkdown(); } catch (error) { if (elements.assistantStatus) elements.assistantStatus.textContent = error.message; }
    });
    const resetAssistantDefaults = () => {
        const selectedMode = elements.assistantCardMode?.value || "standard";
        elements.assistantForm?.reset();
        if (elements.assistantCardMode) elements.assistantCardMode.value = selectedMode;
        if (elements.assistantConservationSettings) elements.assistantConservationSettings.hidden = true;
        if (elements.assistantDuctParticleSettings) elements.assistantDuctParticleSettings.hidden = true;
        if (elements.assistantParticleSettings) elements.assistantParticleSettings.hidden = true;
        if (elements.assistantFluidSettings) elements.assistantFluidSettings.hidden = true;
        elements.assistantDisplayEquation?.closest(".assistant-display-equation-field")?.removeAttribute("hidden");
        elements.assistantDefinitionField?.removeAttribute("hidden");
        document.querySelector(".assistant-graph-section")?.removeAttribute("hidden");
        document.querySelector(".assistant-syntax-help")?.removeAttribute("hidden");
        if (elements.assistantActiveVariables) elements.assistantActiveVariables.value = "A_1, V_2";
        if (elements.assistantLeftAxisLabel) elements.assistantLeftAxisLabel.value = "Area";
        if (elements.assistantLeftAxisUnit) elements.assistantLeftAxisUnit.value = "m^2";
        if (elements.assistantRightAxisLabel) elements.assistantRightAxisLabel.value = "Velocity";
        if (elements.assistantRightAxisUnit) elements.assistantRightAxisUnit.value = "m/s";
        if (elements.assistantConservationVisualization) elements.assistantConservationVisualization.value = "variable-behavior";
        const ductDefaults = { "assistant-duct-particle-count": "24", "assistant-duct-particle-speed": "1", "assistant-duct-particle-trails": "true", "assistant-duct-particle-vectors": "true" };
        Object.entries(ductDefaults).forEach(([id, value]) => { const input = document.getElementById(id); if (input) input.value = value; });
        if (elements.assistantDisplayEquation) elements.assistantDisplayEquation.value = selectedMode === "variable-behavior" ? "A_1 V_1 = A_2 V_2" : defaultAssistantDisplayEquation;
        if (elements.assistantDefinition) elements.assistantDefinition.value = selectedMode === "variable-behavior" ? "A_1 * V_1 = A_2 * V_2\nA_1(m^2,5.8,10,1,0.1,left,Inlet area) = (A_1)\nA_2(m^2,5.8,10,1,0.1,left,Outlet area) = (A_2)\nV_1(m/s,29.2,50,2,0.2,right,Inlet velocity) = (V_1)\nV_2(m/s,29.2,50,2,0.2,right,Outlet velocity) = (V_2)" : defaultAssistantDefinition;
        if (elements.assistantGraphXVariable) elements.assistantGraphXVariable.value = "X";
        if (elements.assistantGraphXLabel) elements.assistantGraphXLabel.value = "X (alpha)";
        if (elements.assistantGraphYLabel) elements.assistantGraphYLabel.value = "F (Omega)";
        if (elements.assistantGraphXMin) elements.assistantGraphXMin.value = "0";
        if (elements.assistantGraphXMax) elements.assistantGraphXMax.value = "10";
        if (elements.assistantGraphYMin) elements.assistantGraphYMin.value = "0";
        if (elements.assistantGraphYMax) elements.assistantGraphYMax.value = "260";
        if (selectedMode === "fluid-control-volume") loadFluidConvergingDefaults?.();
        elements.assistantCardMode?.dispatchEvent(new Event("change"));
        assistantDefinitionEditor?.render();
    };
    elements.assistantResetButton?.addEventListener("click", () => { resetAssistantDefaults(); if (elements.assistantStatus) elements.assistantStatus.textContent = "Assistant reset."; });
    elements.exportCard?.addEventListener("click", () => elements.exportButton?.click());
    if (elements.assistantDefinition && !elements.assistantDefinition.value.trim()) resetAssistantDefaults();

    const defaultForceSystemModel = {
        type: "force_system",
        title: "Simply Supported Beam",
        subtitle: "A point load acts downward at the beam midpoint.",
        geometry: {
            points: [{ id: "P1", x: 0, y: 0 }, { id: "P2", x: 8, y: 0 }, { id: "P3", x: 4, y: 0 }],
            beams: [{ id: "B1", start: "P1", end: "P2" }]
        },
        forces: [{ id: "F1", type: "point", point: "P3", beam: "B1", magnitude: 10, unit: "kN", direction: 270 }],
        supports: [{ id: "A", type: "pin", point: "P1" }, { id: "B", type: "roller", point: "P2" }]
    };
    if (elements.forceSystemModelJson && !elements.forceSystemModelJson.value.trim()) {
        elements.forceSystemModelJson.value = JSON.stringify(defaultForceSystemModel, null, 2);
    }
    elements.forceSystemModelPreviewButton?.addEventListener("click", () => {
        try {
            const config = JSON.parse(elements.forceSystemModelJson.value);
            elements.forceSystemModelPreview.innerHTML = renderForceSystemModelCard(config, "admin-preview");
            hydrateMarkdownPreview(elements.forceSystemModelPreview);
            elements.forceSystemModelStatus.textContent = "Preview ready.";
        } catch (error) {
            elements.forceSystemModelPreview.replaceChildren(emptyState("Could not preview model", error.message || "Invalid JSON payload."));
            elements.forceSystemModelStatus.textContent = "Invalid model.";
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

    elements.lockForm?.addEventListener("submit", async (event) => {
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

    elements.subjectAddToggle?.addEventListener("click", () => {
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
    elements.subjectCreateForm?.addEventListener("submit", async (event) => {
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
    elements.subjectSaveButton?.addEventListener("click", () => {
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
    elements.subjectDeleteButton?.addEventListener("click", () => {
        const subject = getActiveSubject();
        if (!subject || state.subjects.length <= 1) {
            return;
        }
        const nextSubjects = state.subjects.filter((entry) => entry.id !== subject.id);
        commitSubjects(nextSubjects, nextSubjects[0]?.id || "", "");
        setStatus(`Deleted subject “${subject.name}”.`);
    });
    elements.chapterPreviewButton?.addEventListener("click", async () => {
        try {
            await renderChapterPreview();
        } catch (error) {
            renderPreviewError(elements.chapterPreviewStatus, elements.chapterPreviewContent, error);
        }
    });
    elements.chapterImportForm?.addEventListener("submit", async (event) => {
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
    elements.chapterSaveButton?.addEventListener("click", () => {
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
    elements.chapterDeleteButton?.addEventListener("click", () => {
        const chapter = getActiveChapter();
        const subject = getActiveSubject();
        if (!chapter || !subject || subject.chapters.length <= 1) {
            setStatus("A subject must keep at least one chapter.");
            return;
        }
        if (!window.confirm(`Delete chapter \"${chapter.title}\"?`)) return;
        const nextSubjects = state.subjects.map((subject) => subject.id === state.activeSubjectId ? { ...subject, chapters: subject.chapters.filter((entry) => entry.title !== chapter.title), updatedAt: now() } : subject);
        commitSubjects(nextSubjects, state.activeSubjectId, "");
        setStatus(`Deleted chapter “${chapter.title}”.`);
    });
    elements.exportButton?.addEventListener("click", async () => {
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
    elements.chapterPrev?.addEventListener("click", () => moveChapterSelection(-1));
    elements.chapterNext?.addEventListener("click", () => moveChapterSelection(1));

    await loadState();
    renderAll();
});
