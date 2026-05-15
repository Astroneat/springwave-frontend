import { isAuthenticated, getUser, logout } from "../lib/session.js";
import { getActivities } from "../api/activities.js";

/* =========================
   PAGE LOAD
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadNavbar();

        await loadComponent(
            "host-activity-details-container",
            "./components/hostActivityDetails.html"
        );

        await loadFooter();

        initializeHostActivityPage();
    }
);

/* =========================
   FETCH HTML
========================= */

async function fetchContent(url) {

    const response =
        await fetch(url);

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

    logoutBtn?.addEventListener(
        "click",
        () => {

            logout();

            window.location.href =
                "/login.html";
        }
    );
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