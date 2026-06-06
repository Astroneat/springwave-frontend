import { get, put, del, post } from "./client.js";

export function getEvents() {
    return get("/events");
}

export function getEventById(id) {
    return get(`/events/${id}`);
}

export function getPendingEvents(page = 1, limit = 50) {
    return get(`/admin/events/pending?page=${page}&limit=${limit}`);
}

export function approveEvent(id) {
    return put(`/admin/events/${id}/approve`);
}

export function rejectEvent(id) {
    return del(`/admin/events/${id}/reject`);
}

export function deleteEvent(id) {
    return del(`/events/${id}`);
}

export function getScrapePages() {
    return get("/admin/pages");
}

export function scrapeEvents(pages) {
    return post("/admin/scrape", pages ? { pages } : {});
}
