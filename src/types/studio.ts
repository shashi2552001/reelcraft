export type StudioPage =
  | 'dashboard'
  | 'create-video'
  | 'my-videos'
  | 'stories'
  | 'characters'
  | 'prompt-library'
  | 'settings'
  | 'help';

export type VisualStyle =
  | '3D Indian Anime'
  | 'Cartoon'
  | 'Realistic'
  | 'Cinematic'
  | 'Custom Style';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type TotalVideoDuration = 30 | 40 | 45 | 50 | 60;

export type JobStatus =
  | 'Queued'
  | 'Processing'
  | 'Rendering'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export type ModelId =
  | 'ltx-video-0.9.7'
  | 'wan-2.2-ti2v-5b'
  | 'wan-2.2-i2v-a14b'
  | 'hunyuan-video';

export interface ResolutionOption {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

export interface VideoModelSpec {
  id: ModelId;
  name: string;
  family: string;
  license: string;
  maxSingleClipSeconds: number;
  supportedClipDurations: number[];
  supportedResolutions: ResolutionOption[];
  supportsImageToVideo: boolean;
  recommendedVramGb: number;
  minVramGb: number;
  strengths: string;
  characterConsistencyNotes: string;
  estimatedCloudCostPerHrUsd: string;
  officialDocsUrl: string;
}

export interface ScenePlanItem {
  id: string;
  sceneNumber: number;
  title: string;
  prompt: string;
  durationSeconds: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  targetStyle: VisualStyle;
  aspectRatio: AspectRatio;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  faceAndAppearance: string;
  hairstyle: string;
  clothing: string;
  ageAppearance: string;
  bodyDescription: string;
  personality: string;
  referenceImageUrl: string;
  referenceImageName?: string;
  visualStyle: VisualStyle;
  associatedStoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  episodeId: string;
  sceneNumber: number;
  title: string;
  actionDescription: string;
  cameraAndMood: string;
  characterIds: string[];
  compiledPrompt: string;
  negativePrompt: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  storyId: string;
  episodeNumber: number;
  title: string;
  description: string;
  continuitySummary: string;
  previousEpisodeContext: string;
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  visualStyle: VisualStyle;
  defaultAspectRatio: AspectRatio;
  characterIds: string[];
  episodes: Episode[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptItem {
  id: string;
  title: string;
  prompt: string;
  storyPrompt: string;
  negativePrompt: string;
  visualStyle: VisualStyle;
  customStyleNote?: string;
  aspectRatio: AspectRatio;
  durationSeconds: TotalVideoDuration;
  modelId: ModelId;
  storyId?: string;
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJob {
  id: string;
  title: string;
  prompt: string;
  storyPrompt: string;
  negativePrompt: string;
  compiledPrompt: string;
  visualStyle: VisualStyle;
  customStyleNote?: string;
  aspectRatio: AspectRatio;
  resolutionLabel: string;
  durationSeconds: TotalVideoDuration;
  scenes: ScenePlanItem[];
  modelId: ModelId;
  storyId?: string;
  storyTitle?: string;
  episodeId?: string;
  episodeTitle?: string;
  sceneId?: string;
  characterIds: string[];
  status: JobStatus;
  errorMessage?: string;
  backendJobId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  validatedDurationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudioSettings {
  studioName: string;
  defaultStyle: VisualStyle;
  defaultAspectRatio: AspectRatio;
  defaultModelId: ModelId;
  backendBaseUrl: string;
  storageModeLabel: 'localStorage';
}

export interface CreateVideoDraft {
  title: string;
  prompt: string;
  storyPrompt: string;
  negativePrompt: string;
  visualStyle: VisualStyle;
  customStyleNote: string;
  aspectRatio: AspectRatio;
  modelId: ModelId;
  resolutionId: string;
  durationSeconds: TotalVideoDuration;
  scenes: ScenePlanItem[];
  storyId: string;
  episodeId: string;
  sceneId: string;
  characterIds: string[];
}

export interface BackendHealthResult {
  connected: boolean;
  checkedAt: string;
  statusText: string;
  latencyMs?: number;
  activeModel?: string;
  gpuStatus?: string;
  databaseConnected?: boolean;
}
