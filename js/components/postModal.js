import { fetchContent } from "../lib/utils.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { sanitizeHtml } from "../lib/sanitize.js";
import { createDiscussionWithScope } from "../api/forum.js";

let isInitialized = false;

// We'll keep the DOM elements here
let overlay, backdrop, closeBtn, cancelBtn, publishBtn, titleInput, contentInput, tagsInput, eventInfo;
let currentActivity = null;

async function ensurePostModalElements() {
    if (isInitialized) return;
    
    // Fetch and inject HTML if not present
    let existingOverlay = document.getElementById("explorePostOverlay");
    if (!existingOverlay) {
        const html = await fetchContent("./components/postModal.html");
        const div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
    }

    overlay = document.getElementById("explorePostOverlay");
    backdrop = document.getElementById("explorePostBackdrop");
    closeBtn = document.getElementById("explorePostClose");
    cancelBtn = document.getElementById("explorePostCancel");
    publishBtn = document.getElementById("explorePostPublish");
    titleInput = document.getElementById("explorePostTitle");
    contentInput = document.getElementById("explorePostContent");
    tagsInput = document.getElementById("explorePostTags");
    eventInfo = document.getElementById("explorePostEventInfo");

    closeBtn?.addEventListener("click", closePostModal);
    cancelBtn?.addEventListener("click", closePostModal);
    if (backdrop) backdrop.addEventListener("click", closePostModal);

    publishBtn?.addEventListener("click", async () => {
        const check = canPerformAction('createDiscussion');
        if (!check.allowed) {
            alert(`Please wait ${check.remaining} seconds before posting.`);
            return;
        }
        markActionPerformed('createDiscussion');

        const title = sanitizeHtml(titleInput.value.trim());
        if (!title) { titleInput.focus(); return; }
        publishBtn.disabled = true;
        
        try {
            const result = await createDiscussionWithScope({
                title,
                content: sanitizeHtml(contentInput.value.trim() || ""),
                category: "event",
                tags: (tagsInput.value || "").split(",").map(t => sanitizeHtml(t.trim())).filter(Boolean),
                relatedEvent: currentActivity?.activityID || currentActivity?._id,
                scope: "general",
            });
            
            closePostModal();
            
            if (result) {
                result.relatedEvent = currentActivity?.activityID || currentActivity?._id;
                result._event = {
                    title: currentActivity?.title || "",
                    date: currentActivity?.heldDate || "",
                    attendees: currentActivity?.participants || 0,
                };
                if (!result.tags) result.tags = (tagsInput.value || "").split(",").map(t => t.trim()).filter(Boolean);
                if (!result.category) result.category = "event";
                if (!result.lastActivity) result.lastActivity = "Just now";
                if (!result.replies) result.replies = 0;
                result.id = result.id || result._id;
                
                try { sessionStorage.setItem("springwave_pending_discussion", JSON.stringify(result)); } catch {}
                try {
                    result._storedAt = Date.now();
                    const stored = JSON.parse(localStorage.getItem("springwave_event_discussions") || "[]");
                    const idx = stored.findIndex(d => (d.id || d._id) === (result.id || result._id));
                    if (idx === -1) stored.unshift(result);
                    else stored[idx] = result;
                    localStorage.setItem("springwave_event_discussions", JSON.stringify(stored));
                } catch {}
                
                const discId = result._id || result.id;
                showSuccessToast(
                    "Discussion posted successfully! Click here to view",
                    discId ? `./community.html?discussion=${discId}` : null,
                    "View Discussion"
                );
            }
        } finally {
            publishBtn.disabled = false;
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay?.classList.contains("active")) closePostModal();
    });

    isInitialized = true;
}

export async function openPostModal(activity) {
    if (!activity) return;
    await ensurePostModalElements();
    
    currentActivity = activity;
    
    titleInput.value = "";
    contentInput.value = "";
    tagsInput.value = "";
    eventInfo.innerHTML = `
      <span class="material-symbols-outlined text-blue-600">event</span>
      <div class="forum-post-event-info">
        <span class="text-sm font-medium text-slate-800">${activity.title}</span>
        <span class="text-xs text-slate-500">This discussion will be linked to this event</span>
      </div>
      <span class="material-symbols-outlined text-blue-600">check_circle</span>
    `;
    
    overlay.style.display = "flex";
    requestAnimationFrame(() => overlay.classList.add("active"));
    document.body.style.overflow = "hidden";
}

function closePostModal() {
    if (!overlay) return;
    overlay.classList.remove("active");
    setTimeout(() => { overlay.style.display = "none"; }, 300);
    // Don't remove overflow hidden if the event popup is still open!
    // Since eventPopup also manages overflow, we should only reset it if no other popups are active.
    // For now, let's assume we can just remove it, but check if popup-overlay is active.
    const eventPopupOverlay = document.getElementById("popup-overlay");
    if (!eventPopupOverlay || !eventPopupOverlay.classList.contains("active")) {
        document.body.style.overflow = "";
    }
}

function showSuccessToast(message, linkUrl, linkText) {
    const existing = document.querySelectorAll(".success-toast");
    const offset = existing.length * 80;
    const toast = document.createElement("div");
    toast.className = "success-toast";
    toast.style.bottom = `${24 + offset}px`;
    toast.innerHTML = `
      <div class="success-toast-icon">
        <span class="material-symbols-outlined">check_circle</span>
      </div>
      <div class="success-toast-body">
        <span class="success-toast-heading">Success!</span>
        <span class="success-toast-message">${message}</span>
        ${linkUrl ? `<span class="success-toast-link">${linkText || "View Discussion"}</span>` : ""}
      </div>
      <button class="success-toast-close">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    document.body.appendChild(toast);
  
    const closeBtn = toast.querySelector(".success-toast-close");
    closeBtn.addEventListener("click", () => {
      toast.classList.add("hiding");
      setTimeout(() => toast.remove(), 300);
    });
  
    if (linkUrl) {
      toast.querySelector(".success-toast-link").addEventListener("click", () => {
        window.location.href = linkUrl;
      });
    }
  
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
}
