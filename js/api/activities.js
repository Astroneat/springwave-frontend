import { post, get, uploadFormData } from "./client.js";

export function getActivities() {
    return get("/activities");
}

export function createActivity(formData) {
    return uploadFormData("/activities", formData);
}