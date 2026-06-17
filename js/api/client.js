import { API_BASE_URL } from "../config.js";
import { getToken, clearSession } from "../lib/session.js";

let requestQueue = 0;
const MAX_CONCURRENT = 5;
const requestTimestamps = [];
const MIN_REQUEST_INTERVAL = 300;

function checkRateLimit() {
    const now = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 1000) {
        requestTimestamps.shift();
    }
    if (requestTimestamps.length >= 20) {
        throw { status: 429, message: "Too many requests. Please slow down." };
    }
    requestTimestamps.push(now);
}

async function request(endpoint, options = {}) {
    checkRateLimit();

    while (requestQueue >= MAX_CONCURRENT) {
        await new Promise(r => setTimeout(r, 200));
    }
    requestQueue++;

    const token = getToken();
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if(token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

        let data = null;
        try { data = await response.json(); } catch { data = null; }

        if (!response.ok) {
            if (response.status === 401) {
                clearSession();
                window.location.href = "/login.html";
                return;
            }
            if (response.status === 403 && data?.message?.includes("complete your profile")) {
                window.location.href = "/complete-profile.html";
                return;
            }
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const msg = data?.error || data?.message || "Too many requests. Please wait before trying again.";
                throw { status: 429, message: msg, retryAfter: retryAfter ? parseInt(retryAfter) : null };
            }
            throw {
                status: response.status,
                message: data?.message || data?.error || "Request failed"
            };
        }

        return data;
    } finally {
        requestQueue--;
    }
}

export function get(endpoint) {
    return request(endpoint);
}

export function post(endpoint, body) {
    return request(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

export function put(endpoint, body) {
    return request(endpoint, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

export function del(endpoint) {
    return request(endpoint, {
        method: "DELETE"
    });
}

export function uploadFormData(endpoint, formData) {
    const token = getToken();
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return request(endpoint, {
        method: "POST",
        headers,
        body: formData
    });
}