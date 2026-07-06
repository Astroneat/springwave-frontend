import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { getMyTickets } from "../api/user.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { formatDate } from "../lib/utils.js";

async function loadPage() {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }

  await loadSharedNavbar();
  initBasicScroll();

  const list = document.getElementById("tickets-list");
  if (!list) return;

  try {
    const { tickets } = await getMyTickets();

    if (!tickets || tickets.length === 0) {
      list.innerHTML = `
        <div class="text-center py-16">
          <span class="material-symbols-outlined text-5xl text-[#64748b] mb-4">confirmation_number</span>
          <p class="text-lg font-semibold text-[#191b22]">No tickets yet</p>
          <p class="text-sm text-[#64748b] mt-1">Participate in an event to get your ticket.</p>
          <a href="/explore.html" class="inline-block mt-4 px-6 py-2.5 rounded-xl bg-[#1755ba] text-white text-sm font-medium hover:bg-[#1755ba]/90">Explore Events</a>
        </div>`;
      return;
    }

    list.innerHTML = tickets.map(t => {
      const event = t.event || {};
      const eventDate = event.heldDate
        ? new Date(event.heldDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "TBD";
      const isExpired = t.expiresAt && new Date(t.expiresAt) < new Date();
      return `
        <div class="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white border border-[#ecedfa] ${t.isActive ? "" : "opacity-50"}">
          <div class="flex-shrink-0 flex items-center justify-center">
            ${t.qrImageUrl && !isExpired
              ? `<img src="${t.qrImageUrl}" alt="QR Code" class="w-24 h-24 rounded-xl border border-[#ecedfa]"/>`
              : `<div class="w-24 h-24 rounded-xl bg-[#f8f9fc] flex items-center justify-center text-[#64748b]"><span class="material-symbols-outlined text-3xl">qr_code</span></div>`
            }
          </div>
          <div class="flex-grow min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-semibold text-[#191b22] text-base truncate">${event.title || "Unknown Event"}</h3>
                <p class="text-sm text-[#64748b]">${eventDate}${event.location ? " &mdash; " + event.location : ""}</p>
              </div>
              <span class="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${t.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}">${t.isActive ? "Active" : "Cancelled"}</span>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-[#64748b]">
              <span>Ticket: <strong class="text-[#191b22]">${t.qrCode ? t.qrCode.slice(0, 8) + "..." : "N/A"}</strong></span>
              ${t.expiresAt ? `<span>Expires: ${new Date(t.expiresAt).toLocaleDateString("vi-VN")}</span>` : ""}
            </div>
            ${t.isActive && t.qrImageUrl && !isExpired
              ? `<a href="${t.qrImageUrl}" target="_blank" class="mt-2 inline-flex items-center gap-1 text-xs text-[#1755ba] font-medium hover:underline"><span class="material-symbols-outlined text-[14px]">download</span> Download QR</a>`
              : ""}
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    console.error("Failed to load tickets:", err);
    list.innerHTML = `<div class="text-center py-12 text-red-500">Failed to load tickets. Please try again later.</div>`;
  }
}

loadPage();
