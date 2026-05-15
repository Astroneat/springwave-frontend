import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { getActivities } from "../api/activities.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await loadHero();
    await loadExplore();
    await loadFooter();
    initializePage();

    // console.log(await getActivities());
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
    await loadCards();

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

async function loadCards() {
    const cardsContainer = document.getElementById("cards-container");
    try {
        const templateHTML = await fetchContent("./components/cards.html");
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHTML, "text/html");

        const templateCard = doc.querySelector(".card");
        const activities = (await getActivities()).activities || [];
        if (activities.length === 0) {
            cardsContainer.innerHTML =
                `
            <div class="empty-state">
                No activities yet
            </div>
            `
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
    } catch (err) {
        console.error(err);

        cardsContainer.innerHTML =
            `
            <div class="empty-state">
                Failed to load activities
            </div>
            `;
    }
}

async function loadNavbar() {
    const data = await fetchContent("./components/navbar.html");;
    document.getElementById("navbar-container").innerHTML = data;

    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 60) {
            navbar.classList.add("collapsed");
        } else {
            navbar.classList.remove("collapsed");
        }
    });

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

    logoutBtn?.addEventListener(
        "click",
        () => {

            // localStorage.removeItem(
            //     "user"
            // );

            // localStorage.removeItem(
            //     "token"
            // );

            logout();
            window.location.href =
                "/login.html";

        }
    );

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
}

function initStars() {
    const stars = document.querySelectorAll(".star");
    // console.log(stars);
    stars.forEach(star => {
        // console.log("hey");
        star.addEventListener("click", (e) => {
            e.stopPropagation();
            // console.log("click!");
            star.classList.toggle("active");
        });
    });
}

function initCards() {
    const cards = document.querySelectorAll(".card");
    const popupOverlay = document.getElementById("popup-overlay");
    const popupContainer = document.getElementById("popup-container");

    const buttons = document.querySelectorAll(".details-btn");
    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            openPopup();
        });
    });


    cards.forEach(card => {
        card.addEventListener("click", async () => {
            // window.location.href = "details.html"; 
            await openPopup();
        });
    });

    async function openPopup() {
        const popupHTML = await fetchContent("./components/description.html");
        popupContainer.innerHTML = popupHTML;

        initParticipateButton();

        const backBtn = document.getElementById("back-btn");
        backBtn.addEventListener("click", (e) => {
            closePopup();
        });

        popupOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }


    function closePopup() {
        const popupOverlay = document.getElementById("popup-overlay");
        const popupContainer = document.getElementById("popup-container");

        popupOverlay.classList.remove("active");

        document.body.style.overflow = "";
        setTimeout(() => {
            popupContainer.innerHTML = "";
        }, 300);
    }

    popupOverlay.addEventListener("click", (e) => {
        if (e.target === popupOverlay || e.target.classList.contains("popup-backdrop")) {
            closePopup();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closePopup();
        }
    });
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

function toggleFavourite(event) {

    event.stopPropagation();

    const button = event.currentTarget;

    button.classList.toggle("active");

}

//TRY TO CALL THE toggleParticipate() FUNCTION
function initParticipateButton() {

    const participateBtn =
        document.querySelector(".participate");

    if (!participateBtn) return;

    participateBtn.addEventListener(
        "click",
        toggleParticipate
    );
}

//CHANGE THE STATUS OF THE PARTICIPATE BUTTON 
function toggleParticipate(event) {

    event.stopPropagation();

    const button = event.currentTarget;

    button.classList.toggle("active");

    const header =
        button.querySelector(
            ".participate-header"
        );

    const text =
        button.querySelector(
            ".participate-text"
        );

    if (
        button.classList.contains(
            "active"
        )
    ) {

        header.textContent =
            "PARTICIPATED";

        text.textContent =
            "You have joined in this activity";

    }
    else {

        header.textContent =
            "PARTICIPATE";

        text.textContent =
            "Join this activity";
    }
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