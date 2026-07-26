import "../../src/style.css";
import { getCurrentUser, completeProfile } from "../api/auth.js";
import { isAuthenticated, getToken, createSession, setUser, getUser } from "../lib/session.js";
import { initI18n } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }
    await initI18n();
    await loadSchools();
    applySchoolLock();
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

// If the school was set & locked from a verified email domain, pre-select it and
// disable the field so it can't be changed.
function applySchoolLock() {
    const user = getUser();
    const select = document.getElementById("school");
    if (!select || !user?.schoolLocked || !user.school) return;
    if (!Array.from(select.options).some(o => o.value === user.school)) {
        const opt = document.createElement("option");
        opt.value = user.school;
        opt.textContent = user.school;
        select.appendChild(opt);
    }
    select.value = user.school;
    select.disabled = true;
    select.classList.add("opacity-70", "cursor-not-allowed");
    const label = select.previousElementSibling;
    if (label && label.tagName === "LABEL" && !label.querySelector(".school-lock-note")) {
        label.insertAdjacentHTML("beforeend", ' <span class="school-lock-note text-xs text-green-600">(verified email)</span>');
    }
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
