import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import {
  getAllUniversitiesAdmin,
  createUniversity,
  updateUniversity,
  deleteUniversity,
  uploadUniversityLogo
} from "../api/universities.js";

let universities = [];
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

    initSearch();
    initRefresh();
    initForm();
    initDelete();
    initColorSync();
    initLogoUpload();
    await loadData();
});

async function loadData() {
    try {
        const searchVal = document.getElementById("search-input")?.value?.trim() || "";
        const data = await getAllUniversitiesAdmin(searchVal);
        universities = data.universities || [];
        renderTable();
    } catch (err) {
        console.error("Failed to load universities:", err);
        showEmpty();
    }
}

function renderTable() {
    const tbody = document.getElementById("table-body");
    const empty = document.getElementById("table-empty");
    const count = document.getElementById("table-count");

    if (!tbody || !empty || !count) return;

    if (universities.length === 0) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        count.textContent = "0 universities";
        return;
    }

    empty.classList.add("hidden");
    count.textContent = `${universities.length} universit${universities.length !== 1 ? "ies" : "y"}`;

    const q = document.getElementById("search-input").value.trim().toLowerCase();

    tbody.innerHTML = universities
        .filter(u => {
            if (!q) return true;
            const nameMatch = u.name.toLowerCase().includes(q);
            const shortMatch = (u.shortName || "").toLowerCase().includes(q);
            const domainMatch = (u.domains || []).some(d => d.toLowerCase().includes(q));
            return nameMatch || shortMatch || domainMatch;
        })
        .map(u => {
            const statusBadge = u.isActive !== false
                ? `<span class="inline-block text-xs font-semibold py-1 px-2.5 rounded-full bg-[#d1fae5] text-[#059669]">Active</span>`
                : `<span class="inline-block text-xs font-semibold py-1 px-2.5 rounded-full bg-[#fee2e2] text-[#dc2626]">Inactive</span>`;

            const domainTags = (u.domains || []).length > 0
                ? (u.domains || []).map(d => `<span class="domain-tag">${d}</span>`).join(' ')
                : `<span class="text-xs text-[#94a3b8] italic">None</span>`;

            const logoHtml = u.logo
                ? `<img src="${u.logo}" class="w-8 h-8 rounded-lg object-contain border border-[#e2e2eb]" alt="${u.shortName || u.name}" onerror="this.src='/vite.svg'" />`
                : `<div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style="background:${u.color || '#3B6FD4'}">${(u.shortName || u.name || 'U').slice(0, 3).toUpperCase()}</div>`;

            return `
            <tr class="border-b border-[#ecedfa] hover:bg-[#f8f9fc] transition-colors" data-id="${u._id}">
                <td class="py-3.5 px-4">
                    ${logoHtml}
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-[#191b22] line-clamp-1">${u.name}</div>
                    ${u.description ? `<div class="text-xs text-[#64748b] line-clamp-1 mt-0.5">${u.description}</div>` : ''}
                </td>
                <td class="py-3.5 px-4">
                    <span class="font-semibold text-primary">${u.shortName || "—"}</span>
                </td>
                <td class="py-3.5 px-4 hidden md:table-cell">
                    <div class="flex flex-wrap gap-1 max-w-[280px]">
                        ${domainTags}
                    </div>
                </td>
                <td class="py-3.5 px-4 hidden lg:table-cell">
                    <div class="flex items-center gap-2">
                        <span class="color-preview" style="background:${u.color || '#3B6FD4'}"></span>
                        <span class="text-[13px] text-[#64748b] font-mono">${u.color || "#3B6FD4"}</span>
                    </div>
                </td>
                <td class="py-3.5 px-4">${statusBadge}</td>
                <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                        <button class="edit-btn w-9 h-9 rounded-lg border border-[#e2e2eb] bg-white flex items-center justify-center text-[#64748b] hover:bg-[#dae1ff] hover:text-primary hover:border-primary/30 transition-all spring-ease" title="Edit">
                            <i class="fa-regular fa-pen-to-square text-sm"></i>
                        </button>
                        <button class="delete-btn w-9 h-9 rounded-lg border border-[#e2e2eb] bg-white flex items-center justify-center text-[#ef4444] hover:bg-red-50 hover:border-red-200 transition-all spring-ease" title="Delete">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join("");

    initRowActions();
}

function initRowActions() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            const id = btn.closest("tr").dataset.id;
            const uni = universities.find(u => u._id === id);
            if (uni) openForm(uni);
        });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            const id = btn.closest("tr").dataset.id;
            const uni = universities.find(u => u._id === id);
            if (uni) openDelete(uni);
        });
    });
}

function showEmpty() {
    document.getElementById("table-body").innerHTML = "";
    document.getElementById("table-empty").classList.remove("hidden");
    document.getElementById("table-count").textContent = "0 universities";
}

function initSearch() {
    const input = document.getElementById("search-input");
    if (!input) return;
    input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderTable, 250);
    });
}

function initRefresh() {
    const btn = document.getElementById("refresh-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        document.getElementById("search-input").value = "";
        loadData();
    });
}

function initColorSync() {
    const colorPicker = document.getElementById("field-color");
    const colorText = document.getElementById("field-color-text");
    if (!colorPicker || !colorText) return;

    colorPicker.addEventListener("input", () => {
        colorText.value = colorPicker.value;
    });
    colorText.addEventListener("input", () => {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorText.value)) {
            colorPicker.value = colorText.value;
        }
    });
}

function initLogoUpload() {
    const logoFileInput = document.getElementById("field-logo-file");
    const logoUrlInput = document.getElementById("field-logo-url");
    const imgPreview = document.getElementById("logo-preview-img");
    const fallbackIcon = document.getElementById("logo-fallback-icon");

    if (logoUrlInput) {
        logoUrlInput.addEventListener("input", () => {
            const val = logoUrlInput.value.trim();
            if (val) {
                imgPreview.src = val;
                imgPreview.classList.remove("hidden");
                fallbackIcon.classList.add("hidden");
            } else {
                imgPreview.classList.add("hidden");
                fallbackIcon.classList.remove("hidden");
            }
        });
    }

    if (logoFileInput) {
        logoFileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const { logoUrl } = await uploadUniversityLogo(file);
                if (logoUrlInput) logoUrlInput.value = logoUrl;
                if (imgPreview) {
                    imgPreview.src = logoUrl;
                    imgPreview.classList.remove("hidden");
                }
                if (fallbackIcon) fallbackIcon.classList.add("hidden");
            } catch (err) {
                alert("Failed to upload logo: " + err.message);
            }
        });
    }
}

function initForm() {
    const overlay = document.getElementById("form-overlay");
    const backdrop = document.getElementById("form-backdrop");
    const closeBtn = document.getElementById("form-close");
    const cancelBtn = document.getElementById("form-cancel");
    const saveBtn = document.getElementById("form-save");
    const addBtn = document.getElementById("add-university-btn");

    if (addBtn) {
        addBtn.addEventListener("click", () => openForm(null));
    }

    const closeForm = () => {
        overlay.hidden = true;
        actionTarget = null;
    };

    if (closeBtn) closeBtn.addEventListener("click", closeForm);
    if (cancelBtn) cancelBtn.addEventListener("click", closeForm);
    if (backdrop) backdrop.addEventListener("click", closeForm);

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const name = document.getElementById("field-name").value.trim();
            const shortName = document.getElementById("field-short-name").value.trim();
            const domainsRaw = document.getElementById("field-domains").value.trim();
            const logo = document.getElementById("field-logo-url").value.trim();
            const color = document.getElementById("field-color-text").value.trim();
            const description = document.getElementById("field-description").value.trim();
            const isActive = document.getElementById("field-active").checked;

            if (!name) {
                alert("Please enter the full university name.");
                return;
            }
            if (!shortName) {
                alert("Please enter the short name / abbreviation.");
                return;
            }

            const payload = {
                name,
                shortName,
                domains: domainsRaw,
                logo,
                color: color || "#3B6FD4",
                description,
                isActive
            };

            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            try {
                if (actionTarget) {
                    await updateUniversity(actionTarget._id, payload);
                } else {
                    await createUniversity(payload);
                }
                closeForm();
                await loadData();
            } catch (err) {
                alert(err.message || "Failed to save university");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save";
            }
        });
    }
}

function openForm(uni) {
    actionTarget = uni;
    const overlay = document.getElementById("form-overlay");
    const title = document.getElementById("form-title");
    const imgPreview = document.getElementById("logo-preview-img");
    const fallbackIcon = document.getElementById("logo-fallback-icon");

    if (uni) {
        title.textContent = "Edit University";
        document.getElementById("field-name").value = uni.name || "";
        document.getElementById("field-short-name").value = uni.shortName || "";
        document.getElementById("field-domains").value = (uni.domains || []).join(", ");
        document.getElementById("field-logo-url").value = uni.logo || "";
        document.getElementById("field-color").value = uni.color || "#3B6FD4";
        document.getElementById("field-color-text").value = uni.color || "#3B6FD4";
        document.getElementById("field-description").value = uni.description || "";
        document.getElementById("field-active").checked = uni.isActive !== false;

        if (uni.logo) {
            imgPreview.src = uni.logo;
            imgPreview.classList.remove("hidden");
            fallbackIcon.classList.add("hidden");
        } else {
            imgPreview.classList.add("hidden");
            fallbackIcon.classList.remove("hidden");
        }
    } else {
        title.textContent = "Add University";
        document.getElementById("field-name").value = "";
        document.getElementById("field-short-name").value = "";
        document.getElementById("field-domains").value = "";
        document.getElementById("field-logo-url").value = "";
        document.getElementById("field-color").value = "#3B6FD4";
        document.getElementById("field-color-text").value = "#3B6FD4";
        document.getElementById("field-description").value = "";
        document.getElementById("field-active").checked = true;

        imgPreview.classList.add("hidden");
        fallbackIcon.classList.remove("hidden");
    }

    overlay.hidden = false;
}

function initDelete() {
    const overlay = document.getElementById("delete-overlay");
    const backdrop = document.getElementById("delete-backdrop");
    const cancelBtn = document.getElementById("delete-cancel");
    const confirmBtn = document.getElementById("delete-confirm");

    const closeDelete = () => {
        overlay.hidden = true;
        actionTarget = null;
    };

    if (cancelBtn) cancelBtn.addEventListener("click", closeDelete);
    if (backdrop) backdrop.addEventListener("click", closeDelete);

    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            if (!actionTarget) return;

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Deleting...";

            try {
                await deleteUniversity(actionTarget._id);
                closeDelete();
                await loadData();
            } catch (err) {
                alert(err.message || "Failed to delete university");
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Delete";
            }
        });
    }
}

function openDelete(uni) {
    actionTarget = uni;
    const overlay = document.getElementById("delete-overlay");
    const nameEl = document.getElementById("delete-name");
    if (nameEl) nameEl.textContent = uni.shortName ? `${uni.name} (${uni.shortName})` : uni.name;
    overlay.hidden = false;
}
