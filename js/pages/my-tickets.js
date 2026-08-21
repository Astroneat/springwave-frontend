import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { getMyTickets } from "../api/user.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { formatDate } from "../lib/utils.js";
import { openEventPopup } from "../components/eventPopup.js";

let allTickets = [];
let showExpired = false;

function getTicketStatus(t) {
  return t.ticketStatus || 'active';
}

function isInactive(t) {
  const s = getTicketStatus(t);
  return s === 'expired' || s === 'cancelled' || s === 'checked_in';
}

window.zoomTicketQR = function(imageUrl, eventTitle, qrCodeText) {
  const modal = document.getElementById("qr-modal");
  const modalContent = document.getElementById("qr-modal-content");
  const modalTitle = document.getElementById("modal-event-title");
  const modalImg = document.getElementById("modal-qr-img");
  const modalCode = document.getElementById("modal-qr-code");
  const modalDownload = document.getElementById("modal-download-btn");

  if (!modal || !modalTitle || !modalImg || !modalCode || !modalDownload) return;

  modalTitle.textContent = eventTitle;
  modalImg.src = imageUrl;
  modalCode.textContent = qrCodeText ? qrCodeText.toUpperCase() : "N/A";
  modalDownload.href = imageUrl;
  modalDownload.download = `ticket_${qrCodeText || 'qr'}.png`;

  modal.classList.remove("opacity-0", "pointer-events-none");
  if (modalContent) {
    modalContent.classList.remove("scale-95");
    modalContent.classList.add("scale-100");
  }
};

function initModal() {
  const modal = document.getElementById("qr-modal");
  const modalContent = document.getElementById("qr-modal-content");
  const closeBtn = document.getElementById("close-modal-btn");

  if (!modal || !closeBtn) return;

  const closeModal = () => {
    modal.classList.add("opacity-0", "pointer-events-none");
    if (modalContent) {
      modalContent.classList.remove("scale-100");
      modalContent.classList.add("scale-95");
    }
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
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

function renderTickets() {
  const list = document.getElementById("tickets-list");
  if (!list) return;

  const validTickets = allTickets.filter(t => t && t.event && (t.event._id || t.event.title));
  const activeTickets = validTickets.filter(t => !isInactive(t));
  const inactiveTickets = validTickets.filter(t => isInactive(t));

  const activeBadge = document.getElementById("active-count-badge");
  const expiredBadge = document.getElementById("expired-count-badge");
  if (activeBadge) activeBadge.textContent = `${activeTickets.length} Active`;
  if (expiredBadge) expiredBadge.textContent = `${inactiveTickets.length} Inactive & Expired`;

  const ticketsToDisplay = showExpired ? validTickets : activeTickets;

  if (!ticketsToDisplay || ticketsToDisplay.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 bg-white border border-[#ecedfa] rounded-2xl">
        <span class="material-symbols-outlined text-5xl text-[#64748b] mb-4">confirmation_number</span>
        <p class="text-lg font-semibold text-[#191b22]">No tickets found</p>
        <p class="text-sm text-[#64748b] mt-1">${showExpired ? "You don't have any tickets." : "You don't have any active tickets right now."}</p>
        <a href="/explore.html" class="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[#1755ba] text-white text-sm font-medium hover:bg-[#1755ba]/90 transition-all shadow-sm">Explore Events</a>
      </div>`;
    return;
  }

  list.innerHTML = ticketsToDisplay.map(t => {
    const event = t.event || {};
    const eventDate = event.heldDate ? formatDate(event.heldDate) : "TBD";
    const status = getTicketStatus(t);
    const showQR = status === 'active';

    let checkInInfo = '';
    if (t.checkIn && t.checkIn.status === 'present') {
      const time = t.checkIn.checkedInAt ? formatDate(t.checkIn.checkedInAt) : '';
      const label = 'Checked in';
      checkInInfo = `
        <div class="flex items-center gap-1.5 text-xs text-emerald-600">
          <span class="material-symbols-outlined text-[16px]">check_circle</span>
          <span class="font-medium">${label}</span>
          ${time ? `<span class="text-slate-400">• ${time}</span>` : ''}
        </div>`;
    }

    return `
      <div class="group relative flex flex-col md:flex-row bg-white border border-[#ecedfa] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${isInactive(t) ? "opacity-75 bg-slate-50/50" : ""}">
        
        <!-- Event Thumbnail / Cover -->
        <div class="relative w-full md:w-48 h-36 md:h-auto min-h-[144px] flex-shrink-0 bg-slate-100 overflow-hidden cursor-pointer ticket-event-preview" data-event-id="${event._id || ''}">
          <img src="${event.thumbnail || 'https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop'}" 
               alt="${event.title || 'Event'}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden"></div>
          <div class="absolute top-3 left-3 md:hidden">
            ${statusBadgeHTML(status)}
          </div>
        </div>

        <!-- Ticket Details -->
        <div class="flex-grow p-5 flex flex-col justify-between min-w-0">
          <div class="min-w-0">
            <div class="hidden md:flex items-center justify-between gap-2 mb-2">
              ${statusBadgeHTML(status)}
              ${t.expiresAt ? `<span class="text-[11px] text-[#64748b] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">Expires: ${new Date(t.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })}</span>` : ""}
            </div>
            <h3 class="font-bold text-[#191b22] text-lg md:text-xl line-clamp-1 group-hover:text-[#1755ba] transition-colors duration-200 mb-2 cursor-pointer ticket-event-preview" data-event-id="${event._id || ''}" title="${event.title || 'Unknown Event'}">${event.title || "Unknown Event"}</h3>
            
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

          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-[#64748b] min-w-0">
            <span class="truncate">Ticket ID: <strong class="text-[#191b22] font-mono">${t.qrCode ? t.qrCode.slice(0, 8).toUpperCase() + "..." : "N/A"}</strong></span>
            <div class="md:hidden flex items-center gap-2 flex-shrink-0">
              ${t.expiresAt ? `<span class="text-[11px] font-medium">Expires: ${new Date(t.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })}</span>` : ""}
            </div>
          </div>
        </div>

        <!-- Tear Line -->
        <div class="hidden md:flex flex-col justify-between items-center py-3 my-2 flex-shrink-0 w-[1px]">
          <div class="w-3 h-3 rounded-full bg-[#f8f9fc] -mt-5 -ml-1.5 border-b border-l border-r border-[#ecedfa]"></div>
          <div class="h-full border-l border-dashed border-slate-200"></div>
          <div class="w-3 h-3 rounded-full bg-[#f8f9fc] -mb-5 -ml-1.5 border-t border-l border-r border-[#ecedfa]"></div>
        </div>
        <div class="md:hidden flex items-center px-5 flex-shrink-0">
          <div class="w-full border-t border-dashed border-slate-200"></div>
        </div>

        <!-- Right stub: QR Code & Action -->
        <div class="w-full md:w-44 p-5 flex flex-col items-center justify-center bg-slate-50/50 md:bg-transparent flex-shrink-0">
          ${showQR && t.qrImageUrl
            ? `
            <div class="relative group/qr cursor-zoom-in" onclick="window.zoomTicketQR('${t.qrImageUrl}', '${(event.title || 'Event').replace(/'/g, "\\'")}', '${t.qrCode}')">
              <img src="${t.qrImageUrl}" alt="QR Code" class="w-24 h-24 rounded-xl border border-slate-200 bg-white p-1 hover:shadow-md transition-all duration-300" />
              <div class="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/qr:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <span class="material-symbols-outlined text-white text-xl">zoom_in</span>
              </div>
            </div>
            <a href="${t.qrImageUrl}" download="ticket_${t.qrCode || 'qr'}.png" target="_blank" class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1755ba] bg-[#1755ba]/10 hover:bg-[#1755ba]/25 transition-all">
              <span class="material-symbols-outlined text-[16px]">download</span> Download QR
            </a>
            `
            : `
            <div class="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 select-none">
              <span class="material-symbols-outlined text-3xl">${status === 'checked_in' ? 'check_circle' : 'qr_code_2'}</span>
              <span class="text-[9px] font-bold uppercase tracking-wider">${status === 'checked_in' ? 'Done' : (status === 'cancelled' ? 'Cancelled' : 'Expired')}</span>
            </div>
            `
          }
        </div>

      </div>
    `;
  }).join("");

  // Ticket event preview clicks
  document.querySelectorAll(".ticket-event-preview").forEach(el => {
    el.addEventListener("click", () => {
      const eventId = el.dataset.eventId;
      if (!eventId) return;
      const ticket = allTickets.find(tk => tk?.event && String(tk.event._id) === eventId);
      openEventPopup(eventId, { activityData: ticket?.event || null });
    });
  });
}

async function loadPage() {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }

  await loadSharedNavbar();
  initBasicScroll();
  initModal();

  const list = document.getElementById("tickets-list");
  if (!list) return;

  try {
    const { tickets } = await getMyTickets();
    allTickets = (tickets || []).filter(t => t && t.event && (t.event._id || t.event.title));

    if (allTickets.length === 0) {
      list.innerHTML = `
        <div class="text-center py-16 bg-white border border-[#ecedfa] rounded-2xl">
          <span class="material-symbols-outlined text-5xl text-[#64748b] mb-4">confirmation_number</span>
          <p class="text-lg font-semibold text-[#191b22]">No tickets yet</p>
          <p class="text-sm text-[#64748b] mt-1">Participate in an event to get your ticket.</p>
          <a href="/explore.html" class="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[#1755ba] text-white text-sm font-medium hover:bg-[#1755ba]/90 transition-all shadow-sm">Explore Events</a>
        </div>`;
      return;
    }

    const filterBar = document.getElementById("filter-bar");
    const toggleBtn = document.getElementById("toggle-expired-btn");
    const toggleIcon = document.getElementById("toggle-expired-icon");
    const toggleText = document.getElementById("toggle-expired-text");

    if (filterBar) {
      filterBar.classList.remove("hidden");
    }

    const inactiveTickets = allTickets.filter(t => isInactive(t));
    if (toggleBtn) {
      if (inactiveTickets.length === 0) {
        toggleBtn.classList.add("hidden");
      } else {
        toggleBtn.classList.remove("hidden");
        toggleBtn.addEventListener("click", () => {
          showExpired = !showExpired;
          if (showExpired) {
            toggleIcon.textContent = "visibility_off";
            toggleText.textContent = "Hide Expired Tickets";
            toggleBtn.classList.add("bg-slate-100");
          } else {
            toggleIcon.textContent = "visibility";
            toggleText.textContent = "Show Expired Tickets";
            toggleBtn.classList.remove("bg-slate-100");
          }
          renderTickets();
        });
      }
    }

    renderTickets();
  } catch (err) {
    console.error("Failed to load tickets:", err);
    list.innerHTML = `<div class="text-center py-12 text-red-500 font-medium bg-white border border-red-100 rounded-2xl">Failed to load tickets. Please try again later.</div>`;
  }
}

loadPage();
