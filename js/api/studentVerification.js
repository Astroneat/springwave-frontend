import { get, put, post } from "./client.js";
import { uploadFormData } from "./client.js";

export function getMyVerificationStatus() {
  return get('/student-verification/my-status');
}

export function autoVerifyStudent(formData) {
  return uploadFormData('/student-verification/auto-verify', formData);
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

export function batchApproveVerifications(ids) {
  return post(`/student-verification/verifications/batch/approve`, { ids });
}

export function batchRejectVerifications(ids, reviewNote) {
  return post(`/student-verification/verifications/batch/reject`, { ids, reviewNote });
}
