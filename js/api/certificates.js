import { get, post } from "./client.js";

export function getEventCertificates(eventId) {
  return get(`/certificates/events/${eventId}/certificates`);
}

export function issueCertificates(eventId) {
  return post(`/certificates/events/${eventId}/certificates/issue`);
}

export function getMyCertificates() {
  return get("/certificates/mine");
}

export function verifyCertificate(code) {
  return get(`/certificates/verify/${code}`);
}
