import "../../src/style.css";
import { login, googleLogin } from "../api/auth.js";
import { createSession, setSigningKey, isAuthenticated } from "../lib/session.js";
import { ensureSession } from "../api/client.js";
import { GOOGLE_CLIENT_ID, API_BASE_URL } from "../config.js";
import { initI18n } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed, withSubmitLock } from "../lib/throttle.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (isAuthenticated()) {
        await ensureSession();
    }
    await initI18n();
    initLoginForm();
    initGoogleLogin();
});

async function fetchSigningKey(token) {
    try {
        const resp = await fetch(`${API_BASE_URL}/auth/session/init`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
            const data = await resp.json();
            setSigningKey(data.signingKey);
        }
    } catch {}
}

function initLoginForm() {
    const form = document.getElementById("login-form");
    const statusMsg = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = canPerformAction('login');
        if (!check.allowed) {
            setStatus(`Please wait ${check.remaining} seconds before trying again.`, true);
            return;
        }
        markActionPerformed('login');
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        setStatus("Logging in", false);
        try {
            const data = await login(username, password);
            if (!data) return;
            createSession(data.token, data.user);
            await fetchSigningKey(data.token);
            if (data.user && !data.user.emailVerified) {
                showVerificationWarning(data.user.email);
            } else {
                setStatus("Logged in successfully! Redirecting...", false);
                setTimeout(() => { window.location.href = "/index.html"; }, 800);
            }
        } catch(err) {
            if(err.status === 401) {
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
        } else {
            statusMsg.classList.remove("error-msg");
            statusMsg.classList.add("success-msg");
        }
    }

    async function showVerificationWarning(email) {
        const form = document.getElementById("login-form");
        form.innerHTML = `
            <div class="text-center py-6">
                <span class="material-symbols-outlined text-6xl text-amber-500 mb-4">mark_email_unread</span>
                <h2 class="text-xl font-bold text-[#23499b] mb-2">Email Not Verified</h2>
                <p class="text-gray-600 mb-4">Please check your email (${email}) and click the verification link.</p>
                <button id="resend-btn"
                    class="w-full p-3 bg-[#ffde42] border-2 border-[#23499b] rounded-2xl text-lg font-bold cursor-pointer transition duration-200 hover:-translate-y-0.5 mb-3">
                    Resend Verification Email
                </button>
                <a href="index.html"
                    class="inline-block w-full p-3 bg-gray-200 rounded-2xl text-lg font-semibold text-gray-700 transition duration-200 hover:-translate-y-0.5">
                    Go to Home
                </a>
                <p id="resend-status" class="text-sm mt-3 text-gray-500"></p>
            </div>
        `;
        const baseUrl = API_BASE_URL;
        document.getElementById("resend-btn")?.addEventListener("click", async () => {
            const status = document.getElementById("resend-status");
            const btn = document.getElementById("resend-btn");
            btn.disabled = true;
            btn.textContent = "Sending...";
            status.textContent = "";
            try {
                const resp = await fetch(baseUrl + "/auth/resend-verification", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                const data = await resp.json();
                if (resp.ok) {
                    status.textContent = data.message || "Verification email sent!";
                    status.className = "text-sm mt-3 " + (data.emailSent === false ? "text-yellow-600" : "text-green-600");
                } else {
                    status.textContent = data.error || "Failed to resend.";
                    status.className = "text-sm mt-3 text-red-500";
                }
            } catch {
                status.textContent = "Network error. Try again.";
                status.className = "text-sm mt-3 text-red-500";
            }
            btn.disabled = false;
            btn.textContent = "Resend Verification Email";
        });
    }
}

function initGoogleLogin() {
    window.handleGoogleCredential = async (response) => {
        const statusMsg = document.getElementById("status-msg");
        try {
            statusMsg.textContent = "Signing in with Google...";
            statusMsg.classList.remove("error-msg");
            statusMsg.classList.add("success-msg");

            console.log("Google credential received, calling API...");
            const data = await googleLogin(response.credential);
            console.log("Google login API response:", data);

            createSession(data.token, data.user);
            await fetchSigningKey(data.token);

            if (data.needsProfile) {
                window.location.href = "/complete-profile.html";
            } else {
                window.location.href = "/index.html";
            }
        } catch (err) {
            console.error("Google login failed:", err);
            statusMsg.textContent = err.message || "Google sign-in failed";
            statusMsg.classList.remove("success-msg");
            statusMsg.classList.add("error-msg");
        }
    };

    const container = document.getElementById("google-signin-container");
    if (!container) return;

    const tryInit = () => {
        if (window.google?.accounts?.id) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: window.handleGoogleCredential,
                cancel_on_tap_outside: false,
            });
            google.accounts.id.renderButton(container, {
                type: "standard",
                shape: "pill",
                theme: "outline",
                text: "sign_in_with",
                size: "large",
                logo_alignment: "left",
            });
        } else {
            setTimeout(tryInit, 200);
        }
    };
    tryInit();
}
