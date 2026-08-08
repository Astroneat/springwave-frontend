import { API_BASE_URL } from "../config.js";
import { getToken, getSigningKey, setToken, setSigningKey, clearSession } from "../lib/session.js";
import { startProgress, completeProgress } from "../components/pageLoader.js";

let requestQueue = 0;
const MAX_CONCURRENT = 5;
const requestTimestamps = [];
const MIN_REQUEST_INTERVAL = 300;
let refreshTimer = null;

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

async function sha256(message) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", enc.encode(message));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function computeSignature(signingKey, method, path, bodyStr, timestamp, nonce) {
    const bodyHash = await sha256(bodyStr || "");
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", enc.encode(signingKey),
        { name: "HMAC", hash: "SHA-256" },
        false, ["sign"]
    );
    const msg = `${method}:${path}:${timestamp}:${nonce}:${bodyHash}`;
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    const token = getToken();
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiresIn = payload.exp * 1000 - Date.now();
        if (expiresIn <= 0) return;
        const refreshAt = Math.max(expiresIn - 120000, 0);
        refreshTimer = setTimeout(async () => {
            try {
                await refreshTokens();
                scheduleRefresh();
            } catch {
                clearSession();
            }
        }, refreshAt);
    } catch {
        // invalid token format, ignore
    }
}

let refreshPromise = null;

async function refreshTokens() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (!resp.ok) throw new Error("Refresh failed");
            const data = await resp.json();
            setToken(data.token);
            setSigningKey(data.signingKey);
        } finally {
            refreshPromise = null;
        }
    })();
    return refreshPromise;
}

export async function ensureSession() {
    const token = getToken();
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 - Date.now() < 180000) {
            await refreshTokens();
        }
        scheduleRefresh();
        return true;
    } catch {
        return false;
    }
}

async function request(endpoint, options = {}) {
    await ensureSession();
    checkRateLimit();

    while (requestQueue >= MAX_CONCURRENT) {
        await new Promise(r => setTimeout(r, 200));
    }
    requestQueue++;

    const token = getToken();
    const signingKey = getSigningKey();
    const headers = { ...options.headers };
    const method = options.method || "GET";
    const isFormData = options.body instanceof FormData;

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (token && signingKey) {
        const timestamp = Date.now().toString();
        const nonce = crypto.randomUUID();
        const bodyStr = typeof options.body === "string" ? options.body : "";
        const pathOnly = endpoint.split('?')[0];
        const signature = await computeSignature(signingKey, method, pathOnly, bodyStr, timestamp, nonce);
        headers["X-Timestamp"] = timestamp;
        headers["X-Nonce"] = nonce;
        headers["X-Signature"] = signature;
    }

    startProgress();
    try {
        let response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options, headers, credentials: "include",
        });

        if (response.status === 401 && getToken()) {
            try {
                await refreshTokens();
                scheduleRefresh();
                const newToken = getToken();
                const newSigningKey = getSigningKey();
                headers.Authorization = `Bearer ${newToken}`;
                if (newSigningKey) {
                    const timestamp = Date.now().toString();
                    const nonce = crypto.randomUUID();
                    const bodyStr = typeof options.body === "string" ? options.body : "";
                    const pathOnly = endpoint.split('?')[0];
                    const signature = await computeSignature(newSigningKey, method, pathOnly, bodyStr, timestamp, nonce);
                    headers["X-Timestamp"] = timestamp;
                    headers["X-Nonce"] = nonce;
                    headers["X-Signature"] = signature;
                }
                response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    ...options, headers, credentials: "include",
                });
            } catch {
                clearSession();
                window.location.href = "/login.html";
                return;
            }
        }

        let data = null;
        try { data = await response.json(); } catch { data = null; }

        if (!response.ok) {
            if (response.status === 401 && getToken()) {
                clearSession();
                window.location.href = "/login.html";
                return;
            }
            if (response.status === 403 && data?.message?.includes("complete your profile")) {
                window.location.href = "/complete-profile.html";
                return;
            }
            if (response.status === 403 && data?.code === "STUDENT_NOT_VERIFIED") {
                if (!window.location.pathname.endsWith("/student-verify.html")) {
                    window.location.href = "/student-verify.html";
                }
                throw { status: 403, code: "STUDENT_NOT_VERIFIED", message: data?.error || "Please verify your student status first" };
            }
            if (response.status === 429) {
                const retryAfter = response.headers.get("Retry-After");
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
        completeProgress();
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

export function putFormData(endpoint, formData) {
    const token = getToken();
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return request(endpoint, {
        method: "PUT",
        headers,
        body: formData
    });
}
