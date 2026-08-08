import '../../src/style.css';
import { isAuthenticated, getUser } from '../lib/session.js';
import { loadNavbar, initBasicScroll } from '../components/navbar.js';
import { initChatbot } from '../components/chatbot.js';
import { fetchContent, formatDate, isUserVerifiedOrExempt } from '../lib/utils.js';
import { showVerificationModal } from '../components/verificationGuard.js';
import { t } from '../lib/i18n.js';
import { openEventPopup } from '../components/eventPopup.js';
import { showNoticeBox } from '../components/noticeBox.js';
import * as roadmapApi from '../api/roadmap.js';
import { get } from '../api/client.js';
import { CDN_DOMAIN } from '../config.js';

let currentStep = 1;
const MAX_STEPS = 6;
let map, circle, marker;
let selectedLocation = { lat: 10.7769, lng: 106.7009, address: '' };
let generatedRoadmapId = null;
let timelineData = [];

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }

    const user = getUser();
    if (!isUserVerifiedOrExempt(user)) {
        showVerificationModal('create a roadmap');
    }

    await loadNavbar();
    await loadFooter();
    await initChatbot();
    
    initWizard();
    initLocationStep();
    initCategoriesStep();
    initSkillsStep();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        await loadExistingRoadmap(id);
    }
});

async function loadFooter() {
    const html = await fetchContent("./components/footer.html");
    document.getElementById("footer-container").innerHTML = html;
}

function initWizard() {
    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');
    const btnGenerate = document.getElementById('btn-generate');
    
    btnNext.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            if (currentStep < MAX_STEPS) {
                currentStep++;
                showStep(currentStep);
            }
        }
    });
    
    btnBack.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    btnGenerate.addEventListener('click', handleGenerate);

    // Timeframe buttons
    document.getElementById('btn-short-term').addEventListener('click', (e) => {
        e.target.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
        document.getElementById('btn-long-term').classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
        const d = new Date();
        document.getElementById('start-date').value = d.toISOString().split('T')[0];
        d.setMonth(d.getMonth() + 1);
        document.getElementById('end-date').value = d.toISOString().split('T')[0];
    });

    document.getElementById('btn-long-term').addEventListener('click', (e) => {
        e.target.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
        document.getElementById('btn-short-term').classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
        const d = new Date();
        document.getElementById('start-date').value = d.toISOString().split('T')[0];
        d.setMonth(d.getMonth() + 6);
        document.getElementById('end-date').value = d.toISOString().split('T')[0];
    });

    // Time chips toggle
    document.querySelectorAll('.time-chip').forEach(el => {
        el.addEventListener('click', () => el.classList.toggle('active'));
    });

    // Day chips single select
    document.querySelectorAll('.day-chip').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
        });
    });

    // Result actions
    document.getElementById('btn-confirm').addEventListener('click', handleConfirm);
    document.getElementById('btn-regenerate').addEventListener('click', () => {
        document.getElementById('roadmap-result').classList.add('hidden');
        document.getElementById('roadmap-wizard').classList.remove('hidden');
    });
}

function showStep(n) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${n}`).classList.add('active');
    
    document.querySelectorAll('.wizard-step-indicator').forEach((el, idx) => {
        if (idx + 1 < n) {
            el.className = 'wizard-step-indicator completed';
        } else if (idx + 1 === n) {
            el.className = 'wizard-step-indicator active';
        } else {
            el.className = 'wizard-step-indicator';
        }
    });

    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const btnGenerate = document.getElementById('btn-generate');

    btnBack.classList.toggle('hidden', n === 1);
    
    if (n === MAX_STEPS) {
        btnNext.classList.add('hidden');
        btnGenerate.classList.remove('hidden');
    } else {
        btnNext.classList.remove('hidden');
        btnGenerate.classList.add('hidden');
    }

    if (n === 4 && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

function validateStep(n) {
    if (n === 1) {
        const goal = document.getElementById('goal-input').value.trim();
        if (!goal) {
            showNoticeBox({ id: 'err-goal', message: 'Vui lòng nhập mục tiêu của bạn.', type: 'warning', once: false, containerId: 'notice-container' });
            return false;
        }
        return true;
    }
    if (n === 2) {
        const start = document.getElementById('start-date').value;
        const end = document.getElementById('end-date').value;
        if (!start || !end) {
            showNoticeBox({ id: 'err-date-req', message: 'Vui lòng chọn ngày bắt đầu và kết thúc.', type: 'warning', once: false, containerId: 'notice-container' });
            return false;
        }
        if (new Date(start) > new Date(end)) {
            showNoticeBox({ id: 'err-date-range', message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.', type: 'warning', once: false, containerId: 'notice-container' });
            return false;
        }
        return true;
    }
    return true;
}

function initLocationStep() {
    map = L.map('roadmap-map').setView([10.7769, 106.7009], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    marker = L.marker([10.7769, 106.7009], { draggable: true }).addTo(map);
    circle = L.circle([10.7769, 106.7009], { radius: 5000, color: '#1755ba', fillOpacity: 0.1 }).addTo(map);

    const updateLocation = (lat, lng) => {
        selectedLocation.lat = lat;
        selectedLocation.lng = lng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        map.setView([lat, lng]);
    };

    marker.on('dragend', () => updateLocation(marker.getLatLng().lat, marker.getLatLng().lng));
    map.on('click', (e) => updateLocation(e.latlng.lat, e.latlng.lng));

    const slider = document.getElementById('radius-slider');
    slider.addEventListener('input', (e) => {
        const km = e.target.value;
        document.getElementById('radius-val').textContent = km + 'km';
        circle.setRadius(km * 1000);
    });

    const searchInput = document.getElementById('location-search');
    let timeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            if (e.target.value.length < 3) return;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(e.target.value)}`);
                const data = await res.json();
                if (data && data.length > 0) {
                    updateLocation(data[0].lat, data[0].lon);
                    selectedLocation.address = data[0].display_name;
                }
            } catch (err) {}
        }, 500);
    });
}

async function initCategoriesStep() {
    try {
        const res = await get('/categories');
        const container = document.getElementById('category-chips');
        if (res.categories) {
            container.innerHTML = res.categories.map(c => 
                `<div class="category-chip text-sm" data-id="${c._id}">${c.name}</div>`
            ).join('');
            
            container.querySelectorAll('.category-chip').forEach(el => {
                el.addEventListener('click', () => el.classList.toggle('active'));
            });
        }
    } catch (e) {}
}

function initSkillsStep() {
    const input = document.getElementById('skill-input');
    const container = document.getElementById('skills-container');
    const skills = new Set();

    const addSkill = (name) => {
        if (!name || skills.has(name)) return;
        skills.add(name);
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `<span>${name}</span><button type="button">&times;</button>`;
        tag.querySelector('button').addEventListener('click', () => {
            skills.delete(name);
            tag.remove();
        });
        container.insertBefore(tag, input);
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill(input.value.trim());
            input.value = '';
        }
    });

    document.querySelectorAll('.skill-suggest').forEach(el => {
        el.addEventListener('click', () => addSkill(el.textContent));
    });
    
    // Expose for gatherData
    window.getSkills = () => Array.from(skills);
}

async function handleGenerate() {
    const btnGenerate = document.getElementById('btn-generate');
    if (btnGenerate.disabled) return;
    
    btnGenerate.disabled = true;
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('active');

    try {
        const inputData = gatherData();
        const res = await roadmapApi.generateRoadmap(inputData);
        generatedRoadmapId = res.roadmap._id;
        timelineData = res.roadmap.timeline;
        
        document.getElementById('roadmap-wizard').classList.add('hidden');
        document.getElementById('roadmap-result').classList.remove('hidden');
        
        renderResult(res.roadmap);
    } catch (err) {
        const msg = err.status === 429 
            ? t('roadmap.daily_limit') 
            : (err.message || t("roadmap.error_generating"));
        showNoticeBox({
            id: 'err-generate-' + Date.now(),
            message: msg,
            type: 'error',
            once: false,
            containerId: 'notice-container'
        });
    } finally {
        overlay.classList.remove('active');
        btnGenerate.disabled = false;
    }
}

function gatherData() {
    const timeSlots = Array.from(document.querySelectorAll('.time-chip.active')).map(e => e.dataset.value);
    const dayPreference = document.querySelector('.day-chip.active')?.dataset.value || 'both';
    const categories = Array.from(document.querySelectorAll('#category-chips .category-chip.active')).map(e => e.dataset.id);
    const timeframeType = document.getElementById('btn-short-term').classList.contains('border-blue-500') ? 'short' : 'long';
    
    return {
        goal: document.getElementById('goal-input').value,
        timeframe: {
            type: timeframeType,
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value
        },
        availability: {
            timeSlots,
            dayPreference
        },
        location: {
            address: selectedLocation.address || '',
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            radiusKm: parseInt(document.getElementById('radius-slider').value)
        },
        categories,
        expectedSkills: window.getSkills ? window.getSkills() : [],
        wantsCertificate: document.getElementById('cert-toggle').checked
    };
}

function renderResult(roadmap) {
    const comment = roadmap.aiAnalysis?.userComment || t('roadmap.ai_analysis');
    document.getElementById('ai-comment').textContent = comment;
    
    const chart = roadmap.aiAnalysis?.spiderChart;
    if (chart) {
        renderSpiderChart([
            chart.communication || 0,
            chart.technical || 0,
            chart.creativity || 0,
            chart.socialImpact || 0,
            chart.leadership || 0,
            chart.teamwork || 0
        ]);
    }
    
    renderTimeline(roadmap.timeline);
}

function renderSpiderChart(values) {
    const ctx = document.getElementById('spider-chart').getContext('2d');
    if (window.spiderChartInstance) window.spiderChartInstance.destroy();
    
    window.spiderChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Communication', 'Technical', 'Creativity', 'Social Impact', 'Leadership', 'Teamwork'],
            datasets: [{ 
                data: values.length === 6 ? values : [50,50,50,50,50,50], 
                backgroundColor: 'rgba(23,85,186,0.2)', 
                borderColor: '#1755ba', 
                pointBackgroundColor: '#1755ba' 
            }]
        },
        options: {
            scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
            animation: { duration: 1500, easing: 'easeOutQuart' },
            plugins: { legend: { display: false } }
        }
    });
}

function renderTimeline(timeline) {
    const container = document.getElementById('timeline-container');
    
    if (!timeline || timeline.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-gray-400">
            <span class="material-symbols-outlined text-4xl mb-2">event_busy</span>
            <p class="text-sm">${t('roadmap.no_events')}</p>
        </div>`;
        return;
    }
    
    let html = '<div class="timeline-line"></div>';
    
    timeline.forEach((item, index) => {
        const ev = item.selectedEvent || item.event;
        if (!ev) return;
        
        const dateStr = formatDate(item.date || ev.heldDate);
        const thumb = ev.thumbnail ? (ev.thumbnail.startsWith('http') ? ev.thumbnail : CDN_DOMAIN + '/' + ev.thumbnail) : '';
        const thumbHtml = thumb ? `<img src="${thumb}" class="w-24 h-24 rounded-lg object-cover flex-shrink-0" alt="${ev.title}">` : `<div class="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><i class="fa-solid fa-image"></i></div>`;
        const hasAlts = (item.alternativeEvents && item.alternativeEvents.length > 0);
        
        html += `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-card flex-col md:flex-row">
                    ${thumbHtml}
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-lg text-gray-800 line-clamp-1 mb-1">${ev.title}</h3>
                            ${ev.hasCertificate ? `<span class="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 whitespace-nowrap"><i class="fa-solid fa-award"></i> Certificate</span>` : ''}
                        </div>
                        <p class="text-sm text-gray-500 mb-2"><i class="fa-regular fa-calendar mr-1"></i> ${dateStr} &nbsp; <i class="fa-solid fa-location-dot mx-1"></i> ${ev.location || ''}</p>
                        <p class="text-sm text-gray-600 line-clamp-2 mb-3">${(ev.description || '').slice(0, 150)}</p>
                        <div class="flex gap-2">
                            <button onclick="window.openEventPopup('${ev._id}')" class="text-sm text-[#1755ba] font-bold hover:underline">${t('roadmap.view_details')}</button>
                            ${hasAlts ? `<button onclick="window.openSwipeModal(${index})" class="text-sm text-gray-500 font-bold hover:text-gray-800 ml-4">${t('roadmap.replace_event')}</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

window.openEventPopup = openEventPopup;
window.openSwipeModal = (timelineIndex) => {
    const entry = timelineData[timelineIndex];
    const alternatives = entry?.alternativeEvents || entry?.alternatives || [];
    if (alternatives.length === 0) {
        alert(t('roadmap.no_events'));
        return;
    }
    
    const modal = document.getElementById('swipe-modal');
    const stack = document.getElementById('swipe-card-stack');
    modal.classList.add('active');
    
    let currentAltIdx = 0;
    
    const renderCard = () => {
        if (currentAltIdx >= alternatives.length) {
            modal.classList.remove('active');
            return;
        }
        const ev = alternatives[currentAltIdx];
        if (!ev || !ev._id) {
            modal.classList.remove('active');
            return;
        }
        const thumb = ev.thumbnail ? (ev.thumbnail.startsWith('http') ? ev.thumbnail : CDN_DOMAIN + '/' + ev.thumbnail) : '';
        stack.innerHTML = `
            <div class="swipe-card">
                ${thumb ? `<img src="${thumb}" class="w-full h-40 object-cover rounded-lg mb-4">` : '<div class="w-full h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400"><i class="fa-solid fa-image text-3xl"></i></div>'}
                <h3 class="font-bold text-xl mb-2 line-clamp-2">${ev.title}</h3>
                <p class="text-gray-500 text-sm mb-2"><i class="fa-regular fa-calendar mr-1"></i> ${formatDate(ev.heldDate)}</p>
                <p class="text-gray-500 text-sm mb-4"><i class="fa-solid fa-location-dot mr-1"></i> ${ev.location || ''}</p>
                <p class="text-gray-600 text-sm line-clamp-3 flex-1">${(ev.description || '').slice(0, 200)}</p>
                <div class="text-xs text-gray-400 mt-auto pt-4">${currentAltIdx + 1} / ${alternatives.length}</div>
            </div>
        `;
        
        // Touch/mouse swipe support
        const card = stack.querySelector('.swipe-card');
        let startX = 0, currentX = 0, isDragging = false;
        
        const onStart = (x) => { startX = x; isDragging = true; card.style.transition = 'none'; };
        const onMove = (x) => {
            if (!isDragging) return;
            currentX = x - startX;
            card.style.transform = `translateX(${currentX}px)`;
            card.style.opacity = Math.max(0.5, 1 - Math.abs(currentX) / 400);
        };
        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            card.style.transition = 'transform 0.3s, opacity 0.3s';
            if (Math.abs(currentX) > 100) {
                if (currentX > 0) {
                    document.getElementById('swipe-btn-select').click();
                } else {
                    document.getElementById('swipe-btn-skip').click();
                }
            } else {
                card.style.transform = '';
                card.style.opacity = '1';
            }
            currentX = 0;
        };
        
        card.addEventListener('mousedown', (e) => onStart(e.clientX));
        document.addEventListener('mousemove', (e) => onMove(e.clientX));
        document.addEventListener('mouseup', onEnd);
        card.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
        card.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
        card.addEventListener('touchend', onEnd);
    };
    
    renderCard();
    
    const closeModal = () => {
        modal.classList.remove('active');
        document.removeEventListener('keydown', handleKeydown);
    };

    const handleKeydown = (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'ArrowLeft') {
            document.getElementById('swipe-btn-skip').click();
        } else if (e.key === 'ArrowRight') {
            document.getElementById('swipe-btn-select').click();
        } else if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', handleKeydown);

    document.getElementById('swipe-btn-skip').onclick = () => {
        currentAltIdx++;
        if (currentAltIdx >= alternatives.length) {
            closeModal();
        } else {
            renderCard();
        }
    };
    
    document.getElementById('swipe-btn-select').onclick = async () => {
        try {
            const ev = alternatives[currentAltIdx];
            const res = await roadmapApi.swapTimelineEvent(generatedRoadmapId, timelineIndex, ev._id);
            if (res.roadmap) {
                timelineData = res.roadmap.timeline;
                renderTimeline(timelineData);
            }
            closeModal();
        } catch (e) {
            showNoticeBox({ id: 'err-swap-' + Date.now(), message: e.message, type: 'error', once: false, containerId: 'notice-container' });
            closeModal();
        }
    };
    
    // Close modal on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
};

async function handleConfirm() {
    try {
        await roadmapApi.confirmRoadmap(generatedRoadmapId);
        alert(t('roadmap.roadmap_confirmed'));
        window.location.href = "/profile.html";
    } catch (e) {
        alert(e.message);
    }
}

async function loadExistingRoadmap(id) {
    try {
        const res = await roadmapApi.getRoadmapById(id);
        generatedRoadmapId = res.roadmap._id;
        timelineData = res.roadmap.timeline;
        
        document.getElementById('roadmap-wizard').classList.add('hidden');
        document.getElementById('roadmap-result').classList.remove('hidden');
        
        renderResult(res.roadmap);
    } catch (e) {
        alert("Roadmap not found");
        window.location.href = "/profile.html";
    }
}
