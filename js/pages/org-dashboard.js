import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { get, post, put, del, uploadFormData } from "../api/client.js";
import { getMyOrganizations, getAllOrganizations, updateOrganization, deleteOrganization, getOrgActivities, getManagers, addManager, removeManager, transferOwnership, uploadOrgAvatar } from "../api/organizations.js";
import { getAttendance, getAttendanceStats, markAttendance, scanAttendance, initAttendance, importExcelAttendance } from "../api/attendance.js";
import { getEventCertificates, issueCertificates } from "../api/certificates.js";
import { getHostReviews } from "../api/activities.js";
import { getOrgAnalytics, downloadOrgExcelReport } from "../api/analytics.js";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

let currentOrgId = null;
let currentOrgs = [];
let currentEvents = [];
let currentSection = "dashboard";

document.addEventListener("DOMContentLoaded", async () => {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }
  const user = getUser();

  await loadNavbar({ activeSection: "dashboard" });
  await initChatbot();

  initSideNav();
  initOrgSelector();
  await loadOrgs();
  initSettingsForm();
  initCreateOrg();

  // Nút mở profile của tổ chức
  document.getElementById("view-profile-btn")?.addEventListener("click", () => {
    if (currentOrgId) {
      window.open(`/org-profile.html?orgId=${currentOrgId}`, "_blank");
    }
  });

  if (isAdminUser()) {
    const createBtn = document.getElementById("create-org-btn");
    if (createBtn) createBtn.style.display = "none";
  }
  initAddManager();
  initQRScan();
  initAttendanceButtons();
  initIssueCerts();
  initCreateEvent();
  initEventsTabs();
  initParticipantEventSelect();
  initAttendanceEventSelect();
  initCertEventSelect();
});

// ─── Org Loading ───

function isAdminUser() {
  const u = getUser();
  return u?.role === "admin";
}

async function loadOrgs() {
  try {
    const data = isAdminUser() ? await getAllOrganizations() : await getMyOrganizations();
    currentOrgs = data.organizations || [];
    
    renderOrgDropdown();
    if (currentOrgs.length === 1) {
      const singleOrg = currentOrgs[0];
      document.getElementById("org-selector-label").textContent = singleOrg.name;
      await selectOrg(singleOrg._id);
    } else if (currentOrgs.length > 1) {
      const savedOrgId = sessionStorage.getItem("selected_org_id") || localStorage.getItem("selected_org_id");
      const matchedOrg = currentOrgs.find(o => o._id === savedOrgId);
      if (matchedOrg) {
        document.getElementById("org-selector-label").textContent = matchedOrg.name;
        await selectOrg(matchedOrg._id);
      } else {
        const dropdown = document.getElementById("org-dropdown");
        if (dropdown) {
          dropdown.classList.remove("hidden");
          document.getElementById("org-chevron")?.classList.add("rotate-180");
        }
      }
    }
  } catch (err) {
    console.error("Failed to load orgs:", err);
    currentOrgs = [];
    renderOrgDropdown();
  }
}

function renderOrgDropdown() {
  const list = document.getElementById("org-list");
  if (!list) return;
  if (!currentOrgs.length) {
    list.innerHTML = `<div class="text-center py-8 text-[#94a3b8] text-sm">No organizations found</div>`;
    return;
  }
  list.innerHTML = currentOrgs.map(o => {
    const ownerName = o.owner?.fullname || o.owner?.email || "Unknown";
    return `
      <button class="org-option w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f8f9fc] transition-colors text-left ${o._id === currentOrgId ? "bg-[#ecedfa] ring-1 ring-primary/20" : ""}" data-id="${o._id}">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-[#dae1ff] to-[#ecedfa] flex items-center justify-center text-primary font-bold text-sm shrink-0">
          ${(o.name?.[0] || "?").toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-[#191b22] truncate">${o.name}</div>
          <div class="text-[11px] text-[#64748b] truncate" data-org-meta="1">${ownerName}${o.eventCount !== undefined ? ` · ${o.eventCount} events` : ""}</div>
        </div>
        ${o._id === currentOrgId ? '<i class="fa-solid fa-check text-primary text-xs"></i>' : ""}
      </button>
    `;
  }).join("");

  list.querySelectorAll(".org-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (id) {
        switchOrg(id);
        closeOrgDropdown();
      }
    });
  });
}

function switchOrg(orgId) {
  const org = currentOrgs.find(o => o._id === orgId);
  if (!org) return;
  currentOrgId = orgId;
  document.getElementById("org-selector-label").textContent = org.name;
  sessionStorage.setItem("selected_org_id", orgId);
  localStorage.setItem("selected_org_id", orgId);
  renderOrgDropdown();
  selectOrg(orgId);
}

function closeOrgDropdown() {
  document.getElementById("org-dropdown")?.classList.add("hidden");
  document.getElementById("org-chevron")?.classList.remove("rotate-180");
}

function initOrgSelector() {
  const btn = document.getElementById("org-selector-btn");
  const dropdown = document.getElementById("org-dropdown");
  const search = document.getElementById("org-search");
  const chevron = document.getElementById("org-chevron");
  if (!btn || !dropdown) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !dropdown.classList.contains("hidden");
    dropdown.classList.toggle("hidden");
    if (chevron) chevron.classList.toggle("rotate-180");
    if (!isOpen && search) { search.value = ""; search.focus(); filterOrgs(""); }
  });

  search?.addEventListener("input", (e) => filterOrgs(e.target.value));

  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      closeOrgDropdown();
    }
  });
}

function filterOrgs(query) {
  const list = document.getElementById("org-list");
  if (!list) return;
  const q = query.toLowerCase().trim();
  list.querySelectorAll(".org-option").forEach(btn => {
    const name = btn.querySelector(".font-semibold")?.textContent?.toLowerCase() || "";
    const meta = btn.querySelector("[data-org-meta]")?.textContent?.toLowerCase() || "";
    btn.style.display = (!q || name.includes(q) || meta.includes(q)) ? "" : "none";
  });
}

async function selectOrg(orgId) {
  currentOrgId = orgId;
  const org = currentOrgs.find(o => o._id === orgId);
  if (org) {
    document.getElementById("org-name-sidebar").textContent = org.name;
    const roleLabel = isAdminUser() ? "Admin" : (org.membershipRole || "owner");
    document.getElementById("org-role-sidebar").textContent = `Role: ${roleLabel}`;

    const badge = document.getElementById("admin-badge");
    if (isAdminUser() && badge) {
      badge.classList.remove("hidden");
    }

    document.getElementById("org-meta").textContent = isAdminUser()
      ? `Impersonating · Owner: ${org.owner?.fullname || org.owner?.email || "Unknown"}`
      : (org.membershipRole === "owner" ? "You are the owner" : "You are a manager");
  }
  await loadDashboard();
  await loadEvents();
  await loadManagers();
  await loadReviews();
  loadSettings(org);
}

// ─── Side Nav ───

function initSideNav() {
  document.querySelectorAll(".sidenav-link").forEach(link => {
    link.addEventListener("click", () => {
      switchSection(link.dataset.section);
    });
  });
  document.querySelectorAll(".mobile-tab-link").forEach(link => {
    link.addEventListener("click", () => {
      switchSection(link.dataset.section);
    });
  });
  document.getElementById("goto-events")?.addEventListener("click", () => {
    switchSection("events");
  });
}

function switchSection(section) {
  currentSection = section;
  document.querySelectorAll(".section-content").forEach(el => el.classList.add("hidden"));
  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.remove("hidden");

  // Sync desktop sidenav active state
  document.querySelectorAll(".sidenav-link").forEach(l => {
    if (l.dataset.section === section) {
      l.classList.add("active");
    } else {
      l.classList.remove("active");
    }
  });

  // Sync mobile sub-nav active state
  document.querySelectorAll(".mobile-tab-link").forEach(l => {
    if (l.dataset.section === section) {
      l.classList.add("active", "bg-primary", "text-white");
      l.classList.remove("bg-white", "text-[#64748b]", "border", "border-[#e2e2eb]");
    } else {
      l.classList.remove("active", "bg-primary", "text-white");
      l.classList.add("bg-white", "text-[#64748b]", "border", "border-[#e2e2eb]");
    }
  });

  const ps = document.getElementById("participant-event-select");
  if (section === "participants" && ps && ps.value) loadParticipants(ps.value);
  const as = document.getElementById("attendance-event-select");
  if (section === "attendance" && as && as.value) loadAttendance(as.value);
  const cs = document.getElementById("cert-event-select");
  if (section === "certificates" && cs && cs.value) loadCertificates(cs.value);
  if (section === "reviews") {
    loadReviews();
  }
  if (section === "analytics") {
    loadOrgAnalytics();
  }
}

// ─── Dashboard ───

async function loadDashboard() {
  if (!currentOrgId) return;
  try {
    const { events: rawEvents = [] } = await getOrgActivities(currentOrgId);
    const events = rawEvents.filter(a => a._id);

    const totalParticipants = events.reduce((s, e) => s + (e.participants?.length || 0), 0);
    const upcoming = events.filter(e => e.heldDate && new Date(e.heldDate) > new Date()).length;
    const totalViews = events.reduce((s, e) => s + (e.viewCount || 0), 0);

    document.getElementById("stat-events").textContent = events.length;
    document.getElementById("stat-participants").textContent = totalParticipants;
    document.getElementById("stat-upcoming").textContent = upcoming;
    document.getElementById("stat-views").textContent = totalViews;

    const tbody = document.getElementById("dashboard-events-body");
    const recent = events.slice(0, 5);
    tbody.innerHTML = recent.length
      ? recent.map(e => `
        <tr class="border-b border-[#ecedfa]">
          <td class="py-3 px-4"><span class="font-semibold">${e.title}</span></td>
          <td class="py-3 px-4 text-[#64748b] hidden md:table-cell">${formatDate(e.heldDate)}</td>
          <td class="py-3 px-4 text-[#64748b] hidden sm:table-cell">${e.participants?.length || 0}</td>
          <td class="py-3 px-4">${e.status === "published"
          ? '<span class="badge-approved" style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#d1fae5;color:#059669">Published</span>'
          : '<span class="badge-pending" style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#fef3c7;color:#d97706">Draft</span>'}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="text-center py-8 text-[#94a3b8]">No events yet</td></tr>`;
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

// ─── Events ───

let eventsFilter = "all";
let showExpiredEvents = false;

function initEventsTabs() {
  document.querySelectorAll("[data-events-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-events-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      eventsFilter = btn.dataset.eventsTab;
      renderEventsTable();
    });
  });
}

async function loadEvents() {
  if (!currentOrgId) return;
  try {
    const { events: rawEvents = [] } = await getOrgActivities(currentOrgId);
    currentEvents = rawEvents.filter(a => a._id);
    renderEventsTable();
    populateEventSelects();
  } catch (err) {
    console.error("Load events error:", err);
  }
}

function isEventExpired(heldDate) {
  if (!heldDate) return false;
  // Use Vietnam timezone (Asia/Ho_Chi_Minh) for date-only comparison,
  // consistent with how the backend checks event dates. This prevents
  // newly created future events from appearing as expired due to UTC+7 offset.
  const eventDateStr = new Date(heldDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return eventDateStr < nowStr;
}

function canEditEvent(heldDate) {
  if (!heldDate) return true;
  const heldTime = new Date(heldDate).getTime();
  const now = Date.now();
  const diffMs = heldTime - now;
  return !(diffMs > 0 && diffMs < 30 * 60 * 1000);
}

function renderEventsTable() {
  const tbody = document.getElementById("events-table-body");
  const empty = document.getElementById("events-empty");
  const expiredToggle = document.getElementById("toggle-expired-events");
  if (expiredToggle) {
    const hasExpired = currentEvents.some(e => isEventExpired(e.heldDate));
    expiredToggle.classList.toggle("hidden", !hasExpired);
  }

  let filtered = currentEvents;
  if (eventsFilter !== "all") filtered = filtered.filter(e => e.status === eventsFilter);
  if (!showExpiredEvents) filtered = filtered.filter(e => !isEventExpired(e.heldDate));

  if (!filtered.length) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = filtered.map(e => {
    const expired = isEventExpired(e.heldDate);
    const canEdit = canEditEvent(e.heldDate);
    const editDisabled = !canEdit && !expired;
    const editTitle = editDisabled ? 'Không thể chỉnh sửa sự kiện trước thời gian diễn ra 30 phút' : 'Edit';
    return `
    <tr class="border-b border-[#ecedfa] hover:bg-[#f8f9fc] transition-colors ${expired ? 'opacity-60' : ''}" data-id="${e._id}">
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[#ecedfa] overflow-hidden shrink-0">
            ${e.thumbnail
      ? `<img src="${e.thumbnail}" class="w-full h-full object-cover" />`
      : `<div class="w-full h-full flex items-center justify-center text-[#94a3b8]"><i class="fa-regular fa-image text-sm"></i></div>`
    }
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-[#191b22] truncate max-w-[200px]">${e.title}</p>
          </div>
        </div>
      </td>
      <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${formatDate(e.heldDate)}</td>
      <td class="py-3.5 px-4 text-[#64748b] hidden sm:table-cell">${e.participants?.length || 0}</td>
      <td class="py-3.5 px-4 text-[#64748b] hidden lg:table-cell">${capitalize(e.type || "")}</td>
      <td class="py-3.5 px-4">${e.status === "published"
      ? '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#d1fae5;color:#059669">Published</span>'
      : '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#fef3c7;color:#d97706">Draft</span>'}</td>
      <td class="py-3.5 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button class="view-event-btn w-9 h-9 rounded-lg border border-[#e2e2eb] bg-white flex items-center justify-center text-[#64748b] hover:bg-[#dae1ff] hover:text-primary transition-all spring-ease" title="View">
            <i class="fa-regular fa-eye text-sm"></i>
          </button>
          <button class="edit-event-btn w-9 h-9 rounded-lg border border-[#e2e2eb] bg-white flex items-center justify-center transition-all spring-ease ${editDisabled ? 'opacity-40 cursor-not-allowed' : 'text-[#1755ba] hover:bg-[#dae1ff] hover:text-primary'}" title="${editTitle}" ${editDisabled ? 'disabled' : ''}>
            <i class="fa-solid fa-pen text-sm"></i>
          </button>
          <button class="delete-event-btn w-9 h-9 rounded-lg border border-[#e2e2eb] bg-white flex items-center justify-center text-[#ef4444] hover:bg-red-50 hover:border-red-200 transition-all spring-ease" title="Delete">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        </div>
      </td>
    </tr>
  `}).join("");

  tbody.querySelectorAll(".view-event-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.closest("tr").dataset.id;
      openEventDetailModal(id);
    });
  });

  tbody.querySelectorAll(".edit-event-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.closest("tr").dataset.id;
      const event = currentEvents.find(ev => ev._id === id);
      if (!canEditEvent(event?.heldDate)) {
        alert('Không thể chỉnh sửa sự kiện trước thời gian diễn ra 30 phút');
        return;
      }
      window.location.href = `/hostActivity.html?edit=${id}&org=${currentOrgId}`;
    });
  });

  tbody.querySelectorAll(".delete-event-btn").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = btn.closest("tr").dataset.id;
      if (!confirm("Delete this event? This cannot be undone.")) return;
      try {
        await del(`/events/${id}`);
        currentEvents = currentEvents.filter(ev => ev._id !== id);
        renderEventsTable();
      } catch (err) {
        alert(err.message || "Failed to delete event");
      }
    });
  });
}

// ─── Event Detail Modal ───

function openEventDetailModal(eventId) {
  const event = currentEvents.find(e => e._id === eventId);
  if (!event) return;

  const overlay = document.getElementById("event-detail-overlay");
  const body = document.getElementById("event-detail-body");
  if (!overlay || !body) return;

  const heldDate = formatDate(event.heldDate);
  const type = capitalize(event.type || "Event");
  const source = event.createdByName || "—";

  body.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="md:w-[340px] shrink-0">
        ${event.thumbnail
          ? `<img src="${event.thumbnail}" class="w-full h-[240px] object-cover rounded-2xl" alt="${event.title}" />`
          : `<div class="w-full h-[240px] rounded-2xl bg-[#ecedfa] flex items-center justify-center text-[#94a3b8]"><i class="fa-regular fa-image text-4xl"></i></div>`
        }
        <div class="mt-4 space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#dae1ff] flex items-center justify-center text-primary shrink-0"><i class="fa-regular fa-calendar"></i></div>
            <div><p class="text-[13px] text-[#64748b]">Date</p><p class="font-semibold text-[#191b22]">${heldDate}</p></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#dae1ff] flex items-center justify-center text-primary shrink-0"><i class="fa-regular fa-user"></i></div>
            <div><p class="text-[13px] text-[#64748b]">Host</p><p class="font-semibold text-[#191b22]">${source}</p></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#dae1ff] flex items-center justify-center text-primary shrink-0"><i class="fa-solid fa-tag"></i></div>
            <div><p class="text-[13px] text-[#64748b]">Type</p><p class="font-semibold text-[#191b22]">${type}</p></div>
          </div>
          ${event.location ? `
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#dae1ff] flex items-center justify-center text-primary shrink-0"><i class="fa-solid fa-location-dot"></i></div>
            <div><p class="text-[13px] text-[#64748b]">Location</p><p class="font-semibold text-[#191b22]">${event.location}</p></div>
          </div>` : ''}
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#dae1ff] flex items-center justify-center text-primary shrink-0"><i class="fa-regular fa-user"></i></div>
            <div><p class="text-[13px] text-[#64748b]">Participants</p><p class="font-semibold text-[#191b22]">${event.participants?.length || 0}</p></div>
          </div>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <h2 class="font-headline-md text-2xl font-bold text-[#191b22] mb-2">${event.title}</h2>
        <div class="flex flex-wrap gap-2 mb-4">
          ${(event.tags || []).map(t => `<span class="inline-block text-xs font-semibold py-1 px-2.5 rounded-full bg-[#dae1ff] text-primary">${t}</span>`).join('')}
        </div>
        <div class="bg-[#f8f9fc] rounded-2xl p-5 max-h-[400px] overflow-y-auto text-sm leading-relaxed text-[#475569] whitespace-pre-wrap">
          ${event.description || "No description"}
        </div>
      </div>
    </div>`;

  overlay.removeAttribute("hidden");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeEventDetailModal() {
  const overlay = document.getElementById("event-detail-overlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  setTimeout(() => overlay.setAttribute("hidden", ""), 300);
}

// ─── Expired Events Toggle ───

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-expired-events");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      showExpiredEvents = !showExpiredEvents;
      toggleBtn.classList.toggle("bg-[#dae1ff]", showExpiredEvents);
      const icon = toggleBtn.querySelector(".material-symbols-outlined");
      const text = toggleBtn.querySelector("span:last-child");
      if (icon) icon.textContent = showExpiredEvents ? "visibility_off" : "visibility";
      if (text) text.textContent = showExpiredEvents ? "Hide Expired Events" : "Show Expired Events";
      renderEventsTable();
    });
  }

  const detailBackdrop = document.getElementById("event-detail-backdrop");
  if (detailBackdrop) detailBackdrop.addEventListener("click", closeEventDetailModal);
  const detailClose = document.getElementById("event-detail-close");
  if (detailClose) detailClose.addEventListener("click", closeEventDetailModal);
});

function initCreateEvent() {
  document.getElementById("create-event-btn").addEventListener("click", () => {
    if (!currentOrgId) return alert("Select an organization first");
    window.location.href = `/hostActivity.html?org=${currentOrgId}`;
  });
}

function populateEventSelects() {
  renderCustomSelect("participant-event-select-wrapper", "participant-event-select", currentEvents, "Select an event...");
  renderCustomSelect("attendance-event-select-wrapper", "attendance-event-select", currentEvents, "Select an event...");
  
  renderCustomSelect("cert-event-select-wrapper", "cert-event-select", currentEvents, "Select an event...");
}

function renderCustomSelect(wrapperId, hiddenInputId, events, placeholder = "Select an event...") {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  // Preserve the current selected value
  let currentValue = "";
  const existingInput = document.getElementById(hiddenInputId);
  if (existingInput) {
    currentValue = existingInput.value;
  }

  // Clear wrapper
  wrapper.innerHTML = "";

  // Create container
  const container = document.createElement("div");
  container.className = "custom-select-container relative min-w-[280px]";

  // Find selected event
  const selectedEvent = events.find(e => e._id === currentValue);

  // Trigger button HTML
  const triggerBtn = document.createElement("button");
  triggerBtn.type = "button";
  triggerBtn.className = "custom-select-trigger w-full px-4 py-2.5 rounded-xl border border-[#e2e2eb] bg-white text-sm outline-none focus:border-primary flex items-center justify-between cursor-pointer transition-all duration-200 hover:border-primary/50 shadow-sm";
  
  const triggerContent = document.createElement("div");
  triggerContent.className = "flex items-center gap-3 min-w-0";

  const triggerImgDiv = document.createElement("div");
  triggerImgDiv.className = "trigger-thumbnail w-6 h-6 rounded-md bg-[#ecedfa] overflow-hidden shrink-0" + (selectedEvent && selectedEvent.thumbnail ? "" : " hidden");
  const triggerImg = document.createElement("img");
  triggerImg.className = "w-full h-full object-cover";
  if (selectedEvent && selectedEvent.thumbnail) {
    triggerImg.src = selectedEvent.thumbnail;
  }
  triggerImgDiv.appendChild(triggerImg);
  triggerContent.appendChild(triggerImgDiv);

  const triggerText = document.createElement("span");
  triggerText.className = "custom-select-selected-value text-[#191b22] font-semibold truncate";
  triggerText.textContent = selectedEvent ? selectedEvent.title : placeholder;
  triggerContent.appendChild(triggerText);

  triggerBtn.appendChild(triggerContent);

  const arrow = document.createElement("span");
  arrow.className = "material-symbols-outlined select-arrow text-[#64748b] transition-transform duration-200 text-[20px]";
  arrow.textContent = "keyboard_arrow_down";
  triggerBtn.appendChild(arrow);

  container.appendChild(triggerBtn);

  // Dropdown list
  const dropdown = document.createElement("div");
  dropdown.className = "custom-select-dropdown absolute top-full left-0 right-0 mt-2 bg-white border border-[#ecedfa] rounded-2xl shadow-xl z-[100] max-h-[320px] flex flex-col hidden transform origin-top scale-95 opacity-0 transition-all duration-200";

  // Search box
  const searchDiv = document.createElement("div");
  searchDiv.className = "p-3 border-b border-[#ecedfa]";
  searchDiv.innerHTML = `
    <div class="relative flex items-center">
      <span class="material-symbols-outlined absolute left-3 text-[#64748b] text-[18px]">search</span>
      <input type="text" class="custom-select-search w-full pl-9 pr-4 py-2 rounded-xl border border-[#e2e2eb] text-sm outline-none focus:border-primary placeholder-[#94a3b8]" placeholder="Search event...">
    </div>
  `;
  dropdown.appendChild(searchDiv);

  // List container
  const list = document.createElement("div");
  list.className = "custom-select-list overflow-y-auto flex-grow p-1 max-h-[220px]";

  // Populate list
  function renderListItems(filteredEvents) {
    list.innerHTML = "";
    if (filteredEvents.length === 0) {
      list.innerHTML = `<div class="p-4 text-center text-[#94a3b8] text-xs">No events found</div>`;
      return;
    }

    filteredEvents.forEach(e => {
      const item = document.createElement("div");
      item.className = "custom-select-item flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#f8f9fc] transition-colors" + (e._id === currentValue ? " bg-[#f0f4ff]" : "");
      
      const thumb = e.thumbnail 
        ? `<img src="${e.thumbnail}" class="w-10 h-10 rounded-lg object-cover shrink-0" />`
        : `<div class="w-10 h-10 rounded-lg bg-[#ecedfa] flex items-center justify-center text-[#94a3b8] shrink-0"><i class="fa-regular fa-image text-sm"></i></div>`;
      
      item.innerHTML = `
        ${thumb}
        <div class="min-w-0 flex-grow">
          <div class="text-sm font-semibold text-[#191b22] truncate">${e.title}</div>
          <div class="text-xs text-[#64748b] flex items-center gap-1 mt-0.5">
            <span class="material-symbols-outlined text-[12px]">calendar_today</span>
            ${formatDate(e.heldDate)}
          </div>
        </div>
        ${e._id === currentValue ? `<span class="material-symbols-outlined text-primary text-[18px]">check_circle</span>` : ""}
      `;

      item.addEventListener("click", () => {
        // Update input and trigger event
        input.value = e._id;
        triggerText.textContent = e.title;
        if (e.thumbnail) {
          triggerImg.src = e.thumbnail;
          triggerImgDiv.classList.remove("hidden");
        } else {
          triggerImgDiv.classList.add("hidden");
        }

        // Update selected visual state in-place (no full re-render)
        list.querySelectorAll(".custom-select-item").forEach(el => {
          el.classList.remove("bg-[#f0f4ff]");
          const icon = el.querySelector(".material-symbols-outlined.text-primary");
          if (icon) icon.remove();
        });
        item.classList.add("bg-[#f0f4ff]");
        const checkSpan = document.createElement("span");
        checkSpan.className = "material-symbols-outlined text-primary text-[18px]";
        checkSpan.textContent = "check_circle";
        item.appendChild(checkSpan);

        closeDropdown();
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });

      list.appendChild(item);
    });
  }

  renderListItems(events);
  dropdown.appendChild(list);
  container.appendChild(dropdown);

  // Hidden input
  const input = document.createElement("input");
  input.type = "hidden";
  input.id = hiddenInputId;
  input.className = "custom-select-value";
  input.value = currentValue;
  container.appendChild(input);

  wrapper.appendChild(container);

  // Dropdown open/close logic
  let isOpen = false;
  function openDropdown() {
    isOpen = true;
    dropdown.classList.remove("hidden");
    // Animation frame for transition
    requestAnimationFrame(() => {
      dropdown.classList.remove("scale-95", "opacity-0");
      dropdown.classList.add("scale-100", "opacity-100");
    });
    arrow.style.transform = "rotate(180deg)";
    // Focus search
    setTimeout(() => {
      searchDiv.querySelector("input").focus();
    }, 50);
  }

  function closeDropdown() {
    isOpen = false;
    dropdown.classList.remove("scale-100", "opacity-100");
    dropdown.classList.add("scale-95", "opacity-0");
    arrow.style.transform = "";
    // Wait for animation before hiding
    setTimeout(() => {
      if (!isOpen) dropdown.classList.add("hidden");
    }, 200);
  }

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isOpen) {
      closeDropdown();
    } else {
      // Close all other custom dropdowns first
      document.querySelectorAll(".custom-select-dropdown").forEach(d => {
        d.classList.add("hidden", "scale-95", "opacity-0");
      });
      document.querySelectorAll(".select-arrow").forEach(a => {
        a.style.transform = "";
      });
      openDropdown();
    }
  });

  // Search logic
  const searchInput = searchDiv.querySelector("input");
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = events.filter(ev => ev.title.toLowerCase().includes(q));
    renderListItems(filtered);
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      closeDropdown();
    }
  });
}

// ─── Participants ───

function initParticipantEventSelect() {
  const wrapper = document.getElementById("participant-event-select-wrapper");
  if (!wrapper) return;
  wrapper.addEventListener("change", (e) => {
    if (e.target.id === "participant-event-select") {
      if (e.target.value) {
        loadParticipants(e.target.value);
      } else {
        document.getElementById("participants-table-body").innerHTML = "";
        document.getElementById("participants-empty").classList.remove("hidden");
        document.getElementById("participant-count").textContent = "0";
      }
    }
  });
}

async function loadParticipants(eventId) {
  try {
    const { event } = await get(`/events/${eventId}?includeParticipants=true`);
    const participants = event?.participants || [];
    document.getElementById("participant-count").textContent = participants.length;
    const tbody = document.getElementById("participants-table-body");
    const empty = document.getElementById("participants-empty");

    if (!participants.length) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    // If participants are populated objects
    if (participants.length && typeof participants[0] === "object") {
      tbody.innerHTML = participants.map(p => `
        <tr class="border-b border-[#ecedfa]">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              ${p.avatar
          ? `<img src="${p.avatar}" class="w-8 h-8 rounded-full object-cover" />`
          : `<div class="w-8 h-8 rounded-full bg-[#dae1ff] flex items-center justify-center text-primary text-xs font-bold">${(p.fullname?.[0] || "?").toUpperCase()}</div>`}
              <span class="font-semibold">${p.fullname || "Unknown"}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${p.email || "—"}</td>
          <td class="py-3.5 px-4 text-[#64748b] hidden sm:table-cell">${formatDate(p.joinedAt || event.createdAt)}</td>
          <td class="py-3.5 px-4"><span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#d1fae5;color:#059669">Joined</span></td>
        </tr>
      `).join("");
    } else {
      // If only IDs, fetch user details
      const { users } = await post("/user/batch", { ids: participants });
      tbody.innerHTML = (users || []).map(u => `
        <tr class="border-b border-[#ecedfa]">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              ${u.avatar ? `<img src="${u.avatar}" class="w-8 h-8 rounded-full object-cover" />`
          : `<div class="w-8 h-8 rounded-full bg-[#dae1ff] flex items-center justify-center text-primary text-xs font-bold">${(u.fullname?.[0] || "?").toUpperCase()}</div>`}
              <span class="font-semibold">${u.fullname || "Unknown"}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${u.email || "—"}</td>
          <td class="py-3.5 px-4 text-[#64748b] hidden sm:table-cell">—</td>
          <td class="py-3.5 px-4"><span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#d1fae5;color:#059669">Joined</span></td>
        </tr>
      `).join("");
    }
  } catch (err) {
    console.error("Load participants error:", err);
  }
}

// ─── Attendance ───

function initAttendanceEventSelect() {
  const wrapper = document.getElementById("attendance-event-select-wrapper");
  if (!wrapper) return;
  wrapper.addEventListener("change", (e) => {
    if (e.target.id === "attendance-event-select") {
      if (e.target.value) {
        loadAttendance(e.target.value);
      } else {
        document.getElementById("attendance-table-body").innerHTML = "";
        const empty = document.getElementById("attendance-empty");
        if (empty) {
          empty.classList.remove("hidden");
          empty.innerHTML = `<i class="fa-solid fa-qrcode text-4xl mb-3 block"></i>
            <p class="text-base font-semibold">Select an event to view attendance</p>`;
        }
        const statsGrid = document.querySelector("#section-attendance .grid.grid-cols-1");
        const actionBtns = document.querySelector("#section-attendance .flex.gap-3.mb-6");
        const attendanceListHeader = document.querySelector("#section-attendance .px-6.py-4");
        const attendanceTable = document.querySelector("#section-attendance .overflow-x-auto");
        if (statsGrid) statsGrid.style.opacity = "1";
        if (actionBtns) actionBtns.style.opacity = "1";
        if (attendanceListHeader) attendanceListHeader.style.opacity = "1";
        if (attendanceTable) attendanceTable.style.opacity = "1";
      }
    }
  });
}

let attendanceCache = {
  eventId: null,
  records: [],
  lookupMap: new Map(),
  eventRules: { lateCheckinMinutes: 0, expiredCheckinMinutes: 0, heldDate: null },
  isPastEvent: false
};

let backgroundQueue = [];
let totalQueueEnqueued = 0;
let totalQueueProcessed = 0;
let isProcessingQueue = false;

function updateQueueBadgeUI() {
  const badge = document.getElementById("queue-status-badge");
  const dot = document.getElementById("queue-status-dot");
  const text = document.getElementById("queue-status-text");
  if (!badge || !text) return;

  if (totalQueueEnqueued === 0) {
    badge.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    badge.classList.remove("opacity-100", "translate-y-0");
    return;
  }

  badge.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
  badge.classList.add("opacity-100", "translate-y-0");

  const pending = backgroundQueue.length;
  if (pending > 0) {
    if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
    text.textContent = `Sync: ${totalQueueProcessed}/${totalQueueEnqueued}`;
  } else {
    if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400";
    text.textContent = `Synced ${totalQueueProcessed}/${totalQueueEnqueued}`;
    setTimeout(() => {
      if (backgroundQueue.length === 0) {
        totalQueueEnqueued = 0;
        totalQueueProcessed = 0;
        updateQueueBadgeUI();
      }
    }, 4000);
  }
}

async function processBackgroundQueue() {
  if (isProcessingQueue || backgroundQueue.length === 0) return;
  isProcessingQueue = true;

  while (backgroundQueue.length > 0) {
    const job = backgroundQueue[0];
    updateQueueBadgeUI();

    let success = false;
    try {
      await scanAttendance(job.eventId, job.code);
      success = true;
    } catch (err) {
      console.warn(`Background checkin attempt ${(job.attempts || 0) + 1} failed:`, err);
      job.attempts = (job.attempts || 0) + 1;
      if (job.attempts < 3) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }

    backgroundQueue.shift();
    totalQueueProcessed++;
    updateQueueBadgeUI();
  }

  isProcessingQueue = false;

  if (attendanceCache.eventId) {
    loadAttendance(attendanceCache.eventId).catch(() => {});
  }
}

function rebuildAttendanceCache(eventId, records, event, isPastEvent) {
  attendanceCache.eventId = eventId;
  attendanceCache.records = records;
  attendanceCache.isPastEvent = isPastEvent;
  attendanceCache.eventRules = {
    lateCheckinMinutes: event.lateCheckinMinutes || 0,
    expiredCheckinMinutes: event.expiredCheckinMinutes || 0,
    heldDate: event.heldDate
  };

  const map = new Map();
  records.forEach(r => {
    const user = r.user || {};
    const ext = r.externalParticipant || {};

    const keys = [
      user.studentId,
      user.verifiedStudentId,
      user.username,
      r.ticket?.qrCode,
      ext.studentId
    ].filter(Boolean);

    keys.forEach(k => {
      const normalized = String(k).trim().toLowerCase();
      if (normalized) map.set(normalized, r);
    });
  });

  attendanceCache.lookupMap = map;
}

function renderAttendanceTableRows(records, isPastEvent) {
  const tbody = document.getElementById("attendance-table-body");
  const empty = document.getElementById("attendance-empty");
  if (!tbody || !empty) return;

  if (!records || !records.length) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = records.map(r => {
    const user = r.user || (r.isExternal ? { fullname: r.externalParticipant?.fullname, email: `External (${r.externalParticipant?.studentId || 'ID'})` } : {});
    const status = r.status || "absent";
    let badge = '';
    if (status === 'present') {
      badge = '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#d1fae5;color:#059669">Present</span>';
    } else if (status === 'late') {
      badge = '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#fef3c7;color:#d97706">Late</span>';
    } else {
      badge = '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#fee2e2;color:#dc2626">Absent</span>';
    }
    const isCheckedIn = status === 'present' || status === 'late';
    return `
      <tr class="border-b border-[#ecedfa]">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            ${user.avatar
              ? `<img src="${user.avatar}" class="w-8 h-8 rounded-full object-cover" />`
              : `<div class="w-8 h-8 rounded-full bg-[#dae1ff] flex items-center justify-center text-primary text-xs font-bold">${(user.fullname?.[0] || "?").toUpperCase()}</div>`}
            <span class="font-semibold">${user.fullname || "Unknown"}</span>
          </div>
        </td>
        <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${user.email || "—"}</td>
        <td class="py-3.5 px-4">${badge}</td>
        <td class="py-3.5 px-4 text-[#64748b] hidden sm:table-cell">${r.checkedInAt ? formatDate(r.checkedInAt) : "—"}</td>
        <td class="py-3.5 px-4 text-right">
          ${isPastEvent
            ? (isCheckedIn
                ? `<span class="text-sm text-slate-400 font-semibold cursor-not-allowed select-none">Mark Absent</span>`
                : `<span class="text-sm text-slate-400 font-semibold cursor-not-allowed select-none">Check In</span>`)
            : (isCheckedIn
                ? `<button class="manual-checkout-btn text-sm text-red-600 font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${user._id || r._id}">Mark Absent</button>`
                : `<button class="manual-checkin-btn text-sm text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${user._id || r._id}">Check In</button>`)}
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".manual-checkin-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.userId;
      const eventId = document.getElementById("attendance-event-select").value;
      if (!eventId || !userId) return;
      try {
        await markAttendance(eventId, userId, "present");
        await loadAttendance(eventId);
      } catch (err) {
        alert(err.message || "Check-in failed");
      }
    });
  });

  tbody.querySelectorAll(".manual-checkout-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.userId;
      const eventId = document.getElementById("attendance-event-select").value;
      if (!eventId || !userId) return;
      if (!confirm("Change status to Absent for this participant?")) return;
      try {
        await markAttendance(eventId, userId, "absent");
        await loadAttendance(eventId);
      } catch (err) {
        alert(err.message || "Operation failed");
      }
    });
  });
}

async function loadAttendance(eventId) {
  try {
    const [attData, statsData, eventData] = await Promise.all([
      getAttendance(eventId).catch(() => ({ attendance: [] })),
      getAttendanceStats(eventId).catch(() => ({ stats: { totalParticipants: 0, present: 0, absent: 0 } })),
      get(`/events/${eventId}`).catch(() => ({ event: {} })),
    ]);
    const event = eventData.event || {};
    const eventDate = event.heldDateEnd || event.heldDate;
    let isPastEvent = false;
    if (eventDate) {
      const eventDateString = new Date(eventDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const nowDateString = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      isPastEvent = nowDateString > eventDateString;
    }

    const records = attData.attendance || [];
    rebuildAttendanceCache(eventId, records, event, isPastEvent);

    const scanQrBtn = document.getElementById("scan-qr-btn");
    const initBtn = document.getElementById("init-attendance-btn");
    if (scanQrBtn) {
      if (isPastEvent) {
        scanQrBtn.disabled = true;
        scanQrBtn.classList.add("opacity-50", "cursor-not-allowed");
        scanQrBtn.classList.remove("cursor-pointer");
        scanQrBtn.title = "Cannot scan QR code for a past event";
      } else {
        scanQrBtn.disabled = false;
        scanQrBtn.classList.remove("opacity-50", "cursor-not-allowed");
        scanQrBtn.classList.add("cursor-pointer");
        scanQrBtn.title = "";
      }
    }
    if (initBtn) {
      if (isPastEvent) {
        initBtn.disabled = true;
        initBtn.classList.add("opacity-50", "cursor-not-allowed");
        initBtn.classList.remove("cursor-pointer");
        initBtn.title = "Cannot initialize attendance for a past event";
      } else {
        initBtn.disabled = false;
        initBtn.classList.remove("opacity-50", "cursor-not-allowed");
        initBtn.classList.add("cursor-pointer");
        initBtn.title = "";
      }
    }

    const hasAttendance = event.hasAttendance === true || event.hasAttendance === 'true';

    const attendanceContainer = document.getElementById("attendance-content");
    const attendanceEmpty = document.getElementById("attendance-empty");
    const attendanceTable = document.querySelector("#section-attendance .overflow-x-auto");
    const statsGrid = document.querySelector("#section-attendance .grid.grid-cols-1");
    const actionBtns = document.querySelector("#section-attendance .flex.gap-3.mb-6");
    const attendanceListHeader = document.querySelector("#section-attendance .px-6.py-4");

    if (!hasAttendance) {
      if (attendanceEmpty) {
        attendanceEmpty.classList.remove("hidden");
        attendanceEmpty.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation text-4xl mb-3 block text-[#f59e0b]"></i>
          <p class="text-base font-semibold text-[#64748b]">Attendance tracking is not enabled for this event</p>
          <p class="text-sm text-[#94a3b8] mt-1">You can enable it when creating the event or contact the event organizer.</p>
        `;
      }
      document.getElementById("stat-present").textContent = "0";
      document.getElementById("stat-absent").textContent = "0";
      document.getElementById("stat-total-att").textContent = "0";
      document.getElementById("attendance-count").textContent = "0 record(s)";
      const tbody = document.getElementById("attendance-table-body");
      if (tbody) tbody.innerHTML = "";
      if (statsGrid) statsGrid.style.opacity = "0.4";
      if (actionBtns) actionBtns.style.opacity = "0.4";
      if (attendanceListHeader) attendanceListHeader.style.opacity = "0.4";
      if (attendanceTable) attendanceTable.style.opacity = "0.4";
      const rulesEl = document.getElementById("checkin-rules-display");
      if (rulesEl) rulesEl.innerHTML = "";
      return;
    }

    if (statsGrid) statsGrid.style.opacity = "1";
    if (actionBtns) actionBtns.style.opacity = "1";
    if (attendanceListHeader) attendanceListHeader.style.opacity = "1";
    if (attendanceTable) attendanceTable.style.opacity = "1";
    if (attendanceEmpty) {
      attendanceEmpty.classList.remove("hidden");
      attendanceEmpty.innerHTML = `<i class="fa-solid fa-qrcode text-4xl mb-3 block"></i>
        <p class="text-base font-semibold">No attendance records yet</p>`;
    }

    const lateMin = event.lateCheckinMinutes || 0;
    const expiredMin = event.expiredCheckinMinutes || 0;
    const rulesEl = document.getElementById("checkin-rules-display");
    if (rulesEl) {
      if (lateMin > 0 || expiredMin > 0) {
        const parts = [];
        if (lateMin > 0) parts.push(`Late after <strong>${lateMin} min</strong>`);
        if (expiredMin > 0) parts.push(`Expire after <strong>${expiredMin} min</strong>`);
        rulesEl.innerHTML = 'Check-in Rules: ' + parts.join(' &middot; ');
        rulesEl.className = "text-xs text-[#64748b] mt-1";
      } else {
        rulesEl.innerHTML = "Check-in Rules: disabled (all check-ins accepted)";
        rulesEl.className = "text-xs text-[#64748b] mt-1";
      }
    }
    const stats = statsData.stats || {};

    document.getElementById("stat-present").textContent = stats.present || 0;
    document.getElementById("stat-absent").textContent = stats.absent || 0;
    document.getElementById("stat-total-att").textContent = stats.totalParticipants || records.length;
    document.getElementById("attendance-count").textContent = `${records.length} record(s)`;

    renderAttendanceTableRows(records, isPastEvent);
  } catch (err) {
    console.error("Load attendance error:", err);
  }
}

function initQRScan() {
  let activeStream = null;
  let isScanning = false;
  let isMirrored = false;
  let lastScannedCode = "";
  let lastScannedTime = 0;
  let feedbackTimer = null;
  let sessionHistory = [];
  let lastScanTime = 0;
  const SCAN_INTERVAL = 30; // 33 FPS — smooth, responsive, low CPU consumption
  let isProcessingFrame = false;

  // Lazy-init native BarcodeDetector restricted to required formats for maximum speed
  let nativeBarcodeDetector = null;
  async function getNativeBarcodeDetector() {
    if (nativeBarcodeDetector) return nativeBarcodeDetector;
    if (typeof BarcodeDetector === 'undefined') return null;
    try {
      const targetFormats = ['qr_code', 'code_128', 'code_39'];
      nativeBarcodeDetector = new BarcodeDetector({ formats: targetFormats });
      console.log('[Scanner] Native BarcodeDetector ready (target formats only)');
    } catch (e) {
      try {
        nativeBarcodeDetector = new BarcodeDetector();
      } catch (e2) {
        nativeBarcodeDetector = null;
      }
    }
    return nativeBarcodeDetector;
  }
  // Pre-warm the BarcodeDetector
  getNativeBarcodeDetector().catch(() => {});

  // ZXing fallback restricted to target formats only (QR_CODE, CODE_128, CODE_39)
  let zxingReader = null;
  async function getZXingReader() {
    if (zxingReader) return zxingReader;
    if (typeof BrowserMultiFormatReader === 'undefined') return null;
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39
      ]);
      zxingReader = new BrowserMultiFormatReader(hints);
      console.log('[Scanner] ZXing format-restricted reader ready');
      return zxingReader;
    } catch (e) {
      console.warn('[Scanner] ZXing unavailable:', e);
      return null;
    }
  }
  // Pre-warm the ZXing reader
  getZXingReader().catch(() => {});

  let scanType = 'qr'; // 'qr' | 'barcode' — updated dynamically per scan result

  function playBeep(success) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // High double-beep for check-in success
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6
          gain2.gain.setValueAtTime(0.06, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.12);
        }, 90);
      } else {
        // Low buzz for check-in error
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, ctx.currentTime); // C3
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.error("Audio synthesis error:", e);
    }
  }

  function showScanFeedback(state, message = "", user = null, ticketCode = "", isLate = false) {
    const container = document.getElementById("scan-feedback-container");
    const defaultView = document.getElementById("scan-feedback-default");
    const successView = document.getElementById("scan-feedback-success");
    const errorView = document.getElementById("scan-feedback-error");

    if (!container || !defaultView || !successView || !errorView) return;

    defaultView.classList.add("hidden");
    successView.classList.add("hidden");
    errorView.classList.add("hidden");

    container.classList.remove("border-emerald-200", "bg-emerald-50/30", "border-amber-200", "bg-amber-50/30", "border-rose-200", "bg-rose-50/30", "border-slate-200/60", "bg-slate-50");

    if (state === "default" || state === "loading") {
      defaultView.classList.remove("hidden");
      container.classList.add("border-slate-200/60", "bg-slate-50");
      const textEl = defaultView.querySelector("p");
      if (textEl) textEl.textContent = message || (state === "loading" ? "Processing check-in..." : "Position the attendee's ticket QR code or barcode inside the camera viewfinder.");

      const formatLabelEl = document.getElementById("scan-feedback-format");
      if (formatLabelEl) {
        formatLabelEl.textContent = "QR or Barcode";
        formatLabelEl.className = "text-[9px] font-semibold text-slate-400 uppercase tracking-wider";
      }

      const placeholderEl = document.getElementById("scan-feedback-avatar-placeholder");
      if (placeholderEl) {
        placeholderEl.textContent = "person";
        placeholderEl.className = "material-symbols-outlined text-4xl text-slate-400";
      }
      const avatarContainer = document.getElementById("scan-feedback-avatar-container");
      if (avatarContainer) {
        avatarContainer.className = "w-20 h-20 rounded-full border-4 border-slate-300 overflow-hidden shadow-md mx-auto bg-slate-200 flex items-center justify-center";
      }
      const avatarEl = document.getElementById("scan-feedback-avatar");
      if (avatarEl) avatarEl.classList.add("hidden");
    } else if (state === "success" && user) {
      successView.classList.remove("hidden");
      const borderClass = isLate ? "border-amber-200" : "border-emerald-200";
      const bgClass = isLate ? "bg-amber-50/30" : "bg-emerald-50/30";
      container.classList.add(borderClass, bgClass);

      const nameEl = document.getElementById("scan-feedback-name");
      const usernameEl = document.getElementById("scan-feedback-username");
      const emailEl = document.getElementById("scan-feedback-email");
      const codeEl = document.getElementById("scan-feedback-code");
      const avatarEl = document.getElementById("scan-feedback-avatar");
      const placeholderEl = document.getElementById("scan-feedback-avatar-placeholder");
      const statusLabel = document.getElementById("scan-feedback-status-label");
      const avatarContainer = document.getElementById("scan-feedback-avatar-container");
      const formatLabel = document.getElementById("scan-feedback-format");

      if (formatLabel) {
        const isBarcode = scanType === 'barcode';
        formatLabel.textContent = isBarcode ? 'Barcode (ID Card)' : 'QR Ticket';
        formatLabel.className = `text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
          isBarcode
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`;
      }

      if (nameEl) nameEl.textContent = user.fullname || "Unknown Attendee";
      if (usernameEl) {
        const idText = user.studentId ? `ID: ${user.studentId}` : (user.username ? `@${user.username}` : "");
        usernameEl.textContent = idText;
      }
      if (emailEl) emailEl.textContent = user.email || "";
      if (codeEl) codeEl.textContent = ticketCode ? ticketCode.toUpperCase() : "N/A";
      if (statusLabel) {
        if (isLate) {
          statusLabel.textContent = "Checked in (Late)";
          statusLabel.className = "text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full";
        } else {
          statusLabel.textContent = "Checked in";
          statusLabel.className = "text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full";
        }
      }

      if (avatarContainer) {
        const ringGradient = isLate ? 'from-amber-400 to-amber-500' : 'from-emerald-400 to-teal-500';
        avatarContainer.className = `w-24 h-24 rounded-full p-1 bg-gradient-to-tr ${ringGradient} shadow-lg mx-auto flex items-center justify-center overflow-hidden`;
      }

      if (avatarEl && placeholderEl) {
        if (user.avatar) {
          avatarEl.src = user.avatar;
          avatarEl.classList.remove("hidden");
          placeholderEl.classList.add("hidden");
          avatarEl.onerror = () => {
            avatarEl.classList.add("hidden");
            placeholderEl.classList.remove("hidden");
            placeholderEl.textContent = (user.fullname?.[0] || user.username?.[0] || "?").toUpperCase();
            placeholderEl.className = "text-2xl font-bold text-slate-500";
          };
        } else {
          avatarEl.classList.add("hidden");
          placeholderEl.classList.remove("hidden");
          placeholderEl.textContent = (user.fullname?.[0] || user.username?.[0] || "?").toUpperCase();
          placeholderEl.className = "text-2xl font-bold text-slate-500";
        }
      }
    } else if (state === "error") {
      errorView.classList.remove("hidden");
      container.classList.add("border-rose-200", "bg-rose-50/30");

      const errorMsgEl = document.getElementById("scan-feedback-error-message");
      if (errorMsgEl) errorMsgEl.textContent = message || "Invalid or expired ticket code.";
    }
  }

  function setFeedbackWithTimeout(state, message = "", user = null, ticketCode = "", isLate = false) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    showScanFeedback(state, message, user, ticketCode, isLate);

    if (state === "success" || state === "error") {
      feedbackTimer = setTimeout(() => {
        showScanFeedback("default");
      }, 4000);
    }
  }

  function addToHistory(user, ticketCode, isLate = false) {
    const historyList = document.getElementById("scan-history-list");
    const countEl = document.getElementById("history-count");
    if (!historyList) return;

    const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const newItem = {
      fullname: user.fullname || "Unknown Attendee",
      avatar: user.avatar || "",
      ticketCode: ticketCode,
      time: timeStr,
      isLate
    };

    sessionHistory.unshift(newItem);
    if (sessionHistory.length > 5) sessionHistory.pop();

    if (countEl) countEl.textContent = `${sessionHistory.length} Checked In`;

    historyList.innerHTML = sessionHistory.map(item => `
      <div class="flex items-center justify-between p-3 text-xs bg-white hover:bg-slate-50 transition-colors">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200">
            ${item.avatar
              ? `<img src="${item.avatar}" class="w-full h-full object-cover" />`
              : `<span class="font-bold text-[10px] text-slate-500">${(item.fullname?.[0] || "?").toUpperCase()}</span>`
            }
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 truncate">${item.fullname}</p>
            <p class="text-[10px] text-slate-400 font-mono uppercase">${item.ticketCode}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border-emerald-100 border text-[9px] font-semibold">SUCCESS</span>
          <span class="text-[10px] text-slate-400 font-mono">${item.time}</span>
        </div>
      </div>
    `).join("");
  }

  const cameraSelect = document.getElementById("scanner-camera-select");
  const mirrorBtn = document.getElementById("scanner-mirror-btn");
  const zoomSlider = document.getElementById("scanner-zoom-slider");
  const zoomVal = document.getElementById("zoom-value");
  const expSlider = document.getElementById("scanner-exposure-slider");
  const expVal = document.getElementById("exposure-value");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  function updateVideoMirrorStyle() {
    const video = document.getElementById("qr-video");
    if (!video) return;
    if (isMirrored) {
      video.style.transform = "scaleX(-1)";
      if (mirrorBtn) {
        mirrorBtn.classList.add("bg-primary/10", "border-primary", "text-primary");
        mirrorBtn.classList.remove("bg-white", "text-[#64748b]");
      }
    } else {
      video.style.transform = "none";
      if (mirrorBtn) {
        mirrorBtn.classList.remove("bg-primary/10", "border-primary", "text-primary");
        mirrorBtn.classList.add("bg-white", "text-[#64748b]");
      }
    }
  }

  if (mirrorBtn) {
    mirrorBtn.addEventListener("click", () => {
      isMirrored = !isMirrored;
      updateVideoMirrorStyle();
    });
  }

  if (cameraSelect) {
    cameraSelect.addEventListener("change", async (e) => {
      const selectedId = e.target.value;
      if (selectedId && isScanning) {
        await stopScanner();
        await startScanner(selectedId);
      }
    });
  }

  if (zoomSlider && zoomVal) {
    zoomSlider.addEventListener("input", async (e) => {
      const val = parseFloat(e.target.value);
      zoomVal.textContent = `${val.toFixed(1)}x`;
      if (activeStream && isScanning) {
        try {
          const track = activeStream.getVideoTracks()[0];
          if (track) {
            await track.applyConstraints({
              advanced: [{ zoom: val }]
            });
          }
        } catch (err) {
          console.warn("Failed to apply zoom:", err);
        }
      }
    });
  }

  if (expSlider && expVal) {
    expSlider.addEventListener("input", async (e) => {
      const val = parseFloat(e.target.value);
      expVal.textContent = val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
      if (activeStream && isScanning) {
        try {
          const track = activeStream.getVideoTracks()[0];
          if (track) {
            await track.applyConstraints({
              advanced: [{ exposureCompensation: val }]
            });
          }
        } catch (err) {
          console.warn("Failed to apply exposure compensation:", err);
        }
      }
    });
  }

  function scanFrame() {
    if (!isScanning) return;
    const video = document.getElementById("qr-video");
    if (!video) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingFrame) {
      const now = Date.now();
      if (now - lastScanTime >= SCAN_INTERVAL) {
        lastScanTime = now;
        isProcessingFrame = true;

        // Optimal 480px resolution for ultra-fast JS binarization (~180k pixels)
        const maxDim = 480;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const scale = Math.min(maxDim / vw, maxDim / vh, 1.0);
        const targetW = Math.round(vw * scale);
        const targetH = Math.round(vh * scale);

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        // Single-pass draw: if mirrored (front camera), flip horizontally so canvas is ALWAYS in readable left-to-right orientation
        ctx.save();
        if (isMirrored) {
          ctx.translate(targetW, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, targetW, targetH);
        ctx.restore();

        const finalizeFrame = () => { isProcessingFrame = false; };

        try {
          const detector = nativeBarcodeDetector;
          if (detector) {
            // 1. Native BarcodeDetector (Chrome / Edge / Android) — hardware C++ accelerated
            // Pass canvas if mirrored (so text reads left-to-right), otherwise raw video
            const source = isMirrored ? canvas : video;
            detector.detect(source).then(barcodes => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                const raw = barcodes[0].rawValue;
                const fmt = barcodes[0].format || '';
                scanType = fmt === 'qr_code' ? 'qr' : 'barcode';
                onScanSuccess(raw);
                finalizeFrame();
              } else if (!isScanning) {
                finalizeFrame();
              } else {
                tryZXingFallback().finally(finalizeFrame);
              }
            }).catch(() => {
              tryZXingFallback().finally(finalizeFrame);
            });
          } else {
            // 2. ZXing fallback (Safari / iOS)
            tryZXingFallback().finally(finalizeFrame);
          }
        } catch (err) {
          finalizeFrame();
        }

        // Shared ZXing fallback: decodes format-restricted 480px canvas in ~3ms
        async function tryZXingFallback() {
          const zxing = await getZXingReader();
          if (zxing && isScanning) {
            try {
              const result = zxing.decodeFromCanvas(canvas);
              if (result && result.getText && result.getText()) {
                const fmt = result.getBarcodeFormat?.();
                scanType = (fmt === 11) ? 'qr' : 'barcode';
                onScanSuccess(result.getText());
                return;
              }
            } catch (e) {}
          }

          // 3. Fast jsQR fallback
          if (isScanning && typeof jsQR !== "undefined") {
            const imageData = ctx.getImageData(0, 0, targetW, targetH);
            const attempt = (Math.floor(now / 50) % 2 === 0) ? "dontInvert" : "attemptBoth";
            const code = jsQR(imageData.data, targetW, targetH, { inversionAttempts: attempt });
            if (code && code.data) {
              scanType = 'qr';
              onScanSuccess(code.data);
            }
          }
        }
      }
    }
    requestAnimationFrame(scanFrame);
  }

  async function startScanner(cameraId = null) {
    const video = document.getElementById("qr-video");
    if (!video) return;

    try {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        if (videoDevices.length && cameraSelect) {
          cameraSelect.innerHTML = videoDevices.map(d => `<option value="${d.deviceId}">${d.label || `Camera ${d.deviceId}`}</option>`).join("");
          if (cameraId) {
            cameraSelect.value = cameraId;
          } else {
            cameraId = videoDevices[0].deviceId;
            cameraSelect.value = cameraId;
          }
        }
      } catch {}

      const constraints = {
        video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: "environment" } }
      };

      constraints.video.width = { min: 640, ideal: 1280, max: 1920 };
      constraints.video.height = { min: 480, ideal: 720, max: 1080 };
      constraints.video.frameRate = { ideal: 60, min: 30 };

      activeStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = activeStream;
      await video.play();

      // Enable continuous auto-focus if hardware supports it
      try {
        const track = activeStream.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }]
          }).catch(() => {});
        }
      } catch {}

      isScanning = true;
      requestAnimationFrame(scanFrame);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        if (videoDevices.length && cameraSelect) {
          cameraSelect.innerHTML = videoDevices.map(d => `<option value="${d.deviceId}">${d.label || `Camera ${d.deviceId}`}</option>`).join("");
          const track = activeStream.getVideoTracks()[0];
          const settings = track?.getSettings ? track.getSettings() : {};
          if (settings.deviceId) {
            cameraSelect.value = settings.deviceId;
          } else if (cameraId && typeof cameraId === "string") {
            cameraSelect.value = cameraId;
          }

          const label = track?.label?.toLowerCase() || "";
          const isFrontCamera = settings.facingMode === "user" || label.includes("front") || label.includes("user") || label.includes("selfie");
          isMirrored = isFrontCamera;
          updateVideoMirrorStyle();
        }
      } catch {}

      setupCameraCapabilities();
    } catch (err) {
      console.error("Camera start error:", err);
    }
  }

  async function stopScanner() {
    isScanning = false;
    if (activeStream) {
      try {
        activeStream.getTracks().forEach(t => t.stop());
      } catch {}
      activeStream = null;
    }
    if (zxingReader && typeof zxingReader.reset === 'function') {
      try { zxingReader.reset(); } catch {}
    }
    const video = document.getElementById("qr-video");
    if (video) {
      video.srcObject = null;
    }
    isMirrored = false;
    updateVideoMirrorStyle();
    if (zoomSlider) zoomSlider.disabled = true;
    if (zoomVal) zoomVal.textContent = "N/A";
    if (expSlider) expSlider.disabled = true;
    if (expVal) expVal.textContent = "N/A";
  }

  function setupCameraCapabilities() {
    try {
      if (!activeStream) return;
      const track = activeStream.getVideoTracks()[0];
      if (!track) return;
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};

      if (zoomSlider && zoomVal) {
        if (capabilities.zoom) {
          zoomSlider.disabled = false;
          zoomSlider.min = capabilities.zoom.min;
          zoomSlider.max = capabilities.zoom.max;
          zoomSlider.step = capabilities.zoom.step || 0.1;
          const currentSettings = track.getSettings ? track.getSettings() : {};
          zoomSlider.value = currentSettings.zoom || capabilities.zoom.min;
          zoomVal.textContent = `${parseFloat(zoomSlider.value).toFixed(1)}x`;
        } else {
          zoomSlider.disabled = true;
          zoomVal.textContent = "N/A";
        }
      }

      if (expSlider && expVal) {
        if (capabilities.exposureCompensation) {
          expSlider.disabled = false;
          expSlider.min = capabilities.exposureCompensation.min;
          expSlider.max = capabilities.exposureCompensation.max;
          expSlider.step = capabilities.exposureCompensation.step || 0.5;
          const currentSettings = track.getSettings ? track.getSettings() : {};
          expSlider.value = currentSettings.exposureCompensation || 0;
          expVal.textContent = parseFloat(expSlider.value).toFixed(1);
        } else {
          expSlider.disabled = true;
          expVal.textContent = "N/A";
        }
      }
    } catch (err) {
      console.warn("Failed to set up camera capabilities:", err);
    }
  }

  function triggerScanSuccessAnimation() {
    const container = document.getElementById("scanner-viewfinder-container");
    const viewfinder = document.getElementById("scanner-viewfinder");
    if (!container || !viewfinder) return;

    container.classList.add("!border-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.45)]", "scale-[1.02]");
    viewfinder.classList.add("!border-emerald-500", "!border-solid", "scale-105");
    viewfinder.classList.remove("animate-pulse", "border-primary/40");

    setTimeout(() => {
      container.classList.remove("!border-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.45)]", "scale-[1.02]");
      viewfinder.classList.remove("!border-emerald-500", "!border-solid", "scale-105");
      viewfinder.classList.add("animate-pulse", "border-primary/40");
    }, 600);
  }

  async function onScanSuccess(decodedText) {
    const now = Date.now();
    if (decodedText === lastScannedCode && now - lastScannedTime < 3000) {
      // Cooldown to avoid duplicate scanning of the same code
      return;
    }
    lastScannedCode = decodedText;
    lastScannedTime = now;

    triggerScanSuccessAnimation();

    // Process check-in continuously WITHOUT stopping the camera feed
    await processCheckIn(decodedText);
  }

  document.getElementById("scan-qr-btn").addEventListener("click", () => {
    if (document.getElementById("scan-qr-btn").disabled) return;
    const eventId = document.getElementById("attendance-event-select").value;
    if (!eventId) return alert("Select an event first");
    const overlay = document.getElementById("scan-overlay");
    overlay.removeAttribute("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    setTimeout(startScanner, 500);
  });

  function closeScan() {
    stopScanner();

    // Reset scanner UI state
    sessionHistory = [];
    const historyList = document.getElementById("scan-history-list");
    if (historyList) {
      historyList.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 italic">No scans recorded in this session.</div>`;
    }
    const countEl = document.getElementById("history-count");
    if (countEl) countEl.textContent = "0 Checked In";

    if (feedbackTimer) clearTimeout(feedbackTimer);
    showScanFeedback("default");

    const overlay = document.getElementById("scan-overlay");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => overlay.setAttribute("hidden", ""), 300);
  }

  document.getElementById("scan-backdrop").addEventListener("click", closeScan);
  document.getElementById("scan-close").addEventListener("click", closeScan);
  document.getElementById("scan-cancel").addEventListener("click", closeScan);

  const manualInput = document.getElementById("manual-ticket-input");
  const manualBtn = document.getElementById("manual-checkin-btn");

  const handleManualCheckIn = async () => {
    const ticketCode = manualInput.value.trim();
    if (!ticketCode) return;
    await processCheckIn(ticketCode);
  };

  if (manualBtn && manualInput) {
    manualBtn.addEventListener("click", handleManualCheckIn);
    manualInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await handleManualCheckIn();
      }
    });
  }

  async function processCheckIn(ticketCode) {
    const eventId = document.getElementById("attendance-event-select").value;
    if (!ticketCode) return;
    if (!eventId) return alert("Select an event first");

    const codeClean = String(ticketCode).trim().toLowerCase();
    const cachedRecord = attendanceCache.eventId === eventId ? attendanceCache.lookupMap.get(codeClean) : null;

    if (cachedRecord) {
      const currentStatus = cachedRecord.status;
      if (currentStatus === "present" || currentStatus === "late") {
        playBeep(false);
        setFeedbackWithTimeout("error", "Participant is already checked in!");
        if (manualInput) manualInput.value = "";
        return;
      }

      let newStatus = "present";
      const rules = attendanceCache.eventRules;
      if (rules.lateCheckinMinutes > 0 && rules.heldDate) {
        const start = new Date(rules.heldDate);
        const lateThreshold = new Date(start.getTime() + rules.lateCheckinMinutes * 60000);
        if (new Date() > lateThreshold) newStatus = "late";
      }

      cachedRecord.status = newStatus;
      cachedRecord.checkedInAt = new Date().toISOString();

      playBeep(true);
      const isLate = newStatus === "late";
      const userPayload = cachedRecord.isExternal ? {
        fullname: cachedRecord.externalParticipant?.fullname,
        studentId: cachedRecord.externalParticipant?.studentId
      } : (cachedRecord.user || {});

      setFeedbackWithTimeout("success", `Checked in ${userPayload.fullname || 'participant'}`, userPayload, ticketCode, isLate);
      addToHistory(userPayload, ticketCode, isLate);
      if (manualInput) manualInput.value = "";

      const presentEl = document.getElementById("stat-present");
      const absentEl = document.getElementById("stat-absent");
      if (presentEl && absentEl) {
        let p = parseInt(presentEl.textContent) || 0;
        let a = parseInt(absentEl.textContent) || 0;
        presentEl.textContent = p + 1;
        if (a > 0) absentEl.textContent = a - 1;
      }
      renderAttendanceTableRows(attendanceCache.records, attendanceCache.isPastEvent);

      totalQueueEnqueued++;
      backgroundQueue.push({ eventId, code: ticketCode, attempts: 0 });
      updateQueueBadgeUI();
      processBackgroundQueue();
      return;
    }

    setFeedbackWithTimeout("loading", "Processing check-in...");

    try {
      const response = await scanAttendance(eventId, ticketCode);
      playBeep(true);
      const isLate = response.attendance?.status === "late";
      setFeedbackWithTimeout("success", response.message || "", response.user, ticketCode, isLate);
      addToHistory(response.user || {}, ticketCode, isLate);

      if (manualInput) manualInput.value = "";
      await loadAttendance(eventId);
    } catch (err) {
      playBeep(false);
      setFeedbackWithTimeout("error", err.message || "Check-in failed");
    }
  }
}

function initAttendanceButtons() {
  const initBtn = document.getElementById("init-attendance-btn");
  if (initBtn) {
    initBtn.addEventListener("click", async () => {
      if (initBtn.disabled) return;
      const eventId = document.getElementById("attendance-event-select")?.value;
      if (!eventId) return alert("Select an event first");
      if (!confirm("Initialize/refresh attendance records for all participants?")) return;
      try {
        await initAttendance(eventId);
        await loadAttendance(eventId);
        alert("Attendance initialized");
      } catch (err) {
        alert(err.message || "Failed to init attendance");
      }
    });
  }

  const excelInput = document.getElementById("excel-file-input");
  if (excelInput) {
    excelInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const eventId = document.getElementById("attendance-event-select")?.value;
      if (!eventId) {
        alert("Select an event first before importing Excel");
        excelInput.value = "";
        return;
      }

      if (!confirm(`Import Excel list for this event?\nFile: ${file.name}`)) {
        excelInput.value = "";
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await importExcelAttendance(eventId, formData);
        excelInput.value = "";

        const summary = res.summary || {};
        let msg = res.message || "Import completed!";
        if (summary.totalRows) {
          msg += `\n- Total rows: ${summary.totalRows}\n- System users matched: ${summary.matchedSystemUsers || 0}\n- External participants added: ${summary.createdExternalParticipants || 0}`;
        }
        if (summary.errors && summary.errors.length) {
          msg += `\n\nWarnings/Errors:\n${summary.errors.slice(0, 5).join("\n")}`;
        }

        alert(msg);
        await loadAttendance(eventId);
      } catch (err) {
        excelInput.value = "";
        alert(err.message || "Failed to import Excel attendance list");
      }
    });
  }
}

// ─── Certificates ───

function initCertEventSelect() {
  const wrapper = document.getElementById("cert-event-select-wrapper");
  if (!wrapper) return;
  wrapper.addEventListener("change", (e) => {
    if (e.target.id === "cert-event-select") {
      if (e.target.value) {
        loadCertificates(e.target.value);
      } else {
        document.getElementById("certs-table-body").innerHTML = "";
        const empty = document.getElementById("certs-empty");
        if (empty) {
          empty.classList.remove("hidden");
          empty.innerHTML = `
            <i class="fa-solid fa-award text-4xl mb-3 block"></i>
            <p class="text-base font-semibold">Select an event to view certificates</p>
          `;
        }
      }
    }
  });
}

function showCertsNotSupported() {
  const tbody = document.getElementById("certs-table-body");
  const empty = document.getElementById("certs-empty");
  if (tbody) tbody.innerHTML = "";
  if (empty) {
    empty.classList.remove("hidden");
    empty.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation text-4xl mb-3 block text-[#f59e0b]"></i>
      <p class="text-base font-semibold text-[#64748b]">Certificates not supported for this event</p>
      <p class="text-sm text-[#94a3b8] mt-1">Enable the certificate option when creating or editing the event.</p>
    `;
  }
}

async function loadCertificates(eventId) {
  try {
    const event = currentEvents.find(ev => ev._id === eventId);
    if (!event || !(event.hasCertificate === true || event.hasCertificate === 'true')) {
      showCertsNotSupported();
      return;
    }
    const { certificates = [] } = await getEventCertificates(eventId);
    const tbody = document.getElementById("certs-table-body");
    const empty = document.getElementById("certs-empty");

    if (!certificates.length) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      empty.innerHTML = `
        <i class="fa-solid fa-award text-4xl mb-3 block"></i>
        <p class="text-base font-semibold">No certificates issued yet</p>
        <p class="text-sm text-[#94a3b8] mt-1">Issue certificates for present participants.</p>
      `;
      return;
    }
    empty.classList.add("hidden");

    tbody.innerHTML = certificates.map(c => {
      const user = c.user || {};
      return `
        <tr class="border-b border-[#ecedfa]">
          <td class="py-3.5 px-4"><span class="font-semibold">${user.fullname || c.metadata?.userName || "Unknown"}</span></td>
          <td class="py-3.5 px-4 text-[#64748b] font-mono text-[13px] hidden md:table-cell">${c.certificateCode || "—"}</td>
          <td class="py-3.5 px-4 text-[#64748b]">${formatDate(c.createdAt)}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error("Load certificates error:", err);
  }
}

function initIssueCerts() {
  document.getElementById("issue-certs-btn").addEventListener("click", async () => {
    const eventId = document.getElementById("cert-event-select").value;
    if (!eventId) return alert("Select an event first");
    const event = currentEvents.find(ev => ev._id === eventId);
    if (!event || !(event.hasCertificate === true || event.hasCertificate === 'true')) {
      return alert("This event does not support certificates.");
    }
    if (!confirm("Issue certificates to all present participants?")) return;
    try {
      await issueCertificates(eventId);
      alert("Certificates issued!");
      await loadCertificates(eventId);
    } catch (err) {
      alert(err.message || "Failed to issue certificates");
    }
  });
}

// ─── Managers ───

async function loadManagers() {
  if (!currentOrgId) return;
  try {
    const { managers = [] } = await getManagers(currentOrgId);
    const tbody = document.getElementById("managers-table-body");
    const empty = document.getElementById("managers-empty");

    if (!managers.length) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    const u = getUser();
    const currentOrg = currentOrgs.find(o => o._id === currentOrgId);
    const isOwner = currentOrg && u && (currentOrg.owner?._id === u._id || currentOrg.owner === u._id);

    tbody.innerHTML = managers.map(m => {
      const transferBtn = isOwner
        ? `<button class="transfer-owner-btn text-sm text-[#1755ba] font-semibold hover:underline bg-transparent border-none cursor-pointer mr-4" data-user-id="${m._id}" data-fullname="${m.fullname || m.username || 'this user'}" data-email="${m.email}">Transfer Ownership</button>`
        : "";
      return `
        <tr class="border-b border-[#ecedfa]">
          <td class="py-3.5 px-4"><span class="font-semibold">${m.fullname || "Unknown"}</span></td>
          <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${m.email || "—"}</td>
          <td class="py-3.5 px-4"><span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#dae1ff;color:#1755ba">Manager</span></td>
          <td class="py-3.5 px-4 text-right">
            ${transferBtn}
            <button class="remove-manager-btn text-sm text-red-500 font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${m._id}">Remove</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".remove-manager-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Remove this manager?")) return;
        try {
          await removeManager(currentOrgId, btn.dataset.userId);
          await loadManagers();
        } catch (err) {
          alert(err.message || "Failed to remove manager");
        }
      });
    });

    tbody.querySelectorAll(".transfer-owner-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const fullname = btn.dataset.fullname;
        const email = btn.dataset.email;
        if (!email) return alert("This manager does not have an email address set.");
        if (!confirm(`Are you sure you want to transfer ownership of this organization to ${fullname} (${email})? You will become a manager instead and lose owner privileges.`)) return;
        try {
          await transferOwnership(currentOrgId, email);
          alert("Ownership transferred successfully!");
          window.location.reload();
        } catch (err) {
          alert(err.message || "Failed to transfer ownership");
        }
      });
    });
  } catch (err) {
    console.error("Load managers error:", err);
  }
}

function initAddManager() {
  const overlay = document.getElementById("manager-overlay");

  document.getElementById("add-manager-btn").addEventListener("click", () => {
    if (!currentOrgId) return alert("Select an organization first");
    document.getElementById("manager-email-input").value = "";
    overlay.removeAttribute("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  function close() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => overlay.setAttribute("hidden", ""), 300);
  }

  document.getElementById("manager-backdrop").addEventListener("click", close);
  document.getElementById("manager-cancel").addEventListener("click", close);

  document.getElementById("manager-confirm").addEventListener("click", async () => {
    const email = document.getElementById("manager-email-input").value.trim();
    if (!email) return alert("Enter an email address");
    try {
      await addManager(currentOrgId, email);
      close();
      await loadManagers();
      alert("Manager added!");
    } catch (err) {
      alert(err.message || "Failed to add manager");
    }
  });
}

// ─── Settings ───

function loadSettings(org) {
  if (!org) return;
  document.getElementById("settings-name").value = org.name || "";
  document.getElementById("settings-desc").value = org.description || "";
  document.getElementById("settings-phone").value = org.contactInfo?.phoneNo || "";
  document.getElementById("settings-email").value = org.contactInfo?.email || "";
  document.getElementById("settings-website").value = org.website || "";
  document.getElementById("settings-facebook").value = org.socialLinks?.facebook || "";
  document.getElementById("settings-linkedin").value = org.socialLinks?.linkedin || "";
  document.getElementById("settings-instagram").value = org.socialLinks?.instagram || "";
  document.getElementById("settings-twitter").value = org.socialLinks?.twitter || "";
  
  const avatarPreview = document.getElementById("settings-avatar-preview");
  if (avatarPreview) {
    avatarPreview.src = org.avatar || "/assets/images/default-org-avatar.png";
  }
}

function initSettingsForm() {
  const avatarInput = document.getElementById("settings-avatar-input");
  const changeAvatarBtn = document.getElementById("change-org-avatar-btn");
  const avatarStatus = document.getElementById("org-avatar-status");
  const avatarPreview = document.getElementById("settings-avatar-preview");

  if (changeAvatarBtn && avatarInput) {
    changeAvatarBtn.addEventListener("click", () => avatarInput.click());
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file || !currentOrgId) return;

      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }

      if (avatarStatus) {
        avatarStatus.textContent = "Uploading...";
        avatarStatus.className = "text-xs text-blue-600 font-medium";
        avatarStatus.classList.remove("hidden");
      }

      try {
        const res = await uploadOrgAvatar(currentOrgId, file);
        if (res.avatar && avatarPreview) {
          avatarPreview.src = res.avatar;
        }
        if (avatarStatus) {
          avatarStatus.textContent = "Avatar updated successfully!";
          avatarStatus.className = "text-xs text-green-600 font-medium";
          setTimeout(() => avatarStatus.classList.add("hidden"), 3000);
        }
        await loadOrgs();
      } catch (err) {
        if (avatarStatus) {
          avatarStatus.textContent = err.message || "Upload failed";
          avatarStatus.className = "text-xs text-red-600 font-medium";
        }
      }
    });
  }

  document.getElementById("org-settings-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentOrgId) return;
    const data = {
      name: document.getElementById("settings-name").value.trim(),
      description: document.getElementById("settings-desc").value.trim(),
      contactInfo: {
        phoneNo: document.getElementById("settings-phone").value.trim(),
        email: document.getElementById("settings-email").value.trim(),
      },
      website: document.getElementById("settings-website").value.trim(),
      socialLinks: {
        facebook: document.getElementById("settings-facebook").value.trim(),
        linkedin: document.getElementById("settings-linkedin").value.trim(),
        instagram: document.getElementById("settings-instagram").value.trim(),
        twitter: document.getElementById("settings-twitter").value.trim(),
      }
    };
    try {
      await updateOrganization(currentOrgId, data);
      alert("Settings saved!");
      await loadOrgs();
    } catch (err) {
      alert(err.message || "Failed to save settings");
    }
  });

  document.getElementById("delete-org-btn").addEventListener("click", async () => {
    if (!currentOrgId) return;
    if (!confirm("Delete this organization permanently? This cannot be undone.")) return;
    if (!confirm("Are you sure? All events will be unlinked from this organization.")) return;
    try {
      await deleteOrganization(currentOrgId);
      alert("Organization deleted");
      window.location.reload();
    } catch (err) {
      alert(err.message || "Failed to delete organization");
    }
  });
}

// ─── Create Org ───

function initCreateOrg() {
  const overlay = document.getElementById("create-org-overlay");
  document.getElementById("create-org-btn").addEventListener("click", () => {
    document.getElementById("create-org-name").value = "";
    overlay.removeAttribute("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  function close() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => overlay.setAttribute("hidden", ""), 300);
  }

  document.getElementById("create-org-backdrop").addEventListener("click", close);
  document.getElementById("create-org-cancel").addEventListener("click", close);

  document.getElementById("create-org-confirm").addEventListener("click", async () => {
    const name = document.getElementById("create-org-name").value.trim();
    if (!name) return alert("Enter an organization name");
    close();
    window.location.href = `/register-host.html?orgName=${encodeURIComponent(name)}&createMode=true`;
  });
}

// ─── Reviews ───

let globalEventRatings = [];
let currentEventRatingsPage = 1;
const EVENTS_RATINGS_PER_PAGE = 5;

async function loadReviews() {
  try {
    const data = await getHostReviews(currentOrgId);
    const reviews = data.reviews || [];
    
    // Filter reviews to only show those for the currently selected org (though backend already filters if orgId is passed)
    const orgReviews = reviews.filter(r => r.organization === currentOrgId || r.organization?._id === currentOrgId);
    
    // Calculate total org summary
    let orgTotalRating = 0;
    orgReviews.forEach(r => { orgTotalRating += r.rating; });
    const orgAvgRating = orgReviews.length > 0 ? (orgTotalRating / orgReviews.length).toFixed(1) : "0.0";
    
    document.getElementById("review-avg-rating").textContent = orgAvgRating;
    document.getElementById("review-total-count").textContent = orgReviews.length;

    // Fetch org events to show all organized events
    const { events: rawEvents = [] } = await getOrgActivities(currentOrgId);
    
    // Map events with their reviews
    globalEventRatings = rawEvents.map(event => {
        const evReviews = orgReviews.filter(r => r.event?._id === event._id || r.event === event._id);
        const totalScore = evReviews.reduce((sum, r) => sum + r.rating, 0);
        const avg = evReviews.length > 0 ? (totalScore / evReviews.length).toFixed(1) : "0.0";
        return {
            ...event,
            reviews: evReviews,
            averageRating: avg,
            reviewCount: evReviews.length
        };
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); // Sort by newest event

    currentEventRatingsPage = 1;
    renderEventRatingsPage(1);

  } catch (err) {
    console.error("Failed to load reviews:", err);
    document.getElementById("events-ratings-list").innerHTML = `<div class="p-8 text-center text-red-500">Failed to load events.</div>`;
  }
}

function renderEventRatingsPage(page) {
    const list = document.getElementById("events-ratings-list");
    const pagination = document.getElementById("events-ratings-pagination");
    const prevBtn = document.getElementById("events-ratings-prev");
    const nextBtn = document.getElementById("events-ratings-next");
    const pageInfo = document.getElementById("events-ratings-page-info");

    if (!list) return;

    if (globalEventRatings.length === 0) {
        list.innerHTML = `<div class="p-8 text-center text-gray-500 italic">No events found for this organization.</div>`;
        pagination.classList.add("hidden");
        return;
    }

    const totalPages = Math.ceil(globalEventRatings.length / EVENTS_RATINGS_PER_PAGE);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentEventRatingsPage = page;

    const startIdx = (page - 1) * EVENTS_RATINGS_PER_PAGE;
    const endIdx = startIdx + EVENTS_RATINGS_PER_PAGE;
    const pageItems = globalEventRatings.slice(startIdx, endIdx);

    list.innerHTML = pageItems.map(e => `
        <div class="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-4 cursor-pointer" onclick="openReviewDetailsModal('${e._id}')">
            <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                    <img src="${e.thumbnail || '/img/placeholder.png'}" class="w-full h-full object-cover" alt="Event" />
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-900 truncate text-base">${e.title}</h4>
                    <p class="text-xs text-gray-500 mt-1">${formatDate(e.heldDate || e.createdAt)}</p>
                </div>
            </div>
            <div class="text-right shrink-0 flex flex-col items-end">
                <div class="flex items-center gap-2 mb-1">
                    <div class="flex text-yellow-400 text-sm">
                        <i class="fa-solid fa-star"></i>
                    </div>
                    <span class="text-lg font-bold text-gray-900">${e.averageRating}</span>
                </div>
                <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">${e.reviewCount} review${e.reviewCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
    `).join("");

    if (totalPages > 1) {
        pagination.classList.remove("hidden");
        pageInfo.textContent = `Page ${page} of ${totalPages}`;
        
        prevBtn.disabled = page === 1;
        nextBtn.disabled = page === totalPages;

        prevBtn.onclick = () => renderEventRatingsPage(page - 1);
        nextBtn.onclick = () => renderEventRatingsPage(page + 1);
    } else {
        pagination.classList.add("hidden");
    }
}

window.openReviewDetailsModal = function(eventId) {
    const eventData = globalEventRatings.find(e => e._id === eventId);
    if (!eventData) return;

    const modal = document.getElementById("review-details-modal");
    const content = document.getElementById("review-details-content");
    const title = document.getElementById("review-modal-title");
    const list = document.getElementById("review-modal-list");

    title.textContent = `Reviews: ${eventData.title}`;

    if (!eventData.reviews || eventData.reviews.length === 0) {
        list.innerHTML = `<div class="py-12 text-center text-gray-500 italic">No reviews yet for this event.</div>`;
    } else {
        list.innerHTML = eventData.reviews.map(r => `
            <div class="py-5 border-b border-gray-100 last:border-0 flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    ${(r.user?.fullname || r.user?.username || '?').charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <h4 class="font-bold text-gray-900">${r.user?.fullname || r.user?.username || 'Unknown User'}</h4>
                        <span class="text-xs text-gray-500">${formatDate(r.createdAt)}</span>
                    </div>
                    <div class="flex text-yellow-400 text-sm mb-2">
                        ${Array.from({ length: 5 }, (_, i) => `<i class="fa-solid fa-star ${i < r.rating ? '' : 'text-gray-200'}"></i>`).join('')}
                    </div>
                    <p class="text-gray-700 text-sm leading-relaxed">${r.content || '<em class="text-gray-400">No comment provided</em>'}</p>
                </div>
            </div>
        `).join("");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    // trigger animation
    setTimeout(() => {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
    }, 10);
    document.body.style.overflow = "hidden";
}

function closeReviewDetailsModal() {
    const modal = document.getElementById("review-details-modal");
    const content = document.getElementById("review-details-content");
    if (!modal || modal.classList.contains("hidden")) return;

    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-95", "opacity-0");
    
    setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        document.body.style.overflow = "";
    }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("close-review-modal-btn")?.addEventListener("click", closeReviewDetailsModal);
    document.getElementById("review-details-backdrop")?.addEventListener("click", closeReviewDetailsModal);
});

let orgDonutChartInstance = null;
let orgMethodsChartInstance = null;

async function loadOrgAnalytics() {
  if (!currentOrgId) return;
  try {
    const data = await getOrgAnalytics(currentOrgId);
    const summary = data.summary || {};
    const att = data.attendanceBreakdown || {};
    const methods = data.checkinMethods || {};

    const elEvents = document.getElementById("analytics-stat-events");
    if (elEvents) elEvents.textContent = summary.totalEvents || 0;
    const elRegs = document.getElementById("analytics-stat-regs");
    if (elRegs) elRegs.textContent = summary.totalRegistrations || 0;
    const elRate = document.getElementById("analytics-stat-att-rate");
    if (elRate) elRate.textContent = `${summary.overallAttendanceRate || 0}%`;
    const elRating = document.getElementById("analytics-stat-rating");
    if (elRating) elRating.textContent = `${summary.averageRating || 0} ★`;

    const donutCtx = document.getElementById("chart-attendance-donut")?.getContext("2d");
    if (donutCtx && typeof Chart !== "undefined") {
      if (orgDonutChartInstance) orgDonutChartInstance.destroy();
      orgDonutChartInstance = new Chart(donutCtx, {
        type: "doughnut",
        data: {
          labels: ["Present", "Late", "Absent"],
          datasets: [{
            data: [att.present || 0, att.late || 0, att.absent || 0],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } }
        }
      });
    }

    const methodsCtx = document.getElementById("chart-checkin-methods")?.getContext("2d");
    if (methodsCtx && typeof Chart !== "undefined") {
      if (orgMethodsChartInstance) orgMethodsChartInstance.destroy();
      orgMethodsChartInstance = new Chart(methodsCtx, {
        type: "bar",
        data: {
          labels: ["Ticket QR", "Student Card", "Manual", "Excel Import"],
          datasets: [{
            label: "Check-ins",
            data: [methods.ticket_qr || 0, methods.student_card || 0, methods.manual || 0, methods.excel_import || 0],
            backgroundColor: "#3b6fd4",
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    const schoolsContainer = document.getElementById("top-schools-container");
    if (schoolsContainer) {
      const topSchools = data.topSchools || [];
      if (!topSchools.length) {
        schoolsContainer.innerHTML = '<p class="text-xs text-[#94a3b8]">No university data recorded yet.</p>';
      } else {
        const maxCount = Math.max(...topSchools.map(s => s.count), 1);
        schoolsContainer.innerHTML = topSchools.map(s => `
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="truncate max-w-[70%]">${s.name}</span>
              <span class="text-primary">${s.count} attendees</span>
            </div>
            <div class="w-full h-2 bg-[#ecedfa] rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: ${Math.round((s.count / maxCount) * 100)}%"></div>
            </div>
          </div>
        `).join("");
      }
    }

    const majorsContainer = document.getElementById("top-majors-container");
    if (majorsContainer) {
      const topMajors = data.topMajors || [];
      if (!topMajors.length) {
        majorsContainer.innerHTML = '<p class="text-xs text-[#94a3b8]">No major data recorded yet.</p>';
      } else {
        const maxCount = Math.max(...topMajors.map(m => m.count), 1);
        majorsContainer.innerHTML = topMajors.map(m => `
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="truncate max-w-[70%]">${m.name}</span>
              <span class="text-emerald-600">${m.count} attendees</span>
            </div>
            <div class="w-full h-2 bg-[#ecedfa] rounded-full overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full" style="width: ${Math.round((m.count / maxCount) * 100)}%"></div>
            </div>
          </div>
        `).join("");
      }
    }

    const exportBtn = document.getElementById("export-org-excel-btn");
    if (exportBtn) {
      exportBtn.onclick = async () => {
        try {
          const orgName = data.organization?.name || "Org";
          await downloadOrgExcelReport(currentOrgId, orgName);
        } catch (err) {
          alert(err.message || "Failed to download Excel report");
        }
      };
    }
  } catch (err) {
    console.error("Load Org Analytics error:", err);
  }
}
