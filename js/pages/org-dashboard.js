import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { get, post, put, del, uploadFormData } from "../api/client.js";
import { getMyOrganizations, getAllOrganizations, updateOrganization, deleteOrganization, getOrgActivities, getManagers, addManager, removeManager, transferOwnership } from "../api/organizations.js";
import { getAttendance, getAttendanceStats, markAttendance, scanAttendance, initAttendance } from "../api/attendance.js";
import { getEventCertificates, issueCertificates } from "../api/certificates.js";

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
      window.open(`/org-profile.html?id=${currentOrgId}`, "_blank");
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

  if (section === "participants" && document.getElementById("participant-event-select").value) {
    loadParticipants(document.getElementById("participant-event-select").value);
  }
  if (section === "attendance" && document.getElementById("attendance-event-select").value) {
    loadAttendance(document.getElementById("attendance-event-select").value);
  }
  if (section === "certificates" && document.getElementById("cert-event-select").value) {
    loadCertificates(document.getElementById("cert-event-select").value);
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

function renderEventsTable() {
  const tbody = document.getElementById("events-table-body");
  const empty = document.getElementById("events-empty");
  let filtered = currentEvents;
  if (eventsFilter !== "all") filtered = filtered.filter(e => e.status === eventsFilter);

  if (!filtered.length) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = filtered.map(e => `
    <tr class="border-b border-[#ecedfa] hover:bg-[#f8f9fc] transition-colors" data-id="${e._id}">
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
          <button class="delete-event-btn w-9 h-9 rounded-lg border border-[#e2e2eb] bg-white flex items-center justify-center text-[#ef4444] hover:bg-red-50 hover:border-red-200 transition-all spring-ease" title="Delete">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".view-event-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.closest("tr").dataset.id;
      window.open(`/explore.html?event=${id}`, "_blank");
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

function initCreateEvent() {
  document.getElementById("create-event-btn").addEventListener("click", () => {
    if (!currentOrgId) return alert("Select an organization first");
    window.location.href = `/hostActivity.html?org=${currentOrgId}`;
  });
}

function populateEventSelects() {
  renderCustomSelect("participant-event-select-wrapper", "participant-event-select", currentEvents, "Select an event...");
  renderCustomSelect("attendance-event-select-wrapper", "attendance-event-select", currentEvents, "Select an event...");
  
  const certEvents = currentEvents.filter(e => e.hasCertificate === true || e.hasCertificate === 'true');
  renderCustomSelect("cert-event-select-wrapper", "cert-event-select", certEvents, "Select an event...");
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
        
        // Close dropdown
        closeDropdown();
        
        // Dispatch change event
        input.dispatchEvent(new Event("change"));
        
        // Re-render select to show updated checked icon
        renderCustomSelect(wrapperId, hiddenInputId, events, placeholder);
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
  document.getElementById("participant-event-select").addEventListener("change", async function () {
    if (this.value) {
      await loadParticipants(this.value);
    } else {
      document.getElementById("participants-table-body").innerHTML = "";
      document.getElementById("participants-empty").classList.remove("hidden");
      document.getElementById("participant-count").textContent = "0";
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
  document.getElementById("attendance-event-select").addEventListener("change", async function () {
    if (this.value) {
      await loadAttendance(this.value);
    } else {
      document.getElementById("attendance-table-body").innerHTML = "";
      const empty = document.getElementById("attendance-empty");
      empty.classList.remove("hidden");
      empty.innerHTML = `<i class="fa-solid fa-qrcode text-4xl mb-3 block"></i>
        <p class="text-base font-semibold">Select an event to view attendance</p>`;
      const statsGrid = document.querySelector("#section-attendance .grid.grid-cols-1");
      const actionBtns = document.querySelector("#section-attendance .flex.gap-3.mb-6");
      const attendanceListHeader = document.querySelector("#section-attendance .px-6.py-4");
      const attendanceTable = document.querySelector("#section-attendance .overflow-x-auto");
      if (statsGrid) statsGrid.style.opacity = "1";
      if (actionBtns) actionBtns.style.opacity = "1";
      if (attendanceListHeader) attendanceListHeader.style.opacity = "1";
      if (attendanceTable) attendanceTable.style.opacity = "1";
    }
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
    const records = attData.attendance || [];
    const stats = statsData.stats || {};

    document.getElementById("stat-present").textContent = stats.present || 0;
    document.getElementById("stat-absent").textContent = stats.absent || 0;
    document.getElementById("stat-total-att").textContent = stats.totalParticipants || records.length;
    document.getElementById("attendance-count").textContent = `${records.length} record(s)`;

    const tbody = document.getElementById("attendance-table-body");
    const empty = document.getElementById("attendance-empty");

    if (!records.length) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    tbody.innerHTML = records.map(r => {
      const user = r.user || {};
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
              <span class="font-semibold">${user.fullname || "Unknown"}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${user.email || "—"}</td>
          <td class="py-3.5 px-4">${badge}</td>
          <td class="py-3.5 px-4 text-[#64748b] hidden sm:table-cell">${r.checkedInAt ? formatDate(r.checkedInAt) : "—"}</td>
          <td class="py-3.5 px-4 text-right">
            ${isCheckedIn
              ? `<button class="manual-checkout-btn text-sm text-red-600 font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${user._id || r.user}">Mark Absent</button>`
              : `<button class="manual-checkin-btn text-sm text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${user._id || r.user}">Check In</button>`}
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
  const SCAN_INTERVAL = 100; // scan every 100ms for zero lag and low CPU load

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

    if (state === "default") {
      defaultView.classList.remove("hidden");
      container.classList.add("border-slate-200/60", "bg-slate-50");
      const textEl = defaultView.querySelector("p");
      if (textEl) textEl.textContent = "Position the attendee's ticket QR code inside the camera viewfinder.";
    } else if (state === "loading") {
      defaultView.classList.remove("hidden");
      container.classList.add("border-slate-200/60", "bg-slate-50");
      const textEl = defaultView.querySelector("p");
      if (textEl) textEl.textContent = message || "Processing check-in...";
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

      if (nameEl) nameEl.textContent = user.fullname || "Unknown Attendee";
      if (usernameEl) usernameEl.textContent = user.username ? `@${user.username}` : "";
      if (emailEl) emailEl.textContent = user.email || "";
      if (codeEl) codeEl.textContent = ticketCode ? ticketCode.toUpperCase() : "N/A";
      if (statusLabel) {
        statusLabel.textContent = isLate ? "Checked in (late)" : "Checked in";
        statusLabel.className = isLate
          ? "text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"
          : "text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full";
      }

      if (avatarEl && placeholderEl) {
        if (user.avatar) {
          avatarEl.src = user.avatar;
          avatarEl.classList.remove("hidden");
          placeholderEl.classList.add("hidden");
        } else {
          avatarEl.classList.add("hidden");
          placeholderEl.classList.remove("hidden");
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
              : `<span class="material-symbols-outlined text-base text-slate-400">person</span>`
            }
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 truncate">${item.fullname}</p>
            <p class="text-[10px] text-slate-400 font-mono uppercase">${item.ticketCode}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="px-2 py-0.5 rounded ${item.isLate ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} border text-[9px] font-semibold">${item.isLate ? 'LATE' : 'SUCCESS'}</span>
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

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const now = Date.now();
      if (now - lastScanTime >= SCAN_INTERVAL) {
        lastScanTime = now;

        // Crop centered square area corresponding to the smaller dimension
        const sourceSize = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - sourceSize) / 2;
        const sy = (video.videoHeight - sourceSize) / 2;

        const targetSize = 350; // Optimized size for speed & high-density decodes
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Draw cropped center square from video source
        ctx.drawImage(video, sx, sy, sourceSize, sourceSize, 0, 0, targetSize, targetSize);

        try {
          const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
          if (typeof jsQR !== "undefined") {
            // Alternate inversion attempts between frames to keep CPU usage low
            const attempt = (Math.floor(now / SCAN_INTERVAL) % 2 === 0) ? "dontInvert" : "attemptBoth";
            const code = jsQR(imageData.data, targetSize, targetSize, {
              inversionAttempts: attempt
            });
            if (code && code.data) {
              onScanSuccess(code.data);
            }
          }
        } catch (err) {
          // Suppress canvas reading noise
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
        video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" }
      };

      constraints.video.width = { min: 640, ideal: 1280, max: 1920 };
      constraints.video.height = { min: 480, ideal: 720, max: 1080 };

      activeStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = activeStream;
      await video.play();

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

    setFeedbackWithTimeout("loading", "Processing check-in...");

    try {
      const response = await scanAttendance(eventId, ticketCode);
      playBeep(true);
      const isLate = response.message?.includes('late');
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
  document.getElementById("init-attendance-btn").addEventListener("click", async () => {
    const eventId = document.getElementById("attendance-event-select").value;
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

// ─── Certificates ───

function initCertEventSelect() {
  document.getElementById("cert-event-select").addEventListener("change", async function () {
    if (this.value) {
      await loadCertificates(this.value);
    } else {
      document.getElementById("certs-table-body").innerHTML = "";
      document.getElementById("certs-empty").classList.remove("hidden");
    }
  });
}

async function loadCertificates(eventId) {
  try {
    const { certificates = [] } = await getEventCertificates(eventId);
    const tbody = document.getElementById("certs-table-body");
    const empty = document.getElementById("certs-empty");

    if (!certificates.length) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
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
}

function initSettingsForm() {
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
