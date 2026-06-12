import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { getNotifications, getUnreadCount, markRead, markAllRead, startNotificationPolling, stopNotificationPolling } from "../lib/notifications.js";
import { fetchContent } from "../lib/utils.js";
import { initI18n, setLang, getLang, t } from "../lib/i18n.js";

export async function loadNavbar({ activeSection, onFavouritesClick } = {}) {
    const html = await fetchContent("/components/navbar.html");
    document.getElementById("navbar-container").innerHTML = html;

    setActiveLink(activeSection);
    initMobileMenu();

    const authSection = document.getElementById("auth-section");
    const bellIcon = document.getElementById("bell-icon");
    if (authSection) {
        if (isAuthenticated()) {
            const user = getUser();
            const userChipHTML = await fetchContent("/components/userchip.html");
            authSection.innerHTML = userChipHTML;
            const avatarEl = document.getElementById("user-avatar");
            const avatarImg = document.querySelector(".user-avatar-img");
            const avatarInitial = document.getElementById("user-avatar-initial");
            if (user.avatar && avatarImg) {
                avatarImg.src = user.avatar;
                avatarImg.style.display = "";
                if (avatarInitial) avatarInitial.style.display = "none";
            } else {
                if (avatarImg) avatarImg.style.display = "none";
                if (avatarInitial) {
                    avatarInitial.textContent = user.username.charAt(0).toUpperCase();
                    avatarInitial.style.display = "";
                }
            }
            const adminBtn = document.getElementById("admin-btn");
            if (adminBtn) {
                adminBtn.style.display = user?.role === "admin" ? "" : "none";
            }
            initUserDropdown(onFavouritesClick);
            if (bellIcon) {
                bellIcon.classList.remove("hidden");
                bellIcon.classList.add("flex");
            }
            initNotifications();

            window.addEventListener("avatar-updated", (e) => {
                const avatarUrl = e.detail?.avatar;
                if (avatarUrl) {
                    if (avatarImg) {
                        avatarImg.src = avatarUrl;
                        avatarImg.style.display = "";
                    }
                    if (avatarInitial) avatarInitial.style.display = "none";
                    document.querySelectorAll(".mobile-avatar-img").forEach(img => {
                        img.src = avatarUrl;
                    });
                }
            });
        } else {
            authSection.innerHTML = `<a href="/login.html" class="login-btn" data-i18n="nav.login_btn">Login</a>`;
            if (bellIcon) { bellIcon.classList.add("hidden"); bellIcon.classList.remove("flex"); }
        }
    }

    updateMobileMenu();
    await initI18n();
    initLangSwitcher();

    return document.getElementById("navbar");
}

export function initBasicScroll() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("collapsed", window.scrollY > 60);
    }, { passive: true });
}

export function setActiveLink(section) {
    if (!section) return;
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.dataset.section === section) {
            link.classList.add("active");
        }
    });
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

    bell.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
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
                    const link = getNotifLink(n);
                    if (link) window.location.href = link;
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

/* =========================
   MOBILE MENU
   ========================= */

function initMobileMenu() {
    const hamburger = document.getElementById("hamburgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileOverlay = document.getElementById("mobileOverlay");
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener("click", () => {
        const userMenu = document.querySelector(".user-menu");
        if (userMenu) userMenu.classList.remove("active");
        mobileMenu.classList.toggle("open");
    });
    mobileOverlay?.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
    });
    mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => mobileMenu.classList.remove("open"));
    });
}

function updateMobileMenu() {
    const loginBtn = document.getElementById("mobileLoginBtn");
    const getStartedBtn = document.getElementById("mobileGetStartedBtn");
    if (!loginBtn || !getStartedBtn) return;

    if (isAuthenticated()) {
        const user = getUser();
        loginBtn.outerHTML = createMobileUserHTML(user);
        getStartedBtn.style.display = "none";

        document.getElementById("mobileLogoutBtn")?.addEventListener("click", () => {
            logout();
            window.location.href = "/login.html";
        });
    }
}

function createMobileUserHTML(user) {
    const initial = user.username?.charAt(0)?.toUpperCase() || "U";
    const avatarHtml = user.avatar
        ? `<img src="${user.avatar}" alt="" class="w-full h-full rounded-full object-cover mobile-avatar-img">`
        : `<span class="text-primary font-bold text-sm">${initial}</span>`;
    const safeUsername = escapeHtml(user.username || "");
    const safeEmail = escapeHtml(user.email || "");

    return `
        <div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary-fixed/10">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
                ${avatarHtml}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-on-surface truncate">${safeUsername}</p>
                <p class="text-xs text-on-surface-variant truncate">${safeEmail}</p>
            </div>
        </div>
        <a href="/profile.html" class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-on-surface-variant hover:bg-primary-fixed/20 hover:text-primary font-headline-md text-lg font-medium spring-ease">
            <span class="material-symbols-outlined">person</span> <span data-i18n="nav.profile">Profile</span>
        </a>
        <button class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-600 hover:bg-red-50 font-headline-md text-lg font-medium spring-ease w-full text-left" id="mobileLogoutBtn">
            <span class="material-symbols-outlined">logout</span> <span data-i18n="nav.logout">Logout</span>
        </button>
    `;
}

function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* =========================
   USER DROPDOWN
   ========================= */

function initUserDropdown(onFavouritesClick) {
    const userMenu = document.querySelector(".user-menu");
    const userChip = document.getElementById("user-chip");
    const logoutBtn = document.getElementById("logout-btn");
    if (!userMenu || !userChip) return;

    userChip.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.toggle("active");
    });
    document.addEventListener("click", () => userMenu.classList.remove("active"));
    userMenu.addEventListener("click", (e) => e.stopPropagation());

    logoutBtn?.addEventListener("click", () => {
        logout();
        window.location.href = "/login.html";
    });

    const favBtn = document.getElementById("favourites-btn");
    favBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.remove("active");
        if (onFavouritesClick) onFavouritesClick();
    });
}

function initLangSwitcher() {
    const btn = document.getElementById("langSwitcher");
    const label = document.getElementById("langLabel");
    if (!btn) return;
    const updateLabel = () => {
        if (label) label.textContent = getLang().toUpperCase();
    };
    updateLabel();
    btn.addEventListener("click", () => {
        const next = getLang() === "en" ? "vi" : "en";
        setLang(next).then(updateLabel);
    });
    window.addEventListener("language-changed", updateLabel);
}
