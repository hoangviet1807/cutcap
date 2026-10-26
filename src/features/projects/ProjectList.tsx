import { useRef } from "react";
import { APP_NAME, APP_TAGLINE } from "../../shared/constants/app";
import type { ProjectSummary } from "./project-store";

interface ProjectListProps {
  recentProjects: ProjectSummary[];
  error?: string | null;
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string) => void;
  onImportProjectFile: (file: File) => void;
}

export function ProjectList({
  recentProjects,
  error,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onRenameProject,
  onImportProjectFile,
}: ProjectListProps) {
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-amber-700/80 uppercase">
          {APP_TAGLINE}
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-stone-900 md:text-5xl">
          {APP_NAME}
        </h1>
        <p className="max-w-xl text-base text-stone-600">
          Ghép ảnh nền, nhạc và lời bài hát thành lyric video. Projects được lưu
          local và mở lại sau khi reload.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCreateProject}
          className="rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
        >
          New project
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
        >
          Open JSON…
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportProjectFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-stone-500">Recent</h2>
        {recentProjects.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white/40 px-4 py-8 text-center text-sm text-stone-500">
            Chưa có project. Tạo mới hoặc mở file JSON đã export.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-md border border-stone-200 bg-white/70">
            {recentProjects.map((project) => (
              <li
                key={project.id}
                className="flex items-center gap-2 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="min-w-0 flex-1 rounded px-2 py-2 text-left transition hover:bg-stone-50"
                >
                  <span className="block truncate font-medium text-stone-900">
                    {project.name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {new Date(project.updatedAt).toLocaleString()}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRenameProject(project.id)}
                  className="rounded px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteProject(project.id)}
                  className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
