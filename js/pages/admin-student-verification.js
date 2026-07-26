import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent, formatDate } from "../lib/utils.js";
import { getVerifications, getVerificationById, approveVerification, rejectVerification } from "../api/studentVerification.js";

let currentTab = "all";
let currentPage = 1;
let totalPages = 1;
let actionTarget = null;
let searchTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }
  const user = getUser();
  if (user?.role !== "admin") {
    window.location.href = "/";
    return;
  }

  await loadNavbar({ activeSection: "admin" });
  await fetchContent("./components/footer.html").then(html => {
    const c = document.getElementById("footer-container");
    if (c) c.innerHTML = html;
  });
  await initChatbot();

  initTabs();
  initSearch();
  initRefresh();
  initPagination();
  initPopups();
  await loadData();
});

async function loadData() {
  try {
    const params = { page: currentPage, pageSize: 10 };
    if (currentTab !== "all") params.status = currentTab;
    const sd = document.getElementById("search-input")?.value.trim();
    if (sd) params.search = sd;

    const data = await getVerifications(params);
    renderTable(data.data || []);
    renderPagination(data.pagination);
    renderStats();
  } catch (err) {
    console.error("Load data error:", err);
    showEmpty();
  }
}

async function renderStats() {
  try {
    const [all, pending, approved, rejected] = await Promise.all([
      getVerifications({ page: 1, pageSize: 1 }).catch(() => ({ pagination: { totalItems: 0 } })),
      getVerifications({ status: "pending", page: 1, pageSize: 1 }).catch(() => ({ pagination: { totalItems: 0 } })),
      getVerifications({ status: "approved", page: 1, pageSize: 1 }).catch(() => ({ pagination: { totalItems: 0 } })),
      getVerifications({ status: "rejected", page: 1, pageSize: 1 }).catch(() => ({ pagination: { totalItems: 0 } })),
    ]);
    document.getElementById("stat-total").textContent = all.pagination?.totalItems ?? 0;
    document.getElementById("stat-pending").textContent = pending.pagination?.totalItems ?? 0;
    document.getElementById("stat-approved").textContent = approved.pagination?.totalItems ?? 0;
    document.getElementById("stat-rejected").textContent = rejected.pagination?.totalItems ?? 0;
  } catch {}
}

function renderTable(verifications) {
  const tbody = document.getElementById("table-body");
  const empty = document.getElementById("table-empty");
  const count = document.getElementById("table-count");

  if (!verifications.length) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    count.textContent = "0 requests";
    return;
  }

  empty.classList.add("hidden");
  count.textContent = `${verifications.length} requests`;

  tbody.innerHTML = verifications.map(v => `
    <tr class="border-b border-[#ecedfa] hover:bg-[#f8f9fc]/60 transition-colors">
      <td class="py-3.5 px-4">
        <span class="font-semibold text-[#191b22]">${v.studentId}</span>
      </td>
      <td class="py-3.5 px-4 hidden md:table-cell">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
            ${(v.submittedBy?.fullname || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="font-medium text-[#191b22]">${v.submittedBy?.fullname || 'Unknown'}</p>
            <p class="text-[#64748b] text-xs">${v.submittedBy?.email || ''}</p>
          </div>
        </div>
      </td>
      <td class="py-3.5 px-4 hidden lg:table-cell text-[#64748b]">${v.submittedBy?.school || '—'}</td>
      <td class="py-3.5 px-4 hidden sm:table-cell text-[#64748b] text-xs">${formatDate(v.createdAt)}</td>
      <td class="py-3.5 px-4">${statusBadge(v.status)}</td>
      <td class="py-3.5 px-4 text-right">${actionButtons(v)}</td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openDetail(btn.dataset.id));
  });
  tbody.querySelectorAll(".approve-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      actionTarget = btn.dataset.id;
      document.getElementById("approve-name").textContent = btn.dataset.name;
      document.getElementById("approve-sid").textContent = btn.dataset.sid;
      document.getElementById("approve-overlay").hidden = false;
    });
  });
  tbody.querySelectorAll(".reject-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      actionTarget = btn.dataset.id;
      document.getElementById("reject-name").textContent = btn.dataset.name;
      document.getElementById("reject-overlay").hidden = false;
    });
  });
}

function statusBadge(status) {
  const map = {
    pending: '<span class="badge-pending"><i class="fa-regular fa-clock mr-1"></i>Pending</span>',
    approved: '<span class="badge-approved"><i class="fa-solid fa-check mr-1"></i>Approved</span>',
    rejected: '<span class="badge-rejected"><i class="fa-solid fa-ban mr-1"></i>Rejected</span>',
  };
  return map[status] || status;
}

function actionButtons(v) {
  if (v.status !== "pending") {
    return `<button class="view-btn px-4 py-1.5 rounded-lg border border-[#e2e2eb] bg-white text-[#64748b] text-xs font-semibold hover:bg-[#f8f9fc] spring-ease" data-id="${v._id}">
      <i class="fa-regular fa-eye mr-1"></i> View
    </button>`;
  }
  return `
    <div class="flex items-center justify-end gap-2">
      <button class="view-btn px-4 py-1.5 rounded-lg border border-[#e2e2eb] bg-white text-[#64748b] text-xs font-semibold hover:bg-[#f8f9fc] spring-ease" data-id="${v._id}">
        <i class="fa-regular fa-eye mr-1"></i>
      </button>
      <button class="approve-btn px-4 py-1.5 rounded-lg border-none bg-[#059669] text-white text-xs font-semibold hover:bg-[#047857] spring-ease" data-id="${v._id}" data-name="${v.submittedBy?.fullname || ''}" data-sid="${v.studentId}">
        <i class="fa-solid fa-check mr-1"></i> Approve
      </button>
      <button class="reject-btn px-4 py-1.5 rounded-lg border-none bg-red-500 text-white text-xs font-semibold hover:bg-red-600 spring-ease" data-id="${v._id}" data-name="${v.submittedBy?.fullname || ''}">
        <i class="fa-solid fa-ban mr-1"></i>
      </button>
    </div>
  `;
}

function renderPagination(pagination) {
  const el = document.getElementById("pagination");
  if (!pagination || pagination.totalPages <= 1) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  currentPage = pagination.page;
  totalPages = pagination.totalPages;
  document.getElementById("pagination-info").textContent =
    `Page ${pagination.page} of ${pagination.totalPages} (${pagination.totalItems} total)`;
  document.getElementById("prev-page").disabled = currentPage <= 1;
  document.getElementById("next-page").disabled = currentPage >= totalPages;
}

function initPagination() {
  document.getElementById("prev-page")?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; loadData(); }
  });
  document.getElementById("next-page")?.addEventListener("click", () => {
    if (currentPage < totalPages) { currentPage++; loadData(); }
  });
}

function showEmpty() {
  document.getElementById("table-body").innerHTML = "";
  document.getElementById("table-empty").classList.remove("hidden");
  document.getElementById("table-count").textContent = "0 requests";
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      currentPage = 1;
      loadData();
    });
  });
}

function initSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 1;
      loadData();
    }, 400);
  });
}

function initRefresh() {
  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    currentPage = 1;
    loadData();
  });
}

function initPopups() {
  // Detail popup
  const detailOverlay = document.getElementById("detail-overlay");
  document.getElementById("detail-close")?.addEventListener("click", () => { detailOverlay.hidden = true; });
  document.getElementById("detail-backdrop")?.addEventListener("click", () => { detailOverlay.hidden = true; });

  // Approve popup
  const approveOverlay = document.getElementById("approve-overlay");
  document.getElementById("approve-cancel")?.addEventListener("click", () => { approveOverlay.hidden = true; actionTarget = null; });
  document.getElementById("approve-backdrop")?.addEventListener("click", () => { approveOverlay.hidden = true; actionTarget = null; });
  document.getElementById("approve-confirm")?.addEventListener("click", async () => {
    if (!actionTarget) return;
    const btn = document.getElementById("approve-confirm");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing...';
    try {
      await approveVerification(actionTarget);
      approveOverlay.hidden = true;
      actionTarget = null;
      await loadData();
    } catch (err) {
      alert("Error: " + (err.message || "Failed to approve"));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i> Approve';
    }
  });

  // Reject popup
  const rejectOverlay = document.getElementById("reject-overlay");
  document.getElementById("reject-cancel")?.addEventListener("click", () => { rejectOverlay.hidden = true; actionTarget = null; });
  document.getElementById("reject-backdrop")?.addEventListener("click", () => { rejectOverlay.hidden = true; actionTarget = null; });
  document.getElementById("reject-confirm")?.addEventListener("click", async () => {
    if (!actionTarget) return;
    const note = document.getElementById("reject-note").value.trim();
    const btn = document.getElementById("reject-confirm");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing...';
    try {
      await rejectVerification(actionTarget, note);
      rejectOverlay.hidden = true;
      actionTarget = null;
      document.getElementById("reject-note").value = "";
      await loadData();
    } catch (err) {
      alert("Error: " + (err.message || "Failed to reject"));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-ban mr-1.5"></i> Reject';
    }
  });
}

async function openDetail(id) {
  const overlay = document.getElementById("detail-overlay");
  const body = document.getElementById("detail-body");
  body.innerHTML = '<div class="flex items-center justify-center py-16 text-[#94a3b8]"><div class="spinner"></div></div>';
  overlay.hidden = false;

  try {
    const data = await getVerificationById(id);
    const v = data.verification;
    const user = v.submittedBy || {};
    const cardSideHtml = (src, caption) => {
      const inner = src
        ? `<img src="${src}" alt="${caption}" class="w-full rounded-xl border border-[#ecedfa] shadow-sm" onerror="this.parentElement.innerHTML='<div class=\\'p-6 text-center text-[#94a3b8]\\'><i class=\\'fa-solid fa-image-slash text-2xl mb-2\\'></i><p>Image unavailable</p></div>'"/>`
        : '<div class="p-6 text-center text-[#94a3b8]"><i class="fa-solid fa-image-slash text-2xl mb-2"></i><p>No image</p></div>';
      return `<div>
        <p class="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">${caption}</p>
        <div class="bg-[#f8f9fc] rounded-xl p-3 border border-[#ecedfa]">${inner}</div>
      </div>`;
    };
    // New records have front/back; legacy records only have studentCardImage.
    const cardImg = (v.studentCardFront || v.studentCardBack)
      ? `${cardSideHtml(v.studentCardFront, 'Front')}${cardSideHtml(v.studentCardBack, 'Back')}`
      : cardSideHtml(v.studentCardImage, 'Student Card');

    body.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Student ID</label>
            <p class="text-lg font-bold text-[#191b22]">${v.studentId}</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Full Name</label>
            <p class="text-[#191b22]">${user.fullname || 'Unknown'}</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Email</label>
            <p class="text-[#191b22]">${user.email || '—'}</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">School</label>
            <p class="text-[#191b22]">${user.school || '—'}</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Class / Major</label>
            <p class="text-[#191b22]">${user.class || '—'} ${user.major ? '/ ' + user.major : ''}</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Submitted</label>
            <p class="text-[#191b22]">${formatDate(v.createdAt)}</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Status</label>
            <div class="mt-1">${statusBadge(v.status)}</div>
            ${v.reviewNote ? `<div class="mt-2"><label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Review Note</label><p class="text-red-600 text-sm mt-1">${v.reviewNote}</p></div>` : ''}
          </div>
          ${v.reviewedBy ? `<div><label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Reviewed By</label><p class="text-[#191b22]">${v.reviewedBy.fullname || ''}</p></div>` : ''}
        </div>
        <div>
          <label class="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2 block">Student Card Images</label>
          <div class="space-y-3">
            ${cardImg}
          </div>
        </div>
      </div>
      ${v.status === 'pending' ? `
        <div class="flex gap-3 mt-8 pt-6 border-t border-[#ecedfa]">
          <button class="flex-1 py-3 rounded-xl border-none bg-[#059669] text-white font-semibold text-sm spring-ease hover:bg-[#047857] active:scale-95" id="detail-approve-btn" data-id="${v._id}" data-name="${user.fullname || ''}" data-sid="${v.studentId}">
            <i class="fa-solid fa-check mr-1.5"></i> Approve
          </button>
          <button class="flex-1 py-3 rounded-xl border-none bg-red-500 text-white font-semibold text-sm spring-ease hover:bg-red-600 active:scale-95" id="detail-reject-btn" data-id="${v._id}" data-name="${user.fullname || ''}">
            <i class="fa-solid fa-ban mr-1.5"></i> Reject
          </button>
        </div>
      ` : ''}
    `;

    document.getElementById("detail-approve-btn")?.addEventListener("click", () => {
      const btn = document.getElementById("detail-approve-btn");
      overlay.hidden = true;
      actionTarget = btn.dataset.id;
      document.getElementById("approve-name").textContent = btn.dataset.name;
      document.getElementById("approve-sid").textContent = btn.dataset.sid;
      document.getElementById("approve-overlay").hidden = false;
    });
    document.getElementById("detail-reject-btn")?.addEventListener("click", () => {
      const btn = document.getElementById("detail-reject-btn");
      overlay.hidden = true;
      actionTarget = btn.dataset.id;
      document.getElementById("reject-name").textContent = btn.dataset.name;
      document.getElementById("reject-overlay").hidden = false;
    });
  } catch (err) {
    body.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fa-solid fa-exclamation-circle text-3xl mb-2"></i><p>Failed to load details: ${err.message}</p></div>`;
  }
}
