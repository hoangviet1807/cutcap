import type { Project } from "../../shared/types/project";
import type { ProjectSummary } from "../../features/projects/project-store";
import {
  deserializeProject,
  serializeProject,
  toProjectSummary,
} from "./project-schema";
import { deleteProjectMedia } from "./media-blob-store";

const PROJECTS_KEY = "cutcap.projects.v1";
const INDEX_KEY = "cutcap.projectIndex.v1";

function readIndex(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectSummary[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeIndex(summaries: ProjectSummary[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(summaries));
}

function readAllProjects(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllProjects(map: Record<string, string>): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(map));
}

export async function listRecentProjects(): Promise<ProjectSummary[]> {
  return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadProject(id: string): Promise<Project | null> {
  const map = readAllProjects();
  const json = map[id];
  if (!json) return null;
  return deserializeProject(json);
}

export async function saveProject(project: Project): Promise<Project> {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  const map = readAllProjects();
  map[next.id] = serializeProject(next);
  writeAllProjects(map);

  const summary = toProjectSummary(next);
  const index = readIndex().filter((p) => p.id !== next.id);
  writeIndex([summary, ...index]);

  return next;
}

export async function deleteProject(id: string): Promise<void> {
  const map = readAllProjects();
  delete map[id];
  writeAllProjects(map);
  writeIndex(readIndex().filter((p) => p.id !== id));
  await deleteProjectMedia(id);
}

export async function renameProject(
  id: string,
  name: string,
): Promise<Project | null> {
  const project = await loadProject(id);
  if (!project) return null;
  return saveProject({ ...project, name: name.trim() || project.name });
}

export function downloadProjectJson(project: Project): void {
  const blob = new Blob([serializeProject(project)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^\w-]+/g, "_") || "project"}.cutcap.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectFromFile(file: File): Promise<Project> {
  const text = await file.text();
  const project = deserializeProject(text);
  return saveProject(project);
}
