import { get, put } from "./client.js";

export function getMyVerificationStatus() {
  return get('/student-verification/my-status');
}

export function getVerifications(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", params.page);
  if (params.pageSize) q.set("pageSize", params.pageSize);
  if (params.search) q.set("search", params.search);
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  return get(`/student-verification/verifications?${q.toString()}`);
}

export function getVerificationById(id) {
  return get(`/student-verification/verifications/${id}`);
}

export function approveVerification(id) {
  return put(`/student-verification/verifications/${id}/approve`);
}

export function rejectVerification(id, reviewNote) {
  return put(`/student-verification/verifications/${id}/reject`, { reviewNote });
}
