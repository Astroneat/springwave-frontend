import { get } from "./client.js";
import { API_BASE_URL } from "../config.js";
import { getToken } from "../lib/session.js";

export function getOrgAnalytics(orgId) {
  return get(`/analytics/org/${orgId}/overview`);
}

export async function downloadOrgExcelReport(orgId, orgName = "Org") {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/analytics/org/${orgId}/export-excel`, {
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error("Failed to export Excel analytics report");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Analytics_Report_${orgName.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function getAdminAnalytics() {
  return get(`/analytics/admin/overview`);
}

export async function downloadAdminExcelReport() {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/analytics/admin/export-excel`, {
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error("Failed to export Admin Excel report");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SpringWave_Platform_Master_Report.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
