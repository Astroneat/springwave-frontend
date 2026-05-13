import { register } from "../api/auth.js";

const form = document.getElementById("registerForm");
const errorMessage = document.getElementById("errorMessage");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    errorMessage.textContent = "";
    try {
        await register(username, email, password);
        window.location.href = "/login.html";
    }
    catch (err) {
        errorMessage.textContent = err.message;
    }
});