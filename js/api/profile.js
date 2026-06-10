import { post, get } from "./client.js";

export function generateProfile(answers) {
    return post("/profile/generate", { answers });
}

export function getMyProfile() {
    return get("/profile/me");
}
