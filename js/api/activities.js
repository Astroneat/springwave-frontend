import { post, get, del, uploadFormData } from "./client.js";

export function getActivities() {
    return get("/activities");
}

export function getActivityById(id) {
    return get(`/activities/${id}`);
}

export function createActivity(formData) {
    return uploadFormData("/activities", formData);
}

export function participateActivity(id) {
    return post(`/activities/${id}/participate`);
}

export function unparticipateActivity(id) {
    return del(`/activities/${id}/participate`);
}

export function checkParticipation(id) {
    return get(`/activities/${id}/participate`);
}

export function searchActivities(params) {
    const q = new URLSearchParams();
    if (params.keyword) q.set("keyword", params.keyword);
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    if (params.tag) q.set("tag", params.tag);
    if (params.location) q.set("location", params.location);
    if (params.heldDateFrom) q.set("heldDateFrom", params.heldDateFrom);
    if (params.heldDateTo) q.set("heldDateTo", params.heldDateTo);
    if (params.sortBy) q.set("sortBy", params.sortBy);
    if (params.sortOrder) q.set("sortOrder", params.sortOrder);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    return get(`/activities/search/all?${q.toString()}`);
}