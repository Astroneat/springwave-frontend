import "../../src/style.css";
import { isAuthenticated, getUser, setUser } from "../lib/session.js";
import { changeInfo, getFavourites, getUserContribution } from "../api/user.js";
import { getCurrentUser } from "../api/auth.js";
import {
    getActivityById, participateActivity,
    unparticipateActivity, checkParticipation
} from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }

    await loadNavbar();
    await loadFooter();
    await initChatbot();
    await loadUserProfile();
    await renderContribPanel();
    initEditProfile();
});

async function loadNavbar() {
    await loadSharedNavbar({ onFavouritesClick: showFavPopup });
    initBasicScroll();
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

    document.getElementById("profile-name").textContent = user.username || user.fullname;
    document.getElementById("profile-email").textContent = user.email || "-";
    document.getElementById("profile-phone").textContent = user.phoneNo || "-";
    document.getElementById("profile-username").textContent = user.fullname || "-";

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

    const initial = (user.username || user.fullname || "?").charAt(0).toUpperCase();
    document.getElementById("avatar-placeholder").textContent = initial;

    updateEditButton(user);
}

function updateEditButton(user) {
    const btn = document.getElementById("edit-profile-btn");
    if (!btn) return;

    const isComplete = user.dob && user.school && user.class && user.major && user.phoneNo;
    if (isComplete) {
        btn.innerHTML = '<i class="fa-regular fa-pen-to-square"></i> Edit Profile';
        btn.classList.remove("complete");
    } else {
        btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> Complete Profile';
        btn.classList.add("complete");
    }
}



/* =========================
   POPUP
========================= */

const popupOverlay = document.getElementById("popup-overlay");
const popupContainer = document.getElementById("popup-container");

async function openPopup(activityID) {
    if (!activityID || !popupOverlay || !popupContainer) return;

    popupContainer.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    popupOverlay.removeAttribute("hidden");
    popupOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    const { activity } = await getActivityById(activityID);
    popupContainer.innerHTML = buildPopupHTML(activity);

    initParticipateButton(activityID);

    document.getElementById("back-btn").addEventListener("click", closePopup);

    if (isAuthenticated()) {
        Promise.all([
            checkParticipation(activityID).then(({ participated }) => { if (participated) setParticipated(); }),
            checkFavourite(activityID).then(({ favourited }) => { if (favourited) setFavourited(); })
        ]).catch(() => {});
    }

    const favoriteBtn = popupContainer.querySelector(".favorite-btn");
    favoriteBtn?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const active = favoriteBtn.classList.contains("active");
        favoriteBtn.classList.toggle("active");
        try {
            if (active) { await removeFavourite(activityID); }
            else { await addFavourite(activityID); }
        } catch (err) {
            favoriteBtn.classList.toggle("active");
            console.error("Failed to toggle favourite:", err);
        }
    });
}

function closePopup() {
    if (!popupOverlay || !popupContainer) return;
    popupOverlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => { popupContainer.innerHTML = ""; popupOverlay.setAttribute("hidden", ""); }, 300);
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
    const filesHTML = (a.attachments || []).map(f => {
        const fileName = decodeURIComponent(f.link.split('/').pop());
        return `<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div><h4>${fileName}</h4></div>
            </div>
            <a class="download-btn" href="${CDN_DOMAIN}/${f.link}" target="_blank"><i class="fa-solid fa-download"></i></a>
        </div>`;
    }).join("");

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

/* =========================
   FAVOURITES POPUP
   ========================= */

async function showFavPopup() {
    try {
        const { activities } = await getFavourites();
        const items = (activities || []).map(a => {
            const held = formatDate(a.heldDate);
            return `<div class="fav-item" data-id="${a.activityID}">
                <div class="fav-thumb">${a.thumbnail ? `<img src="${a.thumbnail}" alt="${a.title}">` : '<div class="fav-thumb-placeholder"><i class="fa-regular fa-image"></i></div>'}</div>
                <div class="fav-body"><div class="fav-title">${a.title}</div><div class="fav-location"><i class="fa-solid fa-location-dot"></i> ${a.location}</div><div class="fav-date">${held}</div></div>
            </div>`;
        }).join("");

        popupContainer.innerHTML = `
            <div class="container">
                <div class="top-bar">
                    <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
                    <h2 class="fav-popup-title">Favourite Activities</h2>
                </div>
                <div class="fav-list">${items || '<p class="fav-empty">No favourites yet.</p>'}</div>
            </div>`;

        popupOverlay.removeAttribute("hidden");
        popupOverlay.classList.add("active");
        document.getElementById("back-btn").addEventListener("click", closePopup);

        popupContainer.querySelectorAll(".fav-item").forEach(el => {
            el.addEventListener("click", () => openPopup(el.dataset.id));
        });
    } catch {}
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

    const modal = document.getElementById("edit-modal");
    modal.style.display = "flex";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeEditModal() {
    const modal = document.getElementById("edit-modal");
    modal.classList.remove("active");
    modal.style.display = "none";
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
        await loadUserProfile();
        statusEl.className = "edit-form-status success";
        statusEl.textContent = "Profile updated successfully!";
        setTimeout(closeEditModal, 1200);
    } catch (err) {
        statusEl.className = "edit-form-status error";
        statusEl.textContent = err.message || "Failed to update profile.";
    }
}

/* =========================
   CONTRIBUTION PANEL
   ========================= */

const CONTRIB_LEVELS = [
  { level: 1, min: 0, max: 99 },
  { level: 2, min: 100, max: 249 },
  { level: 3, min: 250, max: 499 },
  { level: 4, min: 500, max: 999 },
  { level: 5, min: 1000, max: 1999 },
  { level: 6, min: 2000, max: Infinity },
];

function calcContribLevel(score) {
  for (const l of CONTRIB_LEVELS) {
    if (score >= l.min && score <= l.max) {
      const range = l.max === Infinity ? l.min : l.max - l.min + 1;
      const progress = l.max === Infinity ? 1 : (score - l.min) / range;
      return { level: l.level, current: score - l.min, next: l.max === Infinity ? null : range, progress: Math.min(progress, 1) };
    }
  }
  return { level: 1, current: 0, next: 100, progress: 0 };
}

function computeLocalBadges(user, c) {
  const badges = [];
  if (user && user.dob && user.school) badges.push("hello_world");
  if (c.repliesGiven >= 1) badges.push("talk_is_silver");
  if (c.discussionsStarted >= 1) badges.push("so_it_begins");
  if (c.discussionsStarted >= 5) badges.push("conversation_starter");
  if (c.repliesGiven >= 10) badges.push("helper");
  if (c.repliesGiven >= 50) badges.push("chatterbox");
  if (c.likesReceived >= 20) badges.push("respected");
  if (c.likesReceived >= 50) badges.push("the_oracle");
  if (c.discussionsStarted >= 20) badges.push("trendsetter");
  if (c.score >= 100) badges.push("community_star");
  if (c.repliesGiven >= 100) badges.push("keyboard_warrior");
  if (c.score >= 1000) badges.push("mentor");
  if (c.score >= 2000) badges.push("the_sage");
  if (c.repliesGiven > c.discussionsStarted * 10 && c.discussionsStarted > 0) badges.push("one_man_show");
  if (c.discussionsStarted <= 3 && c.discussionsStarted > 0 && c.likesReceived >= c.discussionsStarted * 5) badges.push("quality_over_quantity");
  return badges;
}

const ALL_BADGES = [
  // ── Newbie Tier ──
  { key: "hello_world",        label: "Hello World",        icon: "gesture",         desc: "Created your account — \"You exist. That's the first step.\"" },
  { key: "talk_is_silver",     label: "Talk is Silver",     icon: "comment",         desc: "Wrote your first reply — \"You said something. The internet is proud.\"" },
  { key: "so_it_begins",       label: "So It Begins",       icon: "rocket_launch",   desc: "Started your first discussion — \"Another thread joins the infinite void.\"" },
  { key: "self_discovery",     label: "Self-Discovery",     icon: "psychology",      desc: "Completed the personality quiz — \"You stared into the quiz, and the quiz stared back.\"" },

  // ── Community Contributor ──
  { key: "conversation_starter", label: "Conversation Starter", icon: "chat",       desc: "Started 5 discussions — \"You're basically a talk show host now.\"" },
  { key: "helper",               label: "Helper",                icon: "forum",      desc: "Wrote 10 replies — \"Your keyboard should be a registered charity.\"" },
  { key: "chatterbox",           label: "Chatterbox",            icon: "speaker_notes", desc: "Wrote 50 replies — \"Do you ever sleep? Do you ever stop typing?\"" },
  { key: "respected",            label: "Respected",             icon: "thumb_up",   desc: "Received 20 likes — \"People approve of your existence. Digitally, at least.\"" },

  // ── Community Leader ──
  { key: "the_oracle",         label: "The Oracle",          icon: "auto_awesome",   desc: "Received 50 likes — \"You don't give advice. You drop prophecies.\"" },
  { key: "trendsetter",        label: "Trendsetter",         icon: "waves",          desc: "Started 20 discussions — \"You're not following trends. You're creating them.\"" },
  { key: "community_star",     label: "Community Star",      icon: "stars",          desc: "Reached 100 contribution score — \"You're basically the main character now.\"" },
  { key: "keyboard_warrior",   label: "Keyboard Warrior",    icon: "keyboard",       desc: "Wrote 100 replies — \"Your keyboard has seen things. Horrible, wonderful things.\"" },

  // ── Legendary ──
  { key: "mentor",             label: "Mentor",              icon: "school",         desc: "Reached Level 5 — \"You have ascended. Use your power wisely.\"" },
  { key: "the_sage",           label: "The Sage",            icon: "emoji_objects",  desc: "Reached Level 6 — \"You are the final boss of this community.\"" },
  { key: "one_man_show",       label: "One-Man Show",        icon: "theater_comedy", desc: "10x more replies than discussions started — \"Ever considered podcasting?\"" },
  { key: "quality_over_quantity", label: "Quality > Quantity", icon: "target",       desc: "Started ≤ 3 discussions yet each got 5+ likes — \"You barely speak, but when you do, people listen.\"" },
];

async function renderContribPanel() {
  const container = document.getElementById("exp-list");
  if (!container) return;

  let data;
  try {
    data = await getUserContribution();
  } catch {
    data = { contribution: { score: 0, discussionsStarted: 0, repliesGiven: 0, likesReceived: 0, badges: [] } };
  }

  const c = data.contribution;
  const user = getUser();
  const serverBadges = c.badges || [];
  const localBadges = computeLocalBadges(user, c);
  const mergedBadges = [...new Set([...serverBadges, ...localBadges])];
  const earnedKeys = new Set(mergedBadges);

  const stored = localStorage.getItem("springwave_badges");
  const prevBadges = stored ? JSON.parse(stored) : [];
  const newBadges = mergedBadges.filter(k => !prevBadges.includes(k));
  localStorage.setItem("springwave_badges", JSON.stringify(mergedBadges));

  if (newBadges.length > 0) {
    setTimeout(() => {
      newBadges.forEach(key => {
        const meta = ALL_BADGES.find(b => b.key === key);
        if (meta) showBadgeToast(meta);
      });
    }, 800);
  }

  const { level, current, next, progress } = calcContribLevel(c.score);
  const pct = Math.round(progress * 100);
  const nextLabel = next !== null ? `${current} / ${next} pts` : `${c.score} pts (Max)`;

  container.innerHTML = `
    <div class="exp-category">
      <div class="exp-header">
        <span class="exp-label">
          <span class="exp-icon-wrap" style="color:#23499b;">
            <span class="material-symbols-outlined" style="font-size:20px">diversity_3</span>
          </span>
          Contribution Score
        </span>
        <span class="exp-level communication" style="background:rgba(35,73,155,0.1);color:#23499b;">Lv.${level}</span>
      </div>
      <div class="exp-track">
        <div class="exp-fill communication animated" data-pct="${pct}" style="background:linear-gradient(90deg,#23499b,#5b8def);"></div>
      </div>
      <div class="exp-info">
        <span class="exp-numbers">${c.score} pts</span>
        <span class="exp-next">${nextLabel}</span>
      </div>
    </div>

    <div class="contrib-stats">
      <div class="contrib-stat">
        <span class="contrib-stat-icon material-symbols-outlined">chat</span>
        <span class="contrib-stat-value">${c.discussionsStarted}</span>
        <span class="contrib-stat-label">Discussions</span>
      </div>
      <div class="contrib-stat">
        <span class="contrib-stat-icon material-symbols-outlined">forum</span>
        <span class="contrib-stat-value">${c.repliesGiven}</span>
        <span class="contrib-stat-label">Replies</span>
      </div>
      <div class="contrib-stat">
        <span class="contrib-stat-icon material-symbols-outlined">thumb_up</span>
        <span class="contrib-stat-value">${c.likesReceived}</span>
        <span class="contrib-stat-label">Likes</span>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    const bar = container.querySelector(".exp-fill");
    if (bar) bar.style.width = bar.dataset.pct + "%";
  });

  renderBadgesPanel(earnedKeys);
}

function renderBadgesPanel(earnedKeys) {
  const grid = document.getElementById("badges-grid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="badges-all">
      ${ALL_BADGES.map(b => {
        const earned = earnedKeys.has(b.key);
        return `
          <div class="badge-card ${earned ? "earned" : "locked"}">
            <div class="badge-icon-wrap ${earned ? "earned" : "locked"}">
              <span class="material-symbols-outlined badge-icon">${b.icon}</span>
            </div>
            <div class="badge-info">
              <span class="badge-label">${b.label}</span>
              <span class="badge-desc">${b.desc}</span>
            </div>
            ${earned ? '<span class="badge-check material-symbols-outlined">check_circle</span>' : '<span class="badge-lock material-symbols-outlined">lock</span>'}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function showBadgeToast(badge) {
  const existing = document.querySelectorAll(".badge-toast");
  const offset = existing.length * 80;

  const toast = document.createElement("div");
  toast.className = "badge-toast";
  toast.style.bottom = `${24 + offset}px`;
  toast.innerHTML = `
    <div class="badge-toast-icon">
      <span class="material-symbols-outlined">${badge.icon}</span>
    </div>
    <div class="badge-toast-body">
      <span class="badge-toast-heading">New Badge Earned!</span>
      <span class="badge-toast-label">${badge.label}</span>
    </div>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}
