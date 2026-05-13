import { API_BASE_URL } from "../config.js";
import { getToken } from "../lib/session.js";

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if(token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
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