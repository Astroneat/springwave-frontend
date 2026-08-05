import { getUser, isAuthenticated } from '../lib/session.js';
import { isUserVerifiedOrExempt } from '../lib/utils.js';
import { t } from '../lib/i18n.js';

let verificationModalOpen = false;

/**
 * Initialize verification guard for read-only mode and action blurring
 */
export function initVerificationGuard() {
    if (!isAuthenticated()) return;

    const user = getUser();
    if (isUserVerifiedOrExempt(user)) return;

    // Show sleek top-aligned Read-Only banner below navbar
    showReadOnlyNoticeBanner();

    // Apply blur and click handlers to elements requiring verification
    applyVerificationBlur();

    // Observe DOM mutations to blur dynamically added elements (e.g. popups, list items)
    const observer = new MutationObserver(() => {
        applyVerificationBlur();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Render a persistent, unified Read-Only Notice Banner for unverified users
 */
export function showReadOnlyNoticeBanner() {
    if (sessionStorage.getItem('springwave_read_only_banner_dismissed')) return;
    if (document.getElementById('read-only-banner')) return;

    let container = document.getElementById('notice-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notice-container';
        container.className = 'notice-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30';
        const main = document.querySelector('main') || document.body;
        main.insertBefore(container, main.firstChild);
    } else {
        if (!container.classList.contains('notice-container')) {
            container.classList.add('notice-container', 'relative', 'z-30');
        }
    }

    const titleText = t('verification.readonly_banner_title', 'Read-Only Mode Active');
    const descText = t('verification.readonly_banner_desc', 'Verify your student status to unlock full access to events, AI roadmaps, and communities.');
    const verifyBtnText = t('verification.modal_verify_btn', 'Verify Now');

    const banner = document.createElement('div');
    banner.id = 'read-only-banner';
    banner.className = 'flex flex-col sm:flex-row items-center justify-between gap-3 p-4 mb-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 backdrop-blur-md shadow-sm transition-all duration-300';
    
    banner.innerHTML = `
        <div class="flex items-center gap-3 text-left w-full sm:w-auto">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[24px]">shield_person</span>
            </div>
            <div>
                <h4 class="text-sm font-bold text-amber-900 dark:text-amber-200 leading-tight">${titleText}</h4>
                <p class="text-xs text-amber-800/80 dark:text-amber-300/80 font-medium leading-relaxed mt-0.5">${descText}</p>
            </div>
        </div>
        <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
            <a href="/student-verify.html" class="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5 whitespace-nowrap flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">verified</span>
                <span>${verifyBtnText}</span>
            </a>
            <button type="button" id="dismiss-readonly-banner" class="p-1.5 rounded-lg text-amber-700/60 hover:text-amber-900 hover:bg-amber-500/10 transition-colors cursor-pointer" aria-label="Dismiss banner">
                <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    `;

    banner.querySelector('#dismiss-readonly-banner').addEventListener('click', () => {
        sessionStorage.setItem('springwave_read_only_banner_dismissed', 'true');
        banner.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => banner.remove(), 300);
    });

    container.prepend(banner);
}

/**
 * Apply blur class and click interceptor to protected elements
 */
export function applyVerificationBlur() {
    const selector = '[data-requires-verified], .requires-verification, #participate-btn, .participate-btn';
    const protectedElements = document.querySelectorAll(selector);

    protectedElements.forEach(el => {
        if (el.dataset.guardApplied) return;
        el.dataset.guardApplied = 'true';

        // Add blur style class
        el.classList.add('verification-blur-target');

        // Capture click event to prevent action and show modal
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const action = el.dataset.actionName || 'perform this action';
            showVerificationModal(action);
            return false;
        }, true);
    });
}

/**
 * Display the glassmorphism verification prompt modal
 * @param {string} [actionName] - Action description
 */
export function showVerificationModal(actionName) {
    if (verificationModalOpen) return;
    verificationModalOpen = true;

    let overlay = document.getElementById('verification-guard-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'verification-guard-modal';
        overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 opacity-0';
        
        const titleText = t('verification.modal_title', 'Student Verification Required');
        const descText = t('verification.modal_desc', 'You are currently in Read-Only mode. Please verify your student status to participate in events and join communities.');
        const verifyBtnText = t('verification.modal_verify_btn', 'Verify Now');
        const cancelBtnText = t('verification.modal_cancel_btn', 'Explore More');

        overlay.innerHTML = `
            <div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden transform scale-95 transition-transform duration-300">
                <!-- Background ambient glow -->
                <div class="absolute -top-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <span class="material-symbols-outlined text-[36px]">shield_person</span>
                </div>

                <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-headline">${titleText}</h3>
                <p class="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">${descText}</p>

                <div class="flex flex-col gap-3">
                    <a href="/student-verify.html" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[20px]">verified</span>
                        <span>${verifyBtnText}</span>
                    </a>
                    <button type="button" id="close-verification-modal-btn" class="w-full py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors cursor-pointer">
                        ${cancelBtnText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector('#close-verification-modal-btn');
        closeBtn.addEventListener('click', closeVerificationModal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeVerificationModal();
        });
    }

    // Trigger animation
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        const inner = overlay.firstElementChild;
        if (inner) inner.classList.remove('scale-95');
    });
}

export function closeVerificationModal() {
    const overlay = document.getElementById('verification-guard-modal');
    if (!overlay) return;

    overlay.classList.add('opacity-0');
    const inner = overlay.firstElementChild;
    if (inner) inner.classList.add('scale-95');

    setTimeout(() => {
        overlay.remove();
        verificationModalOpen = false;
    }, 300);
}
