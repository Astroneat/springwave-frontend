import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { fetchContent } from "../lib/utils.js";

export async function loadNavbar({ activeSection, onFavouritesClick } = {}) {
    const html = await fetchContent("./components/navbar.html");
    document.getElementById("navbar-container").innerHTML = html;

    setActiveLink(activeSection);
    initMobileMenu();

    const authSection = document.getElementById("auth-section");
    if (authSection) {
        if (isAuthenticated()) {
            const user = getUser();
            const userChipHTML = await fetchContent("./components/userchip.html");
            authSection.innerHTML = userChipHTML;
            document.getElementById("user-name").textContent = user.username;
            initUserDropdown(onFavouritesClick);
        } else {
            authSection.innerHTML = `<a href="/login.html" class="login-btn">Login</a>`;
        }
    }

    return document.getElementById("navbar");
}

export function initBasicScroll() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("collapsed", window.scrollY > 60);
    }, { passive: true });
}

export function setActiveLink(section) {
    if (!section) return;
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.dataset.section === section) {
            link.classList.add("active");
        }
    });
}

function initMobileMenu() {
    const hamburger = document.getElementById("hamburgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileOverlay = document.getElementById("mobileOverlay");
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener("click", () => {
        mobileMenu.classList.toggle("open");
    });
    mobileOverlay?.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
    });
    mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => mobileMenu.classList.remove("open"));
    });
}

function initUserDropdown(onFavouritesClick) {
    const userMenu = document.querySelector(".user-menu");
    const userChip = document.getElementById("user-chip");
    const logoutBtn = document.getElementById("logout-btn");
    if (!userMenu || !userChip) return;

    userChip.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.toggle("active");
    });
    document.addEventListener("click", () => userMenu.classList.remove("active"));
    userMenu.addEventListener("click", (e) => e.stopPropagation());

    logoutBtn?.addEventListener("click", () => {
        logout();
        window.location.href = "/login.html";
    });

    const favBtn = document.getElementById("favourites-btn");
    favBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.remove("active");
        if (onFavouritesClick) onFavouritesClick();
    });
}
