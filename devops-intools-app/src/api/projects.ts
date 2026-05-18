import { get } from "./client";
import type { Project } from "../types/api";

export const listProjects = () => get<Project[]>("/projects");
