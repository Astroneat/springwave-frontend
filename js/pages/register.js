import "../../src/style.css";
import { register } from "../api/auth.js";
import { isAuthenticated } from "../lib/session.js";
import { initI18n } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { sanitizeHtml } from "../lib/sanitize.js";
import { getDeviceFingerprint } from "../lib/device.js";
import { TURNSTILE_SITE_KEY } from "../config.js";

let turnstileWidgetId = null;

document.addEventListener("DOMContentLoaded", async () => {
    await initI18n();
    await loadSchools();
    initTurnstile();
    initRegisterForm();
});

function initTurnstile() {
    const container = document.getElementById("turnstile-container");
    if (!container || typeof turnstile === "undefined") return;

    turnstileWidgetId = turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        callback: () => {},
    });
}

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

        if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
            data.cfTurnstileResponse = turnstile.getResponse(turnstileWidgetId);
        }

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
            const result = await register(data);

            if (result.emailSent) {
                showVerificationMessage(data.email);
            } else {
                setStatus("Registered successfully! Redirecting to login...", false);
                setTimeout(() => { window.location.href = "/login.html"; }, 1000);
            }
        } catch (err) {
            setStatus(err.message, true);
            if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
        }
    }

    function showVerificationMessage(email) {
        const form = document.getElementById("register-form");
        form.innerHTML = `
            <div class="text-center py-8">
                <span class="material-symbols-outlined text-6xl text-green-500 mb-4">mark_email_unread</span>
                <h2 class="text-2xl font-bold text-[#23499b] mb-3">Check Your Email</h2>
                <p class="text-gray-600 mb-2">We sent a verification link to:</p>
                <p class="text-lg font-semibold text-gray-800 mb-6">${email}</p>
                <p class="text-sm text-gray-500 mb-6">Click the link in the email to verify your account, then log in.</p>
                <a href="login.html"
                    class="inline-block w-full p-4 bg-[#23499b] text-white rounded-2xl text-lg font-bold cursor-pointer transition duration-200 hover:-translate-y-0.5">
                    Go to Login
                </a>
            </div>
        `;
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
