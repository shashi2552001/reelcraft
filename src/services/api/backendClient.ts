import type {
  AspectRatio,
  BackendHealthResult,
  JobStatus,
  ModelId,
  ScenePlanItem,
  TotalVideoDuration,
  VisualStyle,
} from '../../types/studio';

export class BackendNotConnectedError extends Error {
  constructor(
    message = 'Backend Not Connected – Start the backend server and try again.'
  ) {
    super(message);
    this.name = 'BackendNotConnectedError';
  }
}

export interface GenerateVideoRequestPayload {
  title: string;
  prompt: string;
  storyPrompt: string;
  negativePrompt: string;
  compiledPrompt: string;
  visualStyle: VisualStyle;
  customStyleNote?: string;
  aspectRatio: AspectRatio;
  resolutionId: string;
  resolutionLabel: string;
  durationSeconds: TotalVideoDuration;
  scenes: ScenePlanItem[];
  modelId: ModelId;
  storyId?: string;
  episodeId?: string;
  sceneId?: string;
  characterIds: string[];
}

export interface BackendJobResponse {
  jobId: string;
  status: JobStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  validatedDurationSeconds?: number;
  errorMessage?: string;
}

export class ReelCraftBackendClient {
  private getBaseUrl(configuredUrl: string): string {
    return configuredUrl.trim().replace(/\/+$/, '');
  }

  isConfigured(configuredUrl: string): boolean {
    return this.getBaseUrl(configuredUrl).length > 0;
  }

  async checkHealth(configuredUrl: string): Promise<BackendHealthResult> {
    const baseUrl = this.getBaseUrl(configuredUrl);
    const checkedAt = new Date().toISOString();

    if (!baseUrl) {
      return {
        connected: false,
        checkedAt,
        statusText: 'Backend Not Connected – Start the backend server and try again.',
      };
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!response.ok) {
        return {
          connected: false,
          checkedAt,
          statusText: `Backend Not Connected – Server returned HTTP ${response.status}.`,
        };
      }

      const payload = (await response.json()) as {
        status?: string;
        database_connected?: boolean;
        active_model?: string;
        gpu_status?: string;
      };

      return {
        connected: true,
        checkedAt,
        latencyMs: Math.round(performance.now() - start),
        statusText: 'Backend Connected',
        databaseConnected: payload.database_connected,
        activeModel: payload.active_model,
        gpuStatus: payload.gpu_status,
      };
    } catch {
      return {
        connected: false,
        checkedAt,
        statusText: 'Backend Not Connected – Start the backend server and try again.',
      };
    }
  }

  async submitGenerationJob(
    configuredUrl: string,
    payload: GenerateVideoRequestPayload
  ): Promise<BackendJobResponse> {
    const baseUrl = this.getBaseUrl(configuredUrl);
    if (!baseUrl) {
      throw new BackendNotConnectedError();
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: payload.title,
          prompt: payload.prompt,
          story_prompt: payload.storyPrompt,
          negative_prompt: payload.negativePrompt,
          compiled_prompt: payload.compiledPrompt,
          visual_style: payload.visualStyle,
          custom_style_note: payload.customStyleNote || null,
          aspect_ratio: payload.aspectRatio,
          resolution_id: payload.resolutionId,
          resolution_label: payload.resolutionLabel,
          total_duration_seconds: payload.durationSeconds,
          scenes: payload.scenes.map((sc) => ({
            scene_number: sc.sceneNumber,
            title: sc.title,
            prompt: sc.prompt,
            duration_seconds: sc.durationSeconds,
          })),
          model_id: payload.modelId,
          story_id: payload.storyId || null,
          episode_id: payload.episodeId || null,
          scene_id: payload.sceneId || null,
          character_ids: payload.characterIds,
        }),
      });
    } catch {
      throw new BackendNotConnectedError();
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `Generation request failed (${response.status}): ${errText || response.statusText}`
      );
    }

    const data = (await response.json()) as {
      job_id: string;
      status: JobStatus;
      video_url?: string;
      thumbnail_url?: string;
      file_size_bytes?: number;
      validated_duration_seconds?: number;
      error_message?: string;
    };

    return {
      jobId: data.job_id,
      status: data.status,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      fileSizeBytes: data.file_size_bytes,
      validatedDurationSeconds: data.validated_duration_seconds,
      errorMessage: data.error_message,
    };
  }

  async fetchJobStatus(configuredUrl: string, backendJobId: string): Promise<BackendJobResponse> {
    const baseUrl = this.getBaseUrl(configuredUrl);
    if (!baseUrl) {
      throw new BackendNotConnectedError();
    }
    const response = await fetch(
      `${baseUrl}/api/v1/generations/${encodeURIComponent(backendJobId)}`
    );
    if (!response.ok) {
      throw new Error(`Unable to fetch job status (${response.status}).`);
    }
    const data = (await response.json()) as {
      job_id: string;
      status: JobStatus;
      video_url?: string;
      thumbnail_url?: string;
      file_size_bytes?: number;
      validated_duration_seconds?: number;
      error_message?: string;
    };
    return {
      jobId: data.job_id,
      status: data.status,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      fileSizeBytes: data.file_size_bytes,
      validatedDurationSeconds: data.validated_duration_seconds,
      errorMessage: data.error_message,
    };
  }

  async cancelJob(configuredUrl: string, backendJobId: string): Promise<BackendJobResponse> {
    const baseUrl = this.getBaseUrl(configuredUrl);
    if (!baseUrl) {
      throw new BackendNotConnectedError();
    }
    const response = await fetch(
      `${baseUrl}/api/v1/generations/${encodeURIComponent(backendJobId)}/cancel`,
      { method: 'POST' }
    );
    if (!response.ok) {
      throw new Error(`Cancel request failed (${response.status}).`);
    }
    const data = (await response.json()) as {
      job_id: string;
      status: JobStatus;
      error_message?: string;
    };
    return {
      jobId: data.job_id,
      status: data.status,
      errorMessage: data.error_message,
    };
  }

  async retryJob(configuredUrl: string, backendJobId: string): Promise<BackendJobResponse> {
    const baseUrl = this.getBaseUrl(configuredUrl);
    if (!baseUrl) {
      throw new BackendNotConnectedError();
    }
    const response = await fetch(
      `${baseUrl}/api/v1/generations/${encodeURIComponent(backendJobId)}/retry`,
      { method: 'POST' }
    );
    if (!response.ok) {
      throw new Error(`Retry request failed (${response.status}).`);
    }
    const data = (await response.json()) as {
      job_id: string;
      status: JobStatus;
      error_message?: string;
    };
    return {
      jobId: data.job_id,
      status: data.status,
      errorMessage: data.error_message,
    };
  }
}

export const backendClient = new ReelCraftBackendClient();
