import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { backendClient } from '../services/api/backendClient';
import { VIDEO_MODELS } from '../services/blueprints/infrastructureData';
import {
  localDataRepository,
  type StudioSnapshot,
} from '../services/storage/localDataRepository';
import type {
  BackendHealthResult,
  Character,
  CreateVideoDraft,
  Episode,
  GenerationJob,
  Project,
  PromptItem,
  Scene,
  Story,
  StudioPage,
  StudioSettings,
} from '../types/studio';
import { generateId, nowIso } from '../utils/id';
import { divideDurationIntoScenes } from '../utils/promptComposer';

interface StudioContextValue {
  activePage: StudioPage;
  setActivePage: (page: StudioPage) => void;
  focusedStoryId: string;
  setFocusedStoryId: (storyId: string) => void;
  openStoryById: (storyId: string) => void;
  projects: Project[];
  stories: Story[];
  characters: Character[];
  prompts: PromptItem[];
  generationJobs: GenerationJob[];
  settings: StudioSettings;
  backendHealth: BackendHealthResult;
  isCheckingHealth: boolean;
  refreshBackendHealth: (overrideUrl?: string) => Promise<BackendHealthResult>;
  createVideoDraft: CreateVideoDraft;
  setCreateVideoDraft: React.Dispatch<React.SetStateAction<CreateVideoDraft>>;
  loadPromptIntoComposer: (draftPatch: Partial<CreateVideoDraft>) => void;

  upsertProject: (
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Project;
  deleteProject: (projectId: string) => void;

  upsertStory: (
    story: Omit<Story, 'id' | 'episodes' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Story;
  deleteStory: (storyId: string) => void;
  addEpisode: (
    storyId: string,
    payload: {
      title: string;
      description: string;
      continuitySummary: string;
      previousEpisodeContext: string;
    }
  ) => Episode | undefined;
  updateEpisode: (
    storyId: string,
    episodeId: string,
    payload: Partial<
      Pick<Episode, 'title' | 'description' | 'continuitySummary' | 'previousEpisodeContext'>
    >
  ) => void;
  deleteEpisode: (storyId: string, episodeId: string) => void;
  upsertScene: (
    storyId: string,
    episodeId: string,
    payload: Omit<Scene, 'id' | 'episodeId' | 'sceneNumber' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      sceneNumber?: number;
    }
  ) => Scene | undefined;
  deleteScene: (storyId: string, episodeId: string, sceneId: string) => void;

  upsertCharacter: (
    character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Character;
  deleteCharacter: (characterId: string) => void;

  upsertPrompt: (
    prompt: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => PromptItem;
  deletePrompt: (promptId: string) => void;

  addGenerationJob: (job: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>) => GenerationJob;
  updateGenerationJob: (jobId: string, patch: Partial<GenerationJob>) => void;
  deleteGenerationJob: (jobId: string) => void;

  updateSettings: (patch: Partial<StudioSettings>) => void;
  resetStarterDrafts: () => void;
  clearLocalData: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function makeInitialComposerDraft(settings: StudioSettings): CreateVideoDraft {
  const model =
    VIDEO_MODELS.find((m) => m.id === settings.defaultModelId) ?? VIDEO_MODELS[0];
  const defaultRes =
    model.supportedResolutions.find((r) => r.aspectRatio === settings.defaultAspectRatio) ??
    model.supportedResolutions[0];

  return {
    title: '',
    prompt: '',
    storyPrompt: '',
    negativePrompt: 'blurry faces, extra limbs, distorted proportions, watermark, caption text',
    visualStyle: settings.defaultStyle,
    customStyleNote: '',
    aspectRatio: settings.defaultAspectRatio,
    modelId: model.id,
    resolutionId: defaultRes?.id ?? '',
    durationSeconds: 30,
    scenes: divideDurationIntoScenes(30, '', model.maxSingleClipSeconds),
    storyId: '',
    episodeId: '',
    sceneId: '',
    characterIds: [],
  };
}

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<StudioSnapshot>(() =>
    localDataRepository.loadSnapshot()
  );
  const [activePage, setActivePage] = useState<StudioPage>('dashboard');
  const [focusedStoryId, setFocusedStoryId] = useState<string>(
    () => snapshot.stories[0]?.id ?? ''
  );
  const [createVideoDraft, setCreateVideoDraft] = useState<CreateVideoDraft>(() =>
    makeInitialComposerDraft(snapshot.settings)
  );
  const [backendHealth, setBackendHealth] = useState<BackendHealthResult>({
    connected: false,
    checkedAt: nowIso(),
    statusText: 'Backend Not Connected – Start the backend server and try again.',
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const persistSnapshot = useCallback((updater: (prev: StudioSnapshot) => StudioSnapshot) => {
    setSnapshot((prev) => {
      const next = updater(prev);
      localDataRepository.saveSnapshot(next);
      return next;
    });
  }, []);

  const refreshBackendHealth = useCallback(
    async (overrideUrl?: string) => {
      setIsCheckingHealth(true);
      try {
        const target = overrideUrl ?? snapshot.settings.backendBaseUrl;
        const result = await backendClient.checkHealth(target);
        setBackendHealth(result);
        return result;
      } finally {
        setIsCheckingHealth(false);
      }
    },
    [snapshot.settings.backendBaseUrl]
  );

  useEffect(() => {
    if (snapshot.settings.backendBaseUrl.trim()) {
      void refreshBackendHealth(snapshot.settings.backendBaseUrl);
    }
  }, []);

  const openStoryById = useCallback((storyId: string) => {
    setFocusedStoryId(storyId);
    setActivePage('stories');
  }, []);

  const loadPromptIntoComposer = useCallback((draftPatch: Partial<CreateVideoDraft>) => {
    setCreateVideoDraft((prev) => {
      const nextDuration = draftPatch.durationSeconds ?? prev.durationSeconds;
      const nextModelId = draftPatch.modelId ?? prev.modelId;
      const model = VIDEO_MODELS.find((m) => m.id === nextModelId) ?? VIDEO_MODELS[0];
      const nextRatio = draftPatch.aspectRatio ?? prev.aspectRatio;
      const validRes =
        model.supportedResolutions.find((r) => r.id === (draftPatch.resolutionId ?? prev.resolutionId) && r.aspectRatio === nextRatio) ??
        model.supportedResolutions.find((r) => r.aspectRatio === nextRatio) ??
        model.supportedResolutions[0];

      const nextPrompt = draftPatch.prompt ?? prev.prompt;
      const nextScenes =
        draftPatch.scenes ??
        divideDurationIntoScenes(nextDuration, nextPrompt, model.maxSingleClipSeconds);

      return {
        ...prev,
        ...draftPatch,
        modelId: model.id,
        resolutionId: validRes?.id ?? '',
        durationSeconds: nextDuration,
        scenes: nextScenes,
      };
    });
    setActivePage('create-video');
  }, []);

  const upsertProject = useCallback(
    (input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Project => {
      const timestamp = nowIso();
      const existing = input.id ? snapshot.projects.find((p) => p.id === input.id) : undefined;
      const saved: Project = existing
        ? { ...existing, ...input, updatedAt: timestamp }
        : {
            ...input,
            id: generateId('proj'),
            createdAt: timestamp,
            updatedAt: timestamp,
          };

      persistSnapshot((prev) => ({
        ...prev,
        projects: existing
          ? prev.projects.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev.projects],
      }));
      return saved;
    },
    [persistSnapshot, snapshot.projects]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      persistSnapshot((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== projectId),
        stories: prev.stories.map((s) =>
          s.projectId === projectId ? { ...s, projectId: undefined } : s
        ),
      }));
    },
    [persistSnapshot]
  );

  const upsertStory = useCallback(
    (
      input: Omit<Story, 'id' | 'episodes' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): Story => {
      const timestamp = nowIso();
      const existing = input.id ? snapshot.stories.find((s) => s.id === input.id) : undefined;
      const saved: Story = existing
        ? { ...existing, ...input, updatedAt: timestamp }
        : {
            ...input,
            id: generateId('story'),
            episodes: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          };

      persistSnapshot((prev) => ({
        ...prev,
        stories: existing
          ? prev.stories.map((s) => (s.id === saved.id ? saved : s))
          : [saved, ...prev.stories],
        characters: prev.characters.map((c) => {
          const shouldLink = saved.characterIds.includes(c.id);
          const alreadyLinked = c.associatedStoryIds.includes(saved.id);
          if (shouldLink && !alreadyLinked) {
            return { ...c, associatedStoryIds: [...c.associatedStoryIds, saved.id] };
          }
          return c;
        }),
      }));
      return saved;
    },
    [persistSnapshot, snapshot.stories]
  );

  const deleteStory = useCallback(
    (storyId: string) => {
      persistSnapshot((prev) => ({
        ...prev,
        stories: prev.stories.filter((s) => s.id !== storyId),
        characters: prev.characters.map((c) => ({
          ...c,
          associatedStoryIds: c.associatedStoryIds.filter((id) => id !== storyId),
        })),
      }));
    },
    [persistSnapshot]
  );

  const addEpisode = useCallback(
    (
      storyId: string,
      payload: {
        title: string;
        description: string;
        continuitySummary: string;
        previousEpisodeContext: string;
      }
    ): Episode | undefined => {
      const targetStory = snapshot.stories.find((s) => s.id === storyId);
      if (!targetStory) return undefined;
      const timestamp = nowIso();
      const nextNum =
        targetStory.episodes.length > 0
          ? Math.max(...targetStory.episodes.map((e) => e.episodeNumber)) + 1
          : 1;

      const created: Episode = {
        id: generateId('ep'),
        storyId,
        episodeNumber: nextNum,
        title: payload.title,
        description: payload.description,
        continuitySummary: payload.continuitySummary,
        previousEpisodeContext: payload.previousEpisodeContext,
        scenes: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      persistSnapshot((prev) => ({
        ...prev,
        stories: prev.stories.map((s) =>
          s.id === storyId
            ? { ...s, episodes: [...s.episodes, created], updatedAt: timestamp }
            : s
        ),
      }));
      return created;
    },
    [persistSnapshot, snapshot.stories]
  );

  const updateEpisode = useCallback(
    (
      storyId: string,
      episodeId: string,
      payload: Partial<
        Pick<Episode, 'title' | 'description' | 'continuitySummary' | 'previousEpisodeContext'>
      >
    ) => {
      const timestamp = nowIso();
      persistSnapshot((prev) => ({
        ...prev,
        stories: prev.stories.map((s) =>
          s.id === storyId
            ? {
                ...s,
                updatedAt: timestamp,
                episodes: s.episodes.map((e) =>
                  e.id === episodeId ? { ...e, ...payload, updatedAt: timestamp } : e
                ),
              }
            : s
        ),
      }));
    },
    [persistSnapshot]
  );

  const deleteEpisode = useCallback(
    (storyId: string, episodeId: string) => {
      const timestamp = nowIso();
      persistSnapshot((prev) => ({
        ...prev,
        stories: prev.stories.map((s) =>
          s.id === storyId
            ? {
                ...s,
                updatedAt: timestamp,
                episodes: s.episodes.filter((e) => e.id !== episodeId),
              }
            : s
        ),
      }));
    },
    [persistSnapshot]
  );

  const upsertScene = useCallback(
    (
      storyId: string,
      episodeId: string,
      payload: Omit<Scene, 'id' | 'episodeId' | 'sceneNumber' | 'createdAt' | 'updatedAt'> & {
        id?: string;
        sceneNumber?: number;
      }
    ): Scene | undefined => {
      const story = snapshot.stories.find((s) => s.id === storyId);
      const episode = story?.episodes.find((e) => e.id === episodeId);
      if (!story || !episode) return undefined;

      const timestamp = nowIso();
      const existing = payload.id
        ? episode.scenes.find((sc) => sc.id === payload.id)
        : undefined;
      const nextSceneNum =
        payload.sceneNumber ??
        (episode.scenes.length > 0
          ? Math.max(...episode.scenes.map((sc) => sc.sceneNumber)) + 1
          : 1);

      const saved: Scene = existing
        ? { ...existing, ...payload, sceneNumber: existing.sceneNumber, updatedAt: timestamp }
        : {
            ...payload,
            id: generateId('scene'),
            episodeId,
            sceneNumber: nextSceneNum,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

      persistSnapshot((prev) => ({
        ...prev,
        stories: prev.stories.map((s) =>
          s.id === storyId
            ? {
                ...s,
                updatedAt: timestamp,
                episodes: s.episodes.map((e) =>
                  e.id === episodeId
                    ? {
                        ...e,
                        updatedAt: timestamp,
                        scenes: existing
                          ? e.scenes.map((sc) => (sc.id === saved.id ? saved : sc))
                          : [...e.scenes, saved],
                      }
                    : e
                ),
              }
            : s
        ),
      }));

      return saved;
    },
    [persistSnapshot, snapshot.stories]
  );

  const deleteScene = useCallback(
    (storyId: string, episodeId: string, sceneId: string) => {
      const timestamp = nowIso();
      persistSnapshot((prev) => ({
        ...prev,
        stories: prev.stories.map((s) =>
          s.id === storyId
            ? {
                ...s,
                updatedAt: timestamp,
                episodes: s.episodes.map((e) =>
                  e.id === episodeId
                    ? {
                        ...e,
                        updatedAt: timestamp,
                        scenes: e.scenes.filter((sc) => sc.id !== sceneId),
                      }
                    : e
                ),
              }
            : s
        ),
      }));
    },
    [persistSnapshot]
  );

  const upsertCharacter = useCallback(
    (
      input: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): Character => {
      const timestamp = nowIso();
      const existing = input.id
        ? snapshot.characters.find((c) => c.id === input.id)
        : undefined;
      const saved: Character = existing
        ? { ...existing, ...input, updatedAt: timestamp }
        : {
            ...input,
            id: generateId('char'),
            createdAt: timestamp,
            updatedAt: timestamp,
          };

      persistSnapshot((prev) => ({
        ...prev,
        characters: existing
          ? prev.characters.map((c) => (c.id === saved.id ? saved : c))
          : [saved, ...prev.characters],
        stories: prev.stories.map((st) => {
          const isLinked = saved.associatedStoryIds.includes(st.id);
          const hasChar = st.characterIds.includes(saved.id);
          if (isLinked && !hasChar) {
            return { ...st, characterIds: [...st.characterIds, saved.id] };
          }
          if (!isLinked && hasChar) {
            return { ...st, characterIds: st.characterIds.filter((id) => id !== saved.id) };
          }
          return st;
        }),
      }));

      return saved;
    },
    [persistSnapshot, snapshot.characters]
  );

  const deleteCharacter = useCallback(
    (characterId: string) => {
      persistSnapshot((prev) => ({
        ...prev,
        characters: prev.characters.filter((c) => c.id !== characterId),
        stories: prev.stories.map((st) => ({
          ...st,
          characterIds: st.characterIds.filter((id) => id !== characterId),
          episodes: st.episodes.map((ep) => ({
            ...ep,
            scenes: ep.scenes.map((sc) => ({
              ...sc,
              characterIds: sc.characterIds.filter((id) => id !== characterId),
            })),
          })),
        })),
      }));
    },
    [persistSnapshot]
  );

  const upsertPrompt = useCallback(
    (input: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): PromptItem => {
      const timestamp = nowIso();
      const existing = input.id ? snapshot.prompts.find((p) => p.id === input.id) : undefined;
      const saved: PromptItem = existing
        ? { ...existing, ...input, updatedAt: timestamp }
        : {
            ...input,
            id: generateId('prompt'),
            createdAt: timestamp,
            updatedAt: timestamp,
          };

      persistSnapshot((prev) => ({
        ...prev,
        prompts: existing
          ? prev.prompts.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev.prompts],
      }));
      return saved;
    },
    [persistSnapshot, snapshot.prompts]
  );

  const deletePrompt = useCallback(
    (promptId: string) => {
      persistSnapshot((prev) => ({
        ...prev,
        prompts: prev.prompts.filter((p) => p.id !== promptId),
      }));
    },
    [persistSnapshot]
  );

  const addGenerationJob = useCallback(
    (jobInput: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>): GenerationJob => {
      const timestamp = nowIso();
      const job: GenerationJob = {
        ...jobInput,
        id: generateId('job'),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      persistSnapshot((prev) => ({
        ...prev,
        generationJobs: [job, ...prev.generationJobs],
      }));
      return job;
    },
    [persistSnapshot]
  );

  const updateGenerationJob = useCallback(
    (jobId: string, patch: Partial<GenerationJob>) => {
      const timestamp = nowIso();
      persistSnapshot((prev) => ({
        ...prev,
        generationJobs: prev.generationJobs.map((j) =>
          j.id === jobId ? { ...j, ...patch, updatedAt: timestamp } : j
        ),
      }));
    },
    [persistSnapshot]
  );

  const deleteGenerationJob = useCallback(
    (jobId: string) => {
      persistSnapshot((prev) => ({
        ...prev,
        generationJobs: prev.generationJobs.filter((j) => j.id !== jobId),
      }));
    },
    [persistSnapshot]
  );

  const updateSettings = useCallback(
    (patch: Partial<StudioSettings>) => {
      persistSnapshot((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...patch,
          storageModeLabel: 'localStorage',
        },
      }));
    },
    [persistSnapshot]
  );

  const resetStarterDrafts = useCallback(() => {
    const next = localDataRepository.resetToStarterDrafts();
    setSnapshot(next);
  }, []);

  const clearLocalData = useCallback(() => {
    const empty = localDataRepository.clearAllLocalData();
    setSnapshot(empty);
  }, []);

  const exportBackup = useCallback(() => {
    return localDataRepository.exportBackupJson(snapshot);
  }, [snapshot]);

  const importBackup = useCallback((json: string) => {
    const imported = localDataRepository.importBackupJson(json);
    setSnapshot(imported);
  }, []);

  return (
    <StudioContext.Provider
      value={{
        activePage,
        setActivePage,
        focusedStoryId,
        setFocusedStoryId,
        openStoryById,
        projects: snapshot.projects,
        stories: snapshot.stories,
        characters: snapshot.characters,
        prompts: snapshot.prompts,
        generationJobs: snapshot.generationJobs,
        settings: snapshot.settings,
        backendHealth,
        isCheckingHealth,
        refreshBackendHealth,
        createVideoDraft,
        setCreateVideoDraft,
        loadPromptIntoComposer,
        upsertProject,
        deleteProject,
        upsertStory,
        deleteStory,
        addEpisode,
        updateEpisode,
        deleteEpisode,
        upsertScene,
        deleteScene,
        upsertCharacter,
        deleteCharacter,
        upsertPrompt,
        deletePrompt,
        addGenerationJob,
        updateGenerationJob,
        deleteGenerationJob,
        updateSettings,
        resetStarterDrafts,
        clearLocalData,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export function useStudioData(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error('useStudioData must be used inside StudioProvider.');
  }
  return ctx;
}
