import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { getMyTickets } from "../api/user.js";
import { addEventReview } from "../api/activities.js";
import { getMyCertificates } from "../api/certificates.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { formatDate } from "../lib/utils.js";
import { API_BASE_URL } from "../config.js";

let allTickets = [];
let showPast = false;
let currentRateEventId = null;
let selectedRating = 0;

function getTicketStatus(t) {
  return t.ticketStatus || 'active';
}

function isInactive(t) {
  const s = getTicketStatus(t);
  return s === 'expired' || s === 'cancelled' || s === 'checked_in';
}

function isEventExpired(t) {
  const event = t.event || {};
  if (!event.heldDate) return false;
  // Use Vietnam timezone (Asia/Ho_Chi_Minh) for date-only comparison,
  // consistent with how the backend checks event dates. This prevents
  // newly created future events from appearing as expired due to UTC+7 offset.
  const eventDateStr = new Date(event.heldDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return eventDateStr < nowStr;
}

function statusBadgeHTML(status) {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    checked_in: 'bg-sky-50 text-sky-700 border-sky-200/50',
    expired: 'bg-amber-50 text-amber-700 border-amber-200/50',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200/50',
  };
  const labels = {
    active: 'Active',
    checked_in: 'Checked In',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };
  const cls = map[status] || 'bg-slate-50 text-slate-600 border-slate-200/50';
  return `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls} border">${labels[status] || status}</span>`;
}

function canRateEvent(t) {
  const event = t.event || {};
  if (t.review) return false;
  if (event.hasAttendance) {
    return t.checkIn && t.checkIn.status === 'present';
  }
  return true;
}

function getRatingText(t) {
  if (t.review) return `You rated: ${t.review.rating}/5`;
  if (!canRateEvent(t)) return 'Check in to rate';
  return 'Rate Event';
}

function renderEvents() {
  const list = document.getElementById("events-list");
  if (!list) return;

  const activeEvents = allTickets.filter(t => !isInactive(t) && !isEventExpired(t));
  const pastEvents = allTickets.filter(t => isInactive(t) || isEventExpired(t));

  const activeBadge = document.getElementById("active-count-badge");
  const inactiveBadge = document.getElementById("inactive-count-badge");
  if (activeBadge) activeBadge.textContent = `${activeEvents.length} Active`;
  if (inactiveBadge) inactiveBadge.textContent = `${pastEvents.length} Past`;

  const eventsToDisplay = showPast ? allTickets : activeEvents;

  if (!eventsToDisplay || eventsToDisplay.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 bg-white border border-[#ecedfa] rounded-2xl">
        <span class="material-symbols-outlined text-5xl text-[#64748b] mb-4">event_busy</span>
        <p class="text-lg font-semibold text-[#191b22]">No events found</p>
        <p class="text-sm text-[#64748b] mt-1">${showPast ? "You haven't participated in any events yet." : "You don't have any active events right now."}</p>
        <a href="/explore.html" class="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[#1755ba] text-white text-sm font-medium hover:bg-[#1755ba]/90 transition-all shadow-sm">Explore Events</a>
      </div>`;
    return;
  }

  list.innerHTML = eventsToDisplay.map(t => {
    const event = t.event || {};
    const eventDate = event.heldDate
      ? new Date(event.heldDate).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "TBD";
    const status = getTicketStatus(t);
    const expired = isEventExpired(t);

    let checkInInfo = '';
    if (t.checkIn && t.checkIn.status === 'present') {
      const time = t.checkIn.checkedInAt
        ? new Date(t.checkIn.checkedInAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
        : '';
      checkInInfo = `
        <div class="flex items-center gap-1.5 text-xs text-emerald-600">
          <span class="material-symbols-outlined text-[16px]">check_circle</span>
          <span class="font-medium">Checked in</span>
          ${time ? `<span class="text-slate-400">• ${time}</span>` : ''}
        </div>`;
    }

    const canRate = canRateEvent(t);
    const hasCertificate = !!t.certificate;
    const eventId = event._id || '';
    const eventTitle = event.title || 'Unknown Event';
    const safeTitle = eventTitle.replace(/'/g, "\\'");

    let actionButtons = '';
    if (expired || isInactive(t)) {
      if (canRate) {
        actionButtons += `
          <button class="rate-event-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1755ba] bg-[#1755ba]/10 hover:bg-[#1755ba]/25 transition-all" data-event-id="${eventId}" data-event-title="${safeTitle}">
            <i class="fa-regular fa-star mr-1"></i>Rate Event
          </button>`;
      } else if (t.review) {
        actionButtons += `
          <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50">
            <i class="fa-solid fa-star text-amber-500"></i> ${t.review.rating}/5
          </span>`;
      }
      if (hasCertificate) {
        actionButtons += `
          <button class="view-cert-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all" data-cert-code="${t.certificate.certificateCode}" data-event-title="${safeTitle}">
            <i class="fa-solid fa-award mr-1"></i>Certificate
          </button>`;
      }
    }

    return `
      <div class="group relative flex flex-col md:flex-row bg-white border border-[#ecedfa] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${expired || isInactive(t) ? "opacity-80" : ""}">
        <div class="relative w-full md:w-48 h-36 md:h-auto min-h-[144px] flex-shrink-0 bg-slate-100 overflow-hidden">
          <img src="${event.thumbnail || 'https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop'}" 
               alt="${eventTitle}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden"></div>
          <div class="absolute top-3 left-3 md:hidden">
            ${statusBadgeHTML(status)}
          </div>
        </div>

        <div class="flex-grow p-5 flex flex-col justify-between min-w-0">
          <div class="min-w-0">
            <div class="hidden md:flex items-center justify-between gap-2 mb-2">
              ${statusBadgeHTML(status)}
              ${expired ? '<span class="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-medium">Event ended</span>' : ''}
            </div>
            <h3 class="font-bold text-[#191b22] text-lg md:text-xl line-clamp-1 group-hover:text-[#1755ba] transition-colors duration-200 mb-2" title="${eventTitle}">${eventTitle}</h3>
            
            <div class="space-y-1.5 text-sm text-[#64748b] min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-[18px] text-[#1755ba] shrink-0">calendar_today</span>
                <span class="truncate">${eventDate}</span>
              </div>
              ${event.location ? `
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-[18px] text-[#1755ba] shrink-0">location_on</span>
                <span class="truncate" title="${event.location}">${event.location}</span>
              </div>` : ''}
              ${checkInInfo ? `<div class="flex items-center gap-2 min-w-0">${checkInInfo}</div>` : ''}
            </div>
          </div>

          ${actionButtons ? `
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            ${actionButtons}
          </div>` : `
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <span class="material-symbols-outlined text-[16px]">info</span>
            <span>Participate and check in to unlock features</span>
          </div>`}
        </div>

        <div class="hidden md:flex flex-col justify-between items-center py-3 my-2 flex-shrink-0 w-[1px]">
          <div class="w-3 h-3 rounded-full bg-[#f8f9fc] -mt-5 -ml-1.5 border-b border-l border-r border-[#ecedfa]"></div>
          <div class="h-full border-l border-dashed border-slate-200"></div>
          <div class="w-3 h-3 rounded-full bg-[#f8f9fc] -mb-5 -ml-1.5 border-t border-l border-r border-[#ecedfa]"></div>
        </div>
        <div class="md:hidden flex items-center px-5 flex-shrink-0">
          <div class="w-full border-t border-dashed border-slate-200"></div>
        </div>

        <div class="w-full md:w-44 p-5 flex flex-col items-center justify-center bg-slate-50/50 md:bg-transparent flex-shrink-0">
          ${t.qrImageUrl && status === 'active'
            ? `
            <img src="${t.qrImageUrl}" alt="QR Code" class="w-24 h-24 rounded-xl border border-slate-200 bg-white p-1" />
            <span class="mt-2 text-[10px] font-mono text-slate-400 uppercase">${t.qrCode ? t.qrCode.slice(0, 8) : 'N/A'}</span>
            `
            : `
            <div class="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 select-none">
              <span class="material-symbols-outlined text-3xl">${status === 'checked_in' ? 'check_circle' : 'event_busy'}</span>
              <span class="text-[9px] font-bold uppercase tracking-wider">${status === 'checked_in' ? 'Attended' : (status === 'cancelled' ? 'Cancelled' : 'Ended')}</span>
            </div>
            `
          }
        </div>
      </div>
    `;
  }).join("");

  // Rate buttons
  document.querySelectorAll(".rate-event-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const eventId = btn.dataset.eventId;
      const eventTitle = btn.dataset.eventTitle;
      openRateModal(eventId, eventTitle);
    });
  });

  // Certificate buttons
  document.querySelectorAll(".view-cert-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const certCode = btn.dataset.certCode;
      const eventTitle = btn.dataset.eventTitle;
      openCertModal(certCode, eventTitle);
    });
  });
}

// ─── Rate Modal ───

function openRateModal(eventId, eventTitle) {
  currentRateEventId = eventId;
  selectedRating = 0;
  document.getElementById("rate-modal-event-name").textContent = eventTitle;
  document.getElementById("rate-review-content").value = "";
  document.getElementById("submit-rate-btn").disabled = true;
  document.querySelectorAll("#star-rating .star").forEach(s => {
    s.classList.remove("text-yellow-400");
    s.classList.add("text-slate-200");
  });
  const modal = document.getElementById("rate-modal");
  const content = modal.querySelector(".bg-white");
  modal.classList.remove("opacity-0", "pointer-events-none");
  content.classList.remove("scale-95");
  content.classList.add("scale-100");
}

function closeRateModal() {
  const modal = document.getElementById("rate-modal");
  const content = modal.querySelector(".bg-white");
  modal.classList.add("opacity-0", "pointer-events-none");
  content.classList.remove("scale-100");
  content.classList.add("scale-95");
  currentRateEventId = null;
}

// ─── Certificate Modal ───

function openCertModal(certCode, eventTitle) {
  document.getElementById("cert-modal-event-name").textContent = eventTitle;
  document.getElementById("cert-modal-code").textContent = certCode;
  document.getElementById("cert-verify-link").href = `${API_BASE_URL}/certificates/verify/${certCode}`;
  const modal = document.getElementById("cert-modal");
  const content = modal.querySelector(".bg-white");
  modal.classList.remove("opacity-0", "pointer-events-none");
  content.classList.remove("scale-95");
  content.classList.add("scale-100");
}

function closeCertModal() {
  const modal = document.getElementById("cert-modal");
  const content = modal.querySelector(".bg-white");
  modal.classList.add("opacity-0", "pointer-events-none");
  content.classList.remove("scale-100");
  content.classList.add("scale-95");
}

// ─── Init Modals ───

function initModals() {
  // Rate modal
  const rateModal = document.getElementById("rate-modal");
  document.getElementById("close-rate-modal").addEventListener("click", closeRateModal);
  rateModal.addEventListener("click", (e) => {
    if (e.target === rateModal) closeRateModal();
  });

  document.querySelectorAll("#star-rating .star").forEach(star => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.dataset.rating);
      selectedRating = rating;
      document.querySelectorAll("#star-rating .star").forEach((s, i) => {
        if (i < rating) {
          s.classList.remove("text-slate-200");
          s.classList.add("text-yellow-400");
        } else {
          s.classList.remove("text-yellow-400");
          s.classList.add("text-slate-200");
        }
      });
      document.getElementById("submit-rate-btn").disabled = false;
    });
  });

  document.getElementById("submit-rate-btn").addEventListener("click", async () => {
    if (!currentRateEventId || !selectedRating) return;
    const content = document.getElementById("rate-review-content").value.trim();
    const btn = document.getElementById("submit-rate-btn");
    btn.disabled = true;
    btn.textContent = "Submitting...";
    try {
      await addEventReview(currentRateEventId, selectedRating, content);
      closeRateModal();
      const tkt = allTickets.find(t => {
        const ev = t.event || {};
        return ev._id === currentRateEventId;
      });
      if (tkt) {
        tkt.review = { rating: selectedRating, content };
      }
      renderEvents();
    } catch (err) {
      alert(err.message || "Failed to submit review");
    } finally {
      btn.disabled = false;
      btn.textContent = "Submit Review";
    }
  });

  // Certificate modal
  const certModal = document.getElementById("cert-modal");
  document.getElementById("close-cert-modal").addEventListener("click", closeCertModal);
  certModal.addEventListener("click", (e) => {
    if (e.target === certModal) closeCertModal();
  });
}

// ─── Load Page ───

async function loadPage() {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }

  await loadSharedNavbar();
  initBasicScroll();
  initModals();

  const list = document.getElementById("events-list");
  if (!list) return;

  try {
    const { tickets } = await getMyTickets();
    allTickets = tickets || [];

    if (allTickets.length === 0) {
      list.innerHTML = `
        <div class="text-center py-16 bg-white border border-[#ecedfa] rounded-2xl">
          <span class="material-symbols-outlined text-5xl text-[#64748b] mb-4">event_busy</span>
          <p class="text-lg font-semibold text-[#191b22]">No events yet</p>
          <p class="text-sm text-[#64748b] mt-1">Participate in an event to get started.</p>
          <a href="/explore.html" class="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[#1755ba] text-white text-sm font-medium hover:bg-[#1755ba]/90 transition-all shadow-sm">Explore Events</a>
        </div>`;
      return;
    }

    const filterBar = document.getElementById("filter-bar");
    const toggleBtn = document.getElementById("toggle-expired-btn");
    const toggleIcon = document.getElementById("toggle-expired-icon");
    const toggleText = document.getElementById("toggle-expired-text");

    if (filterBar) filterBar.classList.remove("hidden");

    const pastEvents = allTickets.filter(t => isInactive(t) || isEventExpired(t));
    if (toggleBtn) {
      if (pastEvents.length === 0) {
        toggleBtn.classList.add("hidden");
      } else {
        toggleBtn.classList.remove("hidden");
        toggleBtn.addEventListener("click", () => {
          showPast = !showPast;
          if (showPast) {
            toggleIcon.textContent = "visibility_off";
            toggleText.textContent = "Hide Past Events";
            toggleBtn.classList.add("bg-slate-100");
          } else {
            toggleIcon.textContent = "visibility";
            toggleText.textContent = "Show Past Events";
            toggleBtn.classList.remove("bg-slate-100");
          }
          renderEvents();
        });
      }
    }

    renderEvents();
  } catch (err) {
    console.error("Failed to load events:", err);
    list.innerHTML = `<div class="text-center py-12 text-red-500 font-medium bg-white border border-red-100 rounded-2xl">Failed to load events. Please try again later.</div>`;
  }
}

loadPage();
