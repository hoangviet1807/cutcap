import { useCallback, useEffect, useState } from "react";
import { ProjectEditorShell } from "../features/projects/ProjectEditorShell";
import { ProjectList } from "../features/projects/ProjectList";
import {
  createInitialAppState,
  openNewProject,
  type AppState,
} from "../features/projects/project-store";
import type { Project } from "../shared/types/project";
import {
  deleteProject,
  importProjectFromFile,
  listRecentProjects,
  loadProject,
  renameProject,
  saveProject,
} from "../services/storage/project-repository";

export default function App() {
  const [state, setState] = useState<AppState>(createInitialAppState);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRecent = useCallback(async () => {
    const recent = await listRecentProjects();
    setState((prev) => ({ ...prev, recentProjects: recent }));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshRecent();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load projects");
      } finally {
        setBootstrapped(true);
      }
    })();
  }, [refreshRecent]);

  async function handleCreateProject() {
    setError(null);
    const { project } = openNewProject();
    const saved = await saveProject(project);
    await refreshRecent();
    setState((prev) => ({
      ...prev,
      screen: "editor",
      activeProject: saved,
    }));
  }

  async function handleOpenProject(id: string) {
    setError(null);
    const project = await loadProject(id);
    if (!project) {
      setError("Project not found. It may have been deleted.");
      await refreshRecent();
      return;
    }
    setState((prev) => ({
      ...prev,
      screen: "editor",
      activeProject: project,
    }));
  }

  async function handleDeleteProject(id: string) {
    if (!window.confirm("Delete this project and its stored media?")) return;
    await deleteProject(id);
    await refreshRecent();
    setState((prev) =>
      prev.activeProject?.id === id
        ? { ...prev, screen: "projects", activeProject: null }
        : prev,
    );
  }

  async function handleRenameProject(id: string) {
    const current = state.recentProjects.find((p) => p.id === id);
    const name = window.prompt("Rename project", current?.name ?? "");
    if (name === null) return;
    await renameProject(id, name);
    await refreshRecent();
    if (state.activeProject?.id === id) {
      setState((prev) =>
        prev.activeProject
          ? {
              ...prev,
              activeProject: { ...prev.activeProject, name: name.trim() },
            }
          : prev,
      );
    }
  }

  async function handleImportProjectFile(file: File) {
    setError(null);
    try {
      const project = await importProjectFromFile(file);
      await refreshRecent();
      setState((prev) => ({
        ...prev,
        screen: "editor",
        activeProject: project,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
  }

  function handleBackToProjects() {
    void refreshRecent();
    setState((prev) => ({
      ...prev,
      screen: "projects",
      activeProject: null,
    }));
  }

  const handleProjectChange = useCallback((project: Project) => {
    setState((prev) => ({ ...prev, activeProject: project }));
  }, []);

  if (!bootstrapped) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-500">
        Loading projects…
      </div>
    );
  }

  if (state.screen === "editor" && state.activeProject) {
    return (
      <ProjectEditorShell
        project={state.activeProject}
        onProjectChange={handleProjectChange}
        onBack={handleBackToProjects}
      />
    );
  }

  return (
    <ProjectList
      recentProjects={state.recentProjects}
      error={error}
      onCreateProject={() => void handleCreateProject()}
      onOpenProject={(id) => void handleOpenProject(id)}
      onDeleteProject={(id) => void handleDeleteProject(id)}
      onRenameProject={(id) => void handleRenameProject(id)}
      onImportProjectFile={(file) => void handleImportProjectFile(file)}
    />
  );
}
