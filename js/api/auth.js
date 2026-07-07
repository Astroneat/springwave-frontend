import { post, get, put } from "./client.js";

export function login(username, password, cfTurnstileResponse) {
    return post("/auth/login", {
        username,
        password,
        cfTurnstileResponse: cfTurnstileResponse || undefined
    });
}

export function register(data) {
    return post("/auth/register", data);
}

export function getCurrentUser() {
    return get("/auth/me");
}

export function googleLogin(credential) {
    return post("/auth/google", { credential });
}

export function completeProfile(data) {
    return put("/auth/complete-profile", data);
}