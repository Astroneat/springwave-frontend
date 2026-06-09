import { get, post, put, del } from "./client.js";

export function getComments(eventId) {
    return get(`/events/${eventId}/comments`);
}

export function addComment(eventId, content) {
    return post(`/events/${eventId}/comments`, { content });
}

export function editComment(eventId, commentId, content) {
    return put(`/events/${eventId}/comments/${commentId}`, { content });
}

export function deleteComment(eventId, commentId) {
    return del(`/events/${eventId}/comments/${commentId}`);
}
