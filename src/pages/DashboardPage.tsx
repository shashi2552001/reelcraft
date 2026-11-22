import React, { useState } from 'react';
import {
  BookOpen,
  Film,
  FolderPlus,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { BackendStatusNotice } from '../components/ui/BackendStatusNotice';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ProjectModal } from '../features/dashboard/ProjectModal';
import { useStudioData } from '../hooks/useStudioData';
import type { Project } from '../types/studio';
import { formatShortDate } from '../utils/id';

export const DashboardPage: React.FC = () => {
  const {
    projects,
    stories,
    characters,
    generationJobs,
    setActivePage,
    loadPromptIntoComposer,
    deleteProject,
  } = useStudioData();

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const totalVideos = generationJobs.length;
  const completedVideos = generationJobs.filter((j) => j.status === 'Completed').length;
  const processingVideos = generationJobs.filter(
    (j) => j.status === 'Queued' || j.status === 'Processing' || j.status === 'Rendering'
  ).length;

  const stats = [
    {
      label: 'Total Videos',
      value: totalVideos,
      detail: 'All generation jobs logged',
    },
    {
      label: 'Completed Videos',
      value: completedVideos,
      detail: 'FFmpeg-validated MP4 files',
    },
    {
      label: 'Processing Videos',
      value: processingVideos,
      detail: 'Queued, Processing, or Rendering',
    },
    {
      label: 'Saved Draft Assets',
      value: stories.length + characters.length,
      detail: `${stories.length} stories · ${characters.length} characters`,
    },
  ];

  const handleOpenProjectCreate = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F8FAFC]">
            Welcome to ReelCraft Studio
          </h1>
          <p className="text-sm sm:text-base text-[#9CA3B2] leading-relaxed">
            Your personal studio for 30–60 second Instagram Reels, episodic animated stories, and
            character-consistent short films powered by self-hosted open-weight video models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenProjectCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.12] bg-[#131722] hover:bg-[#1A1F2D] text-sm font-medium text-[#E6E9F0] transition-colors whitespace-nowrap"
          >
            <FolderPlus className="h-4 w-4 text-[#9CA3B2]" />
            <span>New Project</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('create-video')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4 stroke-[2.25]" />
            <span>Create New Video</span>
          </button>
        </div>
      </section>

      <BackendStatusNotice />

      {/* Video & Studio Statistics */}
      <section aria-label="Video statistics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.08] bg-[#12151E] px-5 py-4 flex flex-col justify-between"
          >
            <span className="text-xs font-medium text-[#8E96A4]">{stat.label}</span>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-semibold text-[#F8FAFC] tabular-nums">
                {stat.value}
              </span>
            </div>
            <span className="mt-1.5 text-xs text-[#6F7888]">{stat.detail}</span>
          </div>
        ))}
      </section>

      {/* Beginner Quick-Start Instructions */}
      <section aria-label="Quick-start instructions" className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F3F5F8]">
              Quick-Start Instructions
            </h2>
            <p className="text-xs text-[#8E96A4] mt-0.5">
              Follow these four steps to prepare your stories and connect your own backend when ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActivePage('help')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E59A1A] hover:text-[#FBBF24]"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Full Windows Setup Guide</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActivePage('characters')}
            className="text-left rounded-lg border border-white/[0.07] bg-[#0B0D12] hover:border-white/[0.18] p-3.5 transition-colors"
          >
            <div className="font-mono text-xs text-[#E59A1A] mb-1">01. Characters</div>
            <div className="text-sm font-medium text-[#F3F5F8]">Save Your Cast</div>
            <p className="text-xs text-[#8E96A4] mt-1 leading-relaxed">
              Add character appearance, outfits, and a reference image so scenes stay consistent.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('stories')}
            className="text-left rounded-lg border border-white/[0.07] bg-[#0B0D12] hover:border-white/[0.18] p-3.5 transition-colors"
          >
            <div className="font-mono text-xs text-[#E59A1A] mb-1">02. My Stories</div>
            <div className="text-sm font-medium text-[#F3F5F8]">Plan Episodes</div>
            <p className="text-xs text-[#8E96A4] mt-1 leading-relaxed">
              Write continuing episodes where each episode remembers what happened previously.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('create-video')}
            className="text-left rounded-lg border border-white/[0.07] bg-[#0B0D12] hover:border-white/[0.18] p-3.5 transition-colors"
          >
            <div className="font-mono text-xs text-[#E59A1A] mb-1">03. Create Video</div>
            <div className="text-sm font-medium text-[#F3F5F8]">Split 30–60s Scenes</div>
            <p className="text-xs text-[#8E96A4] mt-1 leading-relaxed">
              Pick 30–60 seconds total; ReelCraft divides it into short scenes for FFmpeg stitching.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className="text-left rounded-lg border border-white/[0.07] bg-[#0B0D12] hover:border-white/[0.18] p-3.5 transition-colors"
          >
            <div className="font-mono text-xs text-[#E59A1A] mb-1">04. Backend & GPU</div>
            <div className="text-sm font-medium text-[#F3F5F8]">Connect FastAPI</div>
            <p className="text-xs text-[#8E96A4] mt-1 leading-relaxed">
              Start PostgreSQL + FastAPI locally, verify Backend Connected, then link your Cloud GPU.
            </p>
          </button>
        </div>
      </section>

      {/* Main Split: Recent Projects & Recent Videos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F3F5F8]">Recent Projects</h2>
            <button
              type="button"
              onClick={handleOpenProjectCreate}
              className="text-xs font-medium text-[#E59A1A] hover:text-[#FBBF24] transition-colors"
            >
              Add Project
            </button>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderPlus className="h-5 w-5" />}
              title="No production projects yet"
              description="Create a project folder to organize your episodic stories, character references, and Reels."
              actionLabel="Create First Project"
              onAction={handleOpenProjectCreate}
            />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#12151E] divide-y divide-white/[0.06]">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        loadPromptIntoComposer({
                          title: `${project.title} — Reel`,
                          visualStyle: project.targetStyle,
                          aspectRatio: project.aspectRatio,
                        })
                      }
                      className="text-sm font-semibold text-[#F3F5F8] hover:text-[#E59A1A] transition-colors text-left truncate block max-w-full"
                    >
                      {project.title}
                    </button>
                    {project.description && (
                      <p className="text-xs text-[#8E96A4] line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6F7888] pt-0.5">
                      <span>{project.targetStyle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{project.aspectRatio}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Updated {formatShortDate(project.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditProject(project)}
                      aria-label={`Edit ${project.title}`}
                      className="p-2 rounded-md text-[#8E96A4] hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(project)}
                      aria-label={`Delete ${project.title}`}
                      className="p-2 rounded-md text-[#8E96A4] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Videos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F3F5F8]">Recent Videos</h2>
            <button
              type="button"
              onClick={() => setActivePage('my-videos')}
              className="text-xs font-medium text-[#E59A1A] hover:text-[#FBBF24] transition-colors"
            >
              Open My Videos
            </button>
          </div>

          {generationJobs.length === 0 ? (
            <EmptyState
              icon={<Film className="h-5 w-5" />}
              title="No rendered videos yet"
              description="Only actual rendered videos appear here. Start your FastAPI backend and GPU worker, then submit a 30–60s video from Create Video."
              actionLabel="Open Create Video"
              onAction={() => setActivePage('create-video')}
            />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#12151E] divide-y divide-white/[0.06]">
              {generationJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium text-[#F3F5F8] truncate">
                      {job.title || 'Untitled Generation Job'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E96A4]">
                      <span
                        className={
                          job.status === 'Completed'
                            ? 'text-emerald-400 font-medium'
                            : job.status === 'Failed'
                            ? 'text-red-400 font-medium'
                            : 'text-[#E59A1A] font-medium'
                        }
                      >
                        {job.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{job.visualStyle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{job.aspectRatio}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{job.durationSeconds}s</span>
                    </div>
                    {job.errorMessage && (
                      <p className="text-xs text-red-300/90 line-clamp-1">{job.errorMessage}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePage('my-videos')}
                    className="px-3 py-1.5 rounded-md border border-white/[0.1] text-xs font-medium text-[#CBD2DF] hover:bg-white/[0.06] whitespace-nowrap shrink-0"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Stories Quick Link */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-[#E59A1A] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-sm font-semibold text-[#F3F5F8]">
              Episodic Story Continuity Ready
            </h2>
            <p className="text-xs text-[#8E96A4] mt-0.5">
              {stories.length} active stories · {characters.length} character profiles ready to attach to new 30–60s Reels.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActivePage('stories')}
          className="px-4 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#F3F5F8] whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          Open My Stories
        </button>
      </section>

      <ProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        editingProject={editingProject}
      />

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) deleteProject(projectToDelete.id);
        }}
        title="Delete Project"
        message={`Delete "${projectToDelete?.title}" from local drafts? Linked stories will remain intact without a project folder.`}
        confirmLabel="Delete Project"
      />
    </div>
  );
};
