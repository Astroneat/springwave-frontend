import { post, get } from "./client.js";

export function login(username, password) {
    return post("/auth/login", {
            username,
            password
        }
    );
}

export function register(username, email, password) {
    return post("/auth/register", {
            username,
            email,
            password
        }
    );
}

export function getCurrentUser() {
    return get("/auth/me");
}