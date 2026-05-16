import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { getActivities, getActivityById, participateActivity, unparticipateActivity, checkParticipation, searchActivities } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite, getFavourites } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatbot.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await loadHero();
    await loadExplore();
    await loadFooter();
    await initChatbot();
    initializePage();

    if (window.location.hash === "#explore") {
        const el = document.getElementById("explore");
        if (el) el.scrollIntoView();
    }
});


async function fetchContent(url) {
    const response = await fetch(url);
    const data = await response.text();
    return data;
}

async function loadHero() {
    const data = await fetchContent("./components/hero.html");
    document.getElementById("hero-container").innerHTML = data;
}

async function loadExplore() {
    const exploreHTML = await fetchContent("./components/explore.html");
    document.getElementById("explore-container").innerHTML = exploreHTML;
    initSearchDatePicker();
    await loadCards();
    initSearchButton();

    const floatingSearch = document.getElementById("floating-search");
    const cards = document.querySelectorAll(".card");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 750) {
            floatingSearch.classList.add("visible");
            cards.forEach(c => c.classList.add("revealed"));
        }
        else {
            floatingSearch.classList.remove("visible");
            cards.forEach(c => c.classList.remove("revealed"));
        }
    });
}

function initSearchButton() {
    const btn = document.querySelector(".search-btn");
    if (!btn) return;

    document.getElementById("refresh-btn")?.addEventListener("click", async () => {
        document.getElementById("search-1").value = "";
        document.getElementById("search-3").value = "";
        if (window.__searchDates) {
            window.__searchDates.startDate = null;
            window.__searchDates.endDate = null;
        }
        const placeholder = document.getElementById("drPlaceholder");
        const value = document.getElementById("drValue");
        if (placeholder) placeholder.classList.remove("hidden");
        if (value) value.classList.remove("visible");
        await loadCards();
        const cards = document.querySelectorAll(".card");
        if (window.scrollY > 750) {
            cards.forEach(c => c.classList.add("revealed"));
        }
    });

    btn.addEventListener("click", async () => {
        const location = document.getElementById("search-1")?.value.trim();
        const keyword = document.getElementById("search-3")?.value.trim();
        const dates = window.__searchDates || {};

        const cardsContainer = document.getElementById("cards-container");
        cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">Searching...</div>`;

        try {
            const data = await searchActivities({
                keyword,
                location,
                heldDateFrom: dates.startDate ? dates.startDate.toISOString().split("T")[0] : undefined,
                heldDateTo: dates.endDate ? dates.endDate.toISOString().split("T")[0] : undefined
            });
            const activities = data?.activities || [];

            if (activities.length === 0) {
                cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">No results found</div>`;
                return;
            }
            await renderCards(activities);
        } catch (e) {
            cardsContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:var(--text-muted)">Search error</div>`;
        }
    });
}

async function loadCards() {
    const cardsContainer = document.getElementById("cards-container");
    try {
        const templateHTML = await fetchContent("./components/cards.html");
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHTML, "text/html");
        const templateCard = doc.querySelector(".card");
        const activities = (await getActivities()).activities || [];

        if (activities.length === 0) {
            cardsContainer.innerHTML = `<div class="empty-state">No activities yet</div>`;
            return;
        }

        cardsContainer.innerHTML = "";
        activities.forEach(activity => {
            const card = templateCard.cloneNode(true);
            const image = card.querySelector(".card-image");
            image.src = activity.thumbnail;
            image.alt = activity.title;
            card.querySelector(".card-title").textContent = activity.title;
            card.querySelectorAll(".info span")[0].textContent = activity.location || "Unknown Location";
            card.querySelectorAll(".info span")[1].textContent = formatDate(activity.heldDate);
            card.querySelectorAll(".info span")[2].textContent = capitalize(activity.type || "Activity");
            card.dataset.id = activity.activityID;
            cardsContainer.appendChild(card);
        });
        syncCardFavourites();
    } catch (err) {
        console.error(err);
        cardsContainer.innerHTML = `<div class="empty-state">Failed to load activities</div>`;
    }
}

async function renderCards(activities) {
    const cardsContainer = document.getElementById("cards-container");
    const templateHTML = await fetchContent("./components/cards.html");
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateHTML, "text/html");
    const templateCard = doc.querySelector(".card");

    if (activities.length === 0) {
        cardsContainer.innerHTML = `<div class="empty-state">No results found</div>`;
        return;
    }

    cardsContainer.innerHTML = "";
    activities.forEach(activity => {
        const card = templateCard.cloneNode(true);
        card.classList.add("revealed");
        const image = card.querySelector(".card-image");
        image.src = activity.thumbnail;
        image.alt = activity.title;
        card.querySelector(".card-title").textContent = activity.title;
        card.querySelectorAll(".info span")[0].textContent = activity.location || "Unknown Location";
        card.querySelectorAll(".info span")[1].textContent = formatDate(activity.heldDate);
        card.querySelectorAll(".info span")[2].textContent = capitalize(activity.type || "Activity");
        card.dataset.id = activity.activityID;
        cardsContainer.appendChild(card);
    });

    syncCardFavourites();
    initCardClickHandlers();
}

async function loadNavbar() {
    const data = await fetchContent("./components/navbar.html");;
    document.getElementById("navbar-container").innerHTML = data;
    initNavbarActiveLinks();

    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 60) {
            navbar.classList.add("collapsed");
        } else {
            navbar.classList.remove("collapsed");
        }
    });

    initHamburger();

    // localStorage.clear();
    // localStorage.setItem("token", "123");
    // localStorage.setItem(
    //     "user", 
    //     JSON.stringify({
    //         userID: "uuid",
    //         fullname: "John Doe",
    //         username: "johndoe",
    //         email: "john@example.com",
    //         role: "user"
    //     })
    // );

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const authSection = document.getElementById("auth-section");
    if (isAuthenticated()) {
        const user = getUser();
        const userChipHTML = await fetchContent("./components/userchip.html");
        authSection.innerHTML = userChipHTML;
        document.getElementById("user-name").textContent = user.username;
        initUserDropdown();

        // authSection.innerHTML = `
        //     <a href="/profile.html"class="user-chip">
        //         <div class="user-avatar">
        //             ${user.username
        //                 .charAt(0)
        //                 .toUpperCase()}
        //         </div>

        //         <span class="user-name">
        //             ${user.username}
        //         </span>
        //     </a>
        // `;
        // authSection.innerHTML = `
        //     <a href="/profile.html"class="user-chip">
        //         <span class="user-name">
        //             ${user.username}
        //         </span>
        //     </a>
        // `;

    }
    else {
        authSection.innerHTML = `
            <a href="/login.html" class="login-btn">Login</a>
        `;
    }
}

/* =========================
   HAMBURGER TOGGLE
========================= */

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

/* =========================
   NAVBAR ACTIVE LINKS
========================= */

function initNavbarActiveLinks() {

    const navLinks =
        document.querySelectorAll(
            ".nav-links a"
        );

    function setActive(section) {
        navLinks.forEach(l => {
            l.classList.remove("active");
            if (l.dataset.section === section) {
                l.classList.add("active");
            }
        });
    }

    // Default: Home active
    setActive("home");

    // Click handler
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const section = link.dataset.section;
            if (section) setActive(section);

            if (section === "home") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (section === "explore") {
                e.preventDefault();
                const explore = document.getElementById("explore");
                if (explore) explore.scrollIntoView({ behavior: "smooth" });
            }
        });
    });
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

/* =========================
   USER DROPDOWN
========================= */

function initUserDropdown() {

    const userMenu =
        document.querySelector(
            ".user-menu"
        );

    const userChip =
        document.getElementById(
            "user-chip"
        );

    const logoutBtn =
        document.getElementById(
            "logout-btn"
        );

    if (
        !userMenu ||
        !userChip
    ) {
        return;
    }

    /*
        TOGGLE
    */

    userChip.addEventListener(
        "click",
        (e) => {

            e.stopPropagation();

            userMenu.classList.toggle(
                "active"
            );

        }
    );

    /*
        CLICK OUTSIDE
    */

    document.addEventListener(
        "click",
        () => {

            userMenu.classList.remove(
                "active"
            );

        }
    );

    /*
        PREVENT CLOSE
    */

    userMenu.addEventListener(
        "click",
        (e) => {

            e.stopPropagation();

        }
    );

    /*
        LOGOUT
    */

    logoutBtn?.addEventListener("click", () => {
        logout();
        window.location.href = "/login.html";
    });

    const favBtn = document.getElementById("favourites-btn");
    favBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.remove("active");
        showFavourites();
    });
}

async function loadFooter() {
    const footerHTML = await fetchContent("./components/footer.html");
    document.getElementById("footer-container").innerHTML = footerHTML;
}

function initializePage() {
    initStars();
    initCards();
    initDetailButtons();
    initCardReveal();
    initNavbarScrollActive();
}

function initStars() {
    document.querySelectorAll(".star").forEach(star => {
        star.addEventListener("click", async (e) => {
            e.stopPropagation();
            const card = star.closest(".card");
            const id = card?.dataset.id;
            if (!id || !isAuthenticated()) return;
            const active = star.classList.contains("active");
            try {
                if (active) {
                    await removeFavourite(id);
                    star.classList.remove("active");
                } else {
                    await addFavourite(id);
                    star.classList.add("active");
                }
            } catch {}
        });
    });
}

function initCards() {
    initCardClickHandlers();
}

const popupOverlay = document.getElementById("popup-overlay");
const popupContainer = document.getElementById("popup-container");
const popupOverlay2 = document.getElementById("popup-overlay-2");
const popupContainer2 = document.getElementById("popup-container-2");

async function openPopup(activityID) {
    if (!activityID) return;

    const { activity } = await getActivityById(activityID);

    popupContainer.innerHTML = buildPopupHTML(activity);

    if (isAuthenticated()) {
        try {
            const [{ participated }, { favourited }] = await Promise.all([
                checkParticipation(activityID),
                checkFavourite(activityID)
            ]);
            if (participated) setParticipated();
            if (favourited) setFavourited(activityID);
        } catch {}
    }

    initParticipateButton(activityID);

    popupContainer.querySelector("#back-btn")?.addEventListener("click", closePopup);

    popupOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

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
    const activity = activityData || (await getActivityById(activityID)).activity;
    if (!activity) return;
    popupContainer2.innerHTML = buildPopupHTML(activity, "Back");

    if (isAuthenticated()) {
        try {
            const [{ participated }, { favourited }] = await Promise.all([
                checkParticipation(activityID), checkFavourite(activityID)
            ]);
            if (participated) setParticipated();
            if (favourited) setFavourited(activityID);
        } catch {}
    }

    initParticipateButton(activityID);
    popupContainer2.querySelector("#back-btn")?.addEventListener("click", closePopup2);
    popupOverlay2.classList.add("active");

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
    } catch {}
}

function buildPopupHTML(a, backText) {
    const heldDate = formatDate(a.heldDate);
    const deadline = formatDate(a.applicationDeadline);
    const type = capitalize(a.type);
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;
    backText = backText || "Back";
    const filesHTML = (a.attachments || []).map(f =>
        `<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div>
                    <h4>${f.link.split('/').pop()}</h4>
                </div>
            </div>
            <a class="download-btn" href="${CDN_DOMAIN}/${f.link}" target="_blank">
                <i class="fa-solid fa-download"></i>
            </a>
        </div>`
    ).join("");

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

function initDetailButtons() {
    const buttons = document.querySelectorAll(".details-btn");
    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    });
}

function initCardReveal() {
    const cards =
        document.querySelectorAll(
            ".card"
        );

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(
                    (entry) => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "revealed"
                            );

                            /*
                                animate once only
                            */

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.5
            }
        );

    cards.forEach(
        (card, index) => {

            /*
                stagger animation
            */

            card.style.transitionDelay =
                `${index * 70}ms`;

            observer.observe(card);

        }
    );
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
        const cards = popupContainer.querySelectorAll(".activity-card");
        activities.forEach((a, i) => {
            cards[i]?.addEventListener("click", () => {
                openPopup2(a.activityID, a);
            });
        });
    } catch {}
}

function buildFavouritesHTML(activities) {
    if (activities.length === 0) {
        return `<div class="container" style="padding:40px;text-align:center;color:var(--text-muted)"><p>No favourites yet.</p></div>`;
    }

    const items = activities.map(a => {
        const held = formatDate(a.heldDate);
        const type = capitalize(a.type);
        return `
        <div class="activity-card" data-id="${a.activityID}" style="cursor:pointer;border:1px solid #e8ecf4;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;gap:16px;transition:background 0.2s">
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

    return `
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <h2 style="font-size:22px;font-weight:700;">Favourite Activities</h2>
        </div>
        <div style="margin-top:20px;">${items}</div>
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

/* =========================
   HELPERS
========================= */

function formatDate(dateString) {

    if (!dateString) {
        return "Unknown Date";
    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}

function capitalize(str) {

    return (
        str.charAt(0).toUpperCase() +
        str.slice(1)
    );

}