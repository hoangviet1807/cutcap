import { createEmptyProject, type Project } from "../../shared/types/project";

export type AppScreen = "projects" | "editor";

export interface AppState {
  screen: AppScreen;
  activeProject: Project | null;
  recentProjects: ProjectSummary[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export function createInitialAppState(): AppState {
  return {
    screen: "projects",
    activeProject: null,
    recentProjects: [],
  };
}

export function openNewProject(name?: string): {
  project: Project;
  summary: ProjectSummary;
} {
  const project = createEmptyProject(name);
  return {
    project,
    summary: {
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
    },
  };
}
