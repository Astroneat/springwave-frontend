import "../../src/style.css";
import { login, googleLogin, forgotPassword, resetPassword } from "../api/auth.js";
import { createSession, setSigningKey, isAuthenticated } from "../lib/session.js";
import { ensureSession } from "../api/client.js";
import { GOOGLE_CLIENT_ID, API_BASE_URL, TURNSTILE_SITE_KEY } from "../config.js";
import { initI18n, t } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed, withSubmitLock } from "../lib/throttle.js";
import { isSchoolEmail } from "../lib/utils.js";

let turnstileWidgetId = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (isAuthenticated()) {
        await ensureSession();
    }
    await initI18n();
    initLoginForm();
    initGoogleLogin();
    initTurnstile();
    initPasswordToggles();
    initPasswordResetModals();
});

function initPasswordToggles() {
    document.querySelectorAll(".auth-toggle-btn[data-toggle-target]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.toggleTarget);
            if (!input) return;
            const isHidden = input.type === "password";
            input.type = isHidden ? "text" : "password";
            btn.setAttribute("aria-pressed", String(isHidden));
            btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
            btn.textContent = isHidden ? t("auth.hide") : t("auth.show");
        });
    });
}

function initTurnstile() {
    const container = document.getElementById("turnstile-container");
    if (!container) return;
    if (typeof turnstile === "undefined") {
        setTimeout(initTurnstile, 300);
        return;
    }
    if (turnstileWidgetId !== null) {
        turnstile.remove(turnstileWidgetId);
    }
    turnstileWidgetId = turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
    });
}

async function fetchSigningKey(token) {
    try {
        const resp = await fetch(`${API_BASE_URL}/auth/session/init`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.signingKey) setSigningKey(data.signingKey);
        }
    } catch (err) {
        console.error("Failed to fetch signing key:", err);
    }
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
        
        let cfTurnstileResponse = undefined;
        if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
            cfTurnstileResponse = turnstile.getResponse(turnstileWidgetId);
        }

        if (!cfTurnstileResponse) {
            setStatus("Please complete the captcha.", true);
            if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
            return;
        }

        try {
            const data = await login(username, password, cfTurnstileResponse);
            if (!data) return;
            createSession(data.token, data.user);
            if (data.signingKey) {
                setSigningKey(data.signingKey);
            } else {
                await fetchSigningKey(data.token);
            }

            // Check verification status
            if (data.user && !data.user.emailVerified) {
                showVerificationWarning(data.user.email);
            } else if (data.user && !data.user.isStudentVerified) {
                // User is logged in but not student verified
                setStatus("Logged in successfully!", false);
                setTimeout(async () => {
                    // Check if user has a school email that should be auto-verified
                    if (data.user.email && await isSchoolEmail(data.user.email)) {
                        const noticeKey = `springwave_notice_seen_auto_school_verification_${data.user._id}`;
                        if (!localStorage.getItem(noticeKey)) {
                            sessionStorage.setItem("show_auto_verified_notice", "true");
                        }
                    }

                    // Redirect to home, user will see verification button in navbar
                    window.location.href = "/index.html";
                }, 800);
            } else {
                setStatus("Logged in successfully! Redirecting...", false);
                setTimeout(() => { window.location.href = "/index.html"; }, 800);
            }
        } catch(err) {
            if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
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
            <div class="auth-status-panel">
                <div class="auth-status-icon pending">
                    <span class="material-symbols-outlined">mark_email_unread</span>
                </div>
                <h2 class="text-xl font-bold mb-2" style="color: var(--brand);">Email Not Verified</h2>
                <p class="text-sm mb-6" style="color: var(--color-text-secondary);">Please check your email (${email}) and click the verification link.</p>
                <button id="resend-btn" type="button" class="auth-submit-btn mb-3">
                    Resend Verification Email
                </button>
                <a href="index.html" class="text-sm font-bold text-center block" style="color: var(--brand);">
                    Go to Home
                </a>
                <p id="resend-status" class="text-sm mt-3" style="color: var(--color-text-secondary);"></p>
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
            if (data.signingKey) {
                setSigningKey(data.signingKey);
            } else {
                await fetchSigningKey(data.token);
            }

            // Check verification status
            if (data.needsProfile) {
                window.location.href = "/complete-profile.html";
            } else if (data.user && !data.user.isStudentVerified) {
                // Check if this is a school email that should be auto-verified
                try {
                    const { checkSchoolEmail } = await import("../api/universities.js");
                    const schoolResult = await checkSchoolEmail(data.user.email);
                    if (schoolResult.isSchool) {
                        // Mark session storage flag for one-time home page notice if not seen before
                        const noticeKey = `springwave_notice_seen_auto_school_verification_${data.user._id}`;
                        if (!localStorage.getItem(noticeKey)) {
                            sessionStorage.setItem("show_auto_verified_notice", "true");
                        }
                    }
                } catch (e) {}
                window.location.href = "/index.html";
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

function initPasswordResetModals() {
    const openForgotBtn = document.getElementById("open-forgot-modal");
    const closeForgotBtn = document.getElementById("close-forgot-modal");
    const forgotModal = document.getElementById("forgot-password-modal");
    const forgotForm = document.getElementById("forgot-password-form");
    const forgotStatus = document.getElementById("forgot-status-msg");
    const forgotSubmitBtn = document.getElementById("forgot-submit-btn");

    const closeResetBtn = document.getElementById("close-reset-modal");
    const resetModal = document.getElementById("reset-password-modal");
    const resetForm = document.getElementById("reset-password-form");
    const resetStatus = document.getElementById("reset-status-msg");
    const resetSubmitBtn = document.getElementById("reset-submit-btn");

    if (openForgotBtn && forgotModal) {
        openForgotBtn.addEventListener("click", () => {
            forgotModal.classList.remove("hidden");
            if (forgotStatus) forgotStatus.classList.add("hidden");
        });
    }

    if (closeForgotBtn && forgotModal) {
        closeForgotBtn.addEventListener("click", () => {
            forgotModal.classList.add("hidden");
        });
    }

    if (closeResetBtn && resetModal) {
        closeResetBtn.addEventListener("click", () => {
            resetModal.classList.add("hidden");
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("forgot-email")?.value.trim();
            if (!email) return;

            if (forgotSubmitBtn) forgotSubmitBtn.disabled = true;
            if (forgotStatus) {
                forgotStatus.textContent = "Đang gửi yêu cầu...";
                forgotStatus.className = "text-xs rounded-xl p-3 bg-blue-50 text-blue-700 block";
            }

            try {
                const res = await forgotPassword(email);
                if (forgotStatus) {
                    forgotStatus.textContent = res.message || "Đã gửi liên kết đặt lại mật khẩu đến email của bạn.";
                    forgotStatus.className = "text-xs rounded-xl p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 block";
                }
            } catch (err) {
                if (forgotStatus) {
                    forgotStatus.textContent = err.message || "Gửi yêu cầu thất bại. Vui lòng thử lại.";
                    forgotStatus.className = "text-xs rounded-xl p-3 bg-rose-50 text-rose-700 border border-rose-200 block";
                }
            } finally {
                if (forgotSubmitBtn) forgotSubmitBtn.disabled = false;
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");
    const token = urlParams.get("token");

    if (action === "reset-password" && token && resetModal) {
        resetModal.classList.remove("hidden");
        if (resetForm) {
            resetForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const newPass = document.getElementById("reset-new-password")?.value;
                const confirmPass = document.getElementById("reset-confirm-password")?.value;

                if (!newPass || !confirmPass) return;
                if (newPass !== confirmPass) {
                    if (resetStatus) {
                        resetStatus.textContent = "Mật khẩu xác nhận không trùng khớp.";
                        resetStatus.className = "text-xs rounded-xl p-3 bg-rose-50 text-rose-700 border border-rose-200 block";
                    }
                    return;
                }

                if (resetSubmitBtn) resetSubmitBtn.disabled = true;
                if (resetStatus) {
                    resetStatus.textContent = "Đang cập nhật mật khẩu mới...";
                    resetStatus.className = "text-xs rounded-xl p-3 bg-blue-50 text-blue-700 block";
                }

                try {
                    const res = await resetPassword(token, newPass, confirmPass);
                    if (resetStatus) {
                        resetStatus.textContent = res.message || "Đã cập nhật mật khẩu thành công!";
                        resetStatus.className = "text-xs rounded-xl p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 block";
                    }
                    setTimeout(() => {
                        window.location.href = "/login.html";
                    }, 1500);
                } catch (err) {
                    if (resetStatus) {
                        resetStatus.textContent = err.message || "Đặt lại mật khẩu thất bại. Mã có thể đã hết hạn.";
                        resetStatus.className = "text-xs rounded-xl p-3 bg-rose-50 text-rose-700 border border-rose-200 block";
                    }
                } finally {
                    if (resetSubmitBtn) resetSubmitBtn.disabled = false;
                }
            });
        }
    }
}
