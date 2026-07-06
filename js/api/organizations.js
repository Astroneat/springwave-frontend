import { get, put, post, del } from "./client.js";

export function getMyOrganizations() {
  return get("/organizations/my");
}

export function getAllOrganizations() {
  return get("/organizations/all");
}

export function getOrganizationById(id) {
  return get(`/organizations/${id}`);
}

export function updateOrganization(id, data) {
  return put(`/organizations/${id}`, data);
}

export function deleteOrganization(id) {
  return del(`/organizations/${id}`);
}

export function getOrgActivities(orgId, params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  const qs = q.toString();
  return get(`/organizations/${orgId}/activities${qs ? `?${qs}` : ""}`);
}

export function getManagers(orgId) {
  return get(`/organizations/${orgId}/managers`);
}

export function addManager(orgId, email) {
  return post(`/organizations/${orgId}/managers`, { email });
}

export function removeManager(orgId, userId) {
  return del(`/organizations/${orgId}/managers/${userId}`);
}
