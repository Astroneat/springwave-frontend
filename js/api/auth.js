import { post, get } from "./client.js";

export function login(username, password) {
    return post("/auth/login", {
            username,
            password
        }
    );
}

export function register(username, password, fullname, email, phoneNo, dob, school, className, major) {
    return post("/auth/register", {
            username, 
            password, 
            fullname, 
            email, 
            phoneNo, 
            dob, 
            school, 
            class: className, 
            major
        }
    );
}

export function getCurrentUser() {
    return get("/auth/me");
}