import { isAuthenticated, getUser, setUser, logout, isStudentVerified } from "../lib/session.js";
import { getNotifications, getUnreadCount, markRead, markAllRead, startNotificationPolling, stopNotificationPolling } from "../lib/notifications.js";
import { fetchContent } from "../lib/utils.js";
import { initI18n, setLang, getLang, t } from "../lib/i18n.js";
import { initPageTransition } from "./pageLoader.js";

export function populateUserChip(user, activeSection) {
    if (!user) return;
    const avatarImg = document.querySelector(".user-avatar-img");
    const avatarInitial = document.getElementById("user-avatar-initial");
    const dropdownAvatarImg = document.querySelector(".dropdown-avatar-img");
    const dropdownAvatarInitial = document.querySelector(".dropdown-avatar-initial");
    const userInitial = (user.username || user.fullname || user.email || "U").charAt(0).toUpperCase();

    if (user.avatar) {
        if (avatarImg) { avatarImg.src = user.avatar; avatarImg.style.display = ""; }
        if (avatarInitial) avatarInitial.style.display = "none";
        if (dropdownAvatarImg) { dropdownAvatarImg.src = user.avatar; dropdownAvatarImg.style.display = ""; }
        if (dropdownAvatarInitial) dropdownAvatarInitial.style.display = "none";
    } else {
        if (avatarImg) avatarImg.style.display = "none";
        if (avatarInitial) { avatarInitial.textContent = userInitial; avatarInitial.style.display = ""; }
        if (dropdownAvatarImg) dropdownAvatarImg.style.display = "none";
        if (dropdownAvatarInitial) { dropdownAvatarInitial.textContent = userInitial; dropdownAvatarInitial.style.display = ""; }
    }

    const usernameEl = document.getElementById("dropdown-username");
    const emailEl = document.getElementById("dropdown-email");
    const roleEl = document.getElementById("dropdown-role-badge");

    if (usernameEl) usernameEl.textContent = user.fullname || user.username || "User";
    if (emailEl) emailEl.textContent = user.email || "";
    if (roleEl) {
        if (user.role === 'admin') {
            roleEl.textContent = "Admin";
            roleEl.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider";
        } else if (user.role === 'host') {
            roleEl.textContent = "Host / Organizer";
            roleEl.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider";
        } else if (isStudentVerified(user)) {
            roleEl.textContent = "Verified Student";
            roleEl.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider";
        } else {
            roleEl.textContent = "Student";
            roleEl.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider";
        }
    }

    const pageLabelEl = document.getElementById("chip-active-page-label");
    if (pageLabelEl) {
        const sectionName = activeSection || getSectionFromPath();
        pageLabelEl.textContent = getSectionTitle(sectionName);
    }

    const adminDashboardBtn = document.getElementById("admin-dashboard-btn");
    if (adminDashboardBtn) {
        adminDashboardBtn.style.display = user?.role === "admin" ? "" : "none";
    }
}

export async function loadNavbar({ activeSection } = {}) {
    try {
        initPageTransition();
    } catch (e) {}

    const navbarContainer = document.getElementById("navbar-container");
    const cachedNav = sessionStorage.getItem("cached_navbar_html");
    const cachedUserChip = sessionStorage.getItem("cached_userchip_html");

    // 1. FAST PATH: Instant synchronous render from sessionStorage cache (0ms delay)
    if (navbarContainer && cachedNav && !navbarContainer.innerHTML.trim()) {
        navbarContainer.innerHTML = cachedNav;
        const authSection = document.getElementById("auth-section");
        const bellIcon = document.getElementById("bell-icon");

        if (authSection) {
            if (isAuthenticated()) {
                const user = getUser();
                if (cachedUserChip) {
                    authSection.innerHTML = cachedUserChip;
                    populateUserChip(user, activeSection);
                    initUserDropdown();
                }
                if (bellIcon) {
                    bellIcon.classList.remove("hidden");
                    bellIcon.classList.add("flex");
                }
            } else {
                authSection.innerHTML = `
                    <a href="/login.html" class="figma-navbar-login-btn flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition spring-ease" data-i18n="nav.login_btn">
                        <span data-i18n="nav.login">Login</span>
                        <img src="/assets/images/icon-login.svg" alt="Login Icon" class="w-4 h-4" />
                    </a>
                `;
                if (bellIcon) { bellIcon.classList.add("hidden"); bellIcon.classList.remove("flex"); }
            }
            updateHostBtn();
        }
        setActiveLink(activeSection);
    }

    // 2. Fetch fresh navbar and userchip in parallel
    const [html, userChipHTML] = await Promise.all([
        fetchContent("/components/navbar.html"),
        isAuthenticated() ? fetchContent("/components/userchip.html") : Promise.resolve("")
    ]);

    if (html && navbarContainer) {
        // Update DOM if not already present or if changed
        if (!cachedNav || navbarContainer.innerHTML !== html) {
            navbarContainer.innerHTML = html;
            sessionStorage.setItem("cached_navbar_html", html);
        }
    }

    if (userChipHTML) {
        sessionStorage.setItem("cached_userchip_html", userChipHTML);
    }

    setActiveLink(activeSection);

    const authSection = document.getElementById("auth-section");
    const bellIcon = document.getElementById("bell-icon");
    if (authSection) {
        if (isAuthenticated()) {
            const user = getUser();
            const chipContent = userChipHTML || cachedUserChip || sessionStorage.getItem("cached_userchip_html");
            if (chipContent) {
                authSection.innerHTML = chipContent;
                populateUserChip(user, activeSection);
                initUserDropdown();
            }

            if (bellIcon) {
                bellIcon.classList.remove("hidden");
                bellIcon.classList.add("flex");
            }
            initNotifications();

            window.addEventListener("avatar-updated", (e) => {
                const avatarUrl = e.detail?.avatar;
                if (avatarUrl) {
                    const avatarImg = document.querySelector(".user-avatar-img");
                    const avatarInitial = document.getElementById("user-avatar-initial");
                    const dropdownAvatarImg = document.querySelector(".dropdown-avatar-img");
                    const dropdownAvatarInitial = document.querySelector(".dropdown-avatar-initial");
                    if (avatarImg) { avatarImg.src = avatarUrl; avatarImg.style.display = ""; }
                    if (avatarInitial) avatarInitial.style.display = "none";
                    if (dropdownAvatarImg) { dropdownAvatarImg.src = avatarUrl; dropdownAvatarImg.style.display = ""; }
                    if (dropdownAvatarInitial) dropdownAvatarInitial.style.display = "none";
                }
            });
        } else {
            authSection.innerHTML = `
                <a href="/login.html" class="figma-navbar-login-btn flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition spring-ease" data-i18n="nav.login_btn">
                    <span data-i18n="nav.login">Login</span>
                    <img src="/assets/images/icon-login.svg" alt="Login Icon" class="w-4 h-4" />
                </a>
            `;
            if (bellIcon) { bellIcon.classList.add("hidden"); bellIcon.classList.remove("flex"); }
        }
        updateHostBtn();
    }

    // 3. Background Non-Blocking Session & Verification Sync
    if (isAuthenticated()) {
        import("../api/auth.js").then(({ getCurrentUser }) => {
            return getCurrentUser();
        }).then(res => {
            if (res && res.user) {
                setUser(res.user);
                populateUserChip(res.user, activeSection);
                updateHostBtn();
            }
        }).catch(err => {
            console.warn("Background sync session failed:", err);
        });

        import("./verificationGuard.js").then(({ initVerificationGuard }) => {
            initVerificationGuard();
        }).catch(() => {});
    }

    initI18n().catch(() => {});
    initLangSwitcher();
    initSlidingIndicator();
    initMobileMenuDrawer();

    return document.getElementById("navbar");
}

export function initBasicScroll() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("collapsed", window.scrollY > 60);
    }, { passive: true });
}

export function getSectionFromPath() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("explore")) return "explore";
    if (path.includes("community")) return "community";
    if (path.includes("about")) return "about";
    if (path.includes("quiz")) return "quiz";
    if (path.includes("profile")) return "profile";
    if (path.includes("my-events")) return "my-events";
    if (path.includes("roadmap")) return "roadmap";
    if (path.includes("org-dashboard")) return "org-dashboard";
    if (path.includes("admin")) return "admin";
    return "home";
}

export function getSectionTitle(sec) {
    switch (sec) {
        case "explore": return "Explore";
        case "community": return "Community";
        case "about": return "About Us";
        case "quiz": return "AI Quiz";
        case "profile": return "Profile";
        case "my-events": return "My Events";
        case "roadmap": return "Roadmap";
        case "org-dashboard": return "Dashboard";
        case "admin": return "Admin";
        default: return "Home";
    }
}

export function setActiveLink(section) {
    const sec = section || getSectionFromPath();
    const navLinks = document.querySelectorAll(".nav-links a, .figma-navbar-link, .dropdown-item[data-section], .mobile-nav-link[data-section]");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.dataset.section === sec) {
            link.classList.add("active");
        }
    });

    const pageLabelEl = document.getElementById("chip-active-page-label");
    if (pageLabelEl) {
        pageLabelEl.textContent = getSectionTitle(sec);
    }
}

function initMobileMenuDrawer() {
    const menuBtn = document.getElementById("mobile-menu-btn");
    const drawer = document.getElementById("mobile-nav-drawer");
    const backdrop = document.getElementById("mobile-nav-backdrop");
    const closeBtn = document.getElementById("close-mobile-menu");
    const mobileAuth = document.getElementById("mobile-auth-actions");
    const mobileLangBtn = document.getElementById("mobile-drawer-lang-btn");
    const mobileLangCode = document.getElementById("mobile-drawer-lang-code");

    if (!drawer || !backdrop) return;

    const openDrawer = () => {
        drawer.classList.add("open");
        backdrop.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
        backdrop.setAttribute("aria-hidden", "false");
        menuBtn?.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    };

    const closeDrawer = () => {
        drawer.classList.remove("open");
        backdrop.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
        backdrop.setAttribute("aria-hidden", "true");
        menuBtn?.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    };

    menuBtn?.addEventListener("click", openDrawer);
    closeBtn?.addEventListener("click", closeDrawer);
    backdrop?.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("open")) {
            closeDrawer();
        }
    });

    // Populate mobile auth actions
    if (mobileAuth) {
        if (isAuthenticated()) {
            const user = getUser();
            mobileAuth.innerHTML = `
                <a href="/profile.html" class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs transition hover:bg-primary/20">
                    <i class="fa-regular fa-user"></i>
                    <span>${escapeHtml(user.fullname || user.username || "Profile")}</span>
                </a>
                <a href="/my-events.html" class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs transition hover:bg-slate-200">
                    <i class="fa-solid fa-calendar-check"></i>
                    <span>My Events</span>
                </a>
                <a href="/roadmap.html" class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs transition hover:bg-slate-200">
                    <i class="fa-solid fa-route"></i>
                    <span data-i18n="user.roadmap">Roadmap</span>
                </a>
                ${user.role === 'admin' ? `
                    <a href="/admin.html" class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 font-semibold text-xs transition hover:bg-purple-100">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span data-i18n="admin.dashboard">Admin Dashboard</span>
                    </a>
                ` : ''}
                ${user.role === 'host' ? `
                    <a href="/org-dashboard.html" class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 font-semibold text-xs transition hover:bg-amber-100">
                        <i class="fa-solid fa-gauge-high"></i>
                        <span data-i18n="user.host_dashboard">Host Dashboard</span>
                    </a>
                ` : ''}
                <button type="button" id="mobile-logout-btn" class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition border-0 cursor-pointer text-left">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    <span data-i18n="user.logout">Logout</span>
                </button>
            `;
            document.getElementById("mobile-logout-btn")?.addEventListener("click", () => {
                logout();
                window.location.href = "/index.html";
            });
        } else {
            mobileAuth.innerHTML = `
                <a href="/login.html" class="w-full py-2.5 px-4 rounded-xl bg-primary text-white text-center font-bold text-xs shadow-md transition hover:bg-primary/90">
                    <span data-i18n="nav.login">Login</span>
                </a>
                <a href="/register.html" class="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-center font-bold text-xs transition hover:bg-slate-200">
                    <span data-i18n="login.register_now">Register</span>
                </a>
            `;
        }
    }

    if (mobileLangBtn && mobileLangCode) {
        mobileLangCode.textContent = getLang().toUpperCase();
        mobileLangBtn.addEventListener("click", () => {
            const next = getLang() === "en" ? "vi" : "en";
            setLang(next).then(() => {
                mobileLangCode.textContent = next.toUpperCase();
            });
        });
    }
}

/* =========================
   NAVBAR TOAST
   ========================= */

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function showNavbarToast({ message, tone = "info", durationMs = 4000 }) {
    let host = document.getElementById("navbar-toast-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "navbar-toast-host";
        host.className = "fixed top-[88px] left-1/2 -translate-x-1/2 z-[1300] flex flex-col items-center gap-2 pointer-events-none max-w-[calc(100vw-32px)]";
        document.body.appendChild(host);
        const mq = window.matchMedia("(max-width: 768px)");
        const updateTop = () => {
            host.style.top = mq.matches ? "62px" : "88px";
        };
        mq.addEventListener("change", updateTop);
        updateTop();
    }
    const tones = {
        info: "bg-white text-[#191b22] border border-[#e2e8f0]",
        warning: "bg-amber-50 text-amber-900 border border-amber-200",
        error: "bg-red-50 text-red-700 border border-red-200",
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className = `pointer-events-auto px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 spring-ease opacity-0 translate-y-[-8px] ${tones[tone] || tones.info}`;
    const icon = {
        info: "info", warning: "warning", error: "error", success: "check_circle"
    }[tone] || "info";
    // Escape message to avoid injecting HTML if it ever surfaces API/user content
    const safeMessage = escapeHtml(message);
    toast.innerHTML = `<span class="material-symbols-outlined text-base shrink-0" aria-hidden="true">${icon}</span><span>${safeMessage}</span>`;
    host.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove("opacity-0", "translate-y-[-8px]");
        toast.classList.add("opacity-100", "translate-y-0");
    });
    const dismiss = () => {
        toast.classList.remove("opacity-100", "translate-y-0");
        toast.classList.add("opacity-0", "translate-y-[-8px]");
        setTimeout(() => toast.remove(), 300);
    };
    toast.addEventListener("click", dismiss);
    setTimeout(dismiss, durationMs);
}

/* =========================
   USER DROPDOWN
   ========================= */

function updateHostBtn() {
    const u = getUser();
    const isHost = u?.role === 'host';
    const isAdmin = u?.role === 'admin';

    const desktopBtn = document.getElementById("desktop-become-host-btn");
    if (desktopBtn && (isHost || isAdmin)) {
        desktopBtn.style.display = "none";
    }

    // Hosts and admins get a direct Host Dashboard link; admins keep "Become a Host" hidden
    const hostDashboardBtn = document.getElementById("host-dashboard-btn");
    if (hostDashboardBtn && (isHost || isAdmin)) {
        hostDashboardBtn.style.display = "";
        // Resolve the org id once so the link goes directly to the user's organization
        import("../api/host.js").then(({ getMyHostStatus }) => {
            getMyHostStatus().then((data) => {
                const url = data?.orgId ? `/org-dashboard.html?orgId=${data.orgId}` : "/org-dashboard.html";
                hostDashboardBtn.setAttribute("href", url);
            }).catch(() => {
                // Fallback to plain dashboard if status lookup fails
                hostDashboardBtn.setAttribute("href", "/org-dashboard.html");
            });
        }).catch(() => {
            hostDashboardBtn.setAttribute("href", "/org-dashboard.html");
        });
    }
}

function initUserDropdown() {
    const userMenu = document.querySelector(".user-menu");
    const userChip = document.getElementById("user-chip");
    const logoutBtn = document.getElementById("logout-btn");
    if (!userMenu || !userChip) return;

    const setUserMenuOpen = (open) => {
        userMenu.classList.toggle("active", open);
        userChip.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
            const notif = document.getElementById("notif-dropdown");
            if (notif) {
                notif.classList.remove("active");
                document.getElementById("bell-icon")?.setAttribute("aria-expanded", "false");
            }
            // Move focus into the dropdown for keyboard users
            const firstItem = userMenu.querySelector(".dropdown-item, button, a[href]");
            if (firstItem && typeof firstItem.focus === "function") {
                firstItem.focus();
            }
        }
    };

    userChip.addEventListener("click", (e) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenu.classList.contains("active"));
    });

    userChip.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setUserMenuOpen(true);
        } else if (e.key === "Escape" && userMenu.classList.contains("active")) {
            e.preventDefault();
            setUserMenuOpen(false);
            userChip.focus();
        }
    });

    document.addEventListener("click", (e) => {
        if (!userMenu.contains(e.target) && e.target !== userChip) {
            setUserMenuOpen(false);
        }
    });
    userMenu.addEventListener("click", (e) => e.stopPropagation());

    // Arrow-key navigation inside the dropdown
    const items = () => Array.from(userMenu.querySelectorAll(".dropdown-item, button:not(.dropdown-item), a[href]"))
        .filter(el => el.offsetParent !== null && !el.hasAttribute("disabled"));
    userMenu.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            setUserMenuOpen(false);
            userChip.focus();
            return;
        }
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
        const list = items();
        if (!list.length) return;
        const currentIndex = list.indexOf(document.activeElement);
        let nextIndex = currentIndex;
        if (e.key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % list.length;
        if (e.key === "ArrowUp") nextIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
        if (e.key === "Home") nextIndex = 0;
        if (e.key === "End") nextIndex = list.length - 1;
        e.preventDefault();
        list[nextIndex].focus();
    });

    logoutBtn?.addEventListener("click", () => {
        logout();
        window.location.href = "/login.html";
    });

    const desktopHostBtn = document.getElementById("desktop-become-host-btn");
    if (desktopHostBtn) {
        desktopHostBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const u = getUser();
            // Hosts and admins use the dedicated Host Dashboard link instead
            if (u?.role === 'host' || u?.role === 'admin') return;
            try {
                const { getMyHostStatus } = await import("../api/host.js");
                const data = await getMyHostStatus();
                if (data.status === 'approved') {
                    // Approved but role not yet set — go to the dashboard
                    const url = data.orgId ? `/org-dashboard.html?orgId=${data.orgId}` : "/org-dashboard.html";
                    window.location.href = url;
                    return;
                }
                if (data.status === 'pending') {
                    showNavbarToast({
                        message: "Your host registration is pending review. Please wait for approval.",
                        tone: "warning",
                        durationMs: 5000
                    });
                    return;
                }
            } catch {}
            if (!u?.dob || !u?.school || !u?.class || !u?.major || !u?.phoneNo) {
                showNavbarToast({
                    message: "Complete your profile (Date of birth, School, Class, Major, Phone) before registering as a Host.",
                    tone: "warning",
                    durationMs: 6000
                });
                setTimeout(() => { window.location.href = "/profile.html"; }, 1200);
            } else {
                window.location.href = "/register-host.html";
            }
        });
    }

    const favBtn = document.getElementById("favourites-btn");
    favBtn?.addEventListener("click", async (e) => {
        e.stopPropagation();
        userMenu.classList.remove("active");
        const { showFavouritesGlobal } = await import("./favourites.js");
        showFavouritesGlobal();
    });

    const verifyBtn = document.getElementById("verify-student-btn");
    if (verifyBtn) {
        const u = getUser();
        verifyBtn.style.display = (u && !isStudentVerified(u)) ? "flex" : "none";
        verifyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userMenu.classList.remove("active");
            window.location.href = "/student-verify.html";
        });
    }
}

/* =========================
   NOTIFICATIONS
   ========================= */

function initNotifications() {
    renderNotifCount();
    renderNotifDropdown();

    const bell = document.getElementById("bell-icon");
    const dropdown = document.getElementById("notif-dropdown");
    if (!bell || !dropdown) return;

    startNotificationPolling();

    const setNotifOpen = (open) => {
        dropdown.classList.toggle("active", open);
        bell.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
            const userMenu = document.querySelector(".user-menu");
            if (userMenu) {
                userMenu.classList.remove("active");
                document.getElementById("user-chip")?.setAttribute("aria-expanded", "false");
            }
        }
    };

    bell.addEventListener("click", (e) => {
        e.stopPropagation();
        setNotifOpen(!dropdown.classList.contains("active"));
    });

    bell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setNotifOpen(!dropdown.classList.contains("active"));
        } else if (e.key === "Escape" && dropdown.classList.contains("active")) {
            e.preventDefault();
            setNotifOpen(false);
            bell.focus();
        }
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });

    window.addEventListener("notifications-updated", () => {
        renderNotifCount();
        renderNotifDropdown();
    });
}

function renderNotifCount() {
    const count = getUnreadCount();
    const el = document.getElementById("bell-count");
    if (!el) return;
    if (count > 0) {
        el.textContent = count > 9 ? "9+" : count;
        el.classList.remove("hidden");
    } else {
        el.classList.add("hidden");
    }
}

function renderNotifDropdown() {
    const dropdown = document.getElementById("notif-dropdown");
    if (!dropdown) return;

    const all = getNotifications();

    if (all.length === 0) {
        dropdown.innerHTML = `
            <div class="notif-dropdown-menu">
                <div class="notif-empty">
                    <span class="material-symbols-outlined notif-empty-icon">notifications_none</span>
                    <span data-i18n="user.no_notifications">No notifications yet</span>
                </div>
            </div>
        `;
        return;
    }

    const unreadCount = all.filter((n) => !n.read).length;

    function getNotifIcon(type) {
        switch (type) {
            case 'comment_like': return 'thumb_up';
            case 'reply': return 'reply';
            case 'new_comment': return 'chat_bubble';
            case 'new_discussion': return 'forum';
            case 'event_review': return 'rate_review';
            case 'badge': return 'military_tech';
            default: return 'notifications';
        }
    }

    function getNotifLink(n) {
        if (n.type === 'badge') return '/profile.html';
        if (n.discussionId) return `/community.html?discussion=${n.discussionId}`;
        return '#';
    }

    dropdown.innerHTML = `
        <div class="notif-dropdown-menu">
            <div class="notif-header">
                <span class="notif-header-title" data-i18n="user.notifications">Notifications</span>
                ${unreadCount > 0 ? `<button class="notif-mark-all" id="notif-mark-all" data-i18n="user.mark_all_read">Mark all read</button>` : ""}
            </div>
            <div class="notif-list">
                ${all.map((n) => `
                    <div class="notif-item ${n.read ? "" : "unread"}" data-notif-id="${n.id}">
                        <div class="notif-item-icon ${n.read ? "" : "unread"}">
                            <span class="material-symbols-outlined">${getNotifIcon(n.type)}</span>
                        </div>
                        <div class="notif-item-body">
                            <span class="notif-item-msg">${n.message}</span>
                            <span class="notif-item-time">${timeAgo(n.createdAt)}</span>
                        </div>
                        ${n.read ? "" : '<span class="notif-unread-dot"></span>'}
                    </div>
                `).join("")}
            </div>
        </div>
    `;

    dropdown.querySelectorAll(".notif-item").forEach((item) => {
        item.addEventListener("click", () => {
            const id = item.dataset.notifId;
            if (id) {
                const n = all.find((x) => x.id === id);
                if (n) {
                    markRead(id);
                    if (n.type === 'event_review' && n.eventId) {
                        import('./reviewModal.js').then(m => m.openReviewModal(n.eventId, n.message));
                    } else {
                        const link = getNotifLink(n);
                        if (link) window.location.href = link;
                    }
                }
            }
        });
    });

    const markAllBtn = document.getElementById("notif-mark-all");
    if (markAllBtn) {
        markAllBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            markAllRead();
        });
    }
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("user.just_now");
    if (mins < 60) return t("user.m_ago", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("user.h_ago", { n: hrs });
    const days = Math.floor(hrs / 24);
    return t("user.d_ago", { n: days });
}

function initLangSwitcher() {
    const btn = document.getElementById("langSwitcher");
    const label = document.getElementById("langLabel");
    const dropdownLangBtn = document.getElementById("dropdown-mobile-lang-btn");
    const dropdownLangCode = document.getElementById("dropdown-lang-code");
    
    const updateLabel = () => {
        const lang = getLang().toUpperCase();
        if (label) label.textContent = lang;
        if (dropdownLangCode) dropdownLangCode.textContent = lang;
    };
    updateLabel();
    
    const toggleLang = (e) => {
        if (e) e.stopPropagation();
        const next = getLang() === "en" ? "vi" : "en";
        setLang(next).then(updateLabel);
    };
    
    btn?.addEventListener("click", toggleLang);
    dropdownLangBtn?.addEventListener("click", toggleLang);
    window.addEventListener("language-changed", updateLabel);
}

function initSlidingIndicator() {
    const menu = document.getElementById("navLinks");
    if (!menu) return;

    let indicator = menu.querySelector(".nav-indicator-pill");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "nav-indicator-pill";
        menu.appendChild(indicator);
    }

    const links = menu.querySelectorAll(".figma-navbar-link");

    const moveIndicator = (targetLink) => {
        if (!targetLink) {
            indicator.style.opacity = "0";
            return;
        }
        const menuRect = menu.getBoundingClientRect();
        const linkRect = targetLink.getBoundingClientRect();

        const left = linkRect.left - menuRect.left;
        const width = linkRect.width;

        // Keep the original width and position
        const reducedWidth = width;
        const centeredLeft = left;

        indicator.style.left = `${centeredLeft}px`;
        indicator.style.width = `${reducedWidth}px`;
        indicator.style.opacity = "1";

        links.forEach(l => {
            if (l === targetLink) {
                l.classList.add("active-text");
            } else {
                l.classList.remove("active-text");
            }
        });
    };

    const activeLink = menu.querySelector(".figma-navbar-link.active");

    if (activeLink) {
        // Initialize position instantly on page load without sliding animation
        indicator.style.transition = "none";
        moveIndicator(activeLink);

        // Force browser layout update
        indicator.offsetHeight;

        // Restore transition for smooth hover movement
        setTimeout(() => {
            indicator.style.transition = "";
        }, 50);
    }

    links.forEach((link) => {
        link.addEventListener("mouseenter", () => moveIndicator(link));
        link.addEventListener("mouseleave", () => {
            const currentActive = menu.querySelector(".figma-navbar-link.active");
            if (currentActive) {
                moveIndicator(currentActive);
            } else {
                indicator.style.opacity = "0";
                links.forEach(l => l.classList.remove("active-text"));
            }
        });
    });

    let resizeRaf = null;
    window.addEventListener("resize", () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
            const currentActive = menu.querySelector(".figma-navbar-link.active");
            if (currentActive) {
                moveIndicator(currentActive);
            }
            resizeRaf = null;
        });
    }, { passive: true });
}
