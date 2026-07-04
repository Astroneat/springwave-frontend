import "../../src/style.css";
import { isAuthenticated } from "../lib/session.js";
import { getActivities, getActivityById, participateActivity, unparticipateActivity, checkParticipation, searchActivities, searchSemantic } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite, getFavourites } from "../api/user.js";
import { getRecommendations, explainRecommendation } from "../api/recommendations.js";
import { createDiscussionWithScope } from "../api/forum.js";
import { CDN_DOMAIN } from "../config.js";
import { t } from "../lib/i18n.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar } from "../components/navbar.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { sanitizeHtml } from "../lib/sanitize.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { getUser } from "../lib/session.js";

let allActivities = [];
let currentCategory = "all";
let currentSort = "newest";
let cachedTemplate = null;

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");

    const eventPromise = eventId
        ? getActivityById(eventId).then(r => r.activity || r).catch(() => null)
        : Promise.resolve(null);

    await loadNavbar();
    await initExplore();
    await loadRecommendations();
    await initChatbot();
    initExplorePostModal();
    initializePage();

    if (eventId) {
        const activity = await eventPromise;
        if (activity) {
            if (!allActivities.some(a => a.activityID === eventId || a._id === eventId)) {
                allActivities.push(activity);
            }
            openPopup(eventId);
        }
    }
});

async function loadNavbar() {
    await loadSharedNavbar({ activeSection: "explore", onFavouritesClick: showFavourites });
    initScrollMerge();
}

function initScrollMerge() {
    const searchBar = document.getElementById("floating-search");
    const navbar = document.getElementById("navbar");
    if (!searchBar || !navbar) return;

    const isMobile = () => window.innerWidth < 768;

    window.addEventListener("scroll", () => {
        if (isMobile()) {
            searchBar.classList.remove("merged");
            navbar.classList.remove("merged");
            return;
        }
        const rect = searchBar.getBoundingClientRect();
        const m = rect.top < navbar.offsetHeight;
        searchBar.classList.toggle("merged", m);
        navbar.classList.toggle("merged", m);
    }, { passive: true });

    window.addEventListener("resize", () => {
        if (isMobile()) {
            searchBar.classList.remove("merged");
            navbar.classList.remove("merged");
        }
    }, { passive: true });
}

function initNavbarActiveLinks() {
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.dataset.section === "explore") {
            link.classList.add("active");
        }
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
        showFavourites();
    });
}

async function initExplore() {
    try {
        initSearchDatePicker();
    } catch (e) {
        console.error("Failed to initialize search date picker:", e);
    }
    
    try {
        initSidebar();
    } catch (e) {
        console.error("Failed to initialize sidebar:", e);
    }
    
    try {
        await loadCards();
    } catch (e) {
        console.error("Failed to load activities cards:", e);
    }
    
    try {
        initSearchButton();
    } catch (e) {
        console.error("Failed to initialize search button handlers:", e);
    }
    
    try {
        initMapSelector();
    } catch (e) {
        console.error("Failed to initialize map selector:", e);
    }
}

async function loadRecommendations() {
    const section = document.getElementById("recommendations-section");
    const container = document.getElementById("recommendations-container");
    if (!section || !container) return;

    if (!isAuthenticated()) return;

    try {
        const data = await getRecommendations();
        const recommended = data?.events || data?.recommendations || [];
        if (recommended.length === 0) return;

        section.style.display = "block";
        container.innerHTML = recommended.slice(0, 6).map(a => {
            const held = formatDate(a.heldDate);
            return `
                <div class="recommendation-card" data-id="${a._id || a.activityID}" style="cursor:pointer;">
                    <div class="recommendation-thumb">
                        ${a.thumbnail ? `<img src="${a.thumbnail}" alt="${a.title}">` : '<div class="recommendation-thumb-placeholder"><span class="material-symbols-outlined">event</span></div>'}
                    </div>
                    <div class="recommendation-body">
                        <h4 class="recommendation-title">${a.title}</h4>
                        <span class="recommendation-meta"><span class="material-symbols-outlined" style="font-size:14px;">location_on</span> ${a.location}</span>
                        <span class="recommendation-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span> ${held}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                openPopup(id);
            });
        });
    } catch {
        section.style.display = "none";
    }
}

function initSearchButton() {
    const searchLoc = document.getElementById("search-location");
    const searchPref = document.getElementById("search-pref");
    const navbarInput = document.getElementById("search-navbar");
    const executeBtn = document.getElementById("searchExecuteBtn");

    if (!searchPref && !navbarInput) return;

    let debounceTimeout = null;

    const performSearch = async () => {
        const location = searchLoc?.value.trim() || "";
        const prefVal = searchPref?.value.trim() || "";
        const navbarVal = navbarInput?.value.trim() || "";
        
        // Use either preferences input or navbar input as the main search term
        const keyword = prefVal || navbarVal;
        const dates = window.__searchDates || {};
        
        // Sync text inputs
        if (searchPref) searchPref.value = keyword;
        if (navbarInput) navbarInput.value = keyword;
        
        // Clear active category filters when searching
        document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
        document.querySelector(".category-chip[data-category='all']")?.classList.add("active");
        currentCategory = "all";
        
        const cardsContainer = document.getElementById("cards-container");
        cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">${t("explore.searching")}</div>`;

        try {
            const params = {
                location: location || undefined,
                heldDateFrom: dates.startDate ? dates.startDate.toISOString().split("T")[0] : undefined,
                heldDateTo: dates.endDate ? dates.endDate.toISOString().split("T")[0] : undefined
            };

            const data = keyword
                ? await searchSemantic({ q: keyword, ...params })
                : await searchActivities({ keyword, ...params });

            let activities = data?.activities || [];
            
            // Client-side filtering fallback to ensure exact matching
            if (location) {
                activities = activities.filter(a => 
                    (a.location || "").toLowerCase().includes(location.toLowerCase())
                );
            }
            if (dates.startDate && dates.endDate) {
                activities = activities.filter(a => {
                    const held = new Date(a.heldDate);
                    return held >= dates.startDate && held <= dates.endDate;
                });
            } else if (dates.startDate) {
                activities = activities.filter(a => new Date(a.heldDate) >= dates.startDate);
            }
            if (keyword) {
                activities = activities.filter(a => 
                    (a.title || "").toLowerCase().includes(keyword.toLowerCase()) ||
                    (a.description || "").toLowerCase().includes(keyword.toLowerCase()) ||
                    (a.type || "").toLowerCase().includes(keyword.toLowerCase()) ||
                    (a.tags || []).some(t => t.toLowerCase().includes(keyword.toLowerCase()))
                );
            }

            if (activities.length === 0) {
                cardsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#94a3b8"><span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:12px">search_off</span><p style="font-size:16px;font-weight:600">${t("explore.no_results")}</p></div>`;
                document.getElementById("resultsCount").textContent = t("explore.results", { n: 0 });
                return;
            }
            await renderCards(activities);
        } catch (e) {
            cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">${t("explore.search_error")}</div>`;
        }
    };

    // Click search button
    executeBtn?.addEventListener("click", performSearch);

    // Typing in either preferences or navbar search inputs triggers search with debounce
    const inputs = [searchPref, navbarInput].filter(Boolean);
    inputs.forEach(input => {
        input.addEventListener("input", (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(performSearch, 350);
        });

        input.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                clearTimeout(debounceTimeout);
                performSearch();
            }
        });
    });
}

async function loadCards() {
    const cardsContainer = document.getElementById("cards-container");
    try {
        if (!cachedTemplate) {
            const templateHTML = await fetchContent("./components/cards.html");
            const parser = new DOMParser();
            const doc = parser.parseFromString(templateHTML, "text/html");
            cachedTemplate = doc.querySelector(".card");
        }
        const activities = (await getActivities()).activities || [];
        allActivities = activities;
        await applyFiltersAndSort();
    } catch (err) {
        console.error(err);
        cardsContainer.innerHTML = `<div class="empty-state">${t("explore.failed_load")}</div>`;
    }
}

async function renderCards(activities) {
    if (!cachedTemplate) {
        const templateHTML = await fetchContent("./components/cards.html");
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHTML, "text/html");
        cachedTemplate = doc.querySelector(".card");
    }

    allActivities = activities;
    await applyFiltersAndSort();
}

async function applyFiltersAndSort() {
    let filtered = [...allActivities];

    if (currentCategory !== "all") {
        filtered = filtered.filter(a => (a.type || "").toLowerCase() === currentCategory);
    }

    switch (currentSort) {
        case "newest":
            filtered.sort((a, b) => new Date(b.heldDate || 0) - new Date(a.heldDate || 0));
            break;
        case "popular":
            filtered.sort((a, b) => ((b.participants?.length || b.viewCount || 0) - (a.participants?.length || a.viewCount || 0)));
            break;
        case "ending":
            filtered.sort((a, b) => new Date(a.applicationDeadline || a.heldDate || 0) - new Date(b.applicationDeadline || b.heldDate || 0));
            break;
    }

    await renderCardsDirect(filtered);
}

async function renderCardsDirect(activities) {
    const cardsContainer = document.getElementById("cards-container");
    if (!cachedTemplate) return;

    if (activities.length === 0) {
        cardsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#94a3b8"><span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:12px">search_off</span><p style="font-size:16px;font-weight:600">${t("explore.no_match")}</p><p style="font-size:13px;margin-top:4px">${t("explore.no_match_hint")}</p></div>`;
        document.getElementById("resultsCount").textContent = t("explore.results", { n: 0 });
        return;
    }

    cardsContainer.innerHTML = "";
    activities.forEach(activity => {
        const card = cachedTemplate.cloneNode(true);
        card.classList.add("revealed");
        const image = card.querySelector(".card-image");
        if (image) {
            image.src = activity.thumbnail;
            image.alt = activity.title;
        }
        card.querySelector(".card-title").textContent = activity.title;
        card.querySelectorAll(".info span")[0].textContent = activity.location || t("explore.unknown_location");
        card.querySelectorAll(".info span")[1].textContent = formatDate(activity.heldDate);
        card.querySelectorAll(".info span")[2].textContent = capitalize(activity.type || "Activity");
        card.dataset.id = activity.activityID;
        cardsContainer.appendChild(card);
    });

    document.getElementById("resultsCount").textContent = activities.length === 1 ? t("explore.result_singular", { n: activities.length }) : t("explore.results", { n: activities.length });

    await syncCardFavourites();
    initCardClickHandlers();
    initStars();
}

function initSidebar() {
    document.querySelectorAll(".category-chip").forEach(chip => {
        chip.addEventListener("click", async () => {
            document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            currentCategory = chip.dataset.category;
            await applyFiltersAndSort();
        });
    });

    document.querySelectorAll(".sort-option").forEach(option => {
        option.addEventListener("click", async () => {
            document.querySelectorAll(".sort-option").forEach(o => o.classList.remove("active"));
            option.classList.add("active");
            currentSort = option.dataset.sort;
            await applyFiltersAndSort();
        });
    });

    document.getElementById("clearFilters")?.addEventListener("click", async () => {
        const searchInput = document.getElementById("search-pref");
        const navbarInput = document.getElementById("search-navbar");
        const locInput = document.getElementById("search-location");
        if (searchInput) searchInput.value = "";
        if (navbarInput) navbarInput.value = "";
        if (locInput) locInput.value = "";
        if (window.__searchDates) {
            window.__searchDates.startDate = null;
            window.__searchDates.endDate = null;
        }
        const placeholder = document.getElementById("drPlaceholder");
        const value = document.getElementById("drValue");
        if (placeholder) placeholder.classList.remove("hidden");
        if (value) value.classList.remove("visible");
        
        document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
        document.querySelector(".category-chip[data-category='all']")?.classList.add("active");
        currentCategory = "all";
        document.querySelectorAll(".sort-option").forEach(o => o.classList.remove("active"));
        document.querySelector(".sort-option[data-sort='newest']")?.classList.add("active");
        currentSort = "newest";
        await applyFiltersAndSort();
    });

    document.getElementById("sidebarToggle")?.addEventListener("click", () => {
        document.getElementById("exploreSidebar")?.classList.toggle("open");
    });

    const sidebar = document.getElementById("exploreSidebar");
    sidebar?.addEventListener("click", (e) => {
        if (e.target === sidebar) sidebar.classList.remove("open");
    });
}

function initializePage() {
    initDetailButtons();
    initCardReveal();
}

function initStars() {
    document.querySelectorAll(".card .star").forEach(star => {
        star.addEventListener("click", async (e) => {
            const card = star.closest(".card");
            const id = card?.dataset.id;
            if (!id || !isAuthenticated()) return;
            e.stopPropagation();
            const active = star.classList.contains("active");
            star.classList.toggle("active");
            try {
                if (active) {
                    await removeFavourite(id);
                } else {
                    await addFavourite(id);
                }
            } catch (err) {
                star.classList.toggle("active");
                console.error("Failed to toggle favourite:", err);
            }
        });
    });
}

const popupOverlay = document.getElementById("popup-overlay");
const popupContainer = document.getElementById("popup-container");
const popupOverlay2 = document.getElementById("popup-overlay-2");
const popupContainer2 = document.getElementById("popup-container-2");

async function openPopup(activityID) {
    if (!activityID) return;
    popupContainer.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    popupOverlay.removeAttribute("hidden");
    popupOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    const activity = allActivities.find(a => a.activityID === activityID || a._id === activityID) || null;
    if (activity) {
        popupContainer.innerHTML = buildPopupHTML(activity);
    } else {
        const { activity: fetched } = await getActivityById(activityID);
        popupContainer.innerHTML = buildPopupHTML(fetched);
    }
    initParticipateButton(activityID);
    popupContainer.querySelector("#back-btn")?.addEventListener("click", closePopup);

    popupContainer.querySelector(".icon-btn")?.addEventListener("click", () => {
        const id = activityID;
        const act = allActivities.find(a => a.activityID === id || a._id === id);
        const title = act?.title || "SpringWave Event";
        const url = `${window.location.origin}/explore.html?event=${id}`;
        if (navigator.share) {
            navigator.share({ title, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!")).catch(() => {});
        }
    });

    popupContainer.querySelector(".discuss-btn")?.addEventListener("click", () => {
        const btn = popupContainer.querySelector(".discuss-btn");
        const eventId = btn?.dataset.eventId;
        const eventTitle = btn?.dataset.eventTitle;
        if (eventId && eventTitle && window._openExplorePostModal) {
            window._openExplorePostModal(eventId, eventTitle);
        }
    });

    if (isAuthenticated()) {
        Promise.all([
            checkParticipation(activityID).then(({ participated }) => { if (participated) setParticipated(); }),
            checkFavourite(activityID).then(({ favourited }) => { if (favourited) setFavourited(activityID); })
        ]).catch(() => {});
    }

    const favoriteBtn = popupContainer.querySelector(".favorite-btn");
    favoriteBtn?.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isActive = favoriteBtn.classList.contains("active");
        favoriteBtn.classList.toggle("active");
        toggleCardStar(activityID, !isActive);
        try {
            if (isActive) {
                await removeFavourite(activityID);
            } else {
                await addFavourite(activityID);
            }
        } catch (err) {
            favoriteBtn.classList.toggle("active");
            toggleCardStar(activityID, isActive);
            console.error("Failed to toggle favourite:", err);
        }
    });
}

function toggleCardStar(activityID, active) {
    const card = document.querySelector(`.card[data-id="${activityID}"]`);
    if (!card) return;
    const star = card.querySelector(".star");
    if (star) star.classList.toggle("active", active);
}

function closePopup() {
    popupOverlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => { popupContainer.innerHTML = ""; popupOverlay.setAttribute("hidden", ""); }, 300);
}

function closePopup2() {
    popupOverlay2.classList.remove("active");
    setTimeout(() => { popupContainer2.innerHTML = ""; popupOverlay2.setAttribute("hidden", ""); }, 300);
}

async function openPopup2(activityID, activityData) {
    if (!activityID) return;
    popupContainer2.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    popupOverlay2.removeAttribute("hidden");
    popupOverlay2.classList.add("active");

    const activity = activityData || (await getActivityById(activityID)).activity;

    if (!activity) return;
    popupContainer2.innerHTML = buildPopupHTML(activity, "Back");
    initParticipateButton(activityID);
    popupContainer2.querySelector("#back-btn")?.addEventListener("click", closePopup2);

    popupContainer2.querySelector(".icon-btn")?.addEventListener("click", () => {
        const title = activity?.title || "SpringWave Event";
        const url = `${window.location.origin}/explore.html?event=${activityID}`;
        if (navigator.share) {
            navigator.share({ title, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!")).catch(() => {});
        }
    });

    popupContainer2.querySelector(".discuss-btn")?.addEventListener("click", () => {
        const btn = popupContainer2.querySelector(".discuss-btn");
        const eventId = btn?.dataset.eventId;
        const eventTitle = btn?.dataset.eventTitle;
        if (eventId && eventTitle && window._openExplorePostModal) {
            window._openExplorePostModal(eventId, eventTitle);
        }
    });

    if (isAuthenticated()) {
        Promise.all([
            checkParticipation(activityID).then(({ participated }) => { if (participated) setParticipated(); }),
            checkFavourite(activityID).then(({ favourited }) => { if (favourited) setFavourited(activityID); })
        ]).catch(() => {});
    }

    const favBtn = popupContainer2.querySelector(".favorite-btn");
    favBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const active = favBtn.classList.contains("active");
        favBtn.classList.toggle("active");
        toggleCardStar(activityID, !active);
        try {
            if (active) { await removeFavourite(activityID); }
            else { await addFavourite(activityID); }
        } catch (err) {
            favBtn.classList.toggle("active");
            toggleCardStar(activityID, active);
            console.error("Failed to toggle favourite:", err);
        }
    });
}

popupOverlay?.addEventListener("click", (e) => {
    if (e.target === popupOverlay || e.target.classList.contains("popup-backdrop")) closePopup();
});

popupOverlay2?.addEventListener("click", (e) => {
    if (e.target === popupOverlay2 || e.target.classList.contains("popup-backdrop")) closePopup2();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePopup(); closePopup2(); }
});

function initCardClickHandlers() {
    const buttons = document.querySelectorAll(".details-btn");
    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const card = button.closest(".card");
            if (card) openPopup(card.dataset.id);
        });
    });

    const cards = document.querySelectorAll(".card");
    cards.forEach(card => {
        card.addEventListener("click", async () => {
            await openPopup(card.dataset.id);
        });
    });
}

async function syncCardFavourites() {
    if (!isAuthenticated()) return;
    try {
        const { activities } = await getFavourites();
        (activities || []).forEach(a => toggleCardStar(a.activityID, true));
    } catch (err) {
        console.error("Failed to sync favourites:", err);
    }
}

function buildPopupHTML(a, backText) {
    const heldDate = formatDate(a.heldDate);
    const type = capitalize(a.type);
    const hasCoords = a.locationLat && a.locationLng;
    const googleMapsLink = hasCoords
        ? `https://www.google.com/maps?q=${a.locationLat},${a.locationLng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;
    backText = backText || t("explore.back");
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
                        <button class="action-btn participate" type="button">
                            <i class="fa-solid fa-users"></i>
                            <div>
                                <h4 class="participate-header">${t("explore.participate")}</h4>
                                <p class="participate-text">${t("explore.join_activity")}</p>
                            </div>
                        </button>
                        <button class="action-btn discuss discuss-btn" data-event-id="${a.activityID}" data-event-title="${a.title}" type="button">
                            <i class="fa-solid fa-comments"></i>
                            <div>
                                <h4>DISCUSS</h4>
                                <p>Join the thread</p>
                            </div>
                        </button>
                        <div class="sidebar-minor-row">
                            <button class="icon-btn minor-btn" type="button"><span class="material-symbols-outlined text-base">share</span> ${t("explore.share")}</button>
                            <button type="button" class="favorite-btn minor-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">${t("explore.favourite")}</span></button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>`;
}

function initDetailButtons() {
    document.querySelectorAll(".details-btn").forEach(button => {
        button.addEventListener("click", (e) => e.stopPropagation());
    });
}

function initCardReveal() {
    const cards = document.querySelectorAll(".card");
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("revealed");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    cards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 70}ms`;
        observer.observe(card);
    });
}

function setParticipated() {
    const btn = document.querySelector(".participate");
    if (!btn) return;
    btn.classList.add("active");
    btn.querySelector(".participate-header").textContent = t("explore.participated");
    btn.querySelector(".participate-text").textContent = t("explore.joined_activity");
}

function setFavourited(activityID) {
    const btn = document.querySelector(".favorite-btn");
    if (btn) btn.classList.add("active");
    toggleCardStar(activityID, true);
}

async function showFavourites() {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }
    try {
        const { activities } = await getFavourites();
        popupContainer.innerHTML = buildFavouritesHTML(activities || []);
        popupOverlay.removeAttribute("hidden");
        popupOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
        popupContainer.querySelector("#back-btn")?.addEventListener("click", closePopup);
        const cards = popupContainer.querySelectorAll(".activity-card");
        activities.forEach((a, i) => {
            cards[i]?.addEventListener("click", () => openPopup2(a.activityID, a));
        });
    } catch (err) {
        console.error("Failed to show favourites:", err);
    }
}

function buildFavouritesHTML(activities) {
    if (activities.length === 0) {
        return `<div class="container" style="padding:40px;text-align:center;color:var(--text-muted)"><p>${t("explore.no_favourites")}</p></div>`;
    }
    const items = activities.map(a => {
        const held = formatDate(a.heldDate);
        const type = capitalize(a.type);
        return `<div class="activity-card" data-id="${a.activityID}" style="cursor:pointer;border:1px solid #e8ecf4;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;gap:16px;transition:background 0.2s">
            <div style="width:120px;height:90px;border-radius:10px;overflow:hidden;background:#e8ecf4;flex-shrink:0;">
                ${a.thumbnail ? `<img src="${a.thumbnail}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="padding:30px;text-align:center;color:#999"><i class="fa-regular fa-image"></i></div>'}
            </div>
            <div style="flex:1">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-size:12px;padding:2px 10px;border-radius:999px;background:#dce9ff;color:var(--accent);font-weight:600;">${type}</span>
                    <span style="font-size:12px;color:var(--text-muted)">${held}</span>
                </div>
                <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">${a.title}</h3>
                <div style="font-size:13px;color:var(--text-secondary)"><i class="fa-solid fa-location-dot" style="color:var(--accent)"></i> ${a.location}</div>
            </div>
        </div>`;
    }).join('');
    return `<div class="container"><div class="top-bar"><button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> ${t("explore.back")}</button><h2 style="font-size:22px;font-weight:700;">${t("explore.favourite_activities")}</h2></div><div style="margin-top:20px;">${items}</div></div>`;
}

function initParticipateButton(activityID) {
    const participateBtn = document.querySelector(".participate");
    if (!participateBtn) return;
    participateBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const button = e.currentTarget;
        const isActive = button.classList.contains("active");
        if (!isAuthenticated()) return;
        try {
            if (isActive) {
                await unparticipateActivity(activityID);
                button.classList.remove("active");
                button.querySelector(".participate-header").textContent = t("explore.participate");
                button.querySelector(".participate-text").textContent = t("explore.join_activity");
            } else {
                await participateActivity(activityID);
                button.classList.add("active");
                button.querySelector(".participate-header").textContent = t("explore.participated");
                button.querySelector(".participate-text").textContent = t("explore.joined_activity");
            }
        } catch (err) {
            console.error("Participate error:", err);
            button.querySelector(".participate-text").textContent = err.message || t("common.error");
            setTimeout(() => {
                button.querySelector(".participate-text").textContent = button.classList.contains("active") ? t("explore.joined_activity") : t("explore.join_activity");
            }, 2000);
        }
    });
}

function initSearchDatePicker() {
    const item = document.getElementById("zone-date");
    const trigger = document.getElementById("drTrigger");
    const placeholder = document.getElementById("drPlaceholder");
    const value = document.getElementById("drValue");
    const dropdown = document.getElementById("drDropdown");
    const grid = document.getElementById("drCalGrid");
    const monthLabel = document.getElementById("drMonthLabel");
    const prevBtn = document.getElementById("drPrev");
    const nextBtn = document.getElementById("drNext");
    const clearBtn = document.getElementById("drClear");
    const closeBtn = document.getElementById("drClose");
    if (!trigger) return;

    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let startDate = null;
    let endDate = null;
    window.__searchDates = { startDate: null, endDate: null };

    function syncSearchDates() { window.__searchDates.startDate = startDate; window.__searchDates.endDate = endDate; }
    function pad(n) { return String(n).padStart(2, "0"); }

    function formatDisplay() {
        if (startDate && endDate) {
            value.textContent = `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)} - ${pad(endDate.getDate())}/${pad(endDate.getMonth() + 1)}`;
            value.classList.add("visible");
            placeholder.classList.add("hidden");
        } else if (startDate) {
            value.textContent = `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)} - dd/mm`;
            value.classList.add("visible");
            placeholder.classList.add("hidden");
        } else {
            value.classList.remove("visible");
            placeholder.classList.remove("hidden");
        }
    }

    function renderCalendar() {
        grid.innerHTML = "";
        const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        weekdays.forEach(d => { const el = document.createElement("div"); el.className = "dr-weekday"; el.textContent = d; grid.appendChild(el); });
        monthLabel.textContent = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = startOffset - 1; i >= 0; i--) { const el = document.createElement("div"); el.className = "dr-day other-month"; el.textContent = daysInPrevMonth - i; grid.appendChild(el); }
        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const el = document.createElement("div"); el.className = "dr-day"; el.textContent = d;
            const date = new Date(currentYear, currentMonth, d);
            if (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) el.classList.add("today");
            el.dataset.date = date.toISOString();
            if (startDate && endDate && date > startDate && date < endDate) el.classList.add("in-range");
            if (startDate && date.getTime() === startDate.getTime()) { el.classList.add("range-start"); el.classList.add("in-range"); }
            if (endDate && date.getTime() === endDate.getTime()) { el.classList.add("range-end"); el.classList.add("in-range"); }
            if (startDate && endDate && startDate.getTime() === endDate.getTime() && date.getTime() === startDate.getTime()) el.classList.add("selected");
            el.addEventListener("click", () => {
                const clicked = new Date(currentYear, currentMonth, d);
                if (!startDate || (startDate && endDate)) { startDate = clicked; endDate = null; }
                else if (clicked < startDate) { startDate = clicked; }
                else { endDate = clicked; }
                syncSearchDates(); renderCalendar(); formatDisplay();
            });
            grid.appendChild(el);
        }
        const totalCells = startOffset + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) { const el = document.createElement("div"); el.className = "dr-day other-month"; el.textContent = i; grid.appendChild(el); }
    }

    function openDropdown() {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 8) + "px";
        dropdown.style.left = (rect.left + rect.width / 2) + "px";
        dropdown.style.transform = "translateX(-50%) scale(1)";
        dropdown.removeAttribute("hidden");
        document.body.appendChild(dropdown);
        const today = new Date(); currentMonth = today.getMonth(); currentYear = today.getFullYear();
        renderCalendar(); dropdown.classList.add("active"); item.classList.add("active");
    }

    function closeDropdown() {
        dropdown.classList.remove("active"); item.classList.remove("active");
        dropdown.style.top = ""; dropdown.style.left = ""; dropdown.style.transform = "";
        dropdown.setAttribute("hidden", "");
        document.getElementById("zone-date")?.appendChild(dropdown);
    }

    trigger.addEventListener("click", (e) => { e.stopPropagation(); dropdown.classList.contains("active") ? closeDropdown() : openDropdown(); });
    prevBtn.addEventListener("click", (e) => { e.stopPropagation(); currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); });
    nextBtn.addEventListener("click", (e) => { e.stopPropagation(); currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); });
    clearBtn.addEventListener("click", (e) => { e.stopPropagation(); startDate = null; endDate = null; syncSearchDates(); renderCalendar(); formatDisplay(); });
    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeDropdown(); });
    document.addEventListener("click", (e) => { if (dropdown.classList.contains("active") && !dropdown.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) closeDropdown(); });
    dropdown.addEventListener("click", (e) => e.stopPropagation());
    formatDisplay();
}

function initMapSelector() {
    const trigger = document.getElementById("mapTrigger");
    const locInput = document.getElementById("search-location");
    const overlay = document.getElementById("mapModalOverlay");
    const backdrop = document.getElementById("mapModalBackdrop");
    const closeBtn = document.getElementById("mapModalClose");
    const cancelBtn = document.getElementById("mapCancelBtn");
    const confirmBtn = document.getElementById("mapConfirmBtn");
    const searchInput = document.getElementById("mapSearchInput");
    const searchBtn = document.getElementById("mapSearchBtn");
    const addressText = document.getElementById("selectedAddressText");

    if (!trigger || !overlay) return;

    let map = null;
    let marker = null;
    let selectedAddress = "";

    const openModal = () => {
        overlay.removeAttribute("hidden");
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
        
        if (typeof L === "undefined") {
            if (addressText) {
                addressText.innerHTML = `<span style="color:#ef4444;font-weight:600">The map library (Leaflet) could not be loaded because unpkg.com is blocked or offline. Please check your network.</span>`;
            }
            return;
        }
        
        if (!map) {
            map = L.map("leafletMap").setView([16.0544, 108.2022], 13);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            map.on("click", async (e) => {
                const { lat, lng } = e.latlng;
                updateMarker(lat, lng);
            });
        }
        
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    };

    const closeModal = () => {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
        setTimeout(() => {
            overlay.setAttribute("hidden", "");
        }, 300);
    };

    const updateMarker = async (lat, lng) => {
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            marker.on("dragend", async () => {
                const pos = marker.getLatLng();
                await reverseGeocode(pos.lat, pos.lng);
            });
        }
        map.panTo([lat, lng]);
        await reverseGeocode(lat, lng);
    };

    const searchAddress = async () => {
        const query = searchInput.value.trim();
        if (!query) return;
        
        searchBtn.disabled = true;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                map.setView([lat, lon], 14);
                updateMarker(lat, lon);
            } else {
                alert("Location not found. Try searching for a city or address.");
            }
        } catch (e) {
            console.error("Geocoding failed:", e);
        } finally {
            searchBtn.disabled = false;
        }
    };

    const reverseGeocode = async (lat, lng) => {
        addressText.textContent = "Loading address details...";
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
                const parts = data.display_name.split(",");
                selectedAddress = parts.slice(0, 3).join(",").trim();
                addressText.textContent = selectedAddress;
            } else {
                selectedAddress = `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                addressText.textContent = selectedAddress;
            }
        } catch (e) {
            selectedAddress = `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            addressText.textContent = selectedAddress;
        }
    };

    trigger.addEventListener("click", openModal);
    locInput.addEventListener("click", openModal);
    
    [closeBtn, cancelBtn, backdrop].filter(Boolean).forEach(el => {
        el.addEventListener("click", closeModal);
    });

    searchBtn.addEventListener("click", searchAddress);
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") searchAddress();
    });

    confirmBtn.addEventListener("click", () => {
        if (locInput && selectedAddress) {
            locInput.value = selectedAddress;
        }
        closeModal();
    });
}

/* =============================
   EXPLORE POST MODAL
   ============================= */

function initExplorePostModal() {
  const overlay = document.getElementById("explorePostOverlay");
  const backdrop = document.getElementById("explorePostBackdrop");
  const closeBtn = document.getElementById("explorePostClose");
  const cancelBtn = document.getElementById("explorePostCancel");
  const publishBtn = document.getElementById("explorePostPublish");
  const titleInput = document.getElementById("explorePostTitle");
  const contentInput = document.getElementById("explorePostContent");
  const tagsInput = document.getElementById("explorePostTags");
  const eventInfo = document.getElementById("explorePostEventInfo");

  let currentEventId = null;
  let currentEventTitle = "";

  function open(eventId, eventTitle) {
    currentEventId = eventId;
    currentEventTitle = eventTitle;
    titleInput.value = "";
    contentInput.value = "";
    tagsInput.value = "";
    eventInfo.innerHTML = `
      <span class="material-symbols-outlined text-blue-600">event</span>
      <div class="forum-post-event-info">
        <span class="text-sm font-medium text-slate-800">${eventTitle}</span>
        <span class="text-xs text-slate-500">This discussion will be linked to this event</span>
      </div>
      <span class="material-symbols-outlined text-blue-600">check_circle</span>
    `;
    overlay.style.display = "flex";
    requestAnimationFrame(() => overlay.classList.add("active"));
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("active");
    setTimeout(() => { overlay.style.display = "none"; }, 300);
    document.body.style.overflow = "";
  }

  closeBtn?.addEventListener("click", close);
  cancelBtn?.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  publishBtn?.addEventListener("click", async () => {
    const check = canPerformAction('createDiscussion');
    if (!check.allowed) {
      alert(`Please wait ${check.remaining} seconds before posting.`);
      return;
    }
    markActionPerformed('createDiscussion');

    const title = sanitizeHtml(titleInput.value.trim());
    if (!title) { titleInput.focus(); return; }
    publishBtn.disabled = true;
    try {
      const result = await createDiscussionWithScope({
        title,
        content: sanitizeHtml(contentInput.value.trim() || ""),
        category: "event",
        tags: (tagsInput.value || "").split(",").map(t => sanitizeHtml(t.trim())).filter(Boolean),
        relatedEvent: currentEventId,
        scope: "general",
      });
      close();
      if (result) {
        const act = allActivities.find(a => a.activityID === currentEventId || a._id === currentEventId);
        result.relatedEvent = currentEventId;
        result._event = {
          title: act?.title || currentEventTitle,
          date: act?.heldDate || "",
          attendees: act?.participants || 0,
        };
        if (!result.tags) result.tags = (tagsInput.value || "").split(",").map(t => t.trim()).filter(Boolean);
        if (!result.category) result.category = "event";
        if (!result.lastActivity) result.lastActivity = "Just now";
        if (!result.replies) result.replies = 0;
        result.id = result.id || result._id;
        try { sessionStorage.setItem("springwave_pending_discussion", JSON.stringify(result)); } catch {}
        try {
          result._storedAt = Date.now();
          const stored = JSON.parse(localStorage.getItem("springwave_event_discussions") || "[]");
          const idx = stored.findIndex(d => (d.id || d._id) === (result.id || result._id));
          if (idx === -1) stored.unshift(result);
          else stored[idx] = result;
          localStorage.setItem("springwave_event_discussions", JSON.stringify(stored));
        } catch {}
        const discId = result._id || result.id;
        showSuccessToast(
          "Discussion posted successfully! Click here to view",
          discId ? `./community.html?discussion=${discId}` : null,
          "View Discussion"
        );
      }
    } finally {
      publishBtn.disabled = false;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close();
  });

  window._openExplorePostModal = open;
}

function showSuccessToast(message, linkUrl, linkText) {
  const existing = document.querySelectorAll(".success-toast");
  const offset = existing.length * 80;
  const toast = document.createElement("div");
  toast.className = "success-toast";
  toast.style.bottom = `${24 + offset}px`;
  toast.innerHTML = `
    <div class="success-toast-icon">
      <span class="material-symbols-outlined">check_circle</span>
    </div>
    <div class="success-toast-body">
      <span class="success-toast-heading">Success!</span>
      <span class="success-toast-message">${message}</span>
      ${linkUrl ? `<span class="success-toast-link">${linkText || "View Discussion"}</span>` : ""}
    </div>
    <button class="success-toast-close">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  if (linkUrl) {
    toast.addEventListener("click", (e) => {
      if (e.target.closest(".success-toast-close")) return;
      window.location.href = linkUrl;
    });
    toast.style.cursor = "pointer";
  }
  toast.querySelector(".success-toast-close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  });
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}


