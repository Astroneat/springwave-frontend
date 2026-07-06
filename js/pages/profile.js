import "../../src/style.css";
import { isAuthenticated, getUser, setUser } from "../lib/session.js";
import { changeInfo, getFavourites, getUserContribution, uploadAvatar, getParticipatedActivities } from "../api/user.js";
import { getCurrentUser } from "../api/auth.js";
import { getMyProfile } from "../api/profile.js";
import {
    getActivityById, participateActivity,
    unparticipateActivity, checkParticipation
} from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { t } from "../lib/i18n.js";

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
    await renderAIProfile();
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

    const roleMap = { student: t("user.student"), host: t("user.host"), admin: t("user.admin") };
    document.getElementById("profile-role").textContent = roleMap[user.role] || "Student";

    const initial = (user.username || user.fullname || "?").charAt(0).toUpperCase();
    const avatarImg = document.getElementById("avatar-image");
    const avatarInitial = document.getElementById("avatar-initial");
    if (user.avatar && avatarImg) {
        avatarImg.src = user.avatar;
        avatarImg.style.display = "";
        if (avatarInitial) avatarInitial.style.display = "none";
    } else {
        if (avatarImg) avatarImg.style.display = "none";
        if (avatarInitial) {
            avatarInitial.textContent = initial;
            avatarInitial.style.display = "";
        }
    }

    updateEditButton(user);

    const avatarInput = document.getElementById("avatarUploadInput");
    if (avatarInput) {
        avatarInput.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            openCropModal(file, async (croppedBlob) => {
                try {
                    const result = await uploadAvatar(croppedBlob);
                    if (result?.avatar) {
                        user.avatar = result.avatar;
                        setUser(user);
                        if (avatarImg) {
                            avatarImg.src = result.avatar;
                            avatarImg.style.display = "";
                            if (avatarInitial) avatarInitial.style.display = "none";
                        }
                        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { avatar: result.avatar } }));
                    }
                } catch (err) {
                    console.error("Avatar upload failed:", err);
                    alert(t("profile.failed_upload"));
                }
            });
        });
    }
}

function updateEditButton(user) {
    const btn = document.getElementById("edit-profile-btn");
    if (!btn) return;

    const isComplete = user.dob && user.school && user.class && user.major && user.phoneNo;
    if (isComplete) {
        btn.innerHTML = `<i class="fa-regular fa-pen-to-square"></i> ${t("profile.edit_profile")}`;
        btn.classList.remove("complete");
    } else {
        btn.innerHTML = `<i class="fa-regular fa-circle-check"></i> ${t("profile.complete_profile")}`;
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

    popupContainer.querySelector(".icon-btn")?.addEventListener("click", () => {
        const title = activity?.title || "SpringWave Event";
        const url = `${window.location.origin}/explore.html?event=${activityID}`;
        if (navigator.share) {
            navigator.share({ title, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!")).catch(() => {});
        }
    });

    popupContainer.querySelector(".discuss-btn")?.addEventListener("click", () => {
        window.location.href = `./community.html?event=${activityID}`;
    });

    if (isAuthenticated()) {
        Promise.all([
            checkParticipation(activityID).then(({ participated }) => { if (participated) setParticipated(); }),
            checkFavourite(activityID).then(({ favourited }) => { if (favourited) setFavourited(); })
        ]).catch(() => {});
    }

    const favoriteBtn = popupContainer.querySelector(".favorite-btn");
    favoriteBtn?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!isAuthenticated()) {
            alert(t("profile.please_login") || "Please login first to favourite activities!");
            return;
        }
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
    btn.querySelector(".participate-header").textContent = t("profile.participated");
    btn.querySelector(".participate-text").textContent = t("profile.joined_activity");
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
                button.querySelector(".participate-header").textContent = t("profile.participate");
                button.querySelector(".participate-text").textContent = t("profile.join_activity");
            } else {
                await participateActivity(activityID);
                button.classList.add("active");
                button.querySelector(".participate-header").textContent = t("profile.participated");
                button.querySelector(".participate-text").textContent = t("profile.joined_activity");
            }
        } catch (err) {
            console.error("Participate error:", err);
            button.querySelector(".participate-text").textContent = err.message || t("common.error");
            setTimeout(() => {
                button.querySelector(".participate-text").textContent =
                    button.classList.contains("active") ? t("profile.joined_activity") : t("profile.join_activity");
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
        const link = f.activityAttachLink || f.link || '';
        const fileName = decodeURIComponent(link.split('/').pop());
        return `<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div><h4>${fileName}</h4></div>
            </div>
            <a class="download-btn" href="${CDN_DOMAIN}/${link}" target="_blank"><i class="fa-solid fa-download"></i></a>
        </div>`;
    }).join("");

    return `
    <div class="activity-popup-layout">
        <!-- Hero Cover Section -->
        <div class="popup-hero-cover">
            <img src="${a.thumbnail || 'https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop'}" alt="${a.title}">
            <div class="popup-hero-overlay"></div>
            <button class="back-btn-floating" id="back-btn" title="${t("profile.back")}"><i class="fa-solid fa-arrow-left"></i></button>
            <span class="popup-category-badge"><i class="fa-solid fa-tag"></i> ${type}</span>
        </div>

        <!-- Content Grid Section -->
        <div class="popup-body-grid">
            <div class="popup-body-main">
                <h1 class="popup-main-title">${a.title}</h1>
                <div class="popup-host-row">
                    <div class="popup-host-avatar">${(a.hostName || "U")[0].toUpperCase()}</div>
                    <div class="popup-host-info">
                        <span class="host-label">Hosted by</span>
                        <h4 class="host-name">${a.hostName || t("profile.unknown")}</h4>
                    </div>
                </div>
                <div class="popup-section-divider"></div>
                <h3 class="popup-section-title">About this Activity</h3>
                <div class="popup-description-text">
                    ${(a.description || "").split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
                </div>
                ${filesHTML ? `
                <div class="popup-section-divider"></div>
                <div class="popup-attachments-section">
                    <h3>${t("profile.attached_files")} (${(a.attachments || []).length})</h3>
                    <div class="popup-files-list">${filesHTML}</div>
                </div>` : ""}
            </div>

            <!-- Sticky Action Sidebar -->
            <aside class="popup-sidebar">
                <div class="popup-sidebar-card">
                    <h3 class="sidebar-card-title">Activity Details</h3>
                    <div class="sidebar-details-list">
                        <div class="sidebar-detail-item">
                            <i class="fa-regular fa-calendar"></i>
                            <div>
                                <span>Date & Time</span>
                                <p>${heldDate}</p>
                            </div>
                        </div>
                        <div class="sidebar-detail-item">
                            <i class="fa-solid fa-location-dot"></i>
                            <div>
                                <span>Location</span>
                                <p><a href="${mapsLink}" target="_blank" class="sidebar-location-link">${a.location} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a></p>
                            </div>
                        </div>
                        <div class="sidebar-detail-item">
                            <i class="fa-regular fa-clock"></i>
                            <div>
                                <span>Registration Deadline</span>
                                <p>${deadline}</p>
                            </div>
                        </div>
                        <div class="sidebar-detail-item">
                            <i class="fa-solid fa-tag"></i>
                            <div>
                                <span>Category</span>
                                <p>${type}</p>
                            </div>
                        </div>
                    </div>

                    <div class="sidebar-actions-group">
                        <button class="action-btn participate" type="button">
                            <i class="fa-solid fa-users"></i>
                            <div>
                                <h4 class="participate-header">${t("profile.participate")}</h4>
                                <p class="participate-text">${t("profile.join_activity")}</p>
                            </div>
                        </button>
                        <button class="action-btn discuss discuss-btn" type="button">
                            <i class="fa-solid fa-comments"></i>
                            <div>
                                <h4>${t("profile.discuss")}</h4>
                                <p>${(a.comments || 0)} ${t("profile.comments")}</p>
                            </div>
                        </button>
                        <div class="sidebar-minor-row">
                            <button class="icon-btn minor-btn" type="button"><span class="material-symbols-outlined text-base">share</span> ${t("profile.share")}</button>
                            <button type="button" class="favorite-btn minor-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">${t("profile.favourite")}</span></button>
                        </div>
                    </div>
                </div>
            </aside>
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
                    <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> ${t("profile.back")}</button>
                    <h2 class="fav-popup-title">${t("profile.favourite_activities")}</h2>
                </div>
                <div class="fav-list">${items || `<p class="fav-empty">${t("profile.no_favourites")}</p>`}</div>
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
let cropperInstance = null;

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
        statusEl.textContent = t("profile.fill_required");
        document.getElementById("edit-form").appendChild(statusEl);
        return;
    }

    statusEl.className = "edit-form-status";
    statusEl.textContent = t("profile.saving");
    document.getElementById("edit-form").appendChild(statusEl);

    try {
        const result = await changeInfo(data);
        currentUser = result.user;
        setUser(result.user);
        await loadUserProfile();
        statusEl.className = "edit-form-status success";
        statusEl.textContent = t("profile.profile_updated");
        setTimeout(closeEditModal, 1200);
    } catch (err) {
        statusEl.className = "edit-form-status error";
        statusEl.textContent = err.message || t("profile.failed_update");
    }
}

/* =========================
   AVATAR CROP MODAL
   ========================= */

function openCropModal(file, onSave) {
    const modal = document.getElementById("cropModal");
    const img = document.getElementById("cropImage");
    const closeBtn = document.getElementById("cropModalClose");
    const cancelBtn = document.getElementById("cropBtnCancel");
    const saveBtn = document.getElementById("cropBtnSave");
    if (!modal || !img) return;

    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        img.src = e.target.result;
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        img.onload = () => {
            cropperInstance = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: "move",
                cropBoxResizable: true,
                cropBoxMovable: true,
                background: false,
                minCropBoxWidth: 100,
                minCropBoxHeight: 100,
            });
        };
    };
    reader.readAsDataURL(file);

    function closeCropModal() {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        modal.style.display = "none";
        document.body.style.overflow = "";
        img.src = "";
    }

    closeBtn?.addEventListener("click", closeCropModal);
    cancelBtn?.addEventListener("click", closeCropModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCropModal();
    });

    saveBtn?.addEventListener("click", () => {
        if (!cropperInstance) return;
        const canvas = cropperInstance.getCroppedCanvas({ width: 512, height: 512 });
        canvas.toBlob((blob) => {
            const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            closeCropModal();
            if (onSave) onSave(croppedFile);
        }, "image/jpeg", 0.92);
    });
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

function computeLocalBadges(user, c, favoritesCount = 0, participationsCount = 0) {
  const badges = [];
  if (user && user.dob && user.school) badges.push("hello_world");
  if (c.repliesGiven >= 1) badges.push("talk_is_silver");
  if (c.discussionsStarted >= 1) badges.push("so_it_begins");
  if (localStorage.getItem("springwave_quiz_completed") === "true") badges.push("self_discovery");
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

  // Activity & Event Gamification
  if (favoritesCount >= 5) badges.push("active_explorer");
  if (participationsCount >= 1) badges.push("event_goer");
  if (user && user.role === "host") {
    badges.push("rising_host");
    if (c.score >= 100 || favoritesCount >= 5) {
      badges.push("grand_host");
    }
  }

  return badges;
}

async function renderAIProfile() {
  const card = document.getElementById("ai-profile-card");
  const container = document.getElementById("ai-profile-content");
  if (!card || !container) return;

  try {
    const data = await getMyProfile();
    card.style.display = "block";

    const p = data?.profile;
    const hasProfile = p && (p.major || p.goal || p.description || (p.skills && p.skills.length > 0));

    if (!hasProfile) {
      card.querySelector("h2").innerHTML = `
        <span class="material-symbols-outlined" style="font-size:20px;vertical-align:middle;color:#8B5CF6">auto_awesome</span>
        <span data-i18n="profile.ai_profile">${t("profile.ai_profile")}</span>
      `;
      container.innerHTML = `
        <div class="py-4 text-center">
          <p class="text-sm text-text-secondary mb-4" data-i18n="profile.no_ai_profile_desc">${t("profile.no_ai_profile_desc")}</p>
          <a href="/quiz.html" class="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all spring-ease">
            <span class="material-symbols-outlined !text-[18px] animate-pulse">auto_awesome</span>
            <span data-i18n="profile.take_ai_quiz">${t("profile.take_ai_quiz")}</span>
          </a>
        </div>
      `;
      return;
    }
    
    // Add Retake button to the header
    card.querySelector("h2").innerHTML = `
      <div class="w-full flex items-center justify-between">
        <span class="flex items-center gap-2">
          <span class="material-symbols-outlined" style="font-size:20px;vertical-align:middle;color:#8B5CF6">auto_awesome</span>
          <span data-i18n="profile.ai_profile">${t("profile.ai_profile")}</span>
        </span>
        <a href="/quiz.html" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 text-xs font-semibold active:scale-95 transition-all spring-ease">
          <span class="material-symbols-outlined !text-[14px]">replay</span>
          <span data-i18n="profile.retake_quiz">${t("profile.retake_quiz")}</span>
        </a>
      </div>
    `;

    container.innerHTML = `
      <div class="ai-profile-section">
        ${p.major ? `<div class="ai-profile-field"><span class="ai-profile-label">Major</span><span class="ai-profile-value">${p.major}</span></div>` : ''}
        ${p.goal ? `<div class="ai-profile-field"><span class="ai-profile-label">Goal</span><span class="ai-profile-value">${p.goal}</span></div>` : ''}
        ${p.skills?.length ? `
          <div class="ai-profile-field">
            <span class="ai-profile-label">Skills</span>
            <div class="ai-profile-tags">${p.skills.map(s => `<span class="ai-profile-tag">${s}</span>`).join('')}</div>
          </div>
        ` : ''}
        ${p.preferredActivities?.length ? `
          <div class="ai-profile-field">
            <span class="ai-profile-label">Preferred Activities</span>
            <div class="ai-profile-tags">${p.preferredActivities.map(a => `<span class="ai-profile-tag">${a}</span>`).join('')}</div>
          </div>
        ` : ''}
        ${p.description ? `<div class="ai-profile-field"><span class="ai-profile-label">About</span><p class="ai-profile-desc">${p.description}</p></div>` : ''}
      </div>
    `;
  } catch (error) {
    console.error("Failed to load AI profile:", error);
    card.style.display = "none";
  }
}

const ALL_BADGES = [
  // ── Newbie Tier ──
  { key: "hello_world",        label: "Hello World",        icon: "gesture",         desc: "Created your account — \"You exist. That's the first step.\"", tier: "newbie" },
  { key: "talk_is_silver",     label: "Talk is Silver",     icon: "comment",         desc: "Wrote your first reply — \"You said something. The internet is proud.\"", tier: "newbie" },
  { key: "so_it_begins",       label: "So It Begins",       icon: "rocket_launch",   desc: "Started your first discussion — \"Another thread joins the infinite void.\"", tier: "newbie" },
  { key: "self_discovery",     label: "Self-Discovery",     icon: "psychology",      desc: "Completed the personality quiz — \"You stared into the quiz, and the quiz stared back.\"", tier: "newbie" },

  // ── Activity Explorer Tier ──
  { key: "active_explorer",    label: "Active Explorer",    icon: "explore",         desc: "Favourited 5 activities — \"Always hunting for the next big student event.\"", tier: "explorer" },
  { key: "event_goer",         label: "Event Goer",         icon: "event_available", desc: "Participated in 1 activity — \"Made it to an event. Real world interaction unlocked!\"", tier: "explorer" },
  { key: "rising_host",        label: "Rising Host",        icon: "campaign",        desc: "Hosted your first activity — \"Welcoming students, organizing schedules.\"", tier: "explorer" },
  { key: "grand_host",         label: "Grand Host",         icon: "co_present",      desc: "Hosted 5 activities — \"A pillar of student life. You build communities.\"", tier: "explorer" },

  // ── Community Contributor ──
  { key: "conversation_starter", label: "Conversation Starter", icon: "chat",       desc: "Started 5 discussions — \"You're basically a talk show host now.\"", tier: "contributor" },
  { key: "helper",               label: "Helper",                icon: "forum",      desc: "Wrote 10 replies — \"Your keyboard should be a registered charity.\"", tier: "contributor" },
  { key: "chatterbox",           label: "Chatterbox",            icon: "speaker_notes", desc: "Wrote 50 replies — \"Do you ever sleep? Do you ever stop typing?\"", tier: "contributor" },
  { key: "respected",            label: "Respected",             icon: "thumb_up",   desc: "Received 20 likes — \"People approve of your existence. Digitally, at least.\"", tier: "contributor" },

  // ── Legendary ──
  { key: "the_oracle",         label: "The Oracle",          icon: "auto_awesome",   desc: "Received 50 likes — \"You don't give advice. You drop prophecies.\"", tier: "legendary" },
  { key: "trendsetter",        label: "Trendsetter",         icon: "waves",          desc: "Started 20 discussions — \"You're not following trends. You're creating them.\"", tier: "legendary" },
  { key: "community_star",     label: "Community Star",      icon: "stars",          desc: "Reached 100 contribution score — \"You're basically the main character now.\"", tier: "legendary" },
  { key: "keyboard_warrior",   label: "Keyboard Warrior",    icon: "keyboard",       desc: "Wrote 100 replies — \"Your keyboard has seen things. Horrible, wonderful things.\"", tier: "legendary" },
  { key: "mentor",             label: "Mentor",              icon: "school",         desc: "Reached Level 5 — \"You have ascended. Use your power wisely.\"", tier: "legendary" },
  { key: "the_sage",           label: "The Sage",            icon: "emoji_objects",  desc: "Reached Level 6 — \"You are the final boss of this community.\"", tier: "legendary" },
  { key: "one_man_show",       label: "One-Man Show",        icon: "theater_comedy", desc: "10x more replies than discussions started — \"Ever considered podcasting?\"", tier: "legendary" },
  { key: "quality_over_quantity", label: "Quality > Quantity", icon: "target",       desc: "Started ≤ 3 discussions yet each got 5+ likes — \"You barely speak, but when you do, people listen.\"", tier: "legendary" },
];

function getBadgeProgress(key, c, user, favoritesCount = 0, participationsCount = 0) {
  switch (key) {
    case "talk_is_silver": return { current: c.repliesGiven, target: 1 };
    case "so_it_begins": return { current: c.discussionsStarted, target: 1 };
    case "conversation_starter": return { current: c.discussionsStarted, target: 5 };
    case "helper": return { current: c.repliesGiven, target: 10 };
    case "chatterbox": return { current: c.repliesGiven, target: 50 };
    case "respected": return { current: c.likesReceived, target: 20 };
    case "the_oracle": return { current: c.likesReceived, target: 50 };
    case "trendsetter": return { current: c.discussionsStarted, target: 20 };
    case "community_star": return { current: c.score, target: 100 };
    case "keyboard_warrior": return { current: c.repliesGiven, target: 100 };
    case "mentor": return { current: c.score, target: 1000 };
    case "the_sage": return { current: c.score, target: 2000 };

    // Activity progress
    case "active_explorer": return { current: favoritesCount, target: 5 };
    case "event_goer": return { current: participationsCount, target: 1 };
    default: return null;
  }
}

async function renderContribPanel() {
  const container = document.getElementById("exp-list");
  if (!container) return;

  let data;
  try {
    data = await getUserContribution();
  } catch {
    data = { contribution: { score: 0, discussionsStarted: 0, repliesGiven: 0, likesReceived: 0, likesGiven: 0, badges: [] } };
  }

  // Fetch event activity metrics for gamification calculations
  let favoritesCount = 0;
  let participationsCount = 0;
  try {
    const { activities } = await getFavourites();
    favoritesCount = (activities || []).length;
  } catch (err) {
    console.warn("Failed to fetch favorites count:", err);
  }
  try {
    const { activities } = await getParticipatedActivities();
    participationsCount = (activities || []).length;
  } catch (err) {
    console.warn("Failed to fetch participated activities count:", err);
  }

  const c = data.contribution;
  const user = getUser();
  const serverBadges = c.badges || [];
  const localBadges = computeLocalBadges(user, c, favoritesCount, participationsCount);
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
    </div>
  `;

  requestAnimationFrame(() => {
    const bar = container.querySelector(".exp-fill");
    if (bar) bar.style.width = bar.dataset.pct + "%";
  });

  renderBadgesPanel(earnedKeys, c, user, favoritesCount, participationsCount);
}

function renderBadgesPanel(earnedKeys, c, user, favoritesCount, participationsCount) {
  const grid = document.getElementById("badges-grid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="badges-all">
      ${ALL_BADGES.map(b => {
        const earned = earnedKeys.has(b.key);
        const progress = getBadgeProgress(b.key, c, user, favoritesCount, participationsCount);

        let progressHtml = "";
        if (!earned && progress) {
          const pct = Math.min(100, Math.round((progress.current / progress.target) * 100));
          const barColorMap = { newbie: "#0284c7", explorer: "#0d9488", contributor: "#7c3aed", legendary: "#d97706" };
          const barColor = barColorMap[b.tier] || "#3b6fd4";
          
          progressHtml = `
            <div class="badge-progress-container" style="margin-top: 8px; width: 100%;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 2px;">
                <span>Progress</span>
                <span>${progress.current}/${progress.target}</span>
              </div>
              <div style="height: 4px; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                <div style="height: 100%; background: ${barColor}; border-radius: 99px; width: ${pct}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
          `;
        }

        return `
          <div class="badge-card tier-${b.tier} ${earned ? "earned" : "locked"}">
            <div class="badge-icon-wrap ${earned ? "earned" : "locked"}">
              <span class="material-symbols-outlined badge-icon">${b.icon}</span>
            </div>
            <div class="badge-info" style="flex: 1;">
              <span class="badge-label">${b.label}</span>
              <span class="badge-desc">${b.desc}</span>
              ${progressHtml}
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
