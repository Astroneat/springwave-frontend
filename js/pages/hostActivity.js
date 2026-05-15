import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { createActivity } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite, getFavourites } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatbot.js";



/* =========================
   PAGE LOAD
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!isAuthenticated()) {
            window.location.href = "/login.html";
            return;
        }

        const user = getUser();
        if (user?.role !== 'host' && user?.role !== 'admin') {
            window.location.href = "./index.html";
            return;
        }

        await loadNavbar();

        await loadComponent(
            "host-activity-details-container",
            "./components/hostActivityDetails.html"
        );

        await loadFooter();
        await initChatbot();

        initializeHostActivityPage();
    }
);

/* =========================
   FETCH HTML
========================= */

async function fetchContent(url) {
    const response = await fetch(url);
    return await response.text();
}

/* =========================
   LOAD COMPONENT
========================= */

async function loadComponent(id, file) {

    try {

        const html =
            await fetchContent(file);

        document.getElementById(id).innerHTML =
            html;

    }
    catch (err) {

        console.error(
            "Failed to load component:",
            err
        );
    }
}

/* =========================
   LOAD NAVBAR
========================= */

async function loadNavbar() {

    const data =
        await fetchContent(
            "./components/navbar.html"
        );

    document.getElementById(
        "navbar-container"
    ).innerHTML = data;

    const navLinks =
        document.querySelectorAll(
            ".nav-links a"
        );

    navLinks.forEach(
        link => {

            const section =
                link.getAttribute(
                    "data-section"
                );

            if (section === "home") {

                link.href = "./index.html";
            }
            else if (section === "explore") {

                link.href = "./index.html#explore";
            }
            else if (section === "host") {
                link.classList.add("active");
            }
        }
    );

    const navbar =
        document.getElementById(
            "navbar"
        );

    window.addEventListener(
        "scroll",
        () => {

            if (window.scrollY > 60) {

                navbar?.classList.add(
                    "collapsed"
                );

            }
            else {

                navbar?.classList.remove(
                    "collapsed"
                );
            }
        }
    );

    const authSection =
        document.getElementById(
            "auth-section"
        );

    if (isAuthenticated()) {

        const user =
            getUser();

        const userChipHTML =
            await fetchContent(
                "./components/userchip.html"
            );

        authSection.innerHTML =
            userChipHTML;

        document.getElementById(
            "user-name"
        ).textContent =
            user.username;

        initUserDropdown();
    }
    else {

        authSection.innerHTML = `
            <a href="/login.html" class="login-btn">
                Login
            </a>
        `;
    }
}

/* =========================
   USER DROPDOWN
========================= */

function initUserDropdown() {

    const userMenu =
        document.querySelector(
            ".user-menu"
        );

    const userChip =
        document.getElementById(
            "user-chip"
        );

    const logoutBtn =
        document.getElementById(
            "logout-btn"
        );

    if (!userMenu || !userChip) {
        return;
    }

    userChip.addEventListener(
        "click",
        (e) => {

            e.stopPropagation();

            userMenu.classList.toggle(
                "active"
            );
        }
    );

    document.addEventListener(
        "click",
        () => {

            userMenu.classList.remove(
                "active"
            );
        }
    );

    userMenu.addEventListener(
        "click",
        (e) => {

            e.stopPropagation();
        }
    );

    logoutBtn?.addEventListener("click", () => {
        logout();
        window.location.href = "/login.html";
    });

    document.getElementById("favourites-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.remove("active");
        showFavPopup();
    });
}

/* =========================
   LOAD FOOTER
========================= */

async function loadFooter() {

    const footerHTML =
        await fetchContent(
            "./components/footer.html"
        );

    document.getElementById(
        "footer-container"
    ).innerHTML =
        footerHTML;
}

/* =========================
   HOST ACTIVITY PAGE
========================= */

function initializeHostActivityPage() {

    initThumbnailPreview();

    initFileUpload();

    initDateValidation();

    initFormSubmit();
}

/* =========================
   THUMBNAIL PREVIEW
========================= */

function initThumbnailPreview() {

    const thumbnailInput =
        document.getElementById(
            "thumbnail-upload"
        );

    const thumbnailPreview =
        document.getElementById(
            "thumbnail-preview"
        );

    const thumbnailPlaceholder =
        document.getElementById(
            "thumbnail-placeholder"
        );

    if (!thumbnailInput) return;

    thumbnailInput.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            if (!file) return;

            const reader =
                new FileReader();

            reader.onload =
                function (e) {

                    thumbnailPreview.src =
                        e.target.result;

                    thumbnailPreview.style.display =
                        "block";

                    thumbnailPlaceholder.style.display =
                        "none";
                };

            reader.readAsDataURL(file);
        }
    );
}

/* =========================
   FILE UPLOAD
========================= */

function initFileUpload() {

    const attachmentInput =
        document.getElementById(
            "attachment-upload"
        );

    const fileList =
        document.getElementById(
            "file-list"
        );

    if (!attachmentInput) return;

    attachmentInput.addEventListener(
        "change",
        function () {

            // LIMIT TO 10 FILES
            if (this.files.length > 10) {

                alert(
                    "You can only upload up to 10 files."
                );

                this.value = "";

                fileList.innerHTML = "";

                return;
            }

            fileList.innerHTML = "";

            Array.from(this.files).forEach(
                file => {

                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "file-item";

                    item.innerHTML = `
                        <span class="material-symbols-outlined">
                            description
                        </span>

                        <div>
                            <div class="file-name">
                                ${file.name}
                            </div>

                            <div class="file-size">
                                ${(file.size / 1024).toFixed(1)} KB
                            </div>
                        </div>
                    `;

                    fileList.appendChild(
                        item
                    );
                }
            );
        }
    );
}

/* =========================
   DATE VALIDATION
========================= */

function initDateValidation() {

    const startDateInput =
        document.querySelectorAll(
            ".date-input"
        )[0];

    const deadlineInput =
        document.querySelectorAll(
            ".date-input"
        )[1];

    if (
        !startDateInput ||
        !deadlineInput
    ) {
        return;
    }

    deadlineInput.addEventListener(
        "change",
        () => {

            validateDates(
                startDateInput,
                deadlineInput
            );
        }
    );

    startDateInput.addEventListener(
        "change",
        () => {

            validateDates(
                startDateInput,
                deadlineInput
            );
        }
    );
}

function validateDates(
    startDateInput,
    deadlineInput
) {

    const startDate =
        new Date(
            startDateInput.value
        );

    const deadlineDate =
        new Date(
            deadlineInput.value
        );

    if (
        startDateInput.value &&
        deadlineInput.value &&
        deadlineDate >= startDate
    ) {

        alert(
            "Application deadline must be earlier than the activity start date."
        );

        deadlineInput.value = "";
    }
}

/* =========================
   FORM SUBMIT
========================= */

function initFormSubmit() {
    const form = document.getElementById("activity-form");
    const statusMsg = document.getElementById("status-msg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("title")?.value.trim();
        const description = document.getElementById("description")?.value.trim();
        const location = document.getElementById("location")?.value.trim();
        const type = form.querySelector('input[name="type"]:checked')?.value;
        const heldDate = document.getElementById("heldDate")?.value;
        const applicationDeadline = document.getElementById("applicationDeadline")?.value;
        const thumbnailFile = document.getElementById("thumbnail-upload")?.files?.[0];
        const attachmentFiles = document.getElementById("attachment-upload")?.files;

        if (!title || !description || !location || !type || !heldDate || !applicationDeadline) {
            setStatus("Please fill in all required fields.", true, statusMsg);
            return;
        }

        if (new Date(applicationDeadline) >= new Date(heldDate)) {
            setStatus("Application deadline must be earlier than the activity start date.", true, statusMsg);
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("location", location);
        formData.append("type", type);
        formData.append("heldDate", heldDate);
        formData.append("applicationDeadline", applicationDeadline);

        if (thumbnailFile) {
            formData.append("thumbnail", thumbnailFile);
        }

        if (attachmentFiles && attachmentFiles.length > 0) {
            for (const file of attachmentFiles) {
                formData.append("attachments", file);
            }
        }

        setStatus("Creating activity...", false, statusMsg);

        try {
            const result = await createActivity(formData);
            setStatus("Activity created successfully! Redirecting...", false, statusMsg);
            setTimeout(() => {
                window.location.href = "./index.html";
            }, 1500);
        } catch (err) {
            setStatus(err.message || "Failed to create activity.", true, statusMsg);
        }
    });
}

function setStatus(msg, isError, el) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("error-msg", "success-msg");
    el.classList.add(isError ? "error-msg" : "success-msg");
}

/* =========================
   FAVOURITES POPUP
========================= */

const popupOverlay = document.getElementById("popup-overlay");
const popupContainer = document.getElementById("popup-container");

async function showFavPopup() {
    try {
        const { activities } = await getFavourites();
        const items = (activities || []).map(a => {
            const held = a.heldDate ? new Date(a.heldDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
            return `<div class="fav-item" data-id="${a.activityID}" style="cursor:pointer;border:1px solid #e8ecf4;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;gap:16px;">
                <div style="width:100px;height:75px;border-radius:8px;overflow:hidden;background:#e8ecf4;flex-shrink:0;">${a.thumbnail ? `<img src="${a.thumbnail}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="padding:24px;text-align:center;color:#999"><i class="fa-regular fa-image"></i></div>'}</div>
                <div style="flex:1"><div style="font-weight:600;margin-bottom:4px;">${a.title}</div><div style="font-size:13px;color:var(--text-secondary)"><i class="fa-solid fa-location-dot" style="color:var(--accent)"></i> ${a.location}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${held}</div></div>
            </div>`;
        }).join("");

        popupContainer.innerHTML = `
            <div class="container">
                <div class="top-bar">
                    <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
                    <h2 style="font-size:22px;font-weight:700;">Favourite Activities</h2>
                </div>
                <div style="margin-top:20px;">${items || '<p style="text-align:center;color:var(--text-muted)">No favourites yet.</p>'}</div>
            </div>`;

        popupOverlay.classList.add("active");
        document.getElementById("back-btn").addEventListener("click", () => {
            popupOverlay.classList.remove("active");
            popupContainer.innerHTML = "";
        });
        popupOverlay.addEventListener("click", (e) => {
            if (e.target === popupOverlay) { popupOverlay.classList.remove("active"); popupContainer.innerHTML = ""; }
        });

        popupContainer.querySelectorAll(".fav-item").forEach(el => {
            el.addEventListener("click", () => {
                popupOverlay.classList.remove("active");
                popupContainer.innerHTML = "";
                window.location.href = `./index.html`;
            });
        });
    } catch {}
}