export async function fetchContent(url) {
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.text();
    } catch (e) {
        console.error("fetchContent error:", url, e);
        return "";
    }
}

export function formatDate(dateString) {
    if (!dateString) return "Unknown Date";
    const lang = localStorage.getItem("springwave_lang") || "en";
    return new Date(dateString).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
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
