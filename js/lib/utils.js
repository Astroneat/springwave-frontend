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
