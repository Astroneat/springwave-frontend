const contentCache = new Map();

export async function fetchContent(url) {
    if (contentCache.has(url)) {
        return contentCache.get(url);
    }
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        contentCache.set(url, text);
        return text;
    } catch (e) {
        console.error("fetchContent error:", url, e);
        return "";
    }
}

export function formatDate(dateString) {
    if (!dateString) return "Unknown Date";
    const lang = localStorage.getItem("springwave_lang") || "en";
    return new Date(dateString).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

export function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

export function toLocalISODate(date) {
    if (!date || isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
export function timeAgo(dateString) {
    if (!dateString) return "just now";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "just now";

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y`;
}

import { checkSchoolEmail } from '../api/universities.js';

/**
 * Check if an email belongs to a school domain using API domain map
 * @param {string} email - The email address to check
 * @returns {Promise<boolean>} - True if the email belongs to a school domain
 */
export async function isSchoolEmail(email) {
    const result = await checkSchoolEmail(email);
    return result.isSchool;
}

/**
 * Extract domain from email
 * @param {string} email - The email address
 * @returns {string|null} - The domain or null if invalid
 */
export function extractEmailDomain(email) {
    if (!email || typeof email !== 'string') return null;
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : null;
}

/**
 * Check if user is verified or exempt (admin/host)
 * @param {Object} user - The user object
 * @returns {boolean} - True if user is verified or exempt
 */
export function isUserVerifiedOrExempt(user) {
    if (!user) return false;
    // Admins and hosts are exempt from verification
    if (user.role === 'admin' || user.role === 'host') return true;
    // Check if student is verified
    return !!user.isStudentVerified;
}

/**
 * Show verification required message
 * @deprecated Use verificationGuard.js modal instead
 * @param {string} action - The action being attempted
 */
export function showVerificationRequired(action = "perform this action") {
    console.warn('showVerificationRequired is deprecated. Use verificationGuard modal.');
}

/**
 * Guard function to prevent unverified users from performing actions
 * @param {Object} user - The user object
 * @param {string} action - The action being attempted
 * @returns {boolean} - True if user can proceed, false if blocked
 */
export function checkVerificationGuard(user, action = "perform this action") {
    if (!isUserVerifiedOrExempt(user)) {
        showVerificationRequired(action);
        return false;
    }
    return true;
}
