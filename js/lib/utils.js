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
    return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

export function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
