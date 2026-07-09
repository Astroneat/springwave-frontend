import "../../src/style.css";
import { isAuthenticated } from "../lib/session.js";
import { getActivities, getActivityById, participateActivity, unparticipateActivity, checkParticipation, searchActivities, searchSemantic } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite, getFavourites } from "../api/user.js";
import { getRecommendations, explainRecommendation } from "../api/recommendations.js";
import { createDiscussionWithScope } from "../api/forum.js";
import { CDN_DOMAIN } from "../config.js";
import { openEventPopup } from "../components/eventPopup.js";
import { t } from "../lib/i18n.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar } from "../components/navbar.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { sanitizeHtml } from "../lib/sanitize.js";
import { fetchContent, formatDate, capitalize, toLocalISODate } from "../lib/utils.js";
import { getUser } from "../lib/session.js";

let allActivities = [];
let currentFilteredActivities = [];
let currentPage = 1;
const pageSize = 20;
let currentCategory = "all";
let currentSort = "newest";
let currentStatus = "upcoming";
let cachedTemplate = null;
let participateQueue = [];
let activeParticipations = 0;
const MAX_CONCURRENT_PARTICIPATIONS = 3;

async function enqueueParticipate(fn) {
    return new Promise((resolve, reject) => {
        participateQueue.push({ fn, resolve, reject });
        processParticipateQueue();
    });
}

async function processParticipateQueue() {
    while (activeParticipations < MAX_CONCURRENT_PARTICIPATIONS && participateQueue.length > 0) {
        const item = participateQueue.shift();
        activeParticipations++;
        try {
            const result = await item.fn();
            item.resolve(result);
        } catch (err) {
            item.reject(err);
        } finally {
            activeParticipations--;
            processParticipateQueue();
        }
    }
}

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
    initializePage();

    if (eventId) {
        const activity = await eventPromise;
        if (activity) {
            if (!allActivities.some(a => a.activityID === eventId || a._id === eventId)) {
                allActivities.push(activity);
            }
            openEventPopup(eventId);
        }
    }
});

async function loadNavbar() {
    await loadSharedNavbar({ activeSection: "explore" });
    initScrollMerge();
}

function initScrollMerge() {
    const searchBar = document.querySelector(".explore-search-bar");
    const navbar = document.getElementById("navbar");
    if (!searchBar || !navbar) return;

    const isMobile = () => window.innerWidth < 768;

    let navbarH = navbar.offsetHeight;
    let ticking = false;

    const update = () => {
        ticking = false;
        if (isMobile()) {
            searchBar.classList.remove("merged");
            navbar.classList.remove("merged");
            return;
        }
        const rect = searchBar.getBoundingClientRect();
        const m = rect.top < navbarH;
        searchBar.classList.toggle("merged", m);
        navbar.classList.toggle("merged", m);
    };

    window.addEventListener("scroll", () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });

    window.addEventListener("resize", () => {
        navbarH = navbar.offsetHeight;
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
                openEventPopup(id);
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
        const keyword = searchPref?.value.trim() || navbarInput?.value.trim() || "";

        const dates = window.__searchDates || {};

        // Sync text inputs to ensure they always match
        if (searchPref && searchPref.value !== keyword) searchPref.value = keyword;
        if (navbarInput && navbarInput.value !== keyword) navbarInput.value = keyword;

        // Clear active category filters when searching
        document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
        document.querySelector(".category-chip[data-category='all']")?.classList.add("active");
        currentCategory = "all";

        const cardsContainer = document.getElementById("cards-container");
        cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">${t("explore.searching")}</div>`;
        const pagContainer = document.getElementById("pagination-container");
        if (pagContainer) pagContainer.style.display = "none";

        try {
            const params = {
                location: location || undefined,
                heldDateFrom: dates.startDate ? toLocalISODate(dates.startDate) : undefined,
                heldDateTo: dates.endDate ? toLocalISODate(dates.endDate) : undefined,
                limit: 500
            };

            const data = keyword
                ? await searchSemantic({ q: keyword, ...params })
                : await searchActivities({ keyword, ...params });

            let activities = data?.activities || [];

            // Client-side filtering fallback to ensure exact matching for location and dates
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
                const kwLower = keyword.toLowerCase();
                activities = activities.filter(a => {
                    const exactMatch = (a.title || "").toLowerCase().includes(kwLower) ||
                        (a.description || "").toLowerCase().includes(kwLower) ||
                        (a.location || "").toLowerCase().includes(kwLower) ||
                        (a.type || "").toLowerCase().includes(kwLower) ||
                        (a.tags || []).some(t => t.toLowerCase().includes(kwLower));

                    // AI embeddings can give junk strings (like "a", "22") scores around 0.5. 
                    // Use 0.60 to filter out junk semantic matches.
                    const semanticMatch = a.score !== undefined && a.score >= 0.60;
                    return exactMatch || semanticMatch;
                });

                // Auto-switch to relevance sorting for semantic search
                document.querySelectorAll(".sort-option").forEach(o => o.classList.remove("active"));
                currentSort = "relevance";
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

    const refreshBtn = document.getElementById("searchRefreshBtn");
    refreshBtn?.addEventListener("click", async () => {
        if (searchLoc) searchLoc.value = "";
        if (searchPref) searchPref.value = "";
        if (navbarInput) navbarInput.value = "";
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

        const cardsContainer = document.getElementById("cards-container");
        if (cardsContainer) cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">${t("explore.searching") || "Refreshing..."}</div>`;
        const pagContainer = document.getElementById("pagination-container");
        if (pagContainer) pagContainer.style.display = "none";

        try {
            const data = await getActivities();
            await renderCards(data.activities || []);
        } catch (e) {
            if (cardsContainer) cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">${t("common.error") || "Error fetching data"}</div>`;
        }
    });

    // Typing in either preferences or navbar search inputs triggers search with debounce
    const inputs = [searchPref, navbarInput].filter(Boolean);
    inputs.forEach(input => {
        input.addEventListener("input", (e) => {
            const val = e.target.value;
            if (searchPref && searchPref !== e.target && searchPref.value !== val) searchPref.value = val;
            if (navbarInput && navbarInput !== e.target && navbarInput.value !== val) navbarInput.value = val;

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
    currentPage = 1;
    let filtered = [...allActivities];

    if (currentCategory !== "all") {
        filtered = filtered.filter(a => (a.type || "").toLowerCase() === currentCategory);
    }

    const now = new Date();
    if (currentStatus === "upcoming") {
        filtered = filtered.filter(a => new Date(a.heldDate || a.createdAt || 0) >= now);
    } else if (currentStatus === "past") {
        filtered = filtered.filter(a => new Date(a.heldDate || a.createdAt || 0) < now);
    }

    switch (currentSort) {
        case "relevance":
            filtered.sort((a, b) => {
                const scoreA = a.score !== undefined ? a.score : 0;
                const scoreB = b.score !== undefined ? b.score : 0;
                return scoreB - scoreA;
            });
            break;
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

    currentFilteredActivities = filtered;
    await renderCardsDirect(filtered);
}

async function renderCardsDirect(activities) {
    const cardsContainer = document.getElementById("cards-container");
    if (!cachedTemplate) return;

    if (activities.length === 0) {
        cardsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#94a3b8"><span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:12px">search_off</span><p style="font-size:16px;font-weight:600">${t("explore.no_match")}</p><p style="font-size:13px;margin-top:4px">${t("explore.no_match_hint")}</p></div>`;
        document.getElementById("resultsCount").textContent = t("explore.results", { n: 0 });
        const pagContainer = document.getElementById("pagination-container");
        if (pagContainer) pagContainer.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(activities.length / pageSize);
    // Ensure currentPage is within bounds
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedActivities = activities.slice(startIndex, startIndex + pageSize);

    cardsContainer.innerHTML = "";
    const frag = document.createDocumentFragment();
    paginatedActivities.forEach(activity => {
        const card = cachedTemplate.cloneNode(true);
        card.classList.add("revealed");
        const image = card.querySelector(".card-image");
        if (image) {
            image.src = activity.thumbnail;
            image.alt = activity.title;
        }
        card.querySelector(".card-title").textContent = activity.title;
        const locationSpan = card.querySelector(".info-location");
        if (locationSpan) locationSpan.textContent = activity.location || t("explore.unknown_location");

        const dateSpan = card.querySelector(".info-date");
        if (dateSpan) dateSpan.textContent = formatDate(activity.heldDate);

        const typeSpan = card.querySelector(".info-type");
        if (typeSpan) typeSpan.textContent = capitalize(activity.type || "Activity");

        const hostSpan = card.querySelector(".info-host");
        if (hostSpan) hostSpan.textContent = activity.hostName || activity.createdByName || t("common.unknown") || "Unknown";
        
        const isPast = new Date(activity.heldDate || activity.createdAt || 0) < new Date();
        if (isPast) {
            card.classList.add("opacity-75", "grayscale-[0.5]");
            
            const btn = card.querySelector(".details-btn");
            if (btn) {
                btn.textContent = t("explore.ended") || "Ended";
                btn.classList.add("!bg-gray-300", "!text-gray-600", "cursor-not-allowed", "!shadow-none");
                btn.classList.remove("bg-primary", "text-white");
                // remove hover effect via style or we can just disable pointer events
                btn.style.pointerEvents = "none";
            }
            
            const tagContainer = card.querySelector(".absolute");
            if (tagContainer) {
                const endedBadge = document.createElement("div");
                endedBadge.className = "absolute top-3 left-3 bg-red-100 px-3 py-1 rounded-lg text-xs font-bold text-red-600 flex items-center gap-1.5 border border-red-200 z-10 shadow-sm";
                endedBadge.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-[10px]"></i><span>Ended</span>`;
                card.appendChild(endedBadge);
            }
        }
        
        card.dataset.id = activity.activityID;
        frag.appendChild(card);
    });
    cardsContainer.appendChild(frag);

    document.getElementById("resultsCount").textContent = activities.length === 1 ? t("explore.result_singular", { n: activities.length }) : t("explore.results", { n: activities.length });

    renderPaginationControls(activities.length, totalPages);

    await syncCardFavourites();
    initCardClickHandlers();
}

function renderPaginationControls(totalItems, totalPages) {
    const container = document.getElementById("pagination-container");
    if (!container) return;
    container.style.display = ""; // Ensure it's visible again after search

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = "";

    // Prev Button
    html += `
        <button class="pagination-btn nav-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
        </button>
    `;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            html += `
                <button class="pagination-btn num-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        } else if (
            i === currentPage - 3 ||
            i === currentPage + 3
        ) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    // Next Button
    html += `
        <button class="pagination-btn nav-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
        </button>
    `;

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pagination-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", async () => {
            const page = parseInt(btn.dataset.page, 10);
            if (!isNaN(page)) {
                // Scroll to results header smoothly, accounting for fixed navbar
                const target = document.querySelector(".results-header");
                if (target) {
                    const navbarHeight = document.getElementById("navbar")?.offsetHeight || 80;
                    const y = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
                    window.scrollTo({ top: y, behavior: "smooth" });
                }

                // Wait for smooth scroll to finish before rendering new cards
                await new Promise(resolve => {
                    let done = false;
                    const finish = () => {
                        if (done) return;
                        done = true;
                        window.removeEventListener('scrollend', finish);
                        clearTimeout(fallback);
                        resolve();
                    };
                    const fallback = setTimeout(finish, 800);
                    window.addEventListener('scrollend', finish, { once: true });
                });

                currentPage = page;
                await renderCardsDirect(currentFilteredActivities);
            }
        });
    });
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

    document.querySelectorAll(".sort-option").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".sort-option").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentSort = btn.dataset.sort;
            applyFiltersAndSort();
        });
    });

    document.querySelectorAll(".status-option").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".status-option").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentStatus = btn.dataset.status;
            applyFiltersAndSort();
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
    initCardReveal();
}



function toggleCardStar(activityID, active) {
    const card = document.querySelector(`.card[data-id="${activityID}"]`);
    if (!card) return;
    const star = card.querySelector(".star");
    if (star) star.classList.toggle("active", active);
}



let cardDelegationBound = false;
let favReqInFlight = null;
let cachedFavIds = null;

function initCardClickHandlers() {
    if (cardDelegationBound) return;
    const container = document.getElementById("cards-container");
    if (!container) return;
    cardDelegationBound = true;

    container.addEventListener("click", async (e) => {
        const star = e.target.closest(".star");
        if (star) {
            e.preventDefault();
            e.stopPropagation();
            const card = star.closest(".card");
            const id = card?.dataset.id;
            if (!id) return;
            if (!isAuthenticated()) {
                alert(t("explore.please_login") || "Please login first to favourite activities!");
                return;
            }
            const active = star.classList.contains("active");
            star.classList.toggle("active");
            if (cachedFavIds) {
                if (active) cachedFavIds.delete(id);
                else cachedFavIds.add(id);
            }
            try {
                if (active) await removeFavourite(id);
                else await addFavourite(id);
            } catch (err) {
                star.classList.toggle("active");
                if (cachedFavIds) {
                    if (active) cachedFavIds.add(id);
                    else cachedFavIds.delete(id);
                }
                console.error("Failed to toggle favourite:", err);
            }
            return;
        }

        const detailsBtn = e.target.closest(".details-btn");
        if (detailsBtn) {
            e.stopPropagation();
            const card = detailsBtn.closest(".card");
            if (card?.dataset.id) {
                await openEventPopup(card.dataset.id);
            }
            return;
        }

        const card = e.target.closest(".card");
        if (card?.dataset.id) {
            await openEventPopup(card.dataset.id);
        }
    });
}

async function syncCardFavourites() {
    if (!isAuthenticated()) return;
    try {
        let activities;
        if (favReqInFlight) {
            const res = await favReqInFlight;
            activities = res.activities || [];
        } else {
            favReqInFlight = getFavourites();
            const res = await favReqInFlight;
            favReqInFlight = null;
            activities = res.activities || [];
        }
        cachedFavIds = new Set(activities.map(a => a.activityID));
        cachedFavIds.forEach(id => toggleCardStar(id, true));
    } catch (err) {
        console.error("Failed to sync favourites:", err);
    }
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
        dropdown.removeAttribute("hidden");
        const today = new Date(); currentMonth = today.getMonth(); currentYear = today.getFullYear();
        renderCalendar(); dropdown.classList.add("active"); item.classList.add("active");
    }

    function closeDropdown() {
        dropdown.classList.remove("active"); item.classList.remove("active");
        dropdown.setAttribute("hidden", "");
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






