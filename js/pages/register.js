import "../../src/style.css";
import { register } from "../api/auth.js";
import { isAuthenticated } from "../lib/session.js";
import { initI18n } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { sanitizeHtml } from "../lib/sanitize.js";
import { getDeviceFingerprint } from "../lib/device.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initI18n();
    await loadSchools();
    initRegisterForm();
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

function initRegisterForm() {
    const form = document.getElementById("register-form");
    const statusMessage = document.getElementById("status-msg");
    if (!form) return;

    const formTimestamp = Date.now();

    form.addEventListener("submit", handleSubmit);

    async function handleSubmit(event) {
        event.preventDefault();

        const check = canPerformAction('register');
        if (!check.allowed) {
            setStatus(`Please wait ${check.remaining} seconds before trying again.`, true);
            return;
        }
        markActionPerformed('register');

        const firstName = sanitizeHtml(document.getElementById("first-name").value.trim());
        const lastName = sanitizeHtml(document.getElementById("last-name").value.trim());
        const data = {
            username: sanitizeHtml(document.getElementById("username").value.trim()),
            email: document.getElementById("email").value.trim(),
            fullname: firstName + " " + lastName,
            password: document.getElementById("password").value.trim(),
        };
        const confirmPassword = document.getElementById("confirm-password").value.trim();
        const dob = document.getElementById("dob")?.value;
        const school = document.getElementById("school")?.value;
        const className = document.getElementById("class")?.value.trim();
        const major = document.getElementById("major")?.value.trim();
        const phoneNo = document.getElementById("phoneNo")?.value.trim();
        if (dob) data.dob = dob;
        if (school) data.school = school;
        if (className) data.class = className;
        if (major) data.major = major;
        if (phoneNo) data.phoneNo = phoneNo;

        data._ts = formTimestamp;
        data.deviceFingerprint = getDeviceFingerprint().deviceId;

        if(data.password.length < 6) {
            setStatus("Password must be at least 6 characters.", true);
            return;
        }
        if(data.password !== confirmPassword) {
            setStatus("Passwords do not match.", true);
            return;
        }

        setStatus("Registering...", false);
        try {
            await register(data);
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
