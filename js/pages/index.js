import { isAuthenticated, getUser } from "../lib/session.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await loadHero();
    await loadExplore();
    initializePage();
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
    const cardsHTML = await fetchContent("./components/cards.html");
    document.getElementById("cards-container").innerHTML = cardsHTML;

    const floatingSearch = document.getElementById("floating-search");
    const cards = document.querySelectorAll(".card");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 800) {
            floatingSearch.classList.add("visible");
            cards.forEach(c => c.classList.add("revealed"));
        }
        else {
            floatingSearch.classList.remove("visible");
            cards.forEach(c => c.classList.remove("revealed"));
        }
    });
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

    localStorage.clear();
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
    if(isAuthenticated()) {
        const user = getUser();

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
        authSection.innerHTML = `
            <a href="/profile.html"class="user-chip">
                <span class="user-name">
                    ${user.username}
                </span>
            </a>
        `;
    }
    else {
        authSection.innerHTML = `
            <a href="/login.html" class="login-btn">Login</a>
        `;
    }
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
    cards.forEach(card => {
        card.addEventListener("click", () => {
            window.location.href = "details.html"; 
        });
    });
}

function initDetailButtons() {
    const buttons = document.querySelectorAll(".details-btn");
    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            window.location.href = "details.html"; 
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