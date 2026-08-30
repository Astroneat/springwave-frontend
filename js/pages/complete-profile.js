import "../../src/style.css";
import { getCurrentUser, completeProfile } from "../api/auth.js";
import { isAuthenticated, getToken, createSession, setUser, getUser } from "../lib/session.js";
import { initI18n, getLang, setLang, t, applyTranslation } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { populateUniversitySelect } from "../api/universities.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }
    await initI18n();
    initLanguageSwitcher();
    await loadSchools();
    applySchoolLock();
    initCompleteProfileForm();
});

function initLanguageSwitcher() {
    const btn = document.getElementById("authLangToggleBtn");
    const text = document.getElementById("authLangText");
    if (text) text.textContent = getLang().toUpperCase();

    btn?.addEventListener("click", async () => {
        const nextLang = getLang() === "en" ? "vi" : "en";
        await setLang(nextLang);
        if (text) text.textContent = nextLang.toUpperCase();
    });

    window.addEventListener("language-changed", (e) => {
        const lang = (e.detail?.lang || getLang()).toUpperCase();
        if (text) text.textContent = lang;
        applyTranslation(document);
    });
}

async function loadSchools() {
    try {
        await populateUniversitySelect("school");
    } catch (e) {
        console.error("Failed to populate university select:", e);
    }
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
        label.insertAdjacentHTML("beforeend", ` <span class="school-lock-note text-xs text-green-600">${t("complete_profile.verified_email_badge", "(verified email)")}</span>`);
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
            setStatus(t("complete_profile.please_wait_throttle", { remaining: check.remaining }, `Please wait ${check.remaining} seconds.`), true);
            return;
        }
        markActionPerformed('register');

        const data = {
            username: document.getElementById("username").value.trim(),
            studentId: document.getElementById("studentId")?.value.trim() || '',
            dob: document.getElementById("dob").value,
            school: document.getElementById("school").value,
            class: document.getElementById("class").value.trim(),
            major: document.getElementById("major").value.trim(),
            phoneNo: document.getElementById("phoneNo").value.trim(),
        };

        if (!data.username || !data.dob || !data.school || !data.class || !data.major || !data.phoneNo) {
            setStatus(t("complete_profile.fill_required_fields", "Please fill in all required fields."), true);
            return;
        }

        setStatus(t("complete_profile.saving", "Saving..."), false);
        try {
            const result = await completeProfile(data);
            createSession(getToken(), result.user);
            setStatus(t("complete_profile.profile_completed", "Profile completed! Redirecting..."), false);
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
