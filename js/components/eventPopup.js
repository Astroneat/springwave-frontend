import { sanitizeHtml } from "../lib/sanitize.js";
import { getActivityById, checkParticipation, unparticipateActivity, participateActivity, getEventComments, addEventComment } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { t } from "../lib/i18n.js";
import { isAuthenticated, getUser, isProfileComplete } from "../lib/session.js";
import { formatDate, capitalize, timeAgo } from "../lib/utils.js";
import { openPostModal } from "./postModal.js";
import { explainRecommendation } from "../api/recommendations.js";
import { getMyProfile } from "../api/profile.js";
import { getSimilarEvents } from "../api/activities.js";

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
        openPostModal(activity);
    });

    initAIMatchButton(container, activityID);

    initEventComments(activityID, container);

    loadSimilarEvents(activityID);

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
        const href = (link.startsWith("http://") || link.startsWith("https://")) ? link : `${CDN_DOMAIN}/${link}`;
        return `<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div><h4>${fileName}</h4></div>
            </div>
            <a class="download-btn" href="${href}" target="_blank"><i class="fa-solid fa-download"></i></a>
        </div>`;
    }).join("");

    const tagsHTML = (a.tags || []).map(tag => `<span class="event-tag">${tag}</span>`).join("");
    const participantCount = a.participants?.length || 0;

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
                
                ${tagsHTML ? `<div class="event-tags-container">${tagsHTML}</div>` : ""}

                <a href="/org-profile.html?orgId=${a.organization || a.createdBy}" class="popup-host-row-new" style="text-decoration: none; color: inherit;">
                    <div class="popup-host-avatar-new">${(a.hostName || a.createdByName || "U")[0].toUpperCase()}</div>
                    <div class="popup-host-info-new">
                        <span class="host-label-new">Hosted by</span>
                        <h4 class="host-name-new">${a.hostName || a.createdByName || t("common.unknown")}</h4>
                    </div>
                    <div class="popup-host-arrow-icon"><i class="fa-solid fa-chevron-right"></i></div>
                </a>

                <div class="popup-section-divider"></div>
                
                <!-- Quick Info Row for Mobile -->
                <div class="mobile-quick-info">
                    <div class="quick-info-item" style="margin-bottom:12px">
                        <i class="fa-regular fa-calendar"></i>
                        <div>
                            <span>Date & Time</span>
                            <p>${heldDate}</p>
                        </div>
                    </div>
                    <div class="quick-info-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <div>
                            <span>Location</span>
                            <p>${a.location}</p>
                        </div>
                    </div>
                </div>

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

                <div class="popup-section-divider"></div>
                <div class="popup-comments-section" id="popup-comments-container">
                    <h3 class="popup-section-title">Comments</h3>
                    
                    <div class="event-comment-input-area">
                        <div class="event-comment-avatar">
                            <span id="current-user-avatar-initial">?</span>
                        </div>
                        <div class="event-comment-input-wrapper">
                            <input type="text" id="event-comment-input" placeholder="Write a comment..." autocomplete="off">
                            <button id="event-comment-submit"><i class="fa-solid fa-paper-plane"></i></button>
                        </div>
                    </div>

                    <div id="event-comments-list" class="event-comments-list">
                        <div class="popup-loading-small"><div class="spinner"></div></div>
                    </div>
                    
                    <button id="event-comments-see-more" class="event-comments-see-more" style="display: none;">See more comments</button>
                </div>
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
                            <i class="fa-solid fa-users"></i>
                            <div>
                                <span>Participants</span>
                                <p>${participantCount} registered</p>
                            </div>
                        </div>
                    </div>

                    <div class="sidebar-actions-group">
                        <button class="action-btn-primary participate" type="button" ${a.source?.url ? `data-external-url="${a.source.url}"` : ''}>
                            <i class="fa-solid fa-${a.source?.url ? 'arrow-up-right-from-square' : 'circle-check'}"></i>
                            <span>${a.source?.url ? "Explore more" : t("explore.participate")}</span>
                        </button>
                        
                        <div class="action-btn-row">
                            <button class="action-btn-secondary discuss discuss-btn" data-event-id="${a.activityID || a._id}" data-event-title="${a.title}" type="button">
                                <i class="fa-solid fa-comments"></i> Discuss
                            </button>
                            <button class="action-btn-secondary ai-match-btn" type="button">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Match
                            </button>
                        </div>
                        
                        <div id="ai-match-result" class="ai-match-result" style="display:none;"></div>
                        
                        <div class="sidebar-minor-row">
                            <button class="icon-btn minor-btn" type="button"><span class="material-symbols-outlined text-base">share</span> ${t("explore.share") || "Share"}</button>
                            <button type="button" class="favorite-btn minor-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">${t("explore.favourite") || "Favourite"}</span></button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>

        <!-- Sticky Bottom Bar for Mobile -->
        <div class="mobile-sticky-bottom-bar">
            <div class="mobile-bottom-info">
                <span class="mobile-bottom-date">${heldDate.split(',')[0]}</span>
                <span class="mobile-bottom-title truncate">${a.title}</span>
            </div>
            <button class="mobile-action-btn participate" type="button" ${a.source?.url ? `data-external-url="${a.source.url}"` : ''}>
                <span>${a.source?.url ? "Explore" : t("explore.participate")}</span>
            </button>
        </div>
    </div>`;
}

function setParticipated(activity) {
    const btns = document.querySelectorAll(".participate");
    btns.forEach(btn => {
        if (!btn) return;
        if (btn.dataset.externalUrl) return;
        btn.classList.add("active");
        
        // Handle primary/mobile button
        const span = btn.querySelector("span");
        if (span) {
            span.textContent = t("explore.participated") || "Participated";
        }
        
        // Handle legacy/other styles
        const header = btn.querySelector(".participate-header");
        if (header) {
            header.textContent = t("explore.participated") || "Participated";
        }
        const text = btn.querySelector(".participate-text");
        if (text) {
            text.textContent = t("explore.joined_activity") || "Joined activity";
        }
    });
}

function setFavourited() {
    const btns = document.querySelectorAll(".favorite-btn");
    btns.forEach(btn => {
        if (btn) btn.classList.add("active");
    });
}

function initParticipateButton(activityID) {
    const btns = document.querySelectorAll(".participate");
    if (btns.length === 0) return;

    let lastClick = 0;
    const COOLDOWN = 3000;

    btns.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();

            const now = Date.now();
            if (now - lastClick < COOLDOWN) {
                return;
            }

            if (btn.dataset.externalUrl) {
                window.open(btn.dataset.externalUrl, '_blank');
                return;
            }

            if (!isAuthenticated()) {
                alert(t("explore.please_login") || "Please login first!");
                return;
            }

            const isActive = btn.classList.contains("active");

            if (isActive) {
                if (!confirm("Are you sure you want to leave this event?")) return;
            }

            lastClick = now;

            try {
                // Update all buttons status
                const allBtns = document.querySelectorAll(".participate");
                allBtns.forEach(b => {
                    if (isActive) {
                        b.classList.remove("active");
                        const span = b.querySelector("span");
                        if (span) span.textContent = t("explore.participate") || "Participate";
                    } else {
                        b.classList.add("active");
                        const span = b.querySelector("span");
                        if (span) span.textContent = t("explore.participated") || "Participated";
                    }
                });

                if (isActive) {
                    await unparticipateActivity(activityID);
                } else {
                    await participateActivity(activityID);
                }
            } catch (err) {
                console.error("Participate error:", err);
                // Revert status on error
                const allBtns = document.querySelectorAll(".participate");
                allBtns.forEach(b => {
                    if (isActive) {
                        b.classList.add("active");
                        const span = b.querySelector("span");
                        if (span) span.textContent = t("explore.participated") || "Participated";
                    } else {
                        b.classList.remove("active");
                        const span = b.querySelector("span");
                        if (span) span.textContent = t("explore.participate") || "Participate";
                    }
                });
                alert(err.message || "Failed to participate");
            }
        });
    });
}


function initAIMatchButton(container, activityID) {
    const btn = container.querySelector(".ai-match-btn");
    const resultEl = container.querySelector("#ai-match-result");
    if (!btn || !resultEl) return;

    let lastClick = 0;
    const COOLDOWN = 15000;

    function setBtnLoading() {
        const h4 = btn.querySelector("h4");
        const p = btn.querySelector("p");
        if (h4 && p) {
            h4.textContent = "CHECKING...";
            p.textContent = "Analyzing your profile";
        } else {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Matching...`;
        }
    }

    function setBtnCooldown(remaining) {
        const p = btn.querySelector("p");
        if (p) {
            p.textContent = `Wait ${remaining}s`;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Wait ${remaining}s`;
        }
    }

    function resetBtn() {
        btn.disabled = false;
        const h4 = btn.querySelector("h4");
        const p = btn.querySelector("p");
        if (h4 && p) {
            h4.textContent = "AI MATCH";
            p.textContent = "Check your compatibility";
        } else {
            btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Match`;
        }
    }

    btn.addEventListener("click", async () => {
        if (!isAuthenticated()) {
            alert("Please login first to use AI Match!");
            return;
        }

        const now = Date.now();
        if (now - lastClick < COOLDOWN) {
            const remaining = Math.ceil((COOLDOWN - (now - lastClick)) / 1000);
            setBtnCooldown(remaining);
            setTimeout(() => {
                resetBtn();
            }, COOLDOWN - (now - lastClick));
            return;
        }

        lastClick = now;
        btn.disabled = true;
        setBtnLoading();
        resultEl.style.display = "none";

        try {
            const profileResp = await getMyProfile();
            const profile = profileResp?.profile;

            if (!profile || typeof profile !== "object" || Object.keys(profile).length === 0) {
                resultEl.innerHTML = `
                    <div class="ai-match-incomplete">
                        <span class="material-symbols-outlined text-3xl text-[#f59e0b]">psychology</span>
                        <h4 class="font-bold text-sm text-[#191b22] mt-2">Profile Required</h4>
                        <p class="text-xs text-[#64748b] mt-1">Take the AI Personality Quiz to build your profile and check event compatibility.</p>
                        <a href="/quiz.html" class="block mt-3 py-2 px-4 rounded-xl bg-primary text-white text-xs font-semibold text-center hover:bg-primary/90 transition-all">Take the Quiz</a>
                    </div>
                `;
                resultEl.style.display = "block";
                resetBtn();
                return;
            }

            const result = await explainRecommendation(activityID);
            const score = result?.score ?? result?.compatibility ?? null;
            const explanation = result?.explanation || result?.message || "Based on your AI profile, this event aligns with your interests and preferences.";
            const tags = result?.tags || result?.highlights || [];

            let pct = null;
            let color = "#64748b";
            let matchLabel = "Chưa xác định";
            if (score !== null) {
                pct = Math.min(100, Math.max(0, Math.round(score * 100)));
                if (pct >= 80) { color = "#059669"; matchLabel = "Excellent Match"; }
                else if (pct >= 60) { color = "#16a34a"; matchLabel = "Strong Match"; }
                else if (pct >= 40) { color = "#d97706"; matchLabel = "Moderate Match"; }
                else { color = "#dc2626"; matchLabel = "Low Match"; }
            }

            const tagsHTML = tags.length
                ? tags.map(t => `<span class="ai-match-tag">${t}</span>`).join("")
                : "";

            const scoreCircleHTML = pct !== null
                ? `
                <div class="ai-match-score-circle" style="width:56px;height:56px;border-radius:50%;background:conic-gradient(${color} ${pct}%, #ecedfa ${pct}%);display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
                    <span style="background:white;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:${color};">${pct}%</span>
                </div>
                <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;background:${color}15;color:${color};">${matchLabel}</span>
                `
                : `
                <div class="ai-match-score-circle" style="width:56px;height:56px;border-radius:50%;background:#ecedfa;display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
                    <span style="background:white;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#64748b;">–</span>
                </div>
                <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;background:#64748b15;color:#64748b;">Chưa xác định</span>
                `;

            resultEl.innerHTML = `
                <div class="ai-match-success">
                    ${scoreCircleHTML}
                    <h4 class="font-bold text-sm text-[#191b22] mt-3 text-center">AI Compatibility</h4>
                    <p class="text-xs text-[#475569] mt-1 leading-relaxed" style="text-align:left;line-height:1.6;">${explanation}</p>
                    ${tagsHTML ? `<div class="ai-match-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;justify-content:center;">${tagsHTML}</div>` : ""}
                </div>
            `;
            resultEl.style.display = "block";
        } catch (err) {
            console.error("AI Match error:", err);
            resultEl.innerHTML = `
                <div class="ai-match-error">
                    <span class="material-symbols-outlined text-3xl text-[#ef4444]">error_outline</span>
                    <p class="text-xs text-[#ef4444] mt-1 font-medium">${err.message || "Failed to check compatibility. Please try again later."}</p>
                </div>
            `;
            resultEl.style.display = "block";
        }
        resetBtn();
    });
}

async function loadSimilarEvents(activityID) {
    const container = document.getElementById('similar-events-container');
    if (!container) return;

    try {
        const data = await getSimilarEvents(activityID, 5);
        const events = data?.events || [];

        if (events.length === 0) {
            container.innerHTML = `<p style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">No similar events found.</p>`;
            return;
        }

        container.innerHTML = events.map(a => {
            const held = formatDate(a.heldDate);
            return `<div class="recommendation-card" data-id="${a._id || a.activityID}" style="cursor:pointer;">
                <div class="recommendation-thumb">
                    ${a.thumbnail ? `<img src="${a.thumbnail}" alt="${a.title}">` : '<div class="recommendation-thumb-placeholder"><span class="material-symbols-outlined">event</span></div>'}
                </div>
                <div class="recommendation-body">
                    <h4 class="recommendation-title">${a.title}</h4>
                    <span class="recommendation-meta"><span class="material-symbols-outlined" style="font-size:14px;">location_on</span> ${a.location || 'Unknown'}</span>
                    <span class="recommendation-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span> ${held}</span>
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', async () => {
                const id = card.dataset.id;
                await openEventPopup(id, { activityData: null });
            });
        });
    } catch (err) {
        console.error("Failed to load similar events:", err);
        container.innerHTML = `<p style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">Failed to load similar events.</p>`;
    }
}

async function initEventComments(eventId, container) {
    const listEl = container.querySelector('#event-comments-list');

    // Add similar events section before comments
    const commentsSection = container.querySelector('#popup-comments-container');
    if (commentsSection) {
        const similarEventsSection = document.createElement('div');
        similarEventsSection.id = 'similar-events-section';
        similarEventsSection.className = 'similar-events-section';
        similarEventsSection.innerHTML = `
            <h3 class="popup-section-title">Similar Events</h3>
            <div id="similar-events-container" class="similar-events-grid">
                <div class="empty-state" style="text-align:center;padding:20px;color:var(--text-muted)">Loading similar events...</div>
            </div>
        `;
        commentsSection.parentNode.insertBefore(similarEventsSection, commentsSection);
    }
    const inputEl = container.querySelector('#event-comment-input');
    const submitBtn = container.querySelector('#event-comment-submit');
    const seeMoreBtn = container.querySelector('#event-comments-see-more');
    const avatarSpan = container.querySelector('#current-user-avatar-initial');
    
    if (isAuthenticated()) {
        const user = getUser();
        if (user) {
            avatarSpan.textContent = (user.fullname || user.username || '?').charAt(0).toUpperCase();
        }
    }
    
    let comments = [];
    let visibleCount = 3;

    function renderComments() {
        if (!comments || comments.length === 0) {
            listEl.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
            seeMoreBtn.style.display = 'none';
            return;
        }

        const visibleComments = comments.slice(0, visibleCount);
        listEl.innerHTML = visibleComments.map(c => {
            const initial = (c.userName || c.author || c.createdByName || '?').charAt(0).toUpperCase();
            return `<div class="event-comment-item">
                <div class="event-comment-avatar">${initial}</div>
                <div class="event-comment-content">
                    <h5 class="event-comment-author">${c.userName || c.author || c.createdByName || 'Unknown User'}</h5>
                    <p class="event-comment-text">${sanitizeHtml(c.content)}</p>
                    <span class="event-comment-date">${timeAgo(c.date || c.createdAt)}</span>
                </div>
            </div>`;
        }).join('');

        if (comments.length > visibleCount) {
            seeMoreBtn.style.display = 'block';
            seeMoreBtn.textContent = `See more comments (${comments.length - visibleCount} hidden)`;
        } else {
            seeMoreBtn.style.display = 'none';
        }
    }

    seeMoreBtn?.addEventListener('click', () => {
        visibleCount += 5;
        renderComments();
    });

    submitBtn?.addEventListener('click', async () => {
        if (!isAuthenticated()) {
            alert('Please login to comment!');
            window.location.href = '/login.html';
            return;
        }
        
        const user = getUser();
        if (!isProfileComplete(user)) {
            alert('Vui lòng cập nhật đầy đủ thông tin cá nhân (Ngày sinh, Trường, Lớp, Ngành, SĐT) trong trang Cá nhân trước khi bình luận.');
            window.location.href = '/profile.html';
            return;
        }

        const text = inputEl.value.trim();
        if (!text) return;
        
        submitBtn.disabled = true;
        try {
            const resp = await addEventComment(eventId, text);
            if (resp) {
                inputEl.value = '';
                // Prepend new comment
                comments.unshift({
                    author: user.fullname || user.username,
                    content: text,
                    date: new Date().toISOString()
                });
                renderComments();
            }
        } catch (err) {
            alert(err.message || 'Failed to post comment');
        } finally {
            submitBtn.disabled = false;
        }
    });

    try {
        const resp = await getEventComments(eventId);
        comments = (resp && resp.comments) ? resp.comments : [];
        comments.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        renderComments();
    } catch (err) {
        listEl.innerHTML = '<div class="no-comments">Failed to load comments</div>';
        seeMoreBtn.style.display = 'none';
    }
}
