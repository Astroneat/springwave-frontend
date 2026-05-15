import { login } from "../api/auth.js";
import { createSession } from "../lib/session.js";

const form = document.getElementById("login-form");
const statusMsg = document.getElementById("status-msg");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    setStatus("Logging in", false);
    try {
        const data = await login(username, password);
        createSession(data.token, data.user);
        setStatus("Logged in successfully! Redirecting...", false);
        window.location.href = "/index.html";
    }
    catch(err) {
        if(err.status === 401) {
            // statusMsg.textContent = "Invalid credentials";
            setStatus("Invalid credentials", true);
            return;
        }
        setStatus(err.message, true);
    }
});

function setStatus(msg, isError) {
    statusMsg.textContent = msg;
    if(isError) {
        statusMsg.classList.remove("success-msg");
        statusMsg.classList.add("error-msg");
    }
    else {
        statusMsg.classList.remove("error-msg");
        statusMsg.classList.add("success-msg");
    }
}