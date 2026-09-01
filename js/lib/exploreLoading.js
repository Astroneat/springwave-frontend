/**
 * Explore page loading state helpers.
 * Renders skeleton cards + status banner into the #cards-container while
 * activities are being fetched, and gracefully clears them when content arrives.
 */

import { t } from "./i18n.js";

const SKELETON_COUNT_DESKTOP = 8;
const FALLBACK_MESSAGE = "Loading...";

function buildSkeletonCard(delayIndex = 0) {
  const delay = delayIndex * 80;
  return `
    <div class="explore-skeleton-card" style="animation-delay:${delay}ms">
      <div class="explore-skeleton-block explore-skeleton-image"></div>
      <div class="explore-skeleton-body">
        <div class="explore-skeleton-block explore-skeleton-title"></div>
        <div class="explore-skeleton-block explore-skeleton-title short"></div>
        <div class="explore-skeleton-block explore-skeleton-line wide"></div>
        <div class="explore-skeleton-block explore-skeleton-line"></div>
        <div class="explore-skeleton-block explore-skeleton-pill"></div>
        <div class="explore-skeleton-footer">
          <div class="explore-skeleton-block explore-skeleton-button"></div>
          <div class="explore-skeleton-block explore-skeleton-star"></div>
        </div>
      </div>
    </div>
  `;
}

function resolveMessage(keyOrText) {
  if (!keyOrText) return "";
  if (keyOrText.includes(".") && !/[{}<>]/.test(keyOrText)) {
    const translated = t(keyOrText, {}, "");
    if (translated && translated !== keyOrText) return translated;
    if (typeof console !== "undefined" && !resolveMessage._warned.has(keyOrText)) {
      console.warn(`[exploreLoading] missing i18n key: ${keyOrText}`);
      resolveMessage._warned.add(keyOrText);
    }
  }
  return keyOrText;
}
resolveMessage._warned = new Set();

function buildSkeletonHTML({ count, messageKey, icon = "hourglass_top" } = {}) {
  const cards = Array.from({ length: count }, (_, i) => buildSkeletonCard(i)).join("");
  const message = resolveMessage(messageKey);
  return `
    <div class="explore-loading">
      ${message ? `
        <div class="explore-loading-banner" role="status" aria-live="polite">
          <span class="material-symbols-outlined" style="color:#3493fa;font-size:20px;">${icon}</span>
          <span class="explore-loading-banner-text">
            <span data-i18n="${messageKey.includes('.') && !/[{}<>]/.test(messageKey) ? messageKey : ''}" data-i18n-fallback="${message}">${message}</span>
            <span class="explore-loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>
          </span>
        </div>
      ` : ""}
      <div class="explore-skeleton-grid">${cards}</div>
    </div>
  `;
}

function getCountForViewport() {
  if (typeof window === "undefined") return SKELETON_COUNT_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return 4;
  if (w < 1024) return 6;
  return SKELETON_COUNT_DESKTOP;
}

/**
 * Show loading skeleton inside the cards container.
 * @param {HTMLElement|string|null} container - container element or id
 * @param {{ messageKey?: string, icon?: string, count?: number }} [options]
 *   messageKey may be either a dotted i18n key (e.g. "explore.searching")
 *   or a literal string. i18n keys are resolved via the `t()` helper.
 */
export function showExploreLoading(container, options = {}) {
  const el = typeof container === "string"
    ? document.getElementById(container)
    : container;
  if (!el) return;
  const count = options.count ?? getCountForViewport();
  const messageKey = options.messageKey || FALLBACK_MESSAGE;
  el.innerHTML = buildSkeletonHTML({
    count,
    messageKey,
    icon: options.icon,
  });
  const pag = document.getElementById("pagination-container");
  if (pag) pag.innerHTML = "";
  const resultsCount = document.getElementById("resultsCount");
  if (resultsCount) {
    resultsCount.textContent = resolveMessage(messageKey);
    resultsCount.dataset.loading = "1";
  }
}

/**
 * Mark loading skeleton as complete (used when actual content is about to render).
 * Currently a no-op kept for API symmetry; consumers should overwrite innerHTML.
 */
export function hideExploreLoading() {
  const resultsCount = document.getElementById("resultsCount");
  if (resultsCount) delete resultsCount.dataset.loading;
}

/**
 * Bind the current loading message so that when the user switches language
 * while the request is in-flight, the banner text updates automatically.
 *
 * @param {HTMLElement|string|null} container
 * @param {string} messageKey  dotted i18n key (e.g. "explore.searching")
 * @returns {() => void} disposer that unbinds the listener
 */
export function bindLoadingLanguage(container, messageKey) {
  const handler = () => refreshExploreLoadingText(container, messageKey);
  window.addEventListener("language-changed", handler);
  return () => window.removeEventListener("language-changed", handler);
}

/**
 * Update only the loading banner text inside the cards container.
 * Useful for refreshing translations when the user switches language
 * while a request is still in-flight.
 */
export function refreshExploreLoadingText(container, messageKey) {
  const el = typeof container === "string"
    ? document.getElementById(container)
    : container;
  if (!el) return;
  const banner = el.querySelector(".explore-loading-banner-text > span:first-child");
  if (banner) banner.textContent = resolveMessage(messageKey);
  const resultsCount = document.getElementById("resultsCount");
  if (resultsCount && resultsCount.dataset.loading === "1") {
    resultsCount.textContent = resolveMessage(messageKey);
  }
}

export const EXPLORE_SKELETON_OPTIONS = {
  initial: { icon: "auto_awesome", messageKey: "explore.loading_events" },
  search: { icon: "search", messageKey: "explore.searching" },
  refresh: { icon: "refresh", messageKey: "explore.refreshing" },
  pagination: { icon: "sync", messageKey: "explore.loading_page" },
};

