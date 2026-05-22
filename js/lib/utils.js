export async function fetchContent(url) {
    const resp = await fetch(url);
    return resp.text();
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
