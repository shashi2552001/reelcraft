import type {
  Character,
  Episode,
  Scene,
  ScenePlanItem,
  Story,
  TotalVideoDuration,
  VisualStyle,
} from '../types/studio';
import { generateId } from './id';

const STYLE_DIRECTIVES: Record<VisualStyle, string> = {
  '3D Indian Anime':
    'High-detail 3D Indian anime cinema aesthetic, rich South Asian architectural & cultural atmosphere, expressive cel-PBR lighting, warm golden and twilight contrast, stylized character proportions',
  Cartoon:
    '2D stylized hand-drawn animation aesthetic, crisp ink linework, expressive cel-shaded lighting, cohesive color palette',
  Realistic:
    'Photorealistic live-action camera capture, natural skin textures, physical lens depth of field, grounded environmental lighting',
  Cinematic:
    '35mm anamorphic cinema grade, controlled contrast ratio, atmospheric volumetric lighting, subtle film grain, deliberate camera motion',
  'Custom Style': 'Custom user-directed visual aesthetic',
};

export function buildCharacterConsistencyBlock(character: Character): string {
  const parts = [
    `${character.name} (${character.ageAppearance})`,
    character.faceAndAppearance ? `Face: ${character.faceAndAppearance}` : '',
    character.hairstyle ? `Hair: ${character.hairstyle}` : '',
    character.bodyDescription ? `Build: ${character.bodyDescription}` : '',
    character.clothing ? `Clothing: ${character.clothing}` : '',
    character.personality ? `Demeanor: ${character.personality}` : '',
    character.description ? `Notes: ${character.description}` : '',
  ].filter(Boolean);

  return `[Character Reference Lock — ${character.visualStyle}] ${parts.join('; ')}. Preserve facial structure, hairstyle, and outfit across scenes (reference-image conditioning attached when supported).`;
}

export function divideDurationIntoScenes(
  totalDuration: TotalVideoDuration,
  basePrompt: string,
  maxClipSeconds = 6,
  existingScenes?: ScenePlanItem[]
): ScenePlanItem[] {
  const safeMax = Math.max(4, Math.min(6, maxClipSeconds));
  const sceneCount = Math.ceil(totalDuration / safeMax);
  const baseDur = Math.floor(totalDuration / sceneCount);
  let remainder = totalDuration % sceneCount;

  const trimmedPrompt = basePrompt.trim();
  const beatLabels = [
    'Opening Hook',
    'Setting & Motion',
    'Character Focus',
    'Escalation Beat',
    'Mid-Arc Turn',
    'Detail Cutaway',
    'Action Peak',
    'Reaction Beat',
    'Closing Movement',
    'Final Resolution',
    'Epilogue Frame',
    'Outro Hold',
  ];

  const scenes: ScenePlanItem[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    const duration = baseDur + extra;
    const prev = existingScenes?.[i];

    scenes.push({
      id: prev?.id ?? generateId('scplan'),
      sceneNumber: i + 1,
      title: prev?.title || beatLabels[i] || `Scene ${i + 1}`,
      prompt:
        prev?.prompt ||
        (trimmedPrompt
          ? `Part ${i + 1} of ${sceneCount}: ${trimmedPrompt}`
          : `Describe visual action for scene ${i + 1}...`),
      durationSeconds: duration,
    });
  }

  return scenes;
}

export interface ComposePromptInput {
  prompt: string;
  storyPrompt?: string;
  visualStyle: VisualStyle;
  customStyleNote?: string;
  story?: Story;
  episode?: Episode;
  scene?: Scene;
  characters: Character[];
  scenesPlan?: ScenePlanItem[];
}

export function composeFullGenerationPrompt(input: ComposePromptInput): string {
  const sections: string[] = [];

  const styleLine =
    input.visualStyle === 'Custom Style' && input.customStyleNote?.trim()
      ? `Custom Style: ${input.customStyleNote.trim()}`
      : STYLE_DIRECTIVES[input.visualStyle];

  sections.push(`Style: ${styleLine}.`);

  if (input.story) {
    sections.push(`Story World (${input.story.title}): ${input.story.description}`);
  }

  if (input.episode) {
    if (input.episode.previousEpisodeContext.trim()) {
      sections.push(`Previous Episode Continuity: ${input.episode.previousEpisodeContext.trim()}`);
    }
    sections.push(
      `Episode ${input.episode.episodeNumber} (${input.episode.title}): ${input.episode.description}`
    );
  }

  if (input.storyPrompt && input.storyPrompt.trim()) {
    sections.push(`Narrative Beat: ${input.storyPrompt.trim()}`);
  }

  if (input.characters.length > 0) {
    const blocks = input.characters.map(buildCharacterConsistencyBlock);
    sections.push(`Locked Characters:\n${blocks.join('\n')}`);
  }

  if (input.scene) {
    sections.push(
      `Episode Scene ${input.scene.sceneNumber} (${input.scene.title}): ${input.scene.actionDescription}${
        input.scene.cameraAndMood ? ` Camera & Mood: ${input.scene.cameraAndMood}` : ''
      }`
    );
  }

  if (input.prompt.trim()) {
    sections.push(`Primary Visual Prompt: ${input.prompt.trim()}`);
  }

  if (input.scenesPlan && input.scenesPlan.length > 0) {
    const totalSec = input.scenesPlan.reduce((sum, s) => sum + s.durationSeconds, 0);
    const breakdown = input.scenesPlan
      .map((s) => `Scene ${s.sceneNumber} (${s.durationSeconds}s — ${s.title}): ${s.prompt}`)
      .join('\n');
    sections.push(`FFmpeg Multi-Scene Timeline (${totalSec}s Total):\n${breakdown}`);
  }

  return sections.join('\n\n');
}

export function buildNextScenePrompt(params: {
  story: Story;
  episode: Episode;
  sceneNumber: number;
  sceneTitle: string;
  actionDescription: string;
  cameraAndMood: string;
  characters: Character[];
}): string {
  const prevScenes = params.episode.scenes
    .filter((s) => s.sceneNumber < params.sceneNumber)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  const lastScene = prevScenes.length > 0 ? prevScenes[prevScenes.length - 1] : undefined;

  const lines: string[] = [];
  lines.push(`Style: ${STYLE_DIRECTIVES[params.story.visualStyle]}.`);
  lines.push(`Story (${params.story.title}): ${params.story.description}`);

  if (params.episode.previousEpisodeContext.trim()) {
    lines.push(`Prior Episode Context: ${params.episode.previousEpisodeContext.trim()}`);
  }

  lines.push(
    `Episode ${params.episode.episodeNumber} — ${params.episode.title}: ${params.episode.description}`
  );

  if (lastScene) {
    lines.push(
      `Preceding Scene (Scene ${lastScene.sceneNumber} — ${lastScene.title}): ${lastScene.actionDescription}`
    );
  }

  if (params.characters.length > 0) {
    lines.push(
      `Locked Character Continuity:\n${params.characters.map(buildCharacterConsistencyBlock).join('\n')}`
    );
  }

  lines.push(
    `Current Scene ${params.sceneNumber} (${params.sceneTitle || 'Next Scene'}): ${
      params.actionDescription || '[Describe the immediate visual action and subject movement]'
    }`
  );

  if (params.cameraAndMood.trim()) {
    lines.push(`Camera & Mood: ${params.cameraAndMood.trim()}`);
  }

  return lines.join('\n\n');
}
