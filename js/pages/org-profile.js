import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import {
  getOrganizationPublicProfile,
  getOrganizationPublicEvents,
  toggleFollowOrganization
} from "../api/organizations.js";
import { getUser } from "../lib/session.js";

// --- small UI helpers -------------------------------------------------------

function renderEventCard(event) {
  const dateObj = event.heldDate ? new Date(event.heldDate) : null;
  const month = dateObj
    ? dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase()
    : "";
  const day = dateObj ? dateObj.getDate() : "";

  return `
    <div class="bg-white border border-[#ecedfa] p-6 rounded-[24px] shadow-sm hover-lift flex gap-5">
      <div class="flex flex-col items-center justify-center w-16">
        <span class="text-xs font-semibold text-[#64748b]">${month}</span>
        <span class="text-2xl font-display-lg text-primary">${day}</span>
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-base text-[#191b22] mb-1">${event.title ?? "Untitled Event"}</h3>
        <p class="text-sm text-[#64748b] mb-2 line-clamp-2">${event.description ?? ""}</p>
        <span class="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          <span class="material-symbols-outlined text-sm">event</span>
          ${dateObj ? dateObj.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
      </div>
    </div>`;
}

// --- main --------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  await fetchContent("./components/footer.html").then((html) => {
    const footerContainer = document.getElementById("footer-container");
    if (footerContainer) footerContainer.innerHTML = html;
  });
  await initChatbot();

  const params = new URLSearchParams(window.location.search);
  const orgId = params.get("id");

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
    org.avatar || loggedInUser.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(org.name || "Org");
  const orgCover =
    org.coverImage || loggedInUser.coverImage || loggedInUser.background || "";

  if (avatarImg) {
    avatarImg.src = orgAvatar;
  }
  if (coverImg && orgCover) {
    coverImg.style.backgroundImage = `url('${orgCover}')`;
  }

  // --- Contact & website ---
  document.getElementById("org-email").textContent = org.contactInfo?.email || "-";
  document.getElementById("org-website").textContent = org.website || "-";

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

  // --- Upcoming events ---
  try {
    const eventsData = await getOrganizationPublicEvents(orgId, 5);
    const events = eventsData.events || [];
    const eventsGrid = document.getElementById("org-events-grid");
    if (eventsGrid) {
      eventsGrid.innerHTML = events.map(renderEventCard).join("") || '<p class="text-[#64748b] text-sm">No upcoming events yet.</p>';
    }
  } catch (error) {
    console.error("Failed to load public events:", error);
    const eventsGrid = document.getElementById("org-events-grid");
    if (eventsGrid) {
      eventsGrid.innerHTML = '<p class="text-[#64748b] text-sm">Failed to load events.</p>';
    }
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

    // Initial label based on server state
    const initialLabel = followBtn.querySelector(".follow-label");
    if (initialLabel && org.isFollowing) {
      initialLabel.textContent = "Following";
    }
  }
});
