import { get, put, post } from "./client.js";

export function getAttendance(eventId) {
  return get(`/attendance/events/${eventId}/attendance`);
}

export function getAttendanceStats(eventId) {
  return get(`/attendance/events/${eventId}/attendance/stats`);
}

export function markAttendance(eventId, userId, status) {
  return put(`/attendance/events/${eventId}/attendance/${userId}`, { status });
}

export function scanAttendance(eventId, ticketCode) {
  return post(`/attendance/events/${eventId}/attendance/scan`, { ticketCode });
}

export function initAttendance(eventId) {
  return post(`/attendance/events/${eventId}/attendance/init`);
}
