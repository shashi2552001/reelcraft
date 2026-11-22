import type {
  Character,
  GenerationJob,
  Project,
  PromptItem,
  Story,
  StudioSettings,
} from '../../types/studio';

export interface StudioSnapshot {
  projects: Project[];
  stories: Story[];
  characters: Character[];
  prompts: PromptItem[];
  generationJobs: GenerationJob[];
  settings: StudioSettings;
}

export interface StudioDataRepository {
  loadSnapshot(): StudioSnapshot;
  saveSnapshot(snapshot: StudioSnapshot): void;
  resetToStarterDrafts(): StudioSnapshot;
  clearAllLocalData(): StudioSnapshot;
  exportBackupJson(snapshot: StudioSnapshot): string;
  importBackupJson(rawJson: string): StudioSnapshot;
}

const STORAGE_KEY = 'reelcraft_studio_local_v2';

export const DEFAULT_SETTINGS: StudioSettings = {
  studioName: 'ReelCraft Studio',
  defaultStyle: '3D Indian Anime',
  defaultAspectRatio: '9:16',
  defaultModelId: 'wan-2.2-ti2v-5b',
  backendBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  storageModeLabel: 'localStorage',
};

export function createStarterDraftSnapshot(): StudioSnapshot {
  const now = '2026-11-20T10:00:00.000Z';

  const starterProjects: Project[] = [
    {
      id: 'proj_neon_courier',
      title: 'Midnight Courier — Vertical Reels',
      description:
        'Serialized 30–60s 9:16 3D anime shorts following Kaito across rain-slicked viaducts.',
      targetStyle: '3D Indian Anime',
      aspectRatio: '9:16',
      createdAt: '2026-11-18T14:20:00.000Z',
      updatedAt: '2026-11-20T09:15:00.000Z',
    },
    {
      id: 'proj_archive_film',
      title: 'The Quiet Archive — Short Film',
      description: 'Atmospheric 16:9 cinematic drama set in a coastal stone library.',
      targetStyle: 'Cinematic',
      aspectRatio: '16:9',
      createdAt: '2026-11-19T11:00:00.000Z',
      updatedAt: '2026-11-20T10:00:00.000Z',
    },
  ];

  const starterCharacters: Character[] = [
    {
      id: 'char_kaito',
      name: 'Kaito Mori',
      description: 'Lead bike courier navigating high-altitude metro bridges with calm precision.',
      faceAndAppearance: 'Lean angular jawline, sharp amber eyes, light scar above left eyebrow',
      hairstyle: 'Dark messy undercut swept slightly to the right',
      clothing:
        'Weathered charcoal technical field jacket with brass zippers, black hoodie, fingerless gloves, messenger satchel',
      ageAppearance: 'Early twenties (21)',
      bodyDescription: 'Athletic lean build, medium height (5 ft 9 in), upright poised stance',
      personality: 'Quietly observant, dependable under pressure, focused and protective',
      referenceImageUrl: '/src/assets/images/char_kaito_anime_1795361737934.jpg',
      referenceImageName: 'kaito_reference_sheet.jpg',
      visualStyle: '3D Indian Anime',
      associatedStoryIds: ['story_courier_arc'],
      createdAt: '2026-11-18T14:30:00.000Z',
      updatedAt: '2026-11-20T09:00:00.000Z',
    },
    {
      id: 'char_elena',
      name: 'Elena Vance',
      description: 'Chief restoration archivist uncovering missing 1970s reel canisters.',
      faceAndAppearance:
        'Warm olive complexion, dark expressive eyes, calm composed expression, subtle natural freckles',
      hairstyle: 'Long dark box braids parted cleanly and resting over shoulders',
      clothing: 'Heavy olive herringbone wool coat over a fine charcoal knit turtleneck',
      ageAppearance: 'Late twenties (28)',
      bodyDescription: 'Slender average height, graceful deliberate hand movements',
      personality: 'Methodical, curious, patient, quietly determined',
      referenceImageUrl: '/src/assets/images/char_elena_cinematic_1795361738204.jpg',
      referenceImageName: 'elena_35mm_portrait.jpg',
      visualStyle: 'Cinematic',
      associatedStoryIds: ['story_archive_mystery'],
      createdAt: '2026-11-19T11:10:00.000Z',
      updatedAt: '2026-11-20T09:40:00.000Z',
    },
  ];

  const starterStories: Story[] = [
    {
      id: 'story_courier_arc',
      projectId: 'proj_neon_courier',
      title: 'Midnight Courier',
      description:
        'An episodic 9:16 animated thriller where Kaito delivers encrypted optical cartridges across rain-slicked rail viaducts before dawn.',
      visualStyle: '3D Indian Anime',
      defaultAspectRatio: '9:16',
      characterIds: ['char_kaito'],
      createdAt: '2026-11-18T14:35:00.000Z',
      updatedAt: '2026-11-20T09:15:00.000Z',
      episodes: [
        {
          id: 'ep_courier_1',
          storyId: 'story_courier_arc',
          episodeNumber: 1,
          title: 'Platform Seven Departure',
          description:
            'Kaito receives the brass-sealed parcel at an abandoned elevated station as storm clouds gather.',
          continuitySummary:
            'Kaito secured the brass optical cartridge inside his left satchel pocket and boarded the northbound freight tram before curfew.',
          previousEpisodeContext: '',
          createdAt: '2026-11-18T15:00:00.000Z',
          updatedAt: '2026-11-19T16:00:00.000Z',
          scenes: [
            {
              id: 'scene_courier_1_1',
              episodeId: 'ep_courier_1',
              sceneNumber: 1,
              title: 'Rain Over Platform Seven',
              actionDescription:
                'Kaito stands under a flickering sodium station lamp, checking the brass clasp of his messenger satchel as rain streaks past the steel canopy.',
              cameraAndMood:
                'Slow vertical dolly-in, low-angle 9:16 framing, cool slate mist with warm sodium highlights.',
              characterIds: ['char_kaito'],
              compiledPrompt:
                '3D anime film rendering, Kaito Mori standing under rain-soaked station canopy checking messenger satchel, low-angle vertical 9:16 dolly shot.',
              negativePrompt:
                'blurry face, extra fingers, deformed limbs, flickering clothing, watermark, text overlay',
              durationSeconds: 6,
              aspectRatio: '9:16',
              visualStyle: '3D Indian Anime',
              createdAt: '2026-11-18T15:10:00.000Z',
              updatedAt: '2026-11-18T15:10:00.000Z',
            },
          ],
        },
        {
          id: 'ep_courier_2',
          storyId: 'story_courier_arc',
          episodeNumber: 2,
          title: 'Viaduct Crossing',
          description:
            'Riding atop the freight carriage as searchlights sweep across the river gorge.',
          continuitySummary: 'Kaito reaches the north relay tower with the cartridge intact.',
          previousEpisodeContext:
            'Kaito secured the brass optical cartridge inside his left satchel pocket and boarded the northbound freight tram before curfew.',
          createdAt: '2026-11-19T17:00:00.000Z',
          updatedAt: '2026-11-20T09:15:00.000Z',
          scenes: [
            {
              id: 'scene_courier_2_1',
              episodeId: 'ep_courier_2',
              sceneNumber: 1,
              title: 'Searchlight Sweep',
              actionDescription:
                'Kaito crouches behind an equipment crate on the moving freight roof, his charcoal jacket whipping in the crosswind as a distant beam sweeps over the steel truss.',
              cameraAndMood:
                'Dynamic tracking shot parallel to train motion, dramatic rim light, shallow depth of field.',
              characterIds: ['char_kaito'],
              compiledPrompt:
                '3D anime film rendering, Kaito Mori crouching on moving freight roof in wind and rain, dynamic parallel tracking shot, dramatic rim lighting.',
              negativePrompt:
                'warped train tracks, inconsistent jacket color, distorted anatomy, text overlay',
              durationSeconds: 6,
              aspectRatio: '9:16',
              visualStyle: '3D Indian Anime',
              createdAt: '2026-11-19T17:15:00.000Z',
              updatedAt: '2026-11-19T17:15:00.000Z',
            },
          ],
        },
      ],
    },
    {
      id: 'story_archive_mystery',
      projectId: 'proj_archive_film',
      title: 'The Quiet Archive',
      description:
        'A grounded 16:9 cinematic mystery following Elena Vance as she restores unlabeled 35mm reels in a winter coastal library.',
      visualStyle: 'Cinematic',
      defaultAspectRatio: '16:9',
      characterIds: ['char_elena'],
      createdAt: '2026-11-19T11:15:00.000Z',
      updatedAt: '2026-11-20T10:00:00.000Z',
      episodes: [
        {
          id: 'ep_archive_1',
          storyId: 'story_archive_mystery',
          episodeNumber: 1,
          title: 'Vault Four',
          description:
            'Elena unlocks the cedar storage room and inspects the first rusted film tin.',
          continuitySummary:
            'Elena logs reel #14 onto the inspection flatbed and notices a handwritten date from 1974.',
          previousEpisodeContext: '',
          createdAt: '2026-11-19T11:30:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
          scenes: [
            {
              id: 'scene_archive_1_1',
              episodeId: 'ep_archive_1',
              sceneNumber: 1,
              title: 'Dust in the Window Light',
              actionDescription:
                'Elena sets a dented aluminum film canister onto an oak inspection desk as cold afternoon coastal light cuts through tall library windows.',
              cameraAndMood:
                'Steady 35mm medium shot, soft dust motes in natural side light, subtle film grain.',
              characterIds: ['char_elena'],
              compiledPrompt:
                '35mm anamorphic cinema grade, Elena Vance placing film canister on oak desk in tall dusty archive room, soft coastal window light.',
              negativePrompt:
                'plastic skin, oversaturated neon, CGI gloss, modern LED screens, text watermark',
              durationSeconds: 6,
              aspectRatio: '16:9',
              visualStyle: 'Cinematic',
              createdAt: '2026-11-19T11:45:00.000Z',
              updatedAt: '2026-11-19T11:45:00.000Z',
            },
          ],
        },
      ],
    },
  ];

  const starterPrompts: PromptItem[] = [
    {
      id: 'prompt_indian_anime_bazaar',
      title: 'Monsoon Lantern Courtyard — 30s 3D Indian Anime Reel',
      prompt:
        'A young traveler walks beneath carved sandstone arches during a warm monsoon evening, brass lanterns reflecting on wet stone steps, gentle camera dolly forward.',
      storyPrompt: 'Opening 30-second vertical Reel introducing the courtyard setting',
      negativePrompt: 'blurry faces, extra limbs, distorted proportions, watermark, caption text',
      visualStyle: '3D Indian Anime',
      aspectRatio: '9:16',
      durationSeconds: 30,
      modelId: 'wan-2.2-ti2v-5b',
      storyId: 'story_courier_arc',
      characterIds: ['char_kaito'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prompt_archive_desk',
      title: '35mm Archive Flatbed Inspection — 45s Cinematic',
      prompt:
        'Close medium shot of hands threading 35mm celluloid film across brass rollers on a warm tungsten-lit editing table, crisp mechanical detail, shallow focus.',
      storyPrompt: 'Multi-scene atmospheric sequence for Episode 1',
      negativePrompt: 'plastic texture, shaky artifacts, modern UI overlays, lens flare spam',
      visualStyle: 'Cinematic',
      aspectRatio: '16:9',
      durationSeconds: 45,
      modelId: 'wan-2.2-i2v-a14b',
      storyId: 'story_archive_mystery',
      characterIds: ['char_elena'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prompt_storybook_bakery',
      title: 'Morning Cedar Bakery — 30s Cartoon Loop',
      prompt:
        'Warm hand-painted 2D animated street corner at sunrise, baker opening timber shutters as golden light spills across cobblestones, gentle breeze swaying hanging lanterns.',
      storyPrompt: 'Cozy multi-beat 30-second animated short',
      negativePrompt: 'photorealistic skin pores, harsh 3D polygons, jittering linework, watermark',
      visualStyle: 'Cartoon',
      aspectRatio: '1:1',
      durationSeconds: 30,
      modelId: 'ltx-video-0.9.7',
      characterIds: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    projects: starterProjects,
    stories: starterStories,
    characters: starterCharacters,
    prompts: starterPrompts,
    // Strictly empty: never seed fake generated videos or fake completed jobs
    generationJobs: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export class LocalStorageRepository implements StudioDataRepository {
  loadSnapshot(): StudioSnapshot {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const starter = createStarterDraftSnapshot();
        this.saveSnapshot(starter);
        return starter;
      }
      const parsed = JSON.parse(raw) as Partial<StudioSnapshot>;
      const fallback = createStarterDraftSnapshot();
      return {
        projects: Array.isArray(parsed.projects) ? parsed.projects : fallback.projects,
        stories: Array.isArray(parsed.stories) ? parsed.stories : fallback.stories,
        characters: Array.isArray(parsed.characters) ? parsed.characters : fallback.characters,
        prompts: Array.isArray(parsed.prompts) ? parsed.prompts : fallback.prompts,
        generationJobs: Array.isArray(parsed.generationJobs) ? parsed.generationJobs : [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings ?? {}),
          storageModeLabel: 'localStorage',
        },
      };
    } catch {
      return createStarterDraftSnapshot();
    }
  }

  saveSnapshot(snapshot: StudioSnapshot): void {
    try {
      const safeSnapshot: StudioSnapshot = {
        ...snapshot,
        settings: {
          ...snapshot.settings,
          storageModeLabel: 'localStorage',
        },
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSnapshot));
    } catch (err) {
      console.error('Failed to persist local studio drafts:', err);
    }
  }

  resetToStarterDrafts(): StudioSnapshot {
    const starter = createStarterDraftSnapshot();
    this.saveSnapshot(starter);
    return starter;
  }

  clearAllLocalData(): StudioSnapshot {
    const empty: StudioSnapshot = {
      projects: [],
      stories: [],
      characters: [],
      prompts: [],
      generationJobs: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    this.saveSnapshot(empty);
    return empty;
  }

  exportBackupJson(snapshot: StudioSnapshot): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        schemaVersion: '2.0.0',
        source: 'ReelCraft Studio Local Drafts',
        data: snapshot,
      },
      null,
      2
    );
  }

  importBackupJson(rawJson: string): StudioSnapshot {
    const parsed = JSON.parse(rawJson) as { data?: Partial<StudioSnapshot> };
    const data = parsed.data ?? (parsed as Partial<StudioSnapshot>);
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.stories)) {
      throw new Error('Invalid ReelCraft backup JSON structure.');
    }
    const sanitized: StudioSnapshot = {
      projects: data.projects,
      stories: data.stories,
      characters: Array.isArray(data.characters) ? data.characters : [],
      prompts: Array.isArray(data.prompts) ? data.prompts : [],
      generationJobs: Array.isArray(data.generationJobs) ? data.generationJobs : [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(data.settings ?? {}),
        storageModeLabel: 'localStorage',
      },
    };
    this.saveSnapshot(sanitized);
    return sanitized;
  }
}

export const localDataRepository: StudioDataRepository = new LocalStorageRepository();
