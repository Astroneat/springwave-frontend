import { post, get, del, uploadFormData } from "./client.js";

function normalizeEvent(e) {
    return { ...e, activityID: e._id };
}

function normalizeEvents(response) {
    if (response.event) {
        return { activity: normalizeEvent(response.event) };
    }
    if (response.events) {
        return { activities: response.events.map(normalizeEvent) };
    }
    return response;
}

export function getActivities() {
    return get("/events").then(normalizeEvents);
}

export function getActivityById(id) {
    return get(`/events/${id}`).then(normalizeEvents);
}

export function createActivity(formData) {
    return uploadFormData("/events", formData);
}

export function deleteActivity(id) {
    return del(`/events/${id}`);
}

export function participateActivity(id) {
    return post(`/events/${id}/participate`);
}

export function unparticipateActivity(id) {
    return del(`/events/${id}/participate`);
}

export function checkParticipation(id) {
    return get(`/events/${id}/participate`);
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
    return get(`/events/search/all?${q.toString()}`).then(normalizeEvents);
}
