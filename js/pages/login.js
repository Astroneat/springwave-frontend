import { login } from "../api/auth.js";
import { createSession } from "../lib/session.js";

const form = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    errorMessage.textContent = "";
    try {
        const data = await login(username, password);
        createSession(data.token, data.user);

        window.location.href = "/index.html";
    }
    catch(err) {
        if(err.status === 401) {
            errorMessage.textContent = "Invalid credentials";
            return;
        }
        errorMessage.textContent = err.message;
    }
});