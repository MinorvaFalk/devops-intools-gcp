import { bustCache, cachedGet } from "./cache";
import type { Firewall } from "../types/api";

const listPath = (project: string) =>
  `/firewall/rules?project=${encodeURIComponent(project)}`;

export const listFirewalls = (project: string) =>
  cachedGet<Firewall[]>(listPath(project));

export const bustFirewalls = (project: string) => bustCache(listPath(project));
