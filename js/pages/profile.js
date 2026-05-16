import { isAuthenticated, getUser, setUser, logout } from "../lib/session.js";
import { getParticipatedActivities, changeInfo, getFavourites } from "../api/user.js";
import { getCurrentUser } from "../api/auth.js";
import {
    getActivityById, participateActivity,
    unparticipateActivity, checkParticipation
} from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatbot.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }

    await loadNavbar();
    await loadFooter();
    await initChatbot();
    await loadUserProfile();
    await loadParticipatedActivities();
    initEditProfile();
});

async function fetchContent(url) {
    const resp = await fetch(url);
    return resp.text();
}

async function loadNavbar() {
    const html = await fetchContent("./components/navbar.html");
    document.getElementById("navbar-container").innerHTML = html;
    initNavbarActiveLinks();

    const authSection = document.getElementById("auth-section");
    if (isAuthenticated()) {
        const user = getUser();
        const userChipHTML = await fetchContent("./components/userchip.html");
        authSection.innerHTML = userChipHTML;
        document.getElementById("user-name").textContent = user.username;
        initUserDropdown();
    } else {
        authSection.innerHTML = `<a href="/login.html" class="login-btn">Login</a>`;
    }
    initHamburger();
}

function initHamburger() {
    const hamburger = document.getElementById("hamburgerBtn");
    const navLinks = document.getElementById("navLinks");
    if (!hamburger || !navLinks) return;
    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navLinks.classList.toggle("open");
    });
    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navLinks.classList.remove("open");
        });
    });
}

function initNavbarActiveLinks() {
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        const section = link.dataset.section;
        if (section === "home") link.href = "./index.html";
        else if (section === "explore") link.href = "./index.html#explore";
    });
}

function initUserDropdown() {
    const userMenu = document.querySelector(".user-menu");
    const userChip = document.getElementById("user-chip");
    const logoutBtn = document.getElementById("logout-btn");
    if (!userMenu || !userChip) return;

    userChip.addEventListener("click", (e) => { e.stopPropagation(); userMenu.classList.toggle("active"); });
    document.addEventListener("click", () => userMenu.classList.remove("active"));
    userMenu.addEventListener("click", (e) => e.stopPropagation());
    logoutBtn?.addEventListener("click", () => { logout(); window.location.href = "/login.html"; });

    document.getElementById("favourites-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.remove("active");
        showFavPopup();
    });
}

async function loadFooter() {
    const html = await fetchContent("./components/footer.html");
    document.getElementById("footer-container").innerHTML = html;
}

async function loadUserProfile() {
    let user = getUser();
    if (!user) return;

    try {
        const fullUser = await getCurrentUser();
        if (fullUser && fullUser.user) {
            user = fullUser.user;
        }
    } catch {} // fallback to localStorage

    currentUser = user;

    document.getElementById("profile-name").textContent = user.fullname || user.username;
    document.getElementById("profile-email").textContent = user.email || "-";
    document.getElementById("profile-phone").textContent = user.phoneNo || "-";
    document.getElementById("profile-username").textContent = "@" + user.username;

    if (user.dob) {
        const d = new Date(user.dob);
        document.getElementById("profile-dob").textContent = d.toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric"
        });
    }

    if (user.school) {
        document.getElementById("profile-school").textContent = user.school;
    }

    const roleMap = { student: "Student", host: "Host", admin: "Admin" };
    document.getElementById("profile-role").textContent = roleMap[user.role] || "Student";

    const initial = (user.fullname || user.username || "?").charAt(0).toUpperCase();
    document.getElementById("avatar-placeholder").textContent = initial;
}

async function loadParticipatedActivities() {
    const list = document.getElementById("activity-list");
    const countEl = document.getElementById("stats-count");

    try {
        const { activities } = await getParticipatedActivities();
        list.innerHTML = "";

        if (!activities || activities.length === 0) {
            list.innerHTML = `<div class="empty-state">No participated activities yet.</div>`;
            countEl.textContent = "0";
            return;
        }

        countEl.textContent = activities.length;

        activities.forEach(a => {
            const held = a.heldDate ? new Date(a.heldDate).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric"
            }) : "TBD";

            const card = document.createElement("div");
            card.className = "activity-card";
            card.dataset.id = a.activityID;
            card.innerHTML = `
                <div class="activity-thumb">
                    ${a.thumbnail ? `<img src="${a.thumbnail}" alt="${a.title}">` : `<i class="fa-regular fa-image"></i>`}
                </div>
                <div class="activity-body">
                    <div class="activity-meta">
                        <span class="activity-type">${capitalize(a.type)}</span>
                        <span class="activity-date">${held}</span>
                    </div>
                    <div class="activity-title">${a.title}</div>
                    <div class="activity-location"><i class="fa-solid fa-location-dot"></i> ${a.location}</div>
                </div>
            `;
            card.addEventListener("click", () => openPopup(a.activityID));
            list.appendChild(card);
        });
    } catch (err) {
        console.error("Load participated activities error:", err);
        list.innerHTML = `<div class="empty-state">Failed to load activities.</div>`;
    }
}

/* =========================
   POPUP
========================= */

const popupOverlay = document.getElementById("popup-overlay");
const popupContainer = document.getElementById("popup-container");

async function openPopup(activityID) {
    if (!activityID || !popupOverlay || !popupContainer) return;

    const { activity } = await getActivityById(activityID);
    popupContainer.innerHTML = buildPopupHTML(activity);

    if (isAuthenticated()) {
        try {
            const [{ participated }, { favourited }] = await Promise.all([
                checkParticipation(activityID), checkFavourite(activityID)
            ]);
            if (participated) setParticipated();
            if (favourited) setFavourited();
        } catch {}
    }

    initParticipateButton(activityID);

    document.getElementById("back-btn").addEventListener("click", closePopup);

    popupOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    const favoriteBtn = popupContainer.querySelector(".favorite-btn");
    favoriteBtn?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const active = favoriteBtn.classList.contains("active");
        try {
            if (active) { await removeFavourite(activityID); favoriteBtn.classList.remove("active"); }
            else { await addFavourite(activityID); favoriteBtn.classList.add("active"); }
        } catch {}
    });
}

function closePopup() {
    if (!popupOverlay || !popupContainer) return;
    popupOverlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => { popupContainer.innerHTML = ""; }, 300);
}

popupOverlay?.addEventListener("click", (e) => {
    if (e.target === popupOverlay || e.target.classList.contains("popup-backdrop")) {
        closePopup();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
});

function setParticipated() {
    const btn = document.querySelector(".participate");
    if (!btn) return;
    btn.classList.add("active");
    btn.querySelector(".participate-header").textContent = "PARTICIPATED";
    btn.querySelector(".participate-text").textContent = "You have joined in this activity";
}

function setFavourited() {
    const btn = document.querySelector(".favorite-btn");
    if (btn) btn.classList.add("active");
}

function initParticipateButton(activityID) {
    const btn = document.querySelector(".participate");
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const button = e.currentTarget;
        const isActive = button.classList.contains("active");
        if (!isAuthenticated()) return;

        try {
            if (isActive) {
                await unparticipateActivity(activityID);
                button.classList.remove("active");
                button.querySelector(".participate-header").textContent = "PARTICIPATE";
                button.querySelector(".participate-text").textContent = "Join this activity";
                removeActivityCard(activityID);
            } else {
                await participateActivity(activityID);
                button.classList.add("active");
                button.querySelector(".participate-header").textContent = "PARTICIPATED";
                button.querySelector(".participate-text").textContent = "You have joined in this activity";
            }
        } catch (err) {
            console.error("Participate error:", err);
            button.querySelector(".participate-text").textContent = err.message || "Error";
            setTimeout(() => {
                button.querySelector(".participate-text").textContent =
                    button.classList.contains("active") ? "You have joined in this activity" : "Join this activity";
            }, 2000);
        }
    });
}

function buildPopupHTML(a) {
    const heldDate = formatDate(a.heldDate);
    const deadline = formatDate(a.applicationDeadline);
    const type = capitalize(a.type);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;
    const filesHTML = (a.attachments || []).map(f =>
        `<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div><h4>${f.link.split('/').pop()}</h4></div>
            </div>
            <a class="download-btn" href="${CDN_DOMAIN}/${f.link}" target="_blank"><i class="fa-solid fa-download"></i></a>
        </div>`
    ).join("");

    return `
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <div class="top-actions">
                <button class="icon-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
                <button class="favorite-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">Favourite</span></button>
            </div>
        </div>
        <div class="main-content">
            <div class="left-panel">
                <img src="${a.thumbnail || 'https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop'}" alt="${a.title}">
                <div class="tag"><i class="fa-solid fa-tag"></i> ${type}</div>
                <div class="details-card">
                    <h2>Details</h2>
                    <div class="detail-item"><i class="fa-solid fa-location-dot"></i><div><span>Location</span><p>${a.location}</p></div></div>
                    <div class="detail-item"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${heldDate}</p></div></div>
                    <div class="detail-item"><i class="fa-regular fa-user"></i><div><span>Host</span><p>${a.hostName || "Unknown"}</p></div></div>
                    <div class="detail-item"><i class="fa-regular fa-clock"></i><div><span>Apply deadline</span><p>${deadline}</p></div></div>
                    <div class="detail-item"><i class="fa-solid fa-tag"></i><div><span>Type</span><p>${type}</p></div></div>
                </div>
            </div>
            <div class="right-panel">
                <h1 class="title">${a.title}</h1>
                <a class="location-link" href="${mapsLink}" target="_blank"><i class="fa-solid fa-location-dot"></i> ${a.location}</a>
                <div class="info-boxes">
                    <div class="info-box"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${heldDate}</p></div></div>
                    <div class="info-box"><i class="fa-regular fa-clock"></i><div><span>Apply deadline</span><p>${deadline}</p></div></div>
                    <div class="info-box"><i class="fa-regular fa-user"></i><div><span>Hosted by</span><p>${a.hostName || "Unknown"}</p></div></div>
                </div>
                <div class="description-panel">
                    ${(a.description || "").split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
                </div>
                ${filesHTML ? `<div class="files-box"><h3>Attached Files (${(a.attachments || []).length})</h3>${filesHTML}</div>` : ""}
            </div>
        </div>
        <div class="action-buttons">
            <button class="action-btn discuss" type="button"><i class="fa-solid fa-comments"></i><div><h4>DISCUSS</h4><p>0 Comments</p></div></button>
            <button class="action-btn participate" type="button"><i class="fa-solid fa-users"></i><div><h4 class="participate-header">PARTICIPATE</h4><p class="participate-text">Join this activity</p></div></button>
            <button class="action-btn report" type="button"><i class="fa-solid fa-flag"></i><div><h4>REPORT</h4><p>Report this activity</p></div></button>
        </div>
    </div>`;
}

function removeActivityCard(activityID) {
    const card = document.querySelector(`.activity-card[data-id="${activityID}"]`);
    if (card) {
        card.remove();
        const remaining = document.querySelectorAll(".activity-card").length;
        document.getElementById("stats-count").textContent = remaining;
        if (remaining === 0) {
            document.getElementById("activity-list").innerHTML = `<div class="empty-state">No participated activities yet.</div>`;
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return "Unknown Date";
    return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

/* =========================
   FAVOURITES POPUP
========================= */

async function showFavPopup() {
    try {
        const { activities } = await getFavourites();
        const items = (activities || []).map(a => {
            const held = formatDate(a.heldDate);
            return `<div class="fav-item" data-id="${a.activityID}" style="cursor:pointer;border:1px solid #e8ecf4;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;gap:16px;">
                <div style="width:100px;height:75px;border-radius:8px;overflow:hidden;background:#e8ecf4;flex-shrink:0;">${a.thumbnail ? `<img src="${a.thumbnail}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="padding:24px;text-align:center;color:#999"><i class="fa-regular fa-image"></i></div>'}</div>
                <div style="flex:1"><div style="font-weight:600;margin-bottom:4px;">${a.title}</div><div style="font-size:13px;color:var(--text-secondary)"><i class="fa-solid fa-location-dot" style="color:var(--accent)"></i> ${a.location}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${held}</div></div>
            </div>`;
        }).join("");

        popupContainer.innerHTML = `
            <div class="container">
                <div class="top-bar">
                    <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
                    <h2 style="font-size:22px;font-weight:700;">Favourite Activities</h2>
                </div>
                <div style="margin-top:20px;">${items || '<p style="text-align:center;color:var(--text-muted)">No favourites yet.</p>'}</div>
            </div>`;

        popupOverlay.classList.add("active");
        document.getElementById("back-btn").addEventListener("click", closePopup);

        popupContainer.querySelectorAll(".fav-item").forEach(el => {
            el.addEventListener("click", () => openPopup(el.dataset.id));
        });
    } catch {}
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/* =========================
   EDIT PROFILE
========================= */

let currentUser = null;

function initEditProfile() {
    const editBtn = document.getElementById("edit-profile-btn");
    const modal = document.getElementById("edit-modal");
    const closeBtn = document.getElementById("edit-modal-close");
    const cancelBtn = document.getElementById("edit-btn-cancel");
    const form = document.getElementById("edit-form");
    const backdrop = modal?.querySelector(".edit-modal-backdrop");

    if (!editBtn || !modal) return;

    editBtn.addEventListener("click", () => openEditModal());
    closeBtn?.addEventListener("click", closeEditModal);
    cancelBtn?.addEventListener("click", closeEditModal);
    backdrop?.addEventListener("click", closeEditModal);
    form?.addEventListener("submit", handleEditSubmit);
}

function openEditModal() {
    const user = currentUser || getUser();
    if (!user) return;

    document.getElementById("edit-fullname").value = user.fullname || "";
    document.getElementById("edit-dob").value = user.dob ? user.dob.split("T")[0] : "";
    document.getElementById("edit-phone").value = user.phoneNo || "";
    document.getElementById("edit-school").value = user.school || "";
    document.getElementById("edit-class").value = user.class || "";
    document.getElementById("edit-major").value = user.major || "";

    document.getElementById("edit-modal").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeEditModal() {
    document.getElementById("edit-modal").classList.remove("active");
    document.body.style.overflow = "";
    const status = document.querySelector(".edit-form-status");
    if (status) status.remove();
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const user = currentUser || getUser();
    if (!user) return;

    const statusEl = document.createElement("div");
    statusEl.className = "edit-form-status";
    const existing = document.querySelector(".edit-form-status");
    if (existing) existing.remove();

    const data = {
        username: user.username,
        fullname: document.getElementById("edit-fullname").value.trim(),
        dob: document.getElementById("edit-dob").value,
        phoneNo: document.getElementById("edit-phone").value.trim(),
        school: document.getElementById("edit-school").value.trim(),
        className: document.getElementById("edit-class").value.trim(),
        major: document.getElementById("edit-major").value.trim()
    };

    if (!data.fullname || !data.dob || !data.school || !data.className || !data.major) {
        statusEl.className = "edit-form-status error";
        statusEl.textContent = "Please fill in all required fields.";
        document.getElementById("edit-form").appendChild(statusEl);
        return;
    }

    statusEl.className = "edit-form-status";
    statusEl.textContent = "Saving...";
    document.getElementById("edit-form").appendChild(statusEl);

    try {
        const result = await changeInfo(data);
        currentUser = result.user;
        setUser(result.user);
        loadUserProfile();
        statusEl.className = "edit-form-status success";
        statusEl.textContent = "Profile updated successfully!";
        setTimeout(closeEditModal, 1200);
    } catch (err) {
        statusEl.className = "edit-form-status error";
        statusEl.textContent = err.message || "Failed to update profile.";
    }
}
