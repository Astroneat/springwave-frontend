import { getActivityById, checkParticipation, unparticipateActivity, participateActivity } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { t } from "../lib/i18n.js";
import { isAuthenticated } from "../lib/session.js";
import { formatDate, capitalize } from "../lib/utils.js";

// Ensure overlay and container exist
function ensurePopupElements() {
    let overlay = document.getElementById("popup-overlay");
    let container = document.getElementById("popup-container");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "popup-overlay";
        overlay.className = "popup-overlay";
        overlay.hidden = true;
        document.body.appendChild(overlay);
    }
    if (!container) {
        container = document.createElement("div");
        container.id = "popup-container";
        container.className = "popup-container";
        overlay.appendChild(container);
    }

    // Bind overlay click once
    if (!overlay.dataset.bound) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay || e.target.classList.contains("popup-backdrop")) {
                closeEventPopup();
            }
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeEventPopup();
        });
        overlay.dataset.bound = "true";
    }

    return { overlay, container };
}

export async function openEventPopup(activityID, options = {}) {
    if (!activityID) return;
    const { overlay, container } = ensurePopupElements();

    const backText = options.backText || t("explore.back") || "Back";

    container.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    overlay.removeAttribute("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // Allow passing activityData directly if already fetched to save network roundtrip
    let activity = options.activityData;
    if (!activity) {
        try {
            const resp = await getActivityById(activityID);
            activity = resp.activity;
        } catch (err) {
            console.error(err);
        }
    }

    if (!activity) {
        closeEventPopup();
        return;
    }

    container.innerHTML = buildPopupHTML(activity, backText);

    initParticipateButton(activityID);

    container.querySelector("#back-btn")?.addEventListener("click", closeEventPopup);

    container.querySelector(".icon-btn")?.addEventListener("click", () => {
        const title = activity.title || "SpringWave Event";
        const url = `${window.location.origin}/explore.html?event=${activityID}`;
        if (navigator.share) {
            navigator.share({ title, url }).catch(() => { });
        } else {
            navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!")).catch(() => { });
        }
    });

    container.querySelector(".discuss-btn")?.addEventListener("click", () => {
        const btn = container.querySelector(".discuss-btn");
        const eventId = btn?.dataset.eventId;
        const eventTitle = btn?.dataset.eventTitle;
        if (eventId && eventTitle && window._openExplorePostModal) {
            window._openExplorePostModal(eventId, eventTitle);
        } else {
            window.location.href = `./community.html?event=${eventId}`;
        }
    });

    if (isAuthenticated()) {
        Promise.all([
            checkParticipation(activityID).then(({ participated }) => { if (participated) setParticipated(activity); }),
            checkFavourite(activityID).then(({ favourited }) => { if (favourited) setFavourited(); })
        ]).catch(() => { });
    }

    const favoriteBtn = container.querySelector(".favorite-btn");
    favoriteBtn?.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isAuthenticated()) {
            alert(t("explore.please_login") || "Please login first to favourite activities!");
            return;
        }
        const isActive = favoriteBtn.classList.contains("active");
        favoriteBtn.classList.toggle("active");

        // Notify options callback if provided (e.g. for syncing card star)
        if (options.onFavouriteToggle) {
            options.onFavouriteToggle(activityID, !isActive);
        }

        try {
            if (isActive) await removeFavourite(activityID);
            else await addFavourite(activityID);
        } catch (err) {
            favoriteBtn.classList.toggle("active");
            if (options.onFavouriteToggle) {
                options.onFavouriteToggle(activityID, isActive);
            }
            console.error("Failed to toggle favourite:", err);
        }
    });
}

export function closeEventPopup() {
    const overlay = document.getElementById("popup-overlay");
    const container = document.getElementById("popup-container");
    if (!overlay || !container) return;

    overlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => {
        container.innerHTML = "";
        overlay.setAttribute("hidden", "");
    }, 300);
}

function buildPopupHTML(a, backText) {
    const heldDate = formatDate(a.heldDate);
    const type = capitalize(String(a.type || "Activity"));
    const hasCoords = a.locationLat && a.locationLng;
    const googleMapsLink = hasCoords
        ? `https://www.google.com/maps?q=${a.locationLat},${a.locationLng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;

    const filesHTML = (a.attachments || []).map(f => {
        const link = f.link || f.activityAttachLink || "";
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
            <button class="back-btn-floating" id="back-btn" title="${backText}"><i class="fa-solid fa-arrow-left"></i></button>
            <span class="popup-category-badge"><i class="fa-solid fa-tag"></i> ${type}</span>
        </div>

        <!-- Content Grid Section -->
        <div class="popup-body-grid">
            <div class="popup-body-main">
                <h1 class="popup-main-title">${a.title}</h1>
                <div class="popup-host-row">
                    <div class="popup-host-avatar">${(a.hostName || a.createdByName || "U")[0].toUpperCase()}</div>
                    <div class="popup-host-info">
                        <span class="host-label">Hosted by</span>
                        <h4 class="host-name">${a.hostName || a.createdByName || t("common.unknown")}</h4>
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
                    <h3>${t("explore.attached_files")} (${(a.attachments || []).length})</h3>
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
                                <p><a href="${googleMapsLink}" target="_blank" class="sidebar-location-link">${a.location} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a></p>
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
                        <button class="action-btn participate" type="button" ${a.source?.url ? `data-external-url="${a.source.url}"` : ''}>
                            <i class="fa-solid fa-${a.source?.url ? 'arrow-up-right-from-square' : 'users'}"></i>
                            <div>
                                <h4 class="participate-header">${a.source?.url ? "Explore more" : t("explore.participate")}</h4>
                                <p class="participate-text" ${a.source?.url ? 'style="display:none"' : ''}>${a.source?.url ? '' : t("explore.join_activity")}</p>
                            </div>
                        </button>
                        <button class="action-btn discuss discuss-btn" data-event-id="${a.activityID || a._id}" data-event-title="${a.title}" type="button">
                            <i class="fa-solid fa-comments"></i>
                            <div>
                                <h4>DISCUSS</h4>
                                <p>Join the thread</p>
                            </div>
                        </button>
                        <div class="sidebar-minor-row">
                            <button class="icon-btn minor-btn" type="button"><span class="material-symbols-outlined text-base">share</span> ${t("explore.share") || "Share"}</button>
                            <button type="button" class="favorite-btn minor-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">${t("explore.favourite") || "Favourite"}</span></button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>`;
}

function setParticipated(activity) {
    const btn = document.querySelector(".participate");
    if (!btn) return;
    if (btn.dataset.externalUrl) return;
    btn.classList.add("active");
    btn.querySelector(".participate-header").textContent = t("explore.participated") || "Participated";
    btn.querySelector(".participate-text").textContent = t("explore.joined_activity") || "Joined activity";
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

        if (btn.dataset.externalUrl) {
            window.open(btn.dataset.externalUrl, '_blank');
            return;
        }

        if (!isAuthenticated()) {
            alert(t("explore.please_login") || "Please login first!");
            return;
        }

        const isActive = btn.classList.contains("active");
        const headerEl = btn.querySelector(".participate-header");
        const textEl = btn.querySelector(".participate-text");

        try {
            if (isActive) {
                btn.classList.remove("active");
                headerEl.textContent = t("explore.participate") || "Participate";
                textEl.textContent = t("explore.join_activity") || "Join activity";
            } else {
                btn.classList.add("active");
                headerEl.textContent = t("explore.participated") || "Participated";
                textEl.textContent = t("explore.joined_activity") || "Joined activity";
            }

            if (isActive) {
                await unparticipateActivity(activityID);
            } else {
                await participateActivity(activityID);
            }
        } catch (err) {
            console.error("Participate error:", err);
            if (isActive) {
                btn.classList.add("active");
                headerEl.textContent = t("explore.participated") || "Participated";
                textEl.textContent = t("explore.joined_activity") || "Joined activity";
            } else {
                btn.classList.remove("active");
                headerEl.textContent = t("explore.participate") || "Participate";
                textEl.textContent = t("explore.join_activity") || "Join activity";
            }
            alert(err.message || "Failed to participate");
        }
    });
}
