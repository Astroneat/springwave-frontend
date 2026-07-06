import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent, formatDate } from "../lib/utils.js";
import { get } from "../api/client.js";
import { getUser } from "../lib/session.js";
import { uploadOrgAvatar, uploadOrgCover, getOrgActivities } from "../api/organizations.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await fetchContent("./components/footer.html").then(html => {
        const footerContainer = document.getElementById("footer-container");
        if (footerContainer) footerContainer.innerHTML = html;
    });
    await initChatbot();

    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('id');

    if (!orgId) {
        document.getElementById("org-name").textContent = "Organization Not Found";
        document.getElementById("org-bio").textContent = "No ID provided.";
        return;
    }

    let org = null;
    try {
        const response = await get(`/organizations/${orgId}`);
        org = response.organization;
    } catch (error) {
        console.error("Failed to load organization from API:", error);
    }

    if (!org) {
        document.getElementById("org-name").textContent = "Organization Not Found";
        document.getElementById("org-bio").textContent = "Failed to load organization details.";
        return;
    }
    document.getElementById("org-name").textContent = org.name || org.orgName || "Unknown Organization";
    document.getElementById("org-bio").textContent = org.description || org.bio || "No bio available.";
    
    const avatarImg = document.getElementById("org-avatar");
    const coverImg = document.getElementById("org-cover");
    const loggedInUser = getUser() || {};
    
    // Lấy avatar và background (cover) từ organization. 
    let orgAvatar = org.avatar || org.owner?.avatar || org.host?.avatar;
    let orgCover = org.coverImage || org.background || org.owner?.background || org.owner?.coverImage || org.host?.background;
    
    if (!orgAvatar && loggedInUser.avatar) orgAvatar = loggedInUser.avatar;
    if (!orgCover && (loggedInUser.background || loggedInUser.coverImage)) {
        orgCover = loggedInUser.background || loggedInUser.coverImage;
    }
    
    if (avatarImg) {
        avatarImg.src = orgAvatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(org.name || org.orgName || "Org");
    }
    
    if (coverImg && orgCover) {
        coverImg.style.backgroundImage = `url('${orgCover}')`;
    }
    
    // Render email và website if available
    const emailEl = document.getElementById("org-email");
    const webEl = document.getElementById("org-website");
    if (emailEl) emailEl.textContent = org.contactInfo?.email || org.email || org.contactEmail || "-";
    if (webEl) webEl.textContent = org.website || org.websiteUrl || "-";
    
    // Authorization Check for upload capabilities
    const loggedInId = loggedInUser?._id ? String(loggedInUser._id) : '';
    const ownerId = org.owner?._id ? String(org.owner._id) : (org.owner ? String(org.owner) : '');
    const isOwner = loggedInId && ownerId && (loggedInId === ownerId);

    const isManager = loggedInId && org.managers && org.managers.some(m => {
        const mId = m?._id ? String(m._id) : String(m);
        return mId === loggedInId;
    });

    const isAuthorized = isOwner || isManager || loggedInUser.role === 'admin';

    console.log("SpringWave Org Profile Auth Check:", {
        loggedInUser,
        orgOwner: org.owner,
        orgManagers: org.managers,
        isOwner,
        isManager,
        isAdmin: loggedInUser.role === 'admin',
        isAuthorized
    });

    if (isAuthorized) {
        const editAvatarBtn = document.getElementById("edit-avatar-btn");
        const editCoverBtn = document.getElementById("edit-cover-btn");
        const avatarInput = document.getElementById("avatar-file-input");
        const coverInput = document.getElementById("cover-file-input");

        if (editAvatarBtn) editAvatarBtn.classList.remove("hidden");
        if (editCoverBtn) editCoverBtn.classList.remove("hidden");

        if (editAvatarBtn && avatarInput) {
            editAvatarBtn.addEventListener("click", () => avatarInput.click());
        }
        if (editCoverBtn && coverInput) {
            editCoverBtn.addEventListener("click", () => coverInput.click());
        }

        if (avatarInput) {
            avatarInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const res = await uploadOrgAvatar(orgId, file);
                    if (res.avatar) {
                        avatarImg.src = res.avatar;
                        alert("Organization logo updated successfully!");
                    }
                } catch (error) {
                    console.error("Failed to upload avatar:", error);
                    alert(error.message || "Failed to upload logo.");
                }
            });
        }

        if (coverInput) {
            coverInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const res = await uploadOrgCover(orgId, file);
                    if (res.coverImage) {
                        coverImg.style.backgroundImage = `url('${res.coverImage}')`;
                        alert("Organization cover photo updated successfully!");
                    }
                } catch (error) {
                    console.error("Failed to upload cover:", error);
                    alert(error.message || "Failed to upload cover photo.");
                }
            });
        }
    }

    // ─── Load & render events ───
    try {
        const { events = [] } = await getOrgActivities(orgId);
        const grid = document.getElementById("org-events-grid");
        const statsEl = document.getElementById("org-stats-events");
        if (statsEl) statsEl.textContent = events.length;

        if (grid) {
            if (events.length === 0) {
                grid.innerHTML = `<div class="col-span-full text-center py-12 text-[#94a3b8]">
                    <span class="material-symbols-outlined text-4xl mb-3" style="font-variation-settings:'FILL'1">event_busy</span>
                    <p class="font-semibold">No events yet</p>
                </div>`;
            } else {
                grid.innerHTML = events.map(e => `
                    <a href="/explore.html?activity=${e._id}" class="block bg-white border border-[#ecedfa] rounded-[20px] overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group">
                        <div class="h-36 bg-[#f1f5f9] overflow-hidden">
                            ${e.thumbnail
                                ? `<img src="${e.thumbnail}" alt="${e.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
                                : `<div class="w-full h-full flex items-center justify-center text-[#94a3b8]"><span class="material-symbols-outlined text-4xl">event</span></div>`
                            }
                        </div>
                        <div class="p-4">
                            <h3 class="font-bold text-sm text-[#191b22] line-clamp-2 mb-2">${e.title}</h3>
                            <div class="flex items-center gap-1 text-xs text-[#64748b] mb-1">
                                <span class="material-symbols-outlined text-sm">calendar_today</span>
                                <span>${formatDate(e.heldDate)}</span>
                            </div>
                            ${e.location ? `<div class="flex items-center gap-1 text-xs text-[#64748b]">
                                <span class="material-symbols-outlined text-sm">location_on</span>
                                <span class="truncate">${e.location}</span>
                            </div>` : ''}
                        </div>
                    </a>
                `).join("");
            }
        }
    } catch (err) {
        console.error("Failed to load organization events:", err);
    }
});
