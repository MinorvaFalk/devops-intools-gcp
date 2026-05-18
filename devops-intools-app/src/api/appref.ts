import { del, get, post, put } from "./client";
import type { AppRef, AppRefFilter, AuditLog, CreateAppRefRequest, RefProject, UpdateAppRefRequest } from "../types/api";

export const listRefProjects = () => get<RefProject[]>("/ref/projects");

export const listApprefs = (filter?: AppRefFilter) => {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.stage) params.set("stage", filter.stage);
  if (filter?.project_code) params.set("project_code", filter.project_code);
  const qs = params.toString();
  return get<AppRef[]>(`/apprefs${qs ? `?${qs}` : ""}`);
};

export const createAppref = (req: CreateAppRefRequest) => post<AppRef>("/apprefs", req);

export const getAppref = (code: string) => get<AppRef>(`/apprefs/${encodeURIComponent(code)}`);

export const updateAppref = (code: string, req: UpdateAppRefRequest) =>
  put<AppRef>(`/apprefs/${encodeURIComponent(code)}`, req);

export const decommissionAppref = (code: string) =>
  del<void>(`/apprefs/${encodeURIComponent(code)}`);

export const listAuditLogs = (code: string) =>
  get<AuditLog[]>(`/apprefs/${encodeURIComponent(code)}/audit-logs`);
