import "../../src/style.css";
import { completeProfile } from "../api/auth.js";
import { createSession, getToken, getUser, logout, isAuthenticated } from "../lib/session.js";
import { initI18n } from "../lib/i18n.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }
    await initI18n();
    initCompleteProfileForm();
});

function initCompleteProfileForm() {
    const form = document.getElementById("complete-profile-form");
    const statusMsg = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            username: document.getElementById("username").value.trim(),
            dob: document.getElementById("dob").value,
            school: document.getElementById("school").value.trim(),
            class: document.getElementById("class").value.trim(),
            major: document.getElementById("major").value.trim(),
            phoneNo: document.getElementById("phoneNo").value.trim(),
        };

        if (!data.username || !data.dob || !data.school || !data.class || !data.major || !data.phoneNo) {
            setStatus("Please fill in all fields.", true);
            return;
        }

        setStatus("Saving...", false);
        try {
            const result = await completeProfile(data);
            createSession(getToken(), result.user);
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
