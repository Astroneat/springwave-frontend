import "../../src/style.css";
import { completeProfile } from "../api/auth.js";
import { createSession, getToken, getUser, logout, isAuthenticated } from "../lib/session.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }
    initCompleteProfileForm();
});

function initCompleteProfileForm() {
    const form = document.getElementById("complete-profile-form");
    const statusMsg = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();

        setStatus("Saving...", false);
        try {
            const data = await completeProfile({ username });
            createSession(getToken(), data.user);
            setStatus("Profile completed! Redirecting...", false);
            window.location.href = "/index.html";
        } catch (err) {
            setStatus(err.message, true);
        }
    });

    function setStatus(msg, isError) {
        statusMsg.textContent = msg;
        if (isError) {
            statusMsg.classList.remove("success-msg");
            statusMsg.classList.add("error-msg");
        } else {
            statusMsg.classList.remove("error-msg");
            statusMsg.classList.add("success-msg");
        }
    }
}
