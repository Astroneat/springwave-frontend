import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { get, post, put, del, uploadFormData } from "../api/client.js";
import { getMyOrganizations, getAllOrganizations, updateOrganization, deleteOrganization, getOrgActivities, getManagers, addManager, removeManager } from "../api/organizations.js";
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
    if (currentOrgs.length) {
      await selectOrg(currentOrgs[0]._id);
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
      document.querySelectorAll(".sidenav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      switchSection(link.dataset.section);
    });
  });
  document.getElementById("goto-events")?.addEventListener("click", () => {
    switchSection("events");
    document.querySelectorAll(".sidenav-link").forEach(l => l.classList.remove("active"));
    document.querySelector('[data-section="events"]')?.classList.add("active");
  });
}

function switchSection(section) {
  currentSection = section;
  document.querySelectorAll(".section-content").forEach(el => el.classList.add("hidden"));
  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.remove("hidden");
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
  const selIds = ["participant-event-select", "attendance-event-select", "cert-event-select"];
  const opts = currentEvents.map(e =>
    `<option value="${e._id}">${e.title} (${formatDate(e.heldDate)})</option>`
  );
  selIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = `<option value="">Select an event...</option>${opts.join("")}`;
    if (val) sel.value = val;
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
      document.getElementById("attendance-empty").classList.remove("hidden");
    }
  });
}

async function loadAttendance(eventId) {
  try {
    const [attData, statsData] = await Promise.all([
      getAttendance(eventId).catch(() => ({ attendance: [] })),
      getAttendanceStats(eventId).catch(() => ({ stats: { totalParticipants: 0, present: 0, absent: 0 } })),
    ]);
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
      const isPresent = r.status === "present";
      return `
        <tr class="border-b border-[#ecedfa]">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <span class="font-semibold">${user.fullname || "Unknown"}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${user.email || "—"}</td>
          <td class="py-3.5 px-4">
            ${isPresent
          ? '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#d1fae5;color:#059669">Present</span>'
          : '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#fee2e2;color:#dc2626">Absent</span>'}
          </td>
          <td class="py-3.5 px-4 text-[#64748b] hidden sm:table-cell">${r.checkedInAt ? formatDate(r.checkedInAt) : "—"}</td>
          <td class="py-3.5 px-4 text-right">
            ${!isPresent ? `<button class="manual-checkin-btn text-sm text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${user._id || r.user}">Check In</button>` : '<span class="text-xs text-[#94a3b8]">Done</span>'}
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
  } catch (err) {
    console.error("Load attendance error:", err);
  }
}

function initQRScan() {
  let html5QrCode = null;
  let isScanning = false;
  let lastScannedCode = "";
  let lastScannedTime = 0;
  let feedbackTimer = null;
  let sessionHistory = [];

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

  function showScanFeedback(state, message = "", user = null, ticketCode = "") {
    const container = document.getElementById("scan-feedback-container");
    const defaultView = document.getElementById("scan-feedback-default");
    const successView = document.getElementById("scan-feedback-success");
    const errorView = document.getElementById("scan-feedback-error");

    if (!container || !defaultView || !successView || !errorView) return;

    defaultView.classList.add("hidden");
    successView.classList.add("hidden");
    errorView.classList.add("hidden");

    // Remove status classes
    container.classList.remove("border-emerald-200", "bg-emerald-50/30", "border-rose-200", "bg-rose-50/30", "border-slate-200/60", "bg-slate-50");

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
      container.classList.add("border-emerald-200", "bg-emerald-50/30");

      const nameEl = document.getElementById("scan-feedback-name");
      const usernameEl = document.getElementById("scan-feedback-username");
      const emailEl = document.getElementById("scan-feedback-email");
      const codeEl = document.getElementById("scan-feedback-code");
      const avatarEl = document.getElementById("scan-feedback-avatar");
      const placeholderEl = document.getElementById("scan-feedback-avatar-placeholder");

      if (nameEl) nameEl.textContent = user.fullname || "Unknown Attendee";
      if (usernameEl) usernameEl.textContent = user.username ? `@${user.username}` : "";
      if (emailEl) emailEl.textContent = user.email || "";
      if (codeEl) codeEl.textContent = ticketCode ? ticketCode.toUpperCase() : "N/A";

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

  function setFeedbackWithTimeout(state, message = "", user = null, ticketCode = "") {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    showScanFeedback(state, message, user, ticketCode);

    if (state === "success" || state === "error") {
      feedbackTimer = setTimeout(() => {
        showScanFeedback("default");
      }, 4000);
    }
  }

  function addToHistory(user, ticketCode) {
    const historyList = document.getElementById("scan-history-list");
    const countEl = document.getElementById("history-count");
    if (!historyList) return;

    const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const newItem = {
      fullname: user.fullname || "Unknown Attendee",
      avatar: user.avatar || "",
      ticketCode: ticketCode,
      time: timeStr
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
          <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-semibold">SUCCESS</span>
          <span class="text-[10px] text-slate-400 font-mono">${item.time}</span>
        </div>
      </div>
    `).join("");
  }

  async function startScanner() {
    if (typeof Html5Qrcode === "undefined") return;
    try {
      html5QrCode = new Html5Qrcode("qr-reader");
      const config = { fps: 15, qrbox: { width: 220, height: 220 } };
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => {}
      );
      isScanning = true;
    } catch (err) {
      console.error("Camera scan error:", err);
    }
  }

  async function stopScanner() {
    if (html5QrCode && isScanning) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch {}
      isScanning = false;
      html5QrCode = null;
    }
  }

  async function onScanSuccess(decodedText) {
    const now = Date.now();
    if (decodedText === lastScannedCode && now - lastScannedTime < 3000) {
      // Cooldown to avoid duplicate scanning of the same code
      return;
    }
    lastScannedCode = decodedText;
    lastScannedTime = now;

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
      setFeedbackWithTimeout("success", "", response.user, ticketCode);
      addToHistory(response.user || {}, ticketCode);

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

    tbody.innerHTML = managers.map(m => `
      <tr class="border-b border-[#ecedfa]">
        <td class="py-3.5 px-4"><span class="font-semibold">${m.fullname || "Unknown"}</span></td>
        <td class="py-3.5 px-4 text-[#64748b] hidden md:table-cell">${m.email || "—"}</td>
        <td class="py-3.5 px-4"><span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#dae1ff;color:#1755ba">Manager</span></td>
        <td class="py-3.5 px-4 text-right">
          <button class="remove-manager-btn text-sm text-red-500 font-semibold hover:underline bg-transparent border-none cursor-pointer" data-user-id="${m._id}">Remove</button>
        </td>
      </tr>
    `).join("");

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
    window.location.href = `/register-host.html?orgName=${encodeURIComponent(name)}`;
  });
}
