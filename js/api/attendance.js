import { get, put, post, uploadFormData } from "./client.js";

export function getAttendance(eventId) {
  return get(`/attendance/events/${eventId}/attendance`);
}

export function getAttendanceStats(eventId) {
  return get(`/attendance/events/${eventId}/attendance/stats`);
}

export function markAttendance(eventId, userId, status) {
  return put(`/attendance/events/${eventId}/attendance/${userId}`, { status });
}

export function scanAttendance(eventId, code) {
  return post(`/attendance/events/${eventId}/attendance/scan`, { code, ticketCode: code });
}

export function initAttendance(eventId) {
  return post(`/attendance/events/${eventId}/attendance/init`);
}

export function importExcelAttendance(eventId, formData) {
  return uploadFormData(`/attendance/events/${eventId}/attendance/import-excel`, formData);
}
