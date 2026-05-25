import { register } from "../api/auth.js";
import { isAuthenticated } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";

document.addEventListener("DOMContentLoaded", async () => {
    initChatbot();
    initRegisterForm();
});

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
