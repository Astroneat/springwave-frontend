import { register } from "../api/auth.js";
import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { initChatbot } from "../components/chatBot.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    initChatbot();
    initRegisterForm();
});

async function fetchContent(url) {
    const resp = await fetch(url);
    return resp.text();
}

async function loadNavbar() {
    const html = await fetchContent("./components/navBar.html");
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
            const userChipHTML = await fetchContent("./components/userChip.html");
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

function initRegisterForm() {
    const form = document.getElementById("register-form");
    const statusMessage = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", handleSubmit);

    async function handleSubmit(event) {
        event.preventDefault();
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const firstName = document.getElementById("first-name").value.trim();
        const lastName = document.getElementById("last-name").value.trim();
        const fullname = firstName + " " + lastName;
        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("confirm-password").value.trim();
        const dob = document.getElementById("dob").value.trim();
        const school = document.getElementById("school").value.trim();
        const className = document.getElementById("class").value.trim();
        const major = document.getElementById("major").value.trim();
        const phoneNo = document.getElementById("tel").value.trim();

        if(password !== confirmPassword) {
            setStatus("Passwords do not match.", true);
            return;
        }

        setStatus("Registering...", false);
        try {
            await register(username, password, fullname, email, phoneNo, dob, school, className, major);
            setStatus("Registered successfully! Redirecting to login...", false);
            window.location.href = "/login.html";
        } catch (err) {
            setStatus(err.message, true);
        }
    }

    function setStatus(msg, isError) {
        statusMessage.textContent = msg;
        if(isError) {
            statusMessage.classList.remove("success-msg");
            statusMessage.classList.add("error-msg");
        } else {
            statusMessage.classList.remove("error-msg");
            statusMessage.classList.add("success-msg");
        }
    }
}
