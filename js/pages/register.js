import "../../src/style.css";
import { register } from "../api/auth.js";
import { isAuthenticated } from "../lib/session.js";
import { initI18n } from "../lib/i18n.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initI18n();
    initRegisterForm();
});

function initRegisterForm() {
    const form = document.getElementById("register-form");
    const statusMessage = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", handleSubmit);

    async function handleSubmit(event) {
        event.preventDefault();
        const firstName = document.getElementById("first-name").value.trim();
        const lastName = document.getElementById("last-name").value.trim();
        const data = {
            username: document.getElementById("username").value.trim(),
            email: document.getElementById("email").value.trim(),
            fullname: firstName + " " + lastName,
            password: document.getElementById("password").value.trim(),
        };
        const confirmPassword = document.getElementById("confirm-password").value.trim();
        const dob = document.getElementById("dob")?.value;
        const school = document.getElementById("school")?.value.trim();
        const className = document.getElementById("class")?.value.trim();
        const major = document.getElementById("major")?.value.trim();
        const phoneNo = document.getElementById("phoneNo")?.value.trim();
        if (dob) data.dob = dob;
        if (school) data.school = school;
        if (className) data.class = className;
        if (major) data.major = major;
        if (phoneNo) data.phoneNo = phoneNo;

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
