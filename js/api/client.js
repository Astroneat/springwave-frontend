import { API_BASE_URL } from "../config.js";
import { getToken, clearSession } from "../lib/session.js";

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        ...options.headers
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }



    if(token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        }
    );

    let data = null;
    try {
        data = await response.json();
    }
    catch {
        data = null;
    }

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
        throw {
            status: response.status,
            message:
                data?.message ||
                data?.error ||
                "Request failed"
        };
    }

    return data;
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