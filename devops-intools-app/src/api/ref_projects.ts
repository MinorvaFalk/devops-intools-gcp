import { cachedGet, bustCache } from "./cache";
import type { RefProject } from "../types/api";

export const listRefProjects = () => cachedGet<RefProject[]>("/ref/projects");
export const getRefProject = (code: string) => cachedGet<RefProject>(`/ref/projects/${code}`);
export const bustRefProjects = () => { bustCache("/ref/projects"); };
