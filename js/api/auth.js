import { post, get, put } from "./client.js";

export function login(username, password) {
    return post("/auth/login", {
            username,
            password
        }
    );
}

export function register(username, password, fullname, email) {
    return post("/auth/register", {
            username, 
            password, 
            fullname, 
            email
        }
    );
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