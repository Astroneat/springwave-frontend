import "../../src/style.css";
import { getCurrentUser, completeProfile } from "../api/auth.js";
import { isAuthenticated, getToken, createSession, setUser } from "../lib/session.js";
import { initI18n } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }
    await initI18n();
    await loadSchools();
    initCompleteProfileForm();
});

async function loadSchools() {
    try {
        const resp = await fetch("/schools.json");
        const data = await resp.json();
        const select = document.getElementById("school");
        if (!select) return;
        data.universities.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.name;
            opt.textContent = `${u.name} (${u.shortName})`;
            select.appendChild(opt);
        });
    } catch {}
}

function initCompleteProfileForm() {
    const form = document.getElementById("complete-profile-form");
    const statusMsg = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const check = canPerformAction('register');
        if (!check.allowed) {
            setStatus(`Please wait ${check.remaining} seconds.`, true);
            return;
        }
        markActionPerformed('register');

        const data = {
            username: document.getElementById("username").value.trim(),
            dob: document.getElementById("dob").value,
            school: document.getElementById("school").value,
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
