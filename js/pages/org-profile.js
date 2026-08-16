import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { openEventPopup } from "../components/eventPopup.js";
import {
  getOrganizationPublicProfile,
  getOrganizationPublicEvents,
  toggleFollowOrganization,
  uploadOrgAvatar,
  uploadOrgCover,
  getOrgActivities
} from "../api/organizations.js";
import { getUser } from "../lib/session.js";

// --- main --------------------------------------------------------------------

let allEvents = [];

function initEventDelegation() {
  document.getElementById("org-events-grid")?.addEventListener("click", (e) => {
    const card = e.target.closest(".event-card");
    if (card) {
      e.preventDefault();
      const id = card.dataset.id;
      const actData = allEvents.find(ev => String(ev._id || ev.activityID) === id);
      openEventPopup(id, { activityData: actData });
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  await fetchContent("./components/footer.html").then((html) => {
    const footerContainer = document.getElementById("footer-container");
    if (footerContainer) footerContainer.innerHTML = html;
  });
  await initChatbot();
  initEventDelegation();

  const params = new URLSearchParams(window.location.search);
  const orgId = params.get("orgId") || params.get("id");

  if (!orgId) {
    document.getElementById("org-name").textContent = "Organization Not Found";
    document.getElementById("org-bio").textContent = "No ID provided.";
    return;
  }

  let org = null;
  try {
    const data = await getOrganizationPublicProfile(orgId);
    org = data.organization;
  } catch (error) {
    console.error("Failed to load organization from public API:", error);
  }

  if (!org) {
    document.getElementById("org-name").textContent = "Organization Not Found";
    document.getElementById("org-bio").textContent = "Failed to load organization details.";
    return;
  }

  // --- Core fields ---
  document.getElementById("org-name").textContent = org.name || "Unknown Organization";
  document.getElementById("org-bio").textContent = org.description || "No bio available.";

  // --- Avatar / cover ---
  const avatarImg = document.getElementById("org-avatar");
  const coverImg = document.getElementById("org-cover");
  const loggedInUser = getUser() || {};

  const orgAvatar =
    org.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(org.name || "Org");
  const orgCover =
    org.coverImage || "";

  if (avatarImg) {
    avatarImg.src = orgAvatar;
  }
  if (coverImg && orgCover) {
    coverImg.style.backgroundImage = `url('${orgCover}')`;
  }

  // --- Contact & website ---
  document.getElementById("org-email").textContent = org.contactInfo?.email || "-";
  
  const websiteEl = document.getElementById("org-website");
  if (org.website) {
    websiteEl.textContent = org.website;
    // ensure url has protocol
    websiteEl.href = org.website.startsWith('http') ? org.website : 'https://' + org.website;
  } else {
    websiteEl.textContent = "-";
    websiteEl.removeAttribute('href');
  }

  // --- Stats ---
  document.getElementById("org-stats-events").textContent = org.eventCount ?? 0;
  document.getElementById("org-stats-followers").textContent = org.followerCount ?? 0;

  // --- Social links ---
  const linkSelectors = {
    linkedin: 'a[data-social="linkedin"]',
    facebook: 'a[data-social="facebook"]',
    twitter: 'a[data-social="twitter"]',
    instagram: 'a[data-social="instagram"]',
  };
  const socialLinks = org.socialLinks || {};
  Object.entries(linkSelectors).forEach(([key, selector]) => {
    const url = socialLinks[key];
    const el = document.querySelector(selector);
    if (!el) return;
    if (url) {
      el.href = url;
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });

  // --- Auth check for upload capabilities ---
  const loggedInId = loggedInUser?._id ? String(loggedInUser._id) : '';
  const ownerId = org.owner?._id ? String(org.owner._id) : (org.owner ? String(org.owner) : '');
  const isOwner = loggedInId && ownerId && (loggedInId === ownerId);

  const isManager = loggedInId && org.managers && org.managers.some(m => {
    const mId = m?._id ? String(m._id) : String(m);
    return mId === loggedInId;
  });

  const isAuthorized = isOwner || isManager || loggedInUser.role === 'admin';

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

  // ─── Load & render events (rich cards with thumbnails) ───
  try {
    const { events = [] } = await getOrgActivities(orgId);
    allEvents = events;
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
          <div data-id="${e._id}" class="event-card cursor-pointer flex flex-col justify-between bg-white border border-[#ecedfa] rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group">
            <div class="h-28 sm:h-36 bg-[#f1f5f9] overflow-hidden relative">
              ${e.thumbnail
                ? `<img src="${e.thumbnail}" alt="${e.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
                : `<div class="w-full h-full flex items-center justify-center text-[#94a3b8]"><span class="material-symbols-outlined text-3xl">event</span></div>`
              }
              <div class="absolute top-2 right-2 sm:top-3 sm:right-3 bg-[#e6f0fd] px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold text-[#3493fa] flex items-center gap-1 sm:gap-1.5 border border-[#3493fa]/30 z-10 shadow-sm max-w-[75%]">
                <i class="fa-solid fa-tag text-[#3493fa] text-[8px] sm:text-[10px] shrink-0"></i>
                <span class="info-type truncate">${capitalize(e.type || "Activity")}</span>
              </div>
            </div>
            <div class="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
              <h3 class="font-bold text-xs sm:text-sm text-[#191b22] line-clamp-2 mb-1.5">${e.title}</h3>
              <div class="space-y-1 mt-auto">
                <div class="flex items-center gap-1 text-[11px] sm:text-xs text-[#64748b]">
                  <span class="material-symbols-outlined text-xs sm:text-sm shrink-0">calendar_today</span>
                  <span class="truncate">${formatDate(e.heldDate)}</span>
                </div>
                ${e.location ? `<div class="flex items-center gap-1 text-[11px] sm:text-xs text-[#64748b]">
                  <span class="material-symbols-outlined text-xs sm:text-sm shrink-0">location_on</span>
                  <span class="truncate">${e.location}</span>
                </div>` : ''}
              </div>
            </div>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("Failed to load organization events:", err);
  }

  // --- Follow button ---
  const followBtn = document.querySelector(".follow-btn");
  if (followBtn) {
    followBtn.addEventListener("click", async () => {
      try {
        const result = await toggleFollowOrganization(orgId);
        document.getElementById("org-stats-followers").textContent = result.followerCount ?? 0;
        followBtn.dataset.following = result.isFollowing ? "true" : "false";
        followBtn.querySelector(".follow-label").textContent = result.isFollowing ? "Following" : "Follow";
      } catch (error) {
        console.error("Follow toggle failed:", error);
      }
    });

    const initialLabel = followBtn.querySelector(".follow-label");
    if (initialLabel && org.isFollowing) {
      initialLabel.textContent = "Following";
    }
  }
});
