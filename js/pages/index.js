import { isAuthenticated, getUser } from "../lib/session.js";
import { getActivityById, participateActivity, unparticipateActivity, checkParticipation } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite, getFavourites } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatBot.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navBar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await initChatbot();
    initializePage();
});


async function loadNavbar() {
    await loadSharedNavbar({ activeSection: "home", onFavouritesClick: showFavourites });
    initBasicScroll();
}

function initNavbarScrollActive() {
    const navLinks = document.querySelectorAll(".nav-links a");

    function setActive(section) {
        navLinks.forEach(l => {
            l.classList.remove("active");
            if (l.dataset.section === section) {
                l.classList.add("active");
            }
        });
    }

    const hero = document.getElementById("hero");
    const explore = document.getElementById("explore");

    if (hero && explore) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (entry.target.id === "hero") {
                            setActive("home");
                        } else if (entry.target.id === "explore") {
                            setActive("explore");
                        }
                    }
                });
            },
            { threshold: 0.3 }
        );
        observer.observe(hero);
        observer.observe(explore);
    }
}

function initializePage() {
    initNavbarScrollActive();
}

const popupOverlay = document.getElementById("popup-overlay");
const popupContainer = document.getElementById("popup-container");
const popupOverlay2 = document.getElementById("popup-overlay-2");
const popupContainer2 = document.getElementById("popup-container-2");

async function openPopup(activityID) {
    if (!activityID) return;

    popupContainer.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    popupOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    const { activity } = await getActivityById(activityID);

    popupContainer.innerHTML = buildPopupHTML(activity);

    initParticipateButton(activityID);

    popupContainer.querySelector("#back-btn")?.addEventListener("click", closePopup);

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
        try {
            if (isActive) {
                await removeFavourite(activityID);
                favoriteBtn.classList.remove("active");
                toggleCardStar(activityID, false);
            } else {
                await addFavourite(activityID);
                favoriteBtn.classList.add("active");
                toggleCardStar(activityID, true);
            }
        } catch {}
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
    setTimeout(() => { popupContainer.innerHTML = ""; }, 300);
}

function closePopup2() {
    popupOverlay2.classList.remove("active");
    setTimeout(() => { popupContainer2.innerHTML = ""; }, 300);
}

async function openPopup2(activityID, activityData) {
    if (!activityID) return;

    popupContainer2.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    popupOverlay2.classList.add("active");

    const activity = activityData || (await getActivityById(activityID)).activity;
    if (!activity) return;
    popupContainer2.innerHTML = buildPopupHTML(activity, "Back");

    initParticipateButton(activityID);
    popupContainer2.querySelector("#back-btn")?.addEventListener("click", closePopup2);

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
        try {
            if (active) { await removeFavourite(activityID); favBtn.classList.remove("active"); toggleCardStar(activityID, false); }
            else { await addFavourite(activityID); favBtn.classList.add("active"); toggleCardStar(activityID, true); }
        } catch {}
    });
}

popupOverlay?.addEventListener("click", (e) => {
    if (e.target === popupOverlay || e.target.classList.contains("popup-backdrop")) {
        closePopup();
    }
});

popupOverlay2?.addEventListener("click", (e) => {
    if (e.target === popupOverlay2 || e.target.classList.contains("popup-backdrop")) {
        closePopup2();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePopup(); closePopup2(); }
});

function buildPopupHTML(a, backText) {
    const heldDate = formatDate(a.heldDate);
    const deadline = formatDate(a.applicationDeadline);
    const type = capitalize(a.type);
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;
    backText = backText || "Back";
    const filesHTML = (a.attachments || []).map(f => {
        const fileName = decodeURIComponent(f.link.split('/').pop());
        return `<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div>
                    <h4>${fileName}</h4>
                </div>
            </div>
            <a class="download-btn" href="${CDN_DOMAIN}/${f.link}" target="_blank">
                <i class="fa-solid fa-download"></i>
            </a>
        </div>`;
    }).join("");

    return `
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn">
                <i class="fa-solid fa-arrow-left"></i>
                ${backText}
            </button>
            <div class="top-actions">
                <button class="icon-btn">
                    <i class="fa-solid fa-share-nodes"></i>
                    Share
                </button>
                <button type="button" class="favorite-btn">
                    <div class="star"><i class="fa-solid fa-star"></i></div>
                    <span class="favorite-text">Favourite</span>
                </button>
            </div>
        </div>
        <div class="main-content">
            <div class="left-panel">
                <img src="${a.thumbnail || 'https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop'}" alt="${a.title}">
                <div class="tag"><i class="fa-solid fa-tag"></i> ${type}</div>
                <div class="details-card">
                    <h2>Details</h2>
                    <div class="detail-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <div><span>Location</span><p>${a.location}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-regular fa-calendar"></i>
                        <div><span>Date</span><p>${heldDate}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-regular fa-user"></i>
                        <div><span>Host</span><p>${a.hostName || "Unknown"}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-regular fa-clock"></i>
                        <div><span>Apply deadline</span><p>${deadline}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-tag"></i>
                        <div><span>Type</span><p>${type}</p></div>
                    </div>
                </div>
            </div>
            <div class="right-panel">
                <h1 class="title">${a.title}</h1>
                <a class="location-link" href="${googleMapsLink}" target="_blank">
                    <i class="fa-solid fa-location-dot"></i>
                    ${a.location}
                </a>
                <div class="info-boxes">
                    <div class="info-box">
                        <i class="fa-regular fa-calendar"></i>
                        <div><span>Date</span><p>${heldDate}</p></div>
                    </div>
                    <div class="info-box">
                        <i class="fa-regular fa-clock"></i>
                        <div><span>Apply deadline</span><p>${deadline}</p></div>
                    </div>
                    <div class="info-box">
                        <i class="fa-regular fa-user"></i>
                        <div><span>Hosted by</span><p>${a.hostName || "Unknown"}</p></div>
                    </div>
                </div>
                <div class="description-panel">
                    ${(a.description || "").split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
                </div>
                ${filesHTML ? `
                <div class="files-box">
                    <h3>Attached Files (${(a.attachments || []).length})</h3>
                    ${filesHTML}
                </div>` : ""}
            </div>
        </div>
        <div class="action-buttons">
            <button class="action-btn discuss" type="button">
                <i class="fa-solid fa-comments"></i>
                <div><h4>DISCUSS</h4><p>0 Comments</p></div>
            </button>
            <button class="action-btn participate" type="button">
                <i class="fa-solid fa-users"></i>
                <div><h4 class="participate-header">PARTICIPATE</h4><p class="participate-text">Join this activity</p></div>
            </button>
            <button class="action-btn report" type="button">
                <i class="fa-solid fa-flag"></i>
                <div><h4>REPORT</h4><p>Report this activity</p></div>
            </button>
        </div>
    </div>`;
}

function setParticipated() {
    const btn = document.querySelector(".participate");
    if (!btn) return;
    btn.classList.add("active");
    btn.querySelector(".participate-header").textContent = "PARTICIPATED";
    btn.querySelector(".participate-text").textContent = "You have joined in this activity";
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
        popupOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
        popupContainer.querySelector("#back-btn")?.addEventListener("click", closePopup);
        const cards = popupContainer.querySelectorAll(".activity-card-fav");
        activities.forEach((a, i) => {
            cards[i]?.addEventListener("click", () => {
                openPopup2(a.activityID, a);
            });
        });
    } catch {}
}

function buildFavouritesHTML(activities) {
    if (activities.length === 0) {
        return `<div class="container fav-empty-container"><p class="fav-empty">No favourites yet.</p></div>`;
    }

    const items = activities.map(a => {
        const held = formatDate(a.heldDate);
        const type = capitalize(a.type);
        return `
        <div class="activity-card-fav" data-id="${a.activityID}">
            <div class="card-thumb">
                ${a.thumbnail ? `<img src="${a.thumbnail}" alt="${a.title}">` : '<div class="card-thumb-placeholder"><i class="fa-regular fa-image"></i></div>'}
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <span class="card-type-badge">${type}</span>
                    <span class="card-date">${held}</span>
                </div>
                <h3 class="card-title">${a.title}</h3>
                <div class="card-location"><i class="fa-solid fa-location-dot"></i> ${a.location}</div>
            </div>
        </div>`;
    }).join('');

    return `
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <h2 class="fav-popup-title">Favourite Activities</h2>
        </div>
        <div class="fav-list">${items}</div>
    </div>`;
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
                button.querySelector(".participate-text").textContent = button.classList.contains("active") ? "You have joined in this activity" : "Join this activity";
            }, 2000);
        }
    });
}

/* =========================
   DATE RANGE PICKER (search bar)
========================= */

function initSearchDatePicker() {
    const item = document.getElementById("searchDateItem");
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

    function syncSearchDates() {
        window.__searchDates.startDate = startDate;
        window.__searchDates.endDate = endDate;
    }

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function formatDisplay() {
        if (startDate && endDate) {
            value.textContent =
                `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)} - ${pad(endDate.getDate())}/${pad(endDate.getMonth() + 1)}`;
            value.classList.add("visible");
            placeholder.classList.add("hidden");
        } else if (startDate) {
            value.textContent =
                `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)} - dd/mm`;
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
        weekdays.forEach(d => {
            const el = document.createElement("div");
            el.className = "dr-weekday";
            el.textContent = d;
            grid.appendChild(el);
        });

        monthLabel.textContent =
            new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        const startOffset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = startOffset - 1; i >= 0; i--) {
            const el = document.createElement("div");
            el.className = "dr-day other-month";
            el.textContent = daysInPrevMonth - i;
            grid.appendChild(el);
        }

        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const el = document.createElement("div");
            el.className = "dr-day";
            el.textContent = d;

            const date = new Date(currentYear, currentMonth, d);

            if (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                el.classList.add("today");
            }

            el.dataset.date = date.toISOString();

            if (startDate && endDate && date > startDate && date < endDate) {
                el.classList.add("in-range");
            }
            if (startDate && date.getTime() === startDate.getTime()) {
                el.classList.add("range-start");
                el.classList.add("in-range");
            }
            if (endDate && date.getTime() === endDate.getTime()) {
                el.classList.add("range-end");
                el.classList.add("in-range");
            }
            if (startDate && endDate && startDate.getTime() === endDate.getTime() && date.getTime() === startDate.getTime()) {
                el.classList.add("selected");
            }

                el.addEventListener("click", () => {
                    const clicked = new Date(currentYear, currentMonth, d);
                    if (!startDate || (startDate && endDate)) {
                        startDate = clicked;
                        endDate = null;
                    } else if (clicked < startDate) {
                        startDate = clicked;
                    } else {
                        endDate = clicked;
                    }
                    syncSearchDates();
                    renderCalendar();
                    formatDisplay();
                });

            grid.appendChild(el);
        }

        const totalCells = startOffset + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const el = document.createElement("div");
            el.className = "dr-day other-month";
            el.textContent = i;
            grid.appendChild(el);
        }
    }

    function openDropdown() {
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        renderCalendar();
        dropdown.classList.add("active");
        item.classList.add("active");
    }

    function closeDropdown() {
        dropdown.classList.remove("active");
        item.classList.remove("active");
    }

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdown.classList.contains("active")) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });

    nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });

    clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startDate = null;
        endDate = null;
        syncSearchDates();
        renderCalendar();
        formatDisplay();
    });

    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDropdown();
    });

    document.addEventListener("click", (e) => {
        if (dropdown.classList.contains("active")) {
            if (!dropdown.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
                closeDropdown();
            }
        }
    });

    dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
    });
    formatDisplay();
}