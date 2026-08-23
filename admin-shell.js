const DRAWER_STATE_KEY = "prepcore.web.adminDrawerCollapsed.v1";

function readDrawerState() {
    try {
        return localStorage.getItem(DRAWER_STATE_KEY) === "true";
    } catch {
        return false;
    }
}

function writeDrawerState(collapsed) {
    try {
        localStorage.setItem(DRAWER_STATE_KEY, String(collapsed));
    } catch {
        // The drawer still works when storage is unavailable.
    }
}

export function initAdminShell({ elements, state, onNavigate }) {
    const syncPageNavigation = () => {
        const currentPage = window.location.pathname.split("/").pop() || "admin.html";
        document.querySelectorAll(".admin-page-nav a").forEach((link) => {
            const linkPage = new URL(link.href, window.location.href).pathname.split("/").pop() || "admin.html";
            const isCurrent = linkPage === currentPage;
            link.classList.toggle("is-active", isCurrent);
            if (isCurrent) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    };

    const setDrawerCollapsed = (collapsed) => {
        state.drawerCollapsed = Boolean(collapsed);
        writeDrawerState(state.drawerCollapsed);
        document.body.classList.toggle("admin-drawer-collapsed", state.drawerCollapsed);
        if (elements.sidebarToggle) {
            elements.sidebarToggle.setAttribute("aria-expanded", String(!state.drawerCollapsed));
            elements.sidebarToggle.setAttribute("aria-label", state.drawerCollapsed ? "Expand subject drawer" : "Collapse subject drawer");
            elements.sidebarToggle.textContent = state.drawerCollapsed ? ">" : "<";
        }
        elements.sidebarCard?.classList.toggle("is-collapsed", state.drawerCollapsed);
    };

    const closeMobileDrawer = () => document.body.classList.remove("admin-drawer-open");
    const openMobileDrawer = () => document.body.classList.add("admin-drawer-open");

    elements.sidebarToggle?.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 900px)").matches) {
            closeMobileDrawer();
        } else {
            setDrawerCollapsed(!state.drawerCollapsed);
        }
    });
    elements.drawerOpen?.addEventListener("click", openMobileDrawer);

    syncPageNavigation();
    document.querySelectorAll(".admin-page-nav a").forEach((link) => {
        link.addEventListener("click", (event) => {
            if (onNavigate && !onNavigate(link)) event.preventDefault();
        });
    });

    const backdrop = document.querySelector(".admin-drawer-backdrop") || document.createElement("div");
    backdrop.className = "admin-drawer-backdrop";
    backdrop.addEventListener("click", closeMobileDrawer);
    if (!backdrop.parentNode) document.body.appendChild(backdrop);

    state.drawerCollapsed = readDrawerState();
    setDrawerCollapsed(state.drawerCollapsed);

    return { setDrawerCollapsed, openMobileDrawer, closeMobileDrawer };
}
