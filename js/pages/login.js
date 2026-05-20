import { login } from "../api/auth.js";
import { createSession, isAuthenticated, getUser, logout } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    initChatbot();
    initLoginForm();
});

async function fetchContent(url) {
    const resp = await fetch(url);
    return resp.text();
}

async function loadNavbar() {
    const html = await fetchContent("./components/navbar.html");
    document.getElementById("navbar-container").innerHTML = html;

    const hamburger = document.getElementById("hamburgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileOverlay = document.getElementById("mobileOverlay");

    if (hamburger && mobileMenu) {
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

    const authSection = document.getElementById("auth-section");
    if (authSection) {
        if (isAuthenticated()) {
            const user = getUser();
            const userChipHTML = await fetchContent("./components/userchip.html");
            authSection.innerHTML = userChipHTML;
            document.getElementById("user-name").textContent = user.username;
            initUserDropdown();
        } else {
            authSection.innerHTML = `<a href="/login.html" class="login-btn">Login</a>`;
        }
    }
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
    });
}

function initLoginForm() {
    const form = document.getElementById("login-form");
    const statusMsg = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        setStatus("Logging in", false);
        try {
            const data = await login(username, password);
            createSession(data.token, data.user);
            setStatus("Logged in successfully! Redirecting...", false);
            window.location.href = "/index.html";
        } catch(err) {
            if(err.status === 401) {
                setStatus("Invalid credentials", true);
                return;
            }
            setStatus(err.message, true);
        }
    });

    function setStatus(msg, isError) {
        statusMsg.textContent = msg;
        if(isError) {
            statusMsg.classList.remove("success-msg");
            statusMsg.classList.add("error-msg");
        } else {
            statusMsg.classList.remove("error-msg");
            statusMsg.classList.add("success-msg");
        }
    }
}