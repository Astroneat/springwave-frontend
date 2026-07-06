import { get, put, post, del } from "./client.js";

export function getMyHostStatus() {
  return get('/host/my-status');
}

export function getRegistrations(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", params.page);
  if (params.pageSize) q.set("pageSize", params.pageSize);
  if (params.search) q.set("search", params.search);
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  return get(`/host/registrations?${q.toString()}`);
}

export function getRegistrationById(id) {
  return get(`/host/registrations/${id}`);
}

export function approveRegistration(id) {
  return put(`/host/registrations/${id}/approve`);
}

export function rejectRegistration(id, reviewNote) {
  return put(`/host/registrations/${id}/reject`, { reviewNote });
}
