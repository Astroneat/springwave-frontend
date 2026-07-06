import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { uploadFormData } from "../api/client.js";
import { getMyHostStatus } from "../api/host.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }

    const user = getUser();
    const params = new URLSearchParams(window.location.search);
    const createMode = params.get("createMode") === "true";
    const isHost = user && user.role === "host";

    try {
        if (!createMode && !isHost) {
            const statusData = await getMyHostStatus();
            if (statusData.status === 'approved') {
                const url = statusData.orgId ? `/org-dashboard.html?orgId=${statusData.orgId}` : "/org-dashboard.html";
                window.location.href = url;
                return;
            }
            if (statusData.status === 'pending') {
                alert("Your host registration is pending review. Please wait for approval.");
                window.location.href = "/";
                return;
            }
        }
    } catch {}

    await loadNavbar();
    await fetchContent("./components/footer.html").then(html => {
        const footerContainer = document.getElementById("footer-container");
        if (footerContainer) footerContainer.innerHTML = html;
    });
    await initChatbot();

    const orgNameParam = params.get("orgName");
    if (orgNameParam) {
        const orgInput = document.getElementById("orgName");
        if (orgInput) orgInput.value = orgNameParam;
    }

    const form = document.querySelector('form');
    if (!form) return;

    const phoneInput = document.getElementById("phoneNo");
    const nameInput = document.getElementById("representativeName");

    if (phoneInput && user.phoneNo) {
        phoneInput.value = user.phoneNo;
        phoneInput.readOnly = true;
        phoneInput.classList.add("opacity-70", "cursor-not-allowed");
    }
    if (nameInput && user.fullname) {
        nameInput.value = user.fullname;
        nameInput.readOnly = true;
        nameInput.classList.add("opacity-70", "cursor-not-allowed");
    }

    const collectedLinks = [];

    function renderLinkTags() {
        const container = document.getElementById("linksList");
        if (!container) return;
        container.innerHTML = collectedLinks.map((link, i) =>
            `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-sm">
                <span class="material-symbols-outlined text-[14px]">link</span>
                ${link.url}
                <button type="button" class="text-error hover:text-error/80 ml-1" data-index="${i}">&times;</button>
            </span>`
        ).join("");
        container.querySelectorAll("button[data-index]").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index);
                collectedLinks.splice(idx, 1);
                renderLinkTags();
            });
        });
    }

    const addLinkBtn = document.getElementById("addLinkBtn");
    const linksContainer = document.getElementById("linksContainer");

    if (addLinkBtn && linksContainer) {
        addLinkBtn.addEventListener("click", () => {
            const rowId = "linkRow_" + Date.now();
            const row = document.createElement("div");
            row.id = rowId;
            row.className = "flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant";
            row.innerHTML = `
                <select class="flex-shrink-0 h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm">
                    <option value="link">Social Link</option>
                    <option value="article">Article</option>
                    <option value="image">Image URL</option>
                </select>
                <input type="url" placeholder="https://..." class="flex-grow h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm"/>
                <input type="text" placeholder="Description (optional)" class="w-40 h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm"/>
                <button type="button" class="flex-shrink-0 w-10 h-10 rounded-lg bg-error/10 text-error hover:bg-error/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            `;
            row.querySelector("button").addEventListener("click", () => {
                row.remove();
            });
            const confirmBtn = document.createElement("button");
            confirmBtn.type = "button";
            confirmBtn.className = "px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90";
            confirmBtn.textContent = "Add";
            confirmBtn.addEventListener("click", () => {
                const type = row.querySelector("select").value;
                const url = row.querySelector("input[type='url']").value.trim();
                const desc = row.querySelector("input[type='text']").value.trim();
                if (!url) {
                    alert("Please enter a URL");
                    return;
                }
                collectedLinks.push({ type, url, description: desc });
                renderLinkTags();
                row.remove();
                if (linksContainer.children.length === 0) {
                    linksContainer.classList.add("hidden");
                }
            });
            row.appendChild(confirmBtn);
            linksContainer.classList.remove("hidden");
            linksContainer.appendChild(row);
            row.querySelector("input[type='url']").focus();
        });
    }

    // File preview for CCCD
    const cccdInput = document.getElementById("cccdImage");
    if (cccdInput) {
        cccdInput.addEventListener("change", () => {
            const preview = document.getElementById("cccdPreview");
            const label = document.getElementById("cccdLabel");
            const icon = document.getElementById("cccdIcon");
            const hint = document.getElementById("cccdHint");
            if (!preview) return;
            if (cccdInput.files.length > 0) {
                const file = cccdInput.files[0];
                label.textContent = file.name;
                icon.textContent = "description";
                hint.textContent = (file.size / 1024 / 1024).toFixed(1) + " MB";
                preview.classList.remove("hidden");
                if (file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        preview.innerHTML = `<img src="${e.target.result}" class="max-h-32 rounded-lg border border-outline-variant"/>`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.innerHTML = `<span class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm">
                        <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>${file.name}</span>`;
                }
            } else {
                label.textContent = "Click to upload or drag and drop";
                icon.textContent = "cloud_upload";
                hint.textContent = "PNG, JPG or PDF up to 10MB";
                preview.classList.add("hidden");
            }
        });
    }

    // File preview for credibility
    const credInput = document.getElementById("credibility");
    if (credInput) {
        credInput.addEventListener("change", () => {
            const preview = document.getElementById("credibilityPreview");
            if (!preview) return;
            preview.innerHTML = "";
            Array.from(credInput.files).slice(0, 10).forEach((file, i) => {
                const el = document.createElement("span");
                el.className = "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-sm border border-outline-variant";
                el.innerHTML = `<span class="material-symbols-outlined text-[16px]">${file.type.startsWith("image/") ? "image" : "description"}</span>${file.name}`;
                preview.appendChild(el);
            });
            if (credInput.files.length > 10) {
                const more = document.createElement("span");
                more.className = "text-xs text-outline ml-1";
                more.textContent = `+${credInput.files.length - 10} more`;
                preview.appendChild(more);
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> <span>Processing...</span>';
        btn.classList.add('opacity-80', 'pointer-events-none');

        const formData = new FormData(form);

        if (collectedLinks.length > 0) {
            formData.append("credibilityLinks", JSON.stringify(collectedLinks));
        }

        try {
            await uploadFormData("/host/register", formData);

            btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> <span>Submission Received!</span>';
            btn.classList.remove('bg-gradient-to-r', 'from-primary-container', 'to-secondary');
            btn.classList.add('bg-green-600');

            setTimeout(() => {
                alert("Registration successful! Our team will review your application.");
                window.location.href = "/";
            }, 1500);
        } catch (error) {
            const msg = error?.message || "An unexpected error occurred. Please try again.";
            let userMsg = msg;
            if (msg.includes("AccessDenied") || msg.includes("upload")) {
                userMsg = "File upload failed. Please try smaller files or different format.";
            }
            alert("Error: " + userMsg);
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-80', 'pointer-events-none');
        }
    });
});
