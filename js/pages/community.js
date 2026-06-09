import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import {
  getTrendingDiscussions,
  getUniversityCommunities,
  getSkillTopics,
  getUpcomingEvents,
  getPopularDiscussions,
  getAISuggestions,
  getDiscussionsByCategory,
  getEventById,
  getEvents,
} from "../api/forum.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { getActivityById, getActivities } from "../api/activities.js";
import { CDN_DOMAIN } from "../config.js";

const CATEGORIES = {
  all:   { label: "All Discussions",      heroTitle: "Connect With Students Beyond Your Campus",                heroSubtitle: "Join discussions, exchange experiences, ask questions, and discover opportunities together with students across Da Nang.",     sectionTitle: "Trending Discussions",     sectionSubtitle: "Active conversations across the community" },
  event: { label: "Event Discussions",     heroTitle: "Event Discussions",                                      heroSubtitle: "Find and discuss upcoming events, hackathons, and activities near you.",                                                       sectionTitle: "Event Discussions",        sectionSubtitle: "Discussions about events and activities" },
  skills:{ label: "Skill Development",     heroTitle: "Skill Development",                                      heroSubtitle: "Explore topics by skill area and interest, and grow together with fellow learners.",                                            sectionTitle: "Skill Discussions",        sectionSubtitle: "Explore topics by skill area and interest" },
  uni:   { label: "University Communities", heroTitle: "University Communities",                                heroSubtitle: "Join your campus community and meet fellow students from your university.",                                                       sectionTitle: "University Discussions",   sectionSubtitle: "Discussions from your university community" },
  mine:  { label: "My Discussions",        heroTitle: "My Discussions",                                         heroSubtitle: "View and manage all your discussions in one place.",                                                                            sectionTitle: "My Discussions",           sectionSubtitle: "Your discussions and topics" },
  saved: { label: "Saved Posts",           heroTitle: "Saved Posts",                                            heroSubtitle: "Your bookmarked discussions and posts, saved for later.",                                                                       sectionTitle: "Saved Posts",              sectionSubtitle: "Your bookmarked content" },
};

function getCategoryFromURL() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");
  return cat && CATEGORIES[cat] ? cat : "all";
}

const MAX_EVENT_DISCUSSIONS = 20;

async function getEventDiscussions() {
  try {
    const { activities } = await getActivities();
    if (!activities || activities.length === 0) return [];
    return activities.slice(0, MAX_EVENT_DISCUSSIONS).map(eventToDiscussion);
  } catch {
    const events = getEvents();
    if (events.length === 0) return [];
    return events.map((e) => ({
      id: e.id,
      author: "SpringWave",
      university: "",
      avatar: "S",
      title: e.title,
      preview: `Join the discussion about ${e.title}! Share your thoughts and connect with other attendees.`,
      category: "event",
      tags: ["event"],
      replies: 0,
      views: 0,
      lastActivity: e.date,
      relatedEvent: e.id,
      _event: { title: e.title, date: e.date, attendees: e.attendees },
    }));
  }
}

function eventToDiscussion(event) {
  return {
    id: event.activityID || event._id,
    author: event.hostName || "SpringWave",
    university: event.location || "",
    avatar: (event.hostName || "S")[0],
    title: event.title,
    preview: (event.description || "").slice(0, 120) + ((event.description || "").length > 120 ? "..." : ""),
    category: "event",
    tags: [event.type || "event"],
    replies: event.participants || 0,
    views: 0,
    lastActivity: event.heldDate ? formatDate(event.heldDate) : "Upcoming",
    relatedEvent: event.activityID || event._id,
    _event: { title: event.title, date: event.heldDate, attendees: event.participants || 0 },
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  initBasicScroll();
  initForumSidebarToggle();
  initPostModal();

  const category = getCategoryFromURL();
  setActiveCategory(category);
  updateHero(category);
  showSections(category);

  let discussions;
  if (category === "event") {
    discussions = await getEventDiscussions();
  } else {
    discussions = getDiscussionsByCategory(category);
  }
  renderDiscussions(discussions, category);

  if (category === "all" || category === "uni") {
    renderUniGrid();
  }
  if (category === "all" || category === "skills") {
    renderTopicGrid();
  }

  initSidebarLinkClick();
  initEventDetailPopup();
  await loadSidebar(category);
  await initChatbot();
  await loadFooter();
});

async function loadNavbar() {
  await loadSharedNavbar({ activeSection: "community" });
}

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  document.getElementById("footer-container").innerHTML = html;
}

function setActiveCategory(category) {
  document.querySelectorAll(".forum-category-item").forEach((item) => {
    const href = item.getAttribute("href");
    const itemCat = !href || href === "./community.html" ? "all" : (href.match(/cat=(\w+)/) || [])[1];
    const isActive = itemCat === category;
    item.classList.toggle("active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function updateHero(category) {
  const config = CATEGORIES[category] || CATEGORIES.all;
  const title = document.querySelector(".forum-hero-title");
  const subtitle = document.querySelector(".forum-hero-subtitle");
  if (title) title.textContent = config.heroTitle;
  if (subtitle) subtitle.textContent = config.heroSubtitle;
  document.title = `${config.label} - SpringWave`;
}

function showSections(category) {
  const trending = document.getElementById("trending");
  const universities = document.getElementById("universities");
  const careerTopics = document.getElementById("careerTopics");
  const config = CATEGORIES[category] || CATEGORIES.all;

  if (trending) {
    trending.style.display = category === "uni" ? "none" : "";
    const title = trending.querySelector(".forum-section-title");
    const sub = trending.querySelector(".forum-section-subtitle");
    if (title) title.textContent = config.sectionTitle;
    if (sub) sub.textContent = config.sectionSubtitle;
  }

  if (universities) universities.style.display = category === "all" || category === "uni" ? "" : "none";
  if (careerTopics) careerTopics.style.display = category === "all" || category === "skills" ? "" : "none";
}

function initSidebarLinkClick() {
  document.querySelectorAll(".forum-category-item").forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("forumSidebar")?.classList.remove("open");
    });
  });
}

/* =============================
   SIDEBAR TOGGLE
   ============================= */

function initForumSidebarToggle() {
  const toggle = document.getElementById("forumFilterBtn");
  const sidebar = document.getElementById("forumSidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });
  }
  const closeBtn = document.getElementById("forumSidebarToggle");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => sidebar.classList.remove("open"));
  }
}

/* =============================
   SIDEBAR
   ============================= */

async function loadSidebar(category) {
  const container = document.getElementById("forumSidebarContainer");
  const html = await fetchContent("./components/forum-sidebar.html");
  container.innerHTML = html;

  const widgets = container.querySelectorAll(".forum-sidebar-widget");
  if (category === "event") {
    if (widgets[0]) widgets[0].style.display = "none";
    if (widgets[1]) widgets[1].style.display = "";
    if (widgets[2]) widgets[2].style.display = "none";
  } else if (category === "skills") {
    if (widgets[0]) widgets[0].style.display = "none";
    if (widgets[1]) widgets[1].style.display = "none";
    if (widgets[2]) widgets[2].style.display = "";
  } else if (category === "uni") {
    if (widgets[0]) widgets[0].style.display = "";
    if (widgets[1]) widgets[1].style.display = "none";
    if (widgets[2]) widgets[2].style.display = "none";
  } else {
    if (widgets[0]) widgets[0].style.display = "";
    if (widgets[1]) widgets[1].style.display = "";
    if (widgets[2]) widgets[2].style.display = "";
  }

  renderPopularDiscussions();
  renderUpcomingEvents();
  renderAISuggestions();
}

function renderPopularDiscussions() {
  const container = document.getElementById("sidebarPopular");
  if (!container) return;
  const popular = getPopularDiscussions();
  container.innerHTML = popular
    .map(
      (d, i) => `
    <div class="forum-sidebar-popular-item">
      <span class="forum-sidebar-popular-rank">${String(i + 1).padStart(2, "0")}</span>
      <div class="forum-sidebar-popular-info">
        <span class="forum-sidebar-popular-title">${d.title}</span>
        <span class="forum-sidebar-popular-replies">${d.replies} replies</span>
      </div>
    </div>
  `
    )
    .join("");
}

function renderUpcomingEvents() {
  const container = document.getElementById("sidebarUpcomingEvents");
  if (!container) return;
  const events = getUpcomingEvents();
  container.innerHTML = events
    .map(
      (e) => `
    <div class="forum-sidebar-event">
      <div class="forum-sidebar-event-date">
        <span class="forum-sidebar-event-day">${e.date.split(" ")[0]}</span>
        <span class="forum-sidebar-event-month">${e.date.split(" ")[1]}</span>
      </div>
      <div class="forum-sidebar-event-info">
        <span class="forum-sidebar-event-title">${e.title}</span>
        <span class="forum-sidebar-event-attendees">
          <span class="material-symbols-outlined text-xs">person</span>
          ${e.attendees} attending
        </span>
      </div>
    </div>
  `
    )
    .join("");
}

function renderAISuggestions() {
  const container = document.getElementById("sidebarAISuggested");
  if (!container) return;
  const suggestions = getAISuggestions();
  container.innerHTML = suggestions
    .map(
      (s) => `
    <div class="forum-sidebar-ai-item">
      <div class="forum-sidebar-ai-icon">
        <span class="material-symbols-outlined">auto_awesome</span>
      </div>
      <div class="forum-sidebar-ai-info">
        <span class="forum-sidebar-ai-title">${s.title}</span>
        <span class="forum-sidebar-ai-reason">${s.reason}</span>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   DISCUSSIONS
   ============================= */

function renderDiscussions(discussions, category) {
  const container = document.getElementById("forumDiscussions");
  if (!container) return;

  if (discussions.length === 0) {
    const emptyMessages = {
      mine:   ["forum", "No discussions yet", "You haven't started any discussions yet. Click 'Start Discussion' to create one!"],
      saved:  ["bookmark", "No saved posts", "You haven't saved any posts yet. Click the bookmark icon on a discussion to save it for later."],
      uni:    ["account_balance", "No university discussions", "Join a university community above to see discussions from your campus."],
      event:  ["event", "No event discussions", "There are no event discussions yet. Be the first to start one!"],
      skills: ["school", "No skill discussions", "There are no skill discussions yet. Be the first to start one!"],
    };
    const msg = emptyMessages[category] || ["forum", "No discussions yet", "Be the first to start a discussion in this category."];
    container.innerHTML = `
      <div class="forum-empty">
        <span class="material-symbols-outlined forum-empty-icon">${msg[0]}</span>
        <p class="forum-empty-title">${msg[1]}</p>
        <p class="forum-empty-desc">${msg[2]}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = discussions
    .map(
      (d) => {
        const eventRef = d.relatedEvent ? renderEventRef(d.relatedEvent, d._event) : "";
        return `
    <div class="forum-discussion-card">
      <div class="forum-discussion-card-header">
        <div class="forum-discussion-author-avatar" style="background: linear-gradient(135deg, #23499b, #3B6FD4);">
          ${d.avatar}
        </div>
        <div class="forum-discussion-author-info">
          <span class="forum-discussion-author-name">${d.author}</span>
          <span class="forum-discussion-author-uni">${d.university}</span>
        </div>
        <span class="forum-discussion-time">${d.lastActivity}</span>
      </div>
      <h3 class="forum-discussion-title">${d.title}</h3>
      <p class="forum-discussion-preview">${d.preview}</p>
      ${eventRef}
      <div class="forum-discussion-meta">
        <span class="forum-category-badge forum-category-${d.category}">${capitalize(d.category)}</span>
        <div class="forum-discussion-tags">
          ${d.tags.map((t) => `<span class="forum-tag">${t}</span>`).join("")}
        </div>
      </div>
      <div class="forum-discussion-footer">
        <div class="forum-discussion-stats">
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">chat_bubble</span>
            ${d.replies} replies
          </span>
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">visibility</span>
            ${d.views} views
          </span>
        </div>
        <div class="forum-discussion-actions">
          <button class="forum-discussion-action-btn" title="Save">
            <span class="material-symbols-outlined text-sm">bookmark_border</span>
          </button>
          <button class="forum-discussion-action-btn" title="Share">
            <span class="material-symbols-outlined text-sm">share</span>
          </button>
        </div>
      </div>
    </div>
  `;}
    )
    .join("");
}

function renderEventRef(eventId, eventData) {
  const event = eventData || getEventById(eventId);
  if (!event) return "";
  return `
    <div class="forum-event-ref" data-event-id="${eventId}">
      <div class="forum-event-ref-icon">
        <span class="material-symbols-outlined">event</span>
      </div>
      <div class="forum-event-ref-info">
        <span class="forum-event-ref-label">Discussing</span>
        <span class="forum-event-ref-title">${event.title}</span>
        <span class="forum-event-ref-meta">
          <span class="material-symbols-outlined text-xs">calendar_today</span>
          ${event.date}
          <span class="material-symbols-outlined text-xs">person</span>
          ${event.attendees} attending
        </span>
      </div>
      <span class="forum-event-ref-link">View Event</span>
    </div>
  `;
}

/* =============================
   UNIVERSITY GRID
   ============================= */

function renderUniGrid() {
  const container = document.getElementById("forumUniGrid");
  if (!container) return;
  const unis = getUniversityCommunities();
  container.innerHTML = unis
    .map(
      (u) => `
    <div class="forum-uni-card">
      <div class="forum-uni-card-top" style="background: linear-gradient(135deg, ${u.color}22, ${u.color}11);">
        <div class="forum-uni-icon" style="background: ${u.color};">
          <span class="material-symbols-outlined text-white text-2xl">account_balance</span>
        </div>
        <h3 class="forum-uni-name">${u.name}</h3>
      </div>
      <div class="forum-uni-card-body">
        <div class="forum-uni-stat">
          <span class="forum-uni-stat-value">${u.memberCount.toLocaleString()}</span>
          <span class="forum-uni-stat-label">Members</span>
        </div>
        <div class="forum-uni-stat">
          <span class="forum-uni-stat-value">${u.activeDiscussions}</span>
          <span class="forum-uni-stat-label">Discussions</span>
        </div>
        <button class="forum-uni-join-btn">Join Community</button>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   TOPIC GRID
   ============================= */

function renderTopicGrid() {
  const container = document.getElementById("forumTopicGrid");
  if (!container) return;
  const topics = getSkillTopics();
  container.innerHTML = topics
    .map(
      (t) => `
    <div class="forum-topic-card">
      <div class="forum-topic-icon" style="background: ${t.color}15; color: ${t.color};">
        <span class="material-symbols-outlined text-2xl">${t.icon}</span>
      </div>
      <div class="forum-topic-info">
        <h3 class="forum-topic-name">${t.name}</h3>
        <p class="forum-topic-desc">${t.description}</p>
        <span class="forum-topic-count">${t.discussionCount} discussions</span>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   POST MODAL
   ============================= */

function initPostModal() {
  const overlay = document.getElementById("forumPostOverlay");
  const backdrop = document.getElementById("forumPostBackdrop");
  const openBtns = document.querySelectorAll("[id='startDiscussionBtn']");
  const closeBtn = document.getElementById("forumPostClose");
  const cancelBtn = document.getElementById("forumPostCancel");
  const postEvent = document.getElementById("postEvent");

  let closeTimer = null;

  function populateEventSelect() {
    if (!postEvent) return;
    const events = getEvents();
    events.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.title} — ${e.date}`;
      postEvent.appendChild(opt);
    });
  }
  populateEventSelect();

  function open() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      overlay.classList.add("active");
    });
    document.body.style.overflow = "hidden";
  }
  window.openPostModal = open;

  function close() {
    overlay.classList.remove("active");
    closeTimer = setTimeout(() => {
      overlay.style.display = "none";
    }, 300);
    document.body.style.overflow = "";
  }

  openBtns.forEach((btn) => {
    if (btn) btn.addEventListener("click", open);
  });
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (cancelBtn) cancelBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  const publishBtn = document.getElementById("forumPostPublish");
  if (publishBtn) {
    publishBtn.addEventListener("click", () => {
      const title = document.getElementById("postTitle")?.value.trim();
      if (!title) {
        document.getElementById("postTitle")?.focus();
        return;
      }
      close();
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";
      document.getElementById("postTags").value = "";
      if (postEvent) postEvent.value = "";
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close();
  });
}

/* =============================
   EVENT DETAIL POPUP
   ============================= */

function initEventDetailPopup() {
  const overlay = document.getElementById("eventPopupOverlay");
  const backdrop = document.getElementById("eventPopupBackdrop");
  const container = document.getElementById("eventPopupContainer");

  async function open(eventId) {
    if (!eventId) return;
    container.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    overlay.removeAttribute("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    try {
      const { activity } = await getActivityById(eventId);
      container.innerHTML = buildEventDetailPopupHTML(activity);
    } catch {
      const event = getEventById(eventId);
      if (event) {
        container.innerHTML = buildEventDetailPopupHTML({
          activityID: event.id,
          title: event.title,
          heldDate: event.date,
          type: "event",
          location: "Da Nang",
          hostName: "SpringWave",
          description: "Join the community discussion about this event! Share your thoughts, ask questions, and connect with other attendees.",
          thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop",
          attachments: [],
        });
      } else {
        container.innerHTML = `<div class="popup-loading text-slate-500">Event not found</div>`;
      }
    }

    container.querySelector("#back-btn")?.addEventListener("click", close);
  }

  function close() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => {
      container.innerHTML = "";
      overlay.setAttribute("hidden", "");
    }, 300);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || backdrop?.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hasAttribute("hidden")) close();
  });

  document.addEventListener("click", (e) => {
    const ref = e.target.closest(".forum-event-ref");
    if (!ref) return;
    const eventId = ref.dataset.eventId;
    if (eventId) open(eventId);
  });
}

function buildEventDetailPopupHTML(a) {
  const heldDate = formatDate(a.heldDate);
  const type = capitalize(a.type);
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;
  const filesHTML = (a.attachments || []).map(f => {
    const link = f.link || f.activityAttachLink || "";
    const fileName = decodeURIComponent(link.split('/').pop());
    return `<div class="file-item">
        <div class="file-left">
            <div class="file-icon"><i class="fa-solid fa-file"></i></div>
            <div><h4>${fileName}</h4></div>
        </div>
        <a class="download-btn" href="${CDN_DOMAIN}/${link}" target="_blank"><i class="fa-solid fa-download"></i></a>
    </div>`;
  }).join("");

  return `
    <div class="container">
      <div class="top-bar">
        <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <div class="top-actions">
          <button class="icon-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
          <button type="button" class="favorite-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">Favourite</span></button>
        </div>
      </div>
      <div class="main-content">
        <div class="left-panel">
          <img src="${a.thumbnail || "https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop"}" alt="${a.title}">
          <div class="tag"><i class="fa-solid fa-tag"></i> ${type}</div>
          <div class="details-card">
            <h2>Details</h2>
            <div class="detail-item"><i class="fa-solid fa-location-dot"></i><div><span>Location</span><p>${a.location}</p></div></div>
            <div class="detail-item"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${heldDate}</p></div></div>
            <div class="detail-item"><i class="fa-regular fa-user"></i><div><span>Host</span><p>${a.hostName || a.createdByName || "Unknown"}</p></div></div>
            <div class="detail-item"><i class="fa-solid fa-tag"></i><div><span>Type</span><p>${type}</p></div></div>
          </div>
        </div>
        <div class="right-panel">
          <h1 class="title">${a.title}</h1>
          <a class="location-link" href="${googleMapsLink}" target="_blank"><i class="fa-solid fa-location-dot"></i> ${a.location}</a>
          <div class="info-boxes">
            <div class="info-box"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${heldDate}</p></div></div>
            <div class="info-box"><i class="fa-regular fa-user"></i><div><span>Hosted by</span><p>${a.hostName || a.createdByName || "Unknown"}</p></div></div>
          </div>
          <div class="description-panel">
            ${(a.description || "").split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
          </div>
          ${filesHTML ? `<div class="files-box"><h3>Attached Files (${(a.attachments || []).length})</h3>${filesHTML}</div>` : ""}
        </div>
      </div>
    </div>`;
}


