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
        }
    );

    const hostLink =
        document.querySelector(
            '.nav-links a[data-section="host"]'
        );

    if (hostLink) {
        hostLink.classList.add("active");
    }

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

    initDatePickers();

    initLocationPicker();
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
   CUSTOM DATE PICKERS
========================= */

function initDatePickers() {
    createDatePicker("startDP", {
        onChange: validateDates
    });
    createDatePicker("deadlineDP", {
        onChange: validateDates
    });
}

function createDatePicker(id, opts) {
    const container = document.getElementById(id);
    if (!container) return;

    const trigger = container.querySelector(".dp-trigger");
    const dropdown = container.querySelector(".dp-dropdown");
    const valueEl = container.querySelector(".dp-value");
    const grid = container.querySelector(".dp-grid");
    const monthEl = container.querySelector(".dp-month");
    const navs = container.querySelectorAll(".dp-nav");
    const chevron = container.querySelector(".dp-chevron");

    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = null;

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function formatDate(date) {
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    function toISOVal(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function render() {
        grid.innerHTML = "";
        const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        weekdays.forEach(d => {
            const el = document.createElement("div");
            el.className = "dp-weekday";
            el.textContent = d;
            grid.appendChild(el);
        });

        monthEl.textContent =
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
                selectedDate = new Date(currentYear, currentMonth, d);
                valueEl.textContent = formatDate(selectedDate);
                valueEl.classList.add("selected");
                close();
                render();
                if (opts.onChange) opts.onChange();
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

    function open() {
        dropdown.classList.add("active");
        container.classList.add("active");
    }

    function close() {
        dropdown.classList.remove("active");
        container.classList.remove("active");
    }

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdown.classList.contains("active")) {
            close();
        } else {
            const today = new Date();
            currentMonth = today.getMonth();
            currentYear = today.getFullYear();
            render();
            open();
        }
    });

    navs.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (btn.textContent.trim() === "‹") {
                currentMonth--;
                if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            } else {
                currentMonth++;
                if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            }
            render();
        });
    });

    document.addEventListener("click", (e) => {
        if (dropdown.classList.contains("active")) {
            if (!container.contains(e.target)) {
                close();
            }
        }
    });

    dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    render();

    return {
        getValue: () => selectedDate ? toISOVal(selectedDate) : null,
        getDate: () => selectedDate,
        container
    };
}

function validateDates() {
    const startVal = document.querySelector("#startDP .dp-value");
    const deadlineVal = document.querySelector("#deadlineDP .dp-value");

    if (!startVal || !deadlineVal) return;

    if (
        startVal.classList.contains("selected") &&
        deadlineVal.classList.contains("selected")
    ) {
        const start = new Date(startVal.textContent.split("/").reverse().join("-"));
        const deadline = new Date(deadlineVal.textContent.split("/").reverse().join("-"));

        if (deadline >= start) {
            alert("Application deadline must be earlier than the activity start date.");
            deadlineVal.textContent = "Select date";
            deadlineVal.classList.remove("selected");
        }
    }
}

/* =========================
   LOCATION PICKER (MapLibre GL + OpenFreeMap + Nominatim)
========================= */

function initLocationPicker() {
    const trigger = document.getElementById("locationTrigger");
    const overlay = document.getElementById("mapOverlay");
    const closeBtn = document.getElementById("mapCloseBtn");
    const cancelBtn = document.getElementById("mapCancelBtn");
    const confirmBtn = document.getElementById("mapConfirmBtn");
    const searchInput = document.getElementById("mapSearchInput");
    const mapContainer = document.getElementById("mapContainer");
    const locName = document.getElementById("locName");
    const locAddress = document.getElementById("locAddress");
    const locLat = document.getElementById("locLat");
    const locLng = document.getElementById("locLng");

    if (!trigger) return;

    let map = null;
    let marker = null;
    let selectedPlace = null;
    let maplibreLoaded = false;
    let searchTimeout = null;

    function loadMapLibre() {
        if (window.maplibregl) {
            maplibreLoaded = true;
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js";
            script.onload = () => {
                maplibreLoaded = true;
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    function initMap() {
        const defaultLoc = [108.2022, 16.0544];

        if (map) {
            map.resize();
            return;
        }

        map = new maplibregl.Map({
            container: mapContainer,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: defaultLoc,
            zoom: 13,
            attributionControl: false
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        map.on("load", () => {
            const el = document.createElement("div");
            el.className = "maplibregl-marker";
            el.style.cssText =
                "width: 30px;height: 30px;background: #2563EB;border: 3px solid #fff;border-radius: 50%;box-shadow: 0 2px 8px rgba(0,0,0,0.3);cursor: grab;";

            el.addEventListener("mousedown", () => { el.style.cursor = "grabbing"; });
            el.addEventListener("mouseup", () => { el.style.cursor = "grab"; });

            marker = new maplibregl.Marker({ element: el, draggable: true })
                .setLngLat(defaultLoc)
                .addTo(map);

            marker.on("dragend", () => {
                const lngLat = marker.getLngLat();
                selectedPlace = {
                    name: "Selected Location",
                    address: lngLat.lat.toFixed(6) + ", " + lngLat.lng.toFixed(6),
                    lat: lngLat.lat,
                    lng: lngLat.lng
                };
                reverseGeocode(lngLat.lat, lngLat.lng);
            });

            if (locLat.value && locLng.value) {
                const pos = [parseFloat(locLng.value), parseFloat(locLat.value)];
                map.setCenter(pos);
                map.setZoom(15);
                marker.setLngLat(pos);
            }

            map.on("click", (e) => {
                const { lng, lat } = e.lngLat;
                marker.setLngLat([lng, lat]);
                map.flyTo({ center: [lng, lat], zoom: map.getZoom() });
                selectedPlace = {
                    name: "Selected Location",
                    address: lat.toFixed(6) + ", " + lng.toFixed(6),
                    lat,
                    lng
                };
                reverseGeocode(lat, lng);
            });
        });
    }

    function reverseGeocode(lat, lng) {
        fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
        )
            .then(r => r.json())
            .then(data => {
                if (data && data.display_name) {
                    selectedPlace.name = data.name || data.display_name.split(",")[0] || "Selected Location";
                    selectedPlace.address = data.display_name;
                    searchInput.value = selectedPlace.name;
                }
            })
            .catch(() => {});
    }

    function searchPlace(query) {
        if (!query.trim()) return;
        fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
            { headers: { "Accept-Language": "en" } }
        )
            .then(r => r.json())
            .then(results => {
                if (results.length === 0) return;
                const place = results[0];
                const lng = parseFloat(place.lon);
                const lat = parseFloat(place.lat);
                map.flyTo({ center: [lng, lat], zoom: 15 });
                marker.setLngLat([lng, lat]);
                selectedPlace = {
                    name: place.display_name.split(",")[0] || place.display_name,
                    address: place.display_name,
                    lat,
                    lng
                };
                searchInput.value = selectedPlace.name;
            })
            .catch(() => {});
    }

    function updateDisplay() {
        if (selectedPlace) {
            locName.textContent = selectedPlace.name;
            locName.classList.add("selected");

            if (selectedPlace.address) {
                locAddress.textContent = selectedPlace.address;
                locAddress.classList.add("visible");
            } else {
                locAddress.classList.remove("visible");
            }

            locLat.value = selectedPlace.lat;
            locLng.value = selectedPlace.lng;
        }
    }

    function openModal() {
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";

        if (!maplibreLoaded) {
            loadMapLibre().then(() => setTimeout(initMap, 100));
        } else {
            setTimeout(() => {
                if (map) map.resize();
                else initMap();
            }, 200);
        }
    }

    function closeModal() {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    function confirmLocation() {
        if (!selectedPlace && marker) {
            const lngLat = marker.getLngLat();
            selectedPlace = {
                name: "Selected Location",
                address: lngLat.lat.toFixed(6) + ", " + lngLat.lng.toFixed(6),
                lat: lngLat.lat,
                lng: lngLat.lng
            };
        }
        if (!selectedPlace) {
            alert("Please select a location on the map.");
            return;
        }
        updateDisplay();
        closeModal();
    }

    trigger.addEventListener("click", openModal);

    closeBtn.addEventListener("click", closeModal);

    cancelBtn.addEventListener("click", closeModal);

    confirmBtn.addEventListener("click", confirmLocation);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("active")) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => searchPlace(searchInput.value), 500);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(searchTimeout);
            searchPlace(searchInput.value);
        }
    });
}