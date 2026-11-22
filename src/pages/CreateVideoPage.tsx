import React, { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Copy,
  HelpCircle,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { BackendStatusNotice } from '../components/ui/BackendStatusNotice';
import { ReferenceImage } from '../components/ui/ReferenceImage';
import { GenerationPreview } from '../features/video/GenerationPreview';
import { useStudioData } from '../hooks/useStudioData';
import { BackendNotConnectedError, backendClient } from '../services/api/backendClient';
import { VIDEO_MODELS } from '../services/blueprints/infrastructureData';
import type {
  AspectRatio,
  GenerationJob,
  ModelId,
  TotalVideoDuration,
  VisualStyle,
} from '../types/studio';
import { generateId } from '../utils/id';
import {
  composeFullGenerationPrompt,
  divideDurationIntoScenes,
} from '../utils/promptComposer';
import { validateRequiredText } from '../utils/validation';

const VISUAL_STYLES: Array<{ value: VisualStyle; subtitle: string }> = [
  { value: '3D Indian Anime', subtitle: 'Vibrant South Asian 3D anime cinema' },
  { value: 'Cartoon', subtitle: 'Stylized 2D linework & cel shading' },
  { value: 'Realistic', subtitle: 'Natural camera optics & physical light' },
  { value: 'Cinematic', subtitle: 'Anamorphic 35mm film grade & grain' },
  { value: 'Custom Style', subtitle: 'Define your own visual style cues' },
];

const TOTAL_DURATIONS: TotalVideoDuration[] = [30, 40, 45, 50, 60];

const ASPECT_RATIOS: Array<{ value: AspectRatio; label: string }> = [
  { value: '9:16', label: '9:16 · Instagram Reels' },
  { value: '16:9', label: '16:9 · Widescreen' },
  { value: '1:1', label: '1:1 · Square' },
];

const EXAMPLE_PROMPTS = [
  {
    label: '3D Indian Anime Reel (30s)',
    style: '3D Indian Anime' as VisualStyle,
    prompt:
      'A young courier crosses a rain-slicked sandstone bridge in Jaipur at dusk, warm brass street lanterns glowing in mist, smooth vertical tracking shot.',
    storyPrompt: 'Hero arrives before curfew carrying a sealed scroll.',
  },
  {
    label: 'Cinematic Mystery (45s)',
    style: 'Cinematic' as VisualStyle,
    prompt:
      'A restoration archivist enters a quiet coastal stone library at golden hour, sunlight cutting through dust motes onto oak tables, slow 35mm dolly push-in.',
    storyPrompt: 'Opening investigation sequence for Episode 1.',
  },
];

export const CreateVideoPage: React.FC = () => {
  const {
    stories,
    characters,
    settings,
    backendHealth,
    createVideoDraft,
    setCreateVideoDraft,
    upsertPrompt,
    addGenerationJob,
    updateGenerationJob,
    setActivePage,
  } = useStudioData();

  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success' | 'info';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const selectedModel = useMemo(
    () => VIDEO_MODELS.find((m) => m.id === createVideoDraft.modelId) ?? VIDEO_MODELS[0],
    [createVideoDraft.modelId]
  );

  // Filter quality/resolution options strictly to what the selected model + aspect ratio supports
  const supportedResolutions = useMemo(() => {
    const matching = selectedModel.supportedResolutions.filter(
      (r) => r.aspectRatio === createVideoDraft.aspectRatio
    );
    return matching.length > 0 ? matching : selectedModel.supportedResolutions;
  }, [createVideoDraft.aspectRatio, selectedModel]);

  const selectedResolution = useMemo(() => {
    return (
      supportedResolutions.find((r) => r.id === createVideoDraft.resolutionId) ??
      supportedResolutions[0]
    );
  }, [createVideoDraft.resolutionId, supportedResolutions]);

  // Keep resolution valid when model or aspect ratio changes
  useEffect(() => {
    if (
      selectedResolution &&
      createVideoDraft.resolutionId !== selectedResolution.id
    ) {
      setCreateVideoDraft((prev) => ({
        ...prev,
        resolutionId: selectedResolution.id,
      }));
    }
  }, [createVideoDraft.resolutionId, selectedResolution, setCreateVideoDraft]);

  const sceneDurationSum = useMemo(
    () => createVideoDraft.scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
    [createVideoDraft.scenes]
  );

  const durationMatchesTotal = sceneDurationSum === createVideoDraft.durationSeconds;

  const selectedStory = stories.find((s) => s.id === createVideoDraft.storyId);
  const selectedEpisode = selectedStory?.episodes.find(
    (e) => e.id === createVideoDraft.episodeId
  );
  const selectedScene = selectedEpisode?.scenes.find(
    (sc) => sc.id === createVideoDraft.sceneId
  );

  const lockedCharacters = useMemo(
    () => characters.filter((c) => createVideoDraft.characterIds.includes(c.id)),
    [characters, createVideoDraft.characterIds]
  );

  const compiledPrompt = useMemo(
    () =>
      composeFullGenerationPrompt({
        prompt: createVideoDraft.prompt,
        storyPrompt: createVideoDraft.storyPrompt,
        visualStyle: createVideoDraft.visualStyle,
        customStyleNote: createVideoDraft.customStyleNote,
        story: selectedStory,
        episode: selectedEpisode,
        scene: selectedScene,
        characters: lockedCharacters,
        scenesPlan: createVideoDraft.scenes,
      }),
    [
      createVideoDraft.prompt,
      createVideoDraft.storyPrompt,
      createVideoDraft.visualStyle,
      createVideoDraft.customStyleNote,
      createVideoDraft.scenes,
      selectedStory,
      selectedEpisode,
      selectedScene,
      lockedCharacters,
    ]
  );

  const handleDurationSelect = (totalSec: TotalVideoDuration) => {
    setCreateVideoDraft((prev) => ({
      ...prev,
      durationSeconds: totalSec,
      scenes: divideDurationIntoScenes(
        totalSec,
        prev.prompt,
        selectedModel.maxSingleClipSeconds
      ),
    }));
  };

  const handleAutoDivideScenes = () => {
    setCreateVideoDraft((prev) => ({
      ...prev,
      scenes: divideDurationIntoScenes(
        prev.durationSeconds,
        prev.prompt,
        selectedModel.maxSingleClipSeconds
      ),
    }));
  };

  const handleUpdateSceneItem = (
    sceneId: string,
    patch: { title?: string; prompt?: string; durationSeconds?: number }
  ) => {
    setCreateVideoDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc) => (sc.id === sceneId ? { ...sc, ...patch } : sc)),
    }));
  };

  const handleAddSceneSlot = () => {
    setCreateVideoDraft((prev) => {
      const nextNum = prev.scenes.length + 1;
      return {
        ...prev,
        scenes: [
          ...prev.scenes,
          {
            id: generateId('scplan'),
            sceneNumber: nextNum,
            title: `Scene ${nextNum}`,
            prompt: prev.prompt.trim() || `Visual beat for scene ${nextNum}...`,
            durationSeconds: selectedModel.maxSingleClipSeconds,
          },
        ],
      };
    });
  };

  const handleRemoveSceneSlot = (sceneId: string) => {
    setCreateVideoDraft((prev) => {
      if (prev.scenes.length <= 1) return prev;
      const filtered = prev.scenes
        .filter((s) => s.id !== sceneId)
        .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      return { ...prev, scenes: filtered };
    });
  };

  const handleToggleCharacter = (characterId: string) => {
    setCreateVideoDraft((prev) => {
      const exists = prev.characterIds.includes(characterId);
      return {
        ...prev,
        characterIds: exists
          ? prev.characterIds.filter((id) => id !== characterId)
          : [...prev.characterIds, characterId],
      };
    });
  };

  const handleStoryChange = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    setCreateVideoDraft((prev) => ({
      ...prev,
      storyId,
      episodeId: '',
      sceneId: '',
      visualStyle: story ? story.visualStyle : prev.visualStyle,
      aspectRatio: story ? story.defaultAspectRatio : prev.aspectRatio,
      characterIds: story
        ? Array.from(new Set([...prev.characterIds, ...story.characterIds]))
        : prev.characterIds,
    }));
  };

  const handleSaveToPromptLibrary = () => {
    const promptValidation = validateRequiredText(
      createVideoDraft.prompt,
      'Primary visual prompt',
      4,
      4000
    );
    if (!promptValidation.valid) {
      setFeedback({
        type: 'error',
        text: promptValidation.error ?? 'Enter a primary visual prompt first.',
      });
      return;
    }

    const title =
      createVideoDraft.title.trim() ||
      `${createVideoDraft.visualStyle} ${createVideoDraft.durationSeconds}s Reel`;

    upsertPrompt({
      title,
      prompt: createVideoDraft.prompt.trim(),
      storyPrompt: createVideoDraft.storyPrompt.trim(),
      negativePrompt: createVideoDraft.negativePrompt.trim(),
      visualStyle: createVideoDraft.visualStyle,
      customStyleNote: createVideoDraft.customStyleNote.trim() || undefined,
      aspectRatio: createVideoDraft.aspectRatio,
      durationSeconds: createVideoDraft.durationSeconds,
      modelId: createVideoDraft.modelId,
      storyId: createVideoDraft.storyId || undefined,
      characterIds: createVideoDraft.characterIds,
    });

    setFeedback({
      type: 'success',
      text: `Saved "${title}" to your Prompt Library.`,
    });
  };

  const handleCopyCompiled = async () => {
    if (!compiledPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      setFeedback({ type: 'error', text: 'Clipboard permission denied by browser.' });
    }
  };

  const handleGenerateVideo = async () => {
    const promptValidation = validateRequiredText(
      createVideoDraft.prompt,
      'Primary visual prompt',
      4,
      4000
    );
    if (!promptValidation.valid) {
      setFeedback({
        type: 'error',
        text: promptValidation.error ?? 'Enter a primary visual prompt before generating.',
      });
      return;
    }

    if (!durationMatchesTotal) {
      setFeedback({
        type: 'error',
        text: `Scene durations currently sum to ${sceneDurationSum}s, but total video duration is ${createVideoDraft.durationSeconds}s. Click "Auto-Split Scenes" or adjust scene durations so they match.`,
      });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    const jobTitle =
      createVideoDraft.title.trim() ||
      selectedScene?.title ||
      `${createVideoDraft.visualStyle} ${createVideoDraft.durationSeconds}s Reel`;

    const resLabel = selectedResolution?.label ?? '720p';

    if (!backendClient.isConfigured(settings.backendBaseUrl)) {
      const failedRecord = addGenerationJob({
        title: jobTitle,
        prompt: createVideoDraft.prompt.trim(),
        storyPrompt: createVideoDraft.storyPrompt.trim(),
        negativePrompt: createVideoDraft.negativePrompt.trim(),
        compiledPrompt,
        visualStyle: createVideoDraft.visualStyle,
        customStyleNote: createVideoDraft.customStyleNote.trim() || undefined,
        aspectRatio: createVideoDraft.aspectRatio,
        resolutionLabel: resLabel,
        durationSeconds: createVideoDraft.durationSeconds,
        scenes: createVideoDraft.scenes,
        modelId: createVideoDraft.modelId,
        storyId: selectedStory?.id,
        storyTitle: selectedStory?.title,
        episodeId: selectedEpisode?.id,
        episodeTitle: selectedEpisode
          ? `Ep ${selectedEpisode.episodeNumber}: ${selectedEpisode.title}`
          : undefined,
        sceneId: selectedScene?.id,
        characterIds: createVideoDraft.characterIds,
        status: 'Failed',
        errorMessage:
          'Backend Not Connected – Start the backend server and try again.',
      });
      setActiveJob(failedRecord);
      setFeedback({
        type: 'error',
        text: 'Backend Not Connected – Start the backend server and try again. No fake video was created.',
      });
      setIsSubmitting(false);
      return;
    }

    const queuedJob = addGenerationJob({
      title: jobTitle,
      prompt: createVideoDraft.prompt.trim(),
      storyPrompt: createVideoDraft.storyPrompt.trim(),
      negativePrompt: createVideoDraft.negativePrompt.trim(),
      compiledPrompt,
      visualStyle: createVideoDraft.visualStyle,
      customStyleNote: createVideoDraft.customStyleNote.trim() || undefined,
      aspectRatio: createVideoDraft.aspectRatio,
      resolutionLabel: resLabel,
      durationSeconds: createVideoDraft.durationSeconds,
      scenes: createVideoDraft.scenes,
      modelId: createVideoDraft.modelId,
      storyId: selectedStory?.id,
      storyTitle: selectedStory?.title,
      episodeId: selectedEpisode?.id,
      episodeTitle: selectedEpisode
        ? `Ep ${selectedEpisode.episodeNumber}: ${selectedEpisode.title}`
        : undefined,
      sceneId: selectedScene?.id,
      characterIds: createVideoDraft.characterIds,
      status: 'Queued',
    });
    setActiveJob(queuedJob);

    try {
      const response = await backendClient.submitGenerationJob(settings.backendBaseUrl, {
        title: jobTitle,
        prompt: createVideoDraft.prompt.trim(),
        storyPrompt: createVideoDraft.storyPrompt.trim(),
        negativePrompt: createVideoDraft.negativePrompt.trim(),
        compiledPrompt,
        visualStyle: createVideoDraft.visualStyle,
        customStyleNote: createVideoDraft.customStyleNote.trim() || undefined,
        aspectRatio: createVideoDraft.aspectRatio,
        resolutionId: selectedResolution?.id ?? '',
        resolutionLabel: resLabel,
        durationSeconds: createVideoDraft.durationSeconds,
        scenes: createVideoDraft.scenes,
        modelId: createVideoDraft.modelId,
        storyId: selectedStory?.id,
        episodeId: selectedEpisode?.id,
        sceneId: selectedScene?.id,
        characterIds: createVideoDraft.characterIds,
      });

      const updatedFields: Partial<GenerationJob> = {
        backendJobId: response.jobId,
        status: response.status,
        videoUrl: response.videoUrl,
        thumbnailUrl: response.thumbnailUrl,
        fileSizeBytes: response.fileSizeBytes,
        validatedDurationSeconds: response.validatedDurationSeconds,
        errorMessage: response.errorMessage,
      };
      updateGenerationJob(queuedJob.id, updatedFields);
      setActiveJob({ ...queuedJob, ...updatedFields });
      setFeedback({
        type: 'info',
        text: `Job submitted (${response.jobId}). Current status: ${response.status}.`,
      });
    } catch (err) {
      const msg =
        err instanceof BackendNotConnectedError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Generation request failed.';
      updateGenerationJob(queuedJob.id, { status: 'Failed', errorMessage: msg });
      setActiveJob({ ...queuedJob, status: 'Failed', errorMessage: msg });
      setFeedback({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">
            Create Video
          </h1>
          <p className="text-sm text-[#9CA3B2] mt-1">
            Build a 30–60 second video by dividing your story into short AI scenes that FFmpeg stitches into one seamless Reel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyCompiled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-[#12151E] hover:bg-[#191E2B] text-xs font-medium text-[#E6E9F0] transition-colors whitespace-nowrap"
          >
            {copiedPrompt ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedPrompt ? 'Copied' : 'Copy Payload'}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToPromptLibrary}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-[#12151E] hover:bg-[#191E2B] text-xs font-medium text-[#E6E9F0] transition-colors whitespace-nowrap"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>Save to Library</span>
          </button>
        </div>
      </div>

      <BackendStatusNotice compact />

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-[#E59A1A]/30 bg-[#E59A1A]/10 text-[#FDE68A]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Composer Form */}
        <div className="xl:col-span-7 space-y-5">
          {/* A, B, C, D: Title & Prompts */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#8E96A4]">
                Need inspiration? Try an example prompt:
              </span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() =>
                      setCreateVideoDraft((prev) => ({
                        ...prev,
                        visualStyle: ex.style,
                        prompt: ex.prompt,
                        storyPrompt: ex.storyPrompt,
                        scenes: divideDurationIntoScenes(
                          prev.durationSeconds,
                          ex.prompt,
                          selectedModel.maxSingleClipSeconds
                        ),
                      }))
                    }
                    className="px-2.5 py-1 rounded-md border border-white/[0.1] bg-[#0B0D12] hover:border-[#E59A1A]/50 text-[11px] font-medium text-[#CBD2DF]"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="clip-title"
                className="block text-xs font-medium text-[#CBD2DF] mb-1.5"
              >
                A. Clip Title (Optional)
              </label>
              <input
                id="clip-title"
                type="text"
                value={createVideoDraft.title}
                onChange={(e) =>
                  setCreateVideoDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Monsoon Courtyard Reel — Ep 1"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="main-prompt"
                  className="text-xs font-medium text-[#CBD2DF]"
                >
                  B. Primary Visual Prompt
                </label>
                <span
                  title="Describe what the camera sees: subject, action, setting, lighting, and camera motion."
                  className="inline-flex items-center gap-1 text-[11px] text-[#7B8494]"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Subject + Action + Lighting + Camera</span>
                </span>
              </div>
              <textarea
                id="main-prompt"
                rows={4}
                value={createVideoDraft.prompt}
                onChange={(e) =>
                  setCreateVideoDraft((prev) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder="Example: A courier steps onto a rain-slicked sandstone bridge under warm amber streetlamps, slow vertical camera push-in..."
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3.5 py-2.5 text-sm text-[#F3F5F8] placeholder-[#5A6375] leading-relaxed focus:outline-none focus:border-[#E59A1A]"
              />
            </div>

            <div>
              <label
                htmlFor="story-prompt"
                className="block text-xs font-medium text-[#CBD2DF] mb-1.5"
              >
                C. Story & Narrative Beat Input
              </label>
              <textarea
                id="story-prompt"
                rows={2}
                value={createVideoDraft.storyPrompt}
                onChange={(e) =>
                  setCreateVideoDraft((prev) => ({ ...prev, storyPrompt: e.target.value }))
                }
                placeholder="What happens in the story during this 30–60s video?"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3.5 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
              />
            </div>

            <div>
              <label
                htmlFor="negative-prompt"
                className="block text-xs font-medium text-[#CBD2DF] mb-1.5"
              >
                D. Negative Prompt (What to avoid)
              </label>
              <input
                id="negative-prompt"
                type="text"
                value={createVideoDraft.negativePrompt}
                onChange={(e) =>
                  setCreateVideoDraft((prev) => ({ ...prev, negativePrompt: e.target.value }))
                }
                placeholder="e.g., blurry face, extra fingers, flickering clothes, watermark"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3.5 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
              />
            </div>
          </div>

          {/* E, F, G, H: Style, 30-60s Duration, Aspect Ratio, Model & Quality */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-5">
            <div>
              <span className="block text-xs font-medium text-[#CBD2DF] mb-2">
                E. Visual Style
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {VISUAL_STYLES.map((style) => {
                  const active = createVideoDraft.visualStyle === style.value;
                  return (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() =>
                        setCreateVideoDraft((prev) => ({ ...prev, visualStyle: style.value }))
                      }
                      className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                        active
                          ? 'border-[#E59A1A] bg-[#E59A1A]/12 text-[#F8FAFC]'
                          : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2] hover:border-white/[0.18] hover:text-[#F3F5F8]'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                        {style.value}
                      </div>
                      <div className="text-[11px] text-[#7B8494] mt-0.5 line-clamp-1">
                        {style.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

              {createVideoDraft.visualStyle === 'Custom Style' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={createVideoDraft.customStyleNote}
                    onChange={(e) =>
                      setCreateVideoDraft((prev) => ({
                        ...prev,
                        customStyleNote: e.target.value,
                      }))
                    }
                    placeholder="Describe your custom visual style (e.g., watercolor storybook with warm lantern lighting)"
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <span className="block text-xs font-medium text-[#CBD2DF] mb-2">
                  F. Total Final Video Duration (30–60s)
                </span>
                <div className="flex flex-wrap gap-2">
                  {TOTAL_DURATIONS.map((sec) => {
                    const active = createVideoDraft.durationSeconds === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleDurationSelect(sec)}
                        className={`px-3.5 py-2 rounded-lg border font-mono text-xs tabular-nums font-medium transition-colors ${
                          active
                            ? 'border-[#E59A1A] bg-[#E59A1A]/12 text-[#F8FAFC]'
                            : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2] hover:text-[#F3F5F8]'
                        }`}
                      >
                        {sec}s
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#7B8494] mt-1.5">
                  Automatically divided into short clips and stitched with FFmpeg.
                </p>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#CBD2DF] mb-2">
                  G. Aspect Ratio
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((ratio) => {
                    const active = createVideoDraft.aspectRatio === ratio.value;
                    return (
                      <button
                        key={ratio.value}
                        type="button"
                        onClick={() =>
                          setCreateVideoDraft((prev) => ({ ...prev, aspectRatio: ratio.value }))
                        }
                        className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'border-[#E59A1A] bg-[#E59A1A]/12 text-[#F8FAFC]'
                            : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2] hover:text-[#F3F5F8]'
                        }`}
                      >
                        <span className="font-mono">{ratio.value}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#7B8494] mt-1.5">
                  {ASPECT_RATIOS.find((r) => r.value === createVideoDraft.aspectRatio)?.label}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="model-select"
                  className="block text-xs font-medium text-[#CBD2DF] mb-1.5"
                >
                  AI Video Engine (Self-Hosted)
                </label>
                <select
                  id="model-select"
                  value={createVideoDraft.modelId}
                  onChange={(e) =>
                    setCreateVideoDraft((prev) => ({
                      ...prev,
                      modelId: e.target.value as ModelId,
                    }))
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
                >
                  {VIDEO_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.minVramGb}GB+ VRAM)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="quality-select"
                  className="block text-xs font-medium text-[#CBD2DF] mb-1.5"
                >
                  H. Quality (Supported by Selected Model)
                </label>
                <select
                  id="quality-select"
                  value={selectedResolution?.id ?? ''}
                  onChange={(e) =>
                    setCreateVideoDraft((prev) => ({
                      ...prev,
                      resolutionId: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
                >
                  {supportedResolutions.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Multi-Scene Breakdown (Must sum to 30-60s) */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-[#F3F5F8]">
                  Multi-Scene Timeline ({createVideoDraft.scenes.length} Clips)
                </h2>
                <p className="text-xs text-[#8E96A4] mt-0.5">
                  {selectedModel.name} generates ~{selectedModel.maxSingleClipSeconds}s clips; FFmpeg stitches them to{' '}
                  <span className="font-mono text-[#F3F5F8]">
                    {createVideoDraft.durationSeconds}s
                  </span>
                  .
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoDivideScenes}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#E6E9F0]"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Auto-Split {createVideoDraft.durationSeconds}s</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddSceneSlot}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#E6E9F0]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Scene</span>
                </button>
              </div>
            </div>

            {!durationMatchesTotal && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-center justify-between gap-2">
                <span>
                  Scene durations total {sceneDurationSum}s, which must equal{' '}
                  {createVideoDraft.durationSeconds}s.
                </span>
                <button
                  type="button"
                  onClick={handleAutoDivideScenes}
                  className="underline font-medium whitespace-nowrap"
                >
                  Fix Automatically
                </button>
              </div>
            )}

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {createVideoDraft.scenes.map((sc) => (
                <div
                  key={sc.id}
                  className="rounded-lg border border-white/[0.07] bg-[#0B0D12] p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-xs text-[#E59A1A] shrink-0">
                        Scene {sc.sceneNumber}
                      </span>
                      <input
                        type="text"
                        value={sc.title}
                        onChange={(e) =>
                          handleUpdateSceneItem(sc.id, { title: e.target.value })
                        }
                        className="flex-1 min-w-0 bg-transparent border-b border-white/[0.08] focus:border-[#E59A1A] text-xs font-medium text-[#F3F5F8] py-0.5 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-[11px] text-[#8E96A4]">Sec:</label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={sc.durationSeconds}
                        onChange={(e) =>
                          handleUpdateSceneItem(sc.id, {
                            durationSeconds: Math.max(2, Math.min(10, Number(e.target.value) || 5)),
                          })
                        }
                        className="w-14 rounded border border-white/[0.1] bg-[#12151E] px-2 py-1 font-mono text-xs text-[#F3F5F8] tabular-nums"
                      />
                      {createVideoDraft.scenes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSceneSlot(sc.id)}
                          aria-label={`Remove scene ${sc.sceneNumber}`}
                          className="p-1 text-[#7B8494] hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={sc.prompt}
                    onChange={(e) =>
                      handleUpdateSceneItem(sc.id, { prompt: e.target.value })
                    }
                    className="w-full rounded border border-white/[0.08] bg-[#12151E] px-2.5 py-1.5 text-xs text-[#CBD2DF] focus:outline-none focus:border-[#E59A1A]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* I. Character Selection & Story Link */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F3F5F8]">
                I. Character Selection & Story Link
              </h2>
              <button
                type="button"
                onClick={() => setActivePage('characters')}
                className="text-xs font-medium text-[#E59A1A] hover:text-[#FBBF24]"
              >
                Manage Characters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ctx-story" className="block text-xs text-[#9CA3B2] mb-1">
                  Associated Story (Optional)
                </label>
                <select
                  id="ctx-story"
                  value={createVideoDraft.storyId}
                  onChange={(e) => handleStoryChange(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#F3F5F8]"
                >
                  <option value="">Standalone Video</option>
                  {stories.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ctx-episode" className="block text-xs text-[#9CA3B2] mb-1">
                  Episode Context (Optional)
                </label>
                <select
                  id="ctx-episode"
                  value={createVideoDraft.episodeId}
                  disabled={!selectedStory}
                  onChange={(e) =>
                    setCreateVideoDraft((prev) => ({
                      ...prev,
                      episodeId: e.target.value,
                      sceneId: '',
                    }))
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#F3F5F8] disabled:opacity-45"
                >
                  <option value="">Select Episode</option>
                  {selectedStory?.episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      Ep {ep.episodeNumber}: {ep.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-[#CBD2DF] mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#8E96A4]" />
                  <span>Select Saved Characters</span>
                </span>
                <span className="text-[11px] text-[#7B8494]">
                  Passes details + reference image when model supports I2V
                </span>
              </div>
              {characters.length === 0 ? (
                <p className="text-xs text-[#7B8494]">No characters saved yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {characters.map((char) => {
                    const selected = createVideoDraft.characterIds.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleToggleCharacter(char.id)}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                          selected
                            ? 'border-[#E59A1A] bg-[#E59A1A]/10'
                            : 'border-white/[0.08] bg-[#0B0D12] hover:border-white/[0.18]'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-md overflow-hidden shrink-0 border border-white/[0.08]">
                          <ReferenceImage
                            src={char.referenceImageUrl}
                            alt={char.name}
                            name={char.name}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#F3F5F8] truncate">
                            {char.name}
                          </div>
                          <div className="text-[11px] text-[#8E96A4] truncate">
                            {char.visualStyle} · {char.ageAppearance}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* J. Generate Video Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-[#8E96A4]">
              {backendHealth.connected
                ? `Backend Connected (${settings.backendBaseUrl}) · Total: ${sceneDurationSum}s`
                : `Backend Not Connected · Total planned: ${sceneDurationSum}s`}
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGenerateVideo}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] disabled:opacity-60 text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{isSubmitting ? 'Submitting...' : 'Generate Video'}</span>
            </button>
          </div>
        </div>

        {/* Right Preview & Status Column */}
        <div className="xl:col-span-5">
          <GenerationPreview
            aspectRatio={createVideoDraft.aspectRatio}
            visualStyle={createVideoDraft.visualStyle}
            durationSeconds={createVideoDraft.durationSeconds}
            resolutionLabel={selectedResolution?.label ?? '720p'}
            scenes={createVideoDraft.scenes}
            selectedModel={selectedModel}
            compiledPrompt={compiledPrompt}
            activeJob={activeJob}
            backendConnected={backendHealth.connected}
            onGoToSettings={() => setActivePage('settings')}
          />
        </div>
      </div>
    </div>
  );
};
