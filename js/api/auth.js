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

export function googleLogin(credential, accessToken) {
    return post("/auth/google", { credential, accessToken });
}

export function microsoftLogin(accessToken) {
    return post("/auth/microsoft", { accessToken });
}

export function completeProfile(data) {
    return put("/auth/complete-profile", data);
}

export function forgotPassword(email) {
    return post("/auth/forgot-password", { email });
}

export function resetPassword(token, newPassword, confirmPassword) {
    return post("/auth/reset-password", { token, newPassword, confirmPassword });
}

export function changePassword(currentPassword, newPassword, confirmPassword) {
    return post("/auth/change-password", { currentPassword, newPassword, confirmPassword });
}