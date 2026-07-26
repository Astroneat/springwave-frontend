import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { uploadFormData } from "../api/client.js";
import { getMyVerificationStatus } from "../api/studentVerification.js";
import { TURNSTILE_SITE_KEY } from "../config.js";

let turnstileWidgetId = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }

    await loadNavbar();
    await fetchContent("./components/footer.html").then(html => {
        const c = document.getElementById("footer-container");
        if (c) c.innerHTML = html;
    });
    await initChatbot();
    initTurnstile();
    await checkExistingStatus();

    const form = document.querySelector('form');
    if (!form) return;

    function bindCardInput(inputId, { icon, label, hint, preview, defaultLabel }) {
        const input = document.getElementById(inputId);
        const iconEl = document.getElementById(icon);
        const labelEl = document.getElementById(label);
        const hintEl = document.getElementById(hint);
        const previewEl = document.getElementById(preview);
        if (!input || !previewEl) return;
        input.addEventListener("change", () => {
            if (input.files.length > 0) {
                const file = input.files[0];
                labelEl.textContent = file.name;
                iconEl.textContent = "description";
                hintEl.textContent = (file.size / 1024 / 1024).toFixed(1) + " MB";
                previewEl.classList.remove("hidden");
                if (file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewEl.innerHTML = `<img src="${e.target.result}" class="max-h-40 rounded-lg border border-outline-variant shadow-sm"/>`;
                    };
                    reader.readAsDataURL(file);
                }
            } else {
                labelEl.textContent = defaultLabel;
                iconEl.textContent = "cloud_upload";
                hintEl.textContent = "JPEG, PNG or GIF up to 50MB";
                previewEl.classList.add("hidden");
            }
        });
    }

    const frontInput = document.getElementById("studentCardFront");
    const backInput = document.getElementById("studentCardBack");
    bindCardInput("studentCardFront", { icon: "frontIcon", label: "frontLabel", hint: "frontHint", preview: "frontPreview", defaultLabel: "Click to upload front" });
    bindCardInput("studentCardBack", { icon: "backIcon", label: "backLabel", hint: "backHint", preview: "backPreview", defaultLabel: "Click to upload back" });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const studentId = document.getElementById("studentId").value.trim();
        if (!studentId) {
            alert("Vui lòng nhập mã số sinh viên");
            return;
        }
        if (!frontInput?.files?.length || !backInput?.files?.length) {
            alert("Vui lòng chọn ảnh cả hai mặt (trước và sau) của thẻ sinh viên");
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> <span>Processing...</span>';
        btn.classList.add('opacity-80', 'pointer-events-none');

        const formData = new FormData(form);
        if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
            formData.append("cfTurnstileResponse", turnstile.getResponse(turnstileWidgetId));
        }

        try {
            await uploadFormData("/student-verification/register", formData);

            btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> <span>Submission Received!</span>';
            btn.classList.remove('bg-gradient-to-r', 'from-primary-container', 'to-secondary');
            btn.classList.add('bg-green-600');

            setTimeout(() => {
                alert("Yêu cầu xác thực đã được gửi! Admin sẽ xem xét và phản hồi sớm.");
                window.location.href = "/";
            }, 1500);
        } catch (error) {
            if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
            const msg = error?.message || "An unexpected error occurred. Please try again.";
            let userMsg = msg;
            if (msg.includes("already verified")) {
                userMsg = "Bạn đã được xác thực sinh viên rồi.";
            } else if (msg.includes("pending")) {
                userMsg = "Bạn đã có yêu cầu xác thực đang chờ xử lý.";
            } else if (msg.includes("taken")) {
                userMsg = "Mã số sinh viên này đã được xác thực bởi người khác.";
            } else if (msg.includes("upload")) {
                userMsg = "Tải file thất bại. Vui lòng thử lại với file nhỏ hơn.";
            }
            alert("Lỗi: " + userMsg);
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-80', 'pointer-events-none');
        }
    });

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

    async function checkExistingStatus() {
        try {
            const data = await getMyVerificationStatus();
            const banner = document.getElementById("status-banner");
            if (!banner) return;

            if (data.status === 'approved') {
                banner.classList.remove("hidden");
                banner.innerHTML = `
                    <div class="rounded-xl bg-green-50 border border-green-200 p-6 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-green-600 text-2xl">verified</span>
                        </div>
                        <div>
                            <h3 class="font-headline-md text-headline-md text-green-800">Đã xác thực</h3>
                            <p class="text-sm text-green-700">Tài khoản của bạn đã được xác thực sinh viên (MSSV: ${data.verifiedStudentId || ''}).</p>
                        </div>
                    </div>
                `;
                document.querySelector('form')?.classList.add('hidden');
            } else if (data.status === 'pending') {
                banner.classList.remove("hidden");
                banner.innerHTML = `
                    <div class="rounded-xl bg-yellow-50 border border-yellow-200 p-6 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-yellow-600 text-2xl">hourglass_top</span>
                        </div>
                        <div>
                            <h3 class="font-headline-md text-headline-md text-yellow-800">Đang chờ duyệt</h3>
                            <p class="text-sm text-yellow-700">Yêu cầu xác thực của bạn đang được admin xem xét. Vui lòng chờ phản hồi.</p>
                        </div>
                    </div>
                `;
                document.querySelector('form')?.classList.add('hidden');
            } else if (data.status === 'rejected') {
                banner.classList.remove("hidden");
                banner.innerHTML = `
                    <div class="rounded-xl bg-red-50 border border-red-200 p-6 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-red-600 text-2xl">gpp_bad</span>
                        </div>
                        <div>
                            <h3 class="font-headline-md text-headline-md text-red-800">Không được duyệt</h3>
                            <p class="text-sm text-red-700">${data.reviewNote ? 'Lý do: ' + data.reviewNote : 'Yêu cầu của bạn không được duyệt. Vui lòng gửi lại với thông tin chính xác.'}</p>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            console.warn("Check status error:", err);
        }
    }
});
