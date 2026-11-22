import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  Eye,
  Film,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  XOctagon,
} from 'lucide-react';
import { BackendStatusNotice } from '../components/ui/BackendStatusNotice';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useStudioData } from '../hooks/useStudioData';
import { backendClient } from '../services/api/backendClient';
import type { GenerationJob, JobStatus } from '../types/studio';
import { formatDateTime, formatFileSize } from '../utils/id';

const STATUS_FILTERS: Array<'All' | JobStatus> = [
  'All',
  'Completed',
  'Queued',
  'Processing',
  'Rendering',
  'Failed',
  'Cancelled',
];

export const MyVideosPage: React.FC = () => {
  const {
    generationJobs,
    settings,
    backendHealth,
    loadPromptIntoComposer,
    addGenerationJob,
    updateGenerationJob,
    deleteGenerationJob,
    openStoryById,
    setActivePage,
  } = useStudioData();

  const [statusFilter, setStatusFilter] = useState<'All' | JobStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobToDelete, setJobToDelete] = useState<GenerationJob | null>(null);
  const [previewJob, setPreviewJob] = useState<GenerationJob | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  const filteredJobs = useMemo(() => {
    return generationJobs.filter((job) => {
      if (statusFilter !== 'All' && job.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${job.title} ${job.prompt} ${job.storyTitle ?? ''} ${job.episodeTitle ?? ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [generationJobs, searchQuery, statusFilter]);

  const handleReusePrompt = (job: GenerationJob) => {
    loadPromptIntoComposer({
      title: `${job.title} (Reused)`,
      prompt: job.prompt,
      storyPrompt: job.storyPrompt,
      negativePrompt: job.negativePrompt,
      visualStyle: job.visualStyle,
      customStyleNote: job.customStyleNote ?? '',
      aspectRatio: job.aspectRatio,
      durationSeconds: job.durationSeconds,
      scenes: job.scenes,
      modelId: job.modelId,
      storyId: job.storyId ?? '',
      episodeId: job.episodeId ?? '',
      sceneId: job.sceneId ?? '',
      characterIds: job.characterIds,
    });
  };

  const handleRegenerate = async (job: GenerationJob) => {
    setActionMessage(null);
    if (!backendHealth.connected || !backendClient.isConfigured(settings.backendBaseUrl)) {
      setActionMessage({
        type: 'error',
        text: 'Backend Not Connected – Start the backend server and try again.',
      });
      return;
    }

    const newJob = addGenerationJob({
      title: `${job.title} (Regenerated)`,
      prompt: job.prompt,
      storyPrompt: job.storyPrompt,
      negativePrompt: job.negativePrompt,
      compiledPrompt: job.compiledPrompt,
      visualStyle: job.visualStyle,
      customStyleNote: job.customStyleNote,
      aspectRatio: job.aspectRatio,
      resolutionLabel: job.resolutionLabel,
      durationSeconds: job.durationSeconds,
      scenes: job.scenes,
      modelId: job.modelId,
      storyId: job.storyId,
      storyTitle: job.storyTitle,
      episodeId: job.episodeId,
      episodeTitle: job.episodeTitle,
      sceneId: job.sceneId,
      characterIds: job.characterIds,
      status: 'Queued',
    });

    try {
      const res = await backendClient.submitGenerationJob(settings.backendBaseUrl, {
        title: newJob.title,
        prompt: job.prompt,
        storyPrompt: job.storyPrompt,
        negativePrompt: job.negativePrompt,
        compiledPrompt: job.compiledPrompt,
        visualStyle: job.visualStyle,
        customStyleNote: job.customStyleNote,
        aspectRatio: job.aspectRatio,
        resolutionId: '',
        resolutionLabel: job.resolutionLabel,
        durationSeconds: job.durationSeconds,
        scenes: job.scenes,
        modelId: job.modelId,
        storyId: job.storyId,
        episodeId: job.episodeId,
        sceneId: job.sceneId,
        characterIds: job.characterIds,
      });
      updateGenerationJob(newJob.id, {
        backendJobId: res.jobId,
        status: res.status,
        errorMessage: res.errorMessage,
      });
      setActionMessage({
        type: 'info',
        text: `Regeneration job queued (${res.jobId}).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Regeneration request failed.';
      updateGenerationJob(newJob.id, { status: 'Failed', errorMessage: msg });
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleCancelJob = async (job: GenerationJob) => {
    setActionMessage(null);
    if (!backendHealth.connected || !job.backendJobId) {
      setActionMessage({
        type: 'error',
        text: 'Cancel requires an active FastAPI backend connection.',
      });
      return;
    }
    try {
      const res = await backendClient.cancelJob(settings.backendBaseUrl, job.backendJobId);
      updateGenerationJob(job.id, { status: res.status, errorMessage: res.errorMessage });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to cancel job.',
      });
    }
  };

  const handleRefreshJob = async (job: GenerationJob) => {
    setActionMessage(null);
    if (!backendHealth.connected || !job.backendJobId) return;
    try {
      const res = await backendClient.fetchJobStatus(settings.backendBaseUrl, job.backendJobId);
      updateGenerationJob(job.id, {
        status: res.status,
        videoUrl: res.videoUrl,
        thumbnailUrl: res.thumbnailUrl,
        fileSizeBytes: res.fileSizeBytes,
        validatedDurationSeconds: res.validatedDurationSeconds,
        errorMessage: res.errorMessage,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to refresh job status.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">My Videos</h1>
          <p className="text-sm text-[#9CA3B2] mt-1">
            Preview and download actual rendered MP4 videos, track real job statuses, or reopen prompts and linked stories.
          </p>
        </div>
      </div>

      <BackendStatusNotice compact />

      {actionMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            actionMessage.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-[#E59A1A]/30 bg-[#E59A1A]/10 text-[#FDE68A]'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#12151E] border border-white/[0.08] overflow-x-auto">
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1F2533] text-[#F8FAFC]'
                    : 'text-[#8E96A4] hover:text-[#E6E9F0]'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="h-4 w-4 text-[#6F7888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, prompt, or story..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#12151E] pl-9 pr-3 py-2 text-xs text-[#F3F5F8] placeholder-[#6F7888] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>
      </div>

      {/* Video Library */}
      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={<Film className="h-5 w-5" />}
          title={
            generationJobs.length === 0
              ? 'No rendered videos yet'
              : 'No videos match your filter'
          }
          description={
            generationJobs.length === 0
              ? 'Only real generated videos appear here. Start your FastAPI backend and Cloud GPU worker, then create a 30–60s video.'
              : 'Adjust your status filter or search query to view logged jobs.'
          }
          actionLabel={generationJobs.length === 0 ? 'Create New Video' : 'Clear Filters'}
          onAction={() => {
            if (generationJobs.length === 0) {
              setActivePage('create-video');
            } else {
              setStatusFilter('All');
              setSearchQuery('');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const isCompletedFile = job.status === 'Completed' && Boolean(job.videoUrl);
            const canCancel =
              backendHealth.connected &&
              Boolean(job.backendJobId) &&
              (job.status === 'Queued' ||
                job.status === 'Processing' ||
                job.status === 'Rendering');

            return (
              <article
                key={job.id}
                className="rounded-xl border border-white/[0.08] bg-[#12151E] overflow-hidden flex flex-col"
              >
                {/* Thumbnail / Video Preview */}
                <div className="bg-[#090B0F] border-b border-white/[0.07] aspect-video flex items-center justify-center relative">
                  {isCompletedFile && job.thumbnailUrl ? (
                    <img
                      src={job.thumbnailUrl}
                      alt={`${job.title} thumbnail`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : isCompletedFile && job.videoUrl ? (
                    <video
                      src={job.videoUrl}
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1.5 px-6 max-w-sm">
                      <Film className="h-6 w-6 text-[#5A6375] mx-auto" />
                      <div className="text-xs font-medium text-[#CBD2DF]">
                        Status: {job.status}
                      </div>
                      <p className="text-xs text-[#7B8494] leading-relaxed">
                        {job.errorMessage ??
                          'No rendered video file yet. Video thumbnail and playback appear after FFmpeg finishes.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata & Actions */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-base font-semibold text-[#F3F5F8] line-clamp-1">
                        {job.title}
                      </h2>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          job.status === 'Completed'
                            ? 'text-emerald-400'
                            : job.status === 'Failed'
                            ? 'text-red-400'
                            : 'text-[#E59A1A]'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E96A4]">
                      <span>{job.visualStyle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{job.aspectRatio}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {job.validatedDurationSeconds ?? job.durationSeconds}s
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDateTime(job.createdAt)}</span>
                      {job.fileSizeBytes && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatFileSize(job.fileSizeBytes)}
                          </span>
                        </>
                      )}
                    </div>

                    {(job.storyTitle || job.episodeTitle) && (
                      <div className="text-xs text-[#CBD2DF]">
                        {[job.storyTitle, job.episodeTitle].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    <p className="text-xs text-[#9CA3B2] line-clamp-2 leading-relaxed">
                      {job.prompt}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCompletedFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewJob(job)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#F3F5F8]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview</span>
                        </button>
                      )}

                      {isCompletedFile && job.videoUrl && (
                        <a
                          href={job.videoUrl}
                          download={`${job.title.replace(/\s+/g, '_').toLowerCase()}.mp4`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-xs font-semibold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleReusePrompt(job)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-[#E6E9F0]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reuse Prompt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRegenerate(job)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-[#E6E9F0]"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Regenerate</span>
                      </button>

                      {job.storyId && (
                        <button
                          type="button"
                          onClick={() => openStoryById(job.storyId!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-[#E6E9F0]"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Open Story</span>
                        </button>
                      )}

                      {backendHealth.connected && job.backendJobId && (
                        <button
                          type="button"
                          onClick={() => void handleRefreshJob(job)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/[0.1] text-xs text-[#9CA3B2] hover:text-white"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Refresh</span>
                        </button>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => void handleCancelJob(job)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/[0.1] text-xs text-[#CBD2DF] hover:text-white"
                        >
                          <XOctagon className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setJobToDelete(job)}
                      aria-label={`Delete ${job.title}`}
                      className="p-1.5 rounded-md text-[#8E96A4] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(previewJob)}
        onClose={() => setPreviewJob(null)}
        title={previewJob?.title ?? 'Video Preview'}
        subtitle={
          previewJob
            ? `${previewJob.visualStyle} · ${previewJob.aspectRatio} · ${
                previewJob.validatedDurationSeconds ?? previewJob.durationSeconds
              }s`
            : undefined
        }
        maxWidthClass="max-w-3xl"
      >
        {previewJob?.videoUrl ? (
          <video
            src={previewJob.videoUrl}
            controls
            autoPlay
            className="w-full max-h-[70vh] rounded-lg bg-black object-contain"
          />
        ) : (
          <p className="text-sm text-[#9CA3B2]">No rendered video file available for playback.</p>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(jobToDelete)}
        onClose={() => setJobToDelete(null)}
        onConfirm={() => {
          if (jobToDelete) deleteGenerationJob(jobToDelete.id);
        }}
        title="Delete Video"
        message={`Remove "${jobToDelete?.title}" from My Videos?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
