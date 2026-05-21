import { isAuthenticated, getUser} from "../lib/session.js";
import { createActivity } from "../api/activities.js";
import { addFavourite, removeFavourite, checkFavourite, getFavourites } from "../api/user.js";
import { CDN_DOMAIN } from "../config.js";
import { initChatbot } from "../components/chatBot.js";
import { fetchContent } from "../lib/utils.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navBar.js";

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
    await loadSharedNavbar({ activeSection: "host", onFavouritesClick: showFavPopup });

    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        const section = link.getAttribute("data-section");
        if (section === "home") {
            link.href = "./index.html";
        }
        else if (section === "explore") {
            link.href = "./index.html#explore";
        }
    });

    initBasicScroll();
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

    initMapPicker();

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

const MAX_FILES = 10;

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

    let selectedFiles = [];

    function renderFileList() {

        fileList.innerHTML = "";

        if (selectedFiles.length === 0) return;

        selectedFiles.forEach(
            (file, index) => {

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

                    <div style="flex:1;min-width:0">
                        <div class="file-name">
                            ${file.name}
                        </div>

                        <div class="file-size">
                            ${(file.size / 1024).toFixed(1)} KB
                        </div>
                    </div>

                    <button type="button" class="file-remove" data-index="${index}" title="Remove file">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                `;

                item.querySelector(
                    ".file-remove"
                ).addEventListener(
                    "click",
                    (e) => {
                        e.stopPropagation();
                        selectedFiles.splice(index, 1);
                        renderFileList();
                        updateFileInput();
                    }
                );

                fileList.appendChild(
                    item
                );
            }
        );
    }

    function updateFileInput() {

        const dt =
            new DataTransfer();

        selectedFiles.forEach(
            f => dt.items.add(f)
        );

        attachmentInput.files =
            dt.files;
    }

    attachmentInput.addEventListener(
        "change",
        function () {

            const newFiles =
                Array.from(this.files);

            if (newFiles.length === 0) return;

            if (
                selectedFiles.length + newFiles.length >
                MAX_FILES
            ) {

                alert(
                    `You can upload up to ${MAX_FILES} files total.`
                );

                this.value = "";

                return;
            }

            selectedFiles = [
                ...selectedFiles,
                ...newFiles
            ];

            renderFileList();
            updateFileInput();
        }
    );
}

/* =========================
   MAP PICKER
========================= */

function initMapPicker() {
    const mapContainer = document.getElementById("map");
    const locationInput = document.getElementById("location");
    const locationRow = document.querySelector(".location-input-row");
    const markerLabel = document.getElementById("mapMarkerLabel");
    const latInput = document.getElementById("locationLat");
    const lngInput = document.getElementById("locationLng");
    const locateBtn = document.getElementById("locateBtn");

    if (!mapContainer || !locationInput) return;

    const defaultCenter = [105.85, 21.03];
    let marker = null;
    let geocodeTimer = null;
    let searchTimer = null;
    let selectedViaSearch = false;

    const map = new maplibregl.Map({
        container: "map",
        style: {
            version: 8,
            sources: {
                osm: {
                    type: "raster",
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    attribution: "&copy; OpenStreetMap contributors"
                }
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }]
        },
        center: defaultCenter,
        zoom: 12,
        attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    /* ---------- autocomplete dropdown ---------- */

    const dropdown = document.createElement("div");
    dropdown.className = "location-autocomplete";
    locationRow.style.position = "relative";
    locationRow.appendChild(dropdown);

    function hideDropdown() {
        dropdown.classList.remove("active");
    }

    function selectPlace(name, lng, lat) {
        selectedViaSearch = true;
        locationInput.value = name;
        hideDropdown();
        setMarker(lng, lat);
        map.flyTo({ center: [lng, lat], zoom: 15 });
        markerLabel.textContent = name;
        markerLabel.classList.add("filled");
    }

    function searchPlaces(query) {
        if (searchTimer) clearTimeout(searchTimer);

        if (!query.trim() || query.length < 2) {
            hideDropdown();
            return;
        }

        searchTimer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                    { headers: { "Accept-Language": "en", "User-Agent": "SpringWave/1.0" } }
                );
                const data = await res.json();
                if (!data || data.length === 0) { hideDropdown(); return; }

                dropdown.innerHTML = data.map((place, i) => {
                    const name = place.display_name;
                    const type = place.type || "";
                    const shortName = name.split(",")[0];
                    return `<div class="ac-item" data-index="${i}">
                        <span class="material-symbols-outlined ac-icon">place</span>
                        <div class="ac-text">
                            <div class="ac-title">${shortName}</div>
                            <div class="ac-desc">${name}</div>
                        </div>
                    </div>`;
                }).join("");
                dropdown.classList.add("active");

                dropdown.querySelectorAll(".ac-item").forEach((el) => {
                    el.addEventListener("click", () => {
                        const idx = parseInt(el.dataset.index);
                        const place = data[idx];
                        selectPlace(place.display_name, parseFloat(place.lon), parseFloat(place.lat));
                    });
                });
            } catch { hideDropdown(); }
        }, 300);
    }

    /* ---------- marker ---------- */

    function setMarker(lng, lat) {
        if (marker) marker.remove();

        const el = document.createElement("div");
        el.className = "map-pin";
        el.innerHTML = `<span class="material-symbols-outlined" style="font-size:36px;color:#2563EB;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">location_on</span>`;
        el.style.transform = "translate(-50%, -100%)";

        marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);

        latInput.value = lat;
        lngInput.value = lng;
    }

    /* ---------- reverse geocode ---------- */

    function reverseGeocode(lng, lat) {
        if (geocodeTimer) clearTimeout(geocodeTimer);

        geocodeTimer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
                    { headers: { "Accept-Language": "en", "User-Agent": "SpringWave/1.0" } }
                );
                const data = await res.json();
                const displayName = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                locationInput.value = displayName;
                markerLabel.textContent = displayName;
                markerLabel.classList.add("filled");
            } catch {
                const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                locationInput.value = fallback;
                markerLabel.textContent = fallback;
                markerLabel.classList.add("filled");
            }
        }, 300);
    }

    /* ---------- map click ---------- */

    map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        selectedViaSearch = false;
        setMarker(lng, lat);
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
        reverseGeocode(lng, lat);
        hideDropdown();
    });

    /* ---------- input events ---------- */

    locationInput.addEventListener("input", () => {
        if (!locationInput.value.trim()) {
            markerLabel.textContent = "Click on map to set location";
            markerLabel.classList.remove("filled");
            if (marker) { marker.remove(); marker = null; }
            latInput.value = "";
            lngInput.value = "";
            hideDropdown();
            return;
        }
        if (!selectedViaSearch) {
            searchPlaces(locationInput.value);
        }
        selectedViaSearch = false;
    });

    locationInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideDropdown();
    });

    locationInput.addEventListener("blur", () => {
        setTimeout(hideDropdown, 200);
    });

    locationInput.addEventListener("focus", () => {
        const val = locationInput.value.trim();
        if (val.length >= 2) searchPlaces(val);
    });

    /* ---------- locate button ---------- */

    locateBtn?.addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                selectedViaSearch = false;
                map.flyTo({ center: [longitude, latitude], zoom: 15 });
                setMarker(longitude, latitude);
                reverseGeocode(longitude, latitude);
            },
            () => alert("Could not get your location. Please enable location access.")
        );
    });

    /* ---------- map resize ---------- */

    map.on("load", () => {
        map.resize();
    });
}

/* =========================
   DATE PICKER
========================= */

function initDateValidation() {
    const heldDate = createDatePicker({
        triggerId: "heldDateTrigger",
        dropdownId: "heldDateDropdown",
        placeholderId: "heldDatePlaceholder",
        valueId: "heldDateValue",
        gridId: "heldDateCalGrid",
        monthLabelId: "heldDateMonthLabel",
        prevBtnId: "heldDatePrev",
        nextBtnId: "heldDateNext",
        clearBtnId: "heldDateClear",
        closeBtnId: "heldDateClose",
        hiddenInputId: "heldDate"
    });

    const deadline = createDatePicker({
        triggerId: "deadlineTrigger",
        dropdownId: "deadlineDropdown",
        placeholderId: "deadlinePlaceholder",
        valueId: "deadlineValue",
        gridId: "deadlineCalGrid",
        monthLabelId: "deadlineMonthLabel",
        prevBtnId: "deadlinePrev",
        nextBtnId: "deadlineNext",
        clearBtnId: "deadlineClear",
        closeBtnId: "deadlineClose",
        hiddenInputId: "applicationDeadline"
    });

    heldDate.onSelect = (date) => {
        const dVal = document.getElementById("applicationDeadline")?.value;
        if (dVal && new Date(dVal) >= date) {
            alert("Application deadline must be earlier than the activity start date.");
            deadline.clear();
        }
    };

    deadline.onSelect = (date) => {
        const hVal = document.getElementById("heldDate")?.value;
        if (hVal && date >= new Date(hVal)) {
            alert("Application deadline must be earlier than the activity start date.");
            deadline.clear();
        }
    };
}

function createDatePicker(config) {
    const trigger = document.getElementById(config.triggerId);
    const dropdown = document.getElementById(config.dropdownId);
    const placeholder = document.getElementById(config.placeholderId);
    const valueEl = document.getElementById(config.valueId);
    const grid = document.getElementById(config.gridId);
    const monthLabel = document.getElementById(config.monthLabelId);
    const prevBtn = document.getElementById(config.prevBtnId);
    const nextBtn = document.getElementById(config.nextBtnId);
    const clearBtn = document.getElementById(config.clearBtnId);
    const closeBtn = document.getElementById(config.closeBtnId);
    const hiddenInput = document.getElementById(config.hiddenInputId);

    if (!trigger) return null;

    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = null;
    let onSelect = null;

    document.body.appendChild(dropdown);

    const api = {
        clear() {
            selectedDate = null;
            hiddenInput.value = "";
            updateDisplay();
        },
        get onSelect() { return onSelect; },
        set onSelect(fn) { onSelect = fn; },
        get selectedDate() { return selectedDate; }
    };

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function updateDisplay() {
        if (selectedDate) {
            valueEl.textContent = `${pad(selectedDate.getDate())}/${pad(selectedDate.getMonth() + 1)}/${selectedDate.getFullYear()}`;
            valueEl.classList.add("visible");
            placeholder.classList.add("hidden");
            hiddenInput.value = selectedDate.toISOString().split("T")[0];
        } else {
            valueEl.classList.remove("visible");
            placeholder.classList.remove("hidden");
            hiddenInput.value = "";
        }
    }

    function renderCalendar() {
        grid.innerHTML = "";

        const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        weekdays.forEach(d => {
            const el = document.createElement("div");
            el.className = "dp-weekday";
            el.textContent = d;
            grid.appendChild(el);
        });

        monthLabel.textContent =
            new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = startOffset - 1; i >= 0; i--) {
            const el = document.createElement("div");
            el.className = "dp-day other-month";
            el.textContent = daysInPrevMonth - i;
            grid.appendChild(el);
        }

        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const el = document.createElement("div");
            el.className = "dp-day";
            el.textContent = d;

            const date = new Date(currentYear, currentMonth, d);

            if (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                el.classList.add("today");
            }

            if (selectedDate && date.getTime() === selectedDate.getTime()) {
                el.classList.add("selected");
            }

            el.addEventListener("click", () => {
                selectedDate = date;
                updateDisplay();
                renderCalendar();
                closeDropdown();
                if (onSelect) onSelect(date);
            });

            grid.appendChild(el);
        }

        const totalCells = startOffset + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const el = document.createElement("div");
            el.className = "dp-day other-month";
            el.textContent = i;
            grid.appendChild(el);
        }
    }

    const NAVBAR_SAFE = 80;

    function positionDropdown() {
        const rect = trigger.getBoundingClientRect();
        const dropdownWidth = 320;
        const dropdownHeight = dropdown.offsetHeight || 380;

        let left = rect.left + rect.width / 2;
        if (left - dropdownWidth / 2 < 10) left = 10 + dropdownWidth / 2;
        if (left + dropdownWidth / 2 > window.innerWidth - 10) left = window.innerWidth - 10 - dropdownWidth / 2;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        let top;
        if (spaceBelow < dropdownHeight + 16 && spaceAbove > dropdownHeight + 16) {
            top = rect.top - dropdownHeight - 8;
        } else {
            top = rect.bottom + 8;
        }

        if (top < NAVBAR_SAFE) top = NAVBAR_SAFE;
        if (top + dropdownHeight > window.innerHeight - 10) {
            top = window.innerHeight - dropdownHeight - 10;
        }

        dropdown.style.left = left + "px";
        dropdown.style.top = top + "px";
    }

    function openDropdown() {
        const today = new Date();
        if (!selectedDate) {
            currentMonth = today.getMonth();
            currentYear = today.getFullYear();
        } else {
            currentMonth = selectedDate.getMonth();
            currentYear = selectedDate.getFullYear();
        }
        renderCalendar();
        positionDropdown();
        dropdown.style.transform = "translateX(-50%) translateY(8px) scale(0.96)";
        dropdown.classList.add("active");
        trigger.parentElement.classList.add("active");

        requestAnimationFrame(() => {
            dropdown.style.transform = "translateX(-50%) translateY(0) scale(1)";
        });

        window.addEventListener("scroll", followOnScroll, { passive: true });
        window.addEventListener("resize", followOnScroll, { passive: true });
    }

    function followOnScroll() {
        const rect = trigger.getBoundingClientRect();
        const navbarH = 80;

        if (rect.bottom < navbarH || rect.top > window.innerHeight) {
            closeDropdown();
            return;
        }

        positionDropdown();
    }

    function closeDropdown() {
        dropdown.classList.remove("active");
        trigger.parentElement.classList.remove("active");
        window.removeEventListener("scroll", followOnScroll);
        window.removeEventListener("resize", followOnScroll);
    }

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdown.classList.contains("active")) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });

    nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });

    clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedDate = null;
        hiddenInput.value = "";
        updateDisplay();
        renderCalendar();
    });

    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDropdown();
    });

    document.addEventListener("click", (e) => {
        if (dropdown.classList.contains("active")) {
            if (!dropdown.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
                closeDropdown();
            }
        }
    });

    dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    updateDisplay();

    return api;
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
            return `<div class="fav-item" data-id="${a.activityID}">
                <div class="fav-thumb">${a.thumbnail ? `<img src="${a.thumbnail}" alt="${a.title}">` : '<div class="fav-thumb-placeholder"><i class="fa-regular fa-image"></i></div>'}</div>
                <div class="fav-body"><div class="fav-title">${a.title}</div><div class="fav-location"><i class="fa-solid fa-location-dot"></i> ${a.location}</div><div class="fav-date">${held}</div></div>
            </div>`;
        }).join("");

        popupContainer.innerHTML = `
            <div class="container">
                <div class="top-bar">
                    <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
                    <h2 class="fav-popup-title">Favourite Activities</h2>
                </div>
                <div class="fav-list">${items || '<p class="fav-empty">No favourites yet.</p>'}</div>
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