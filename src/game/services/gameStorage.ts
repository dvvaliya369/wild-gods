export type GuardianId = 'moon-stag' | 'ember-boar' | 'tide-serpent';

export type GameSave = {
  guardians: Record<GuardianId, boolean>;
  activatedShrines: string[];
  destroyedAnchors: string[];
  completed: boolean;
  muted: boolean;
  tutorialComplete: boolean;
};

const STORAGE_KEY = 'wild-gods-save-v1';

const createDefaultSave = (): GameSave => ({
  guardians: {
    'moon-stag': false,
    'ember-boar': false,
    'tide-serpent': false,
  },
  activatedShrines: [],
  destroyedAnchors: [],
  completed: false,
  muted: false,
  tutorialComplete: false,
});

export const loadGameSave = (): GameSave => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return createDefaultSave();

    const stored = JSON.parse(value) as Partial<GameSave>;
    return {
      guardians: {
        'moon-stag': Boolean(stored.guardians?.['moon-stag']),
        'ember-boar': Boolean(stored.guardians?.['ember-boar']),
        'tide-serpent': Boolean(stored.guardians?.['tide-serpent']),
      },
      activatedShrines: Array.isArray(stored.activatedShrines)
        ? stored.activatedShrines.filter((id): id is string => typeof id === 'string')
        : [],
      destroyedAnchors: Array.isArray(stored.destroyedAnchors)
        ? stored.destroyedAnchors.filter((id): id is string => typeof id === 'string')
        : [],
      completed: Boolean(stored.completed),
      muted: Boolean(stored.muted),
      tutorialComplete: Boolean(stored.tutorialComplete),
    };
  } catch {
    return createDefaultSave();
  }
};

export const saveGame = (save: GameSave): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Progress saving is optional when browser storage is blocked.
  }
};

export const clearGameSave = (): GameSave => {
  const save = createDefaultSave();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The new journey still starts even if storage is unavailable.
  }
  return save;
};

export const hasSavedProgress = (save: GameSave): boolean => (
  Object.values(save.guardians).some(Boolean)
  || save.activatedShrines.length > 0
  || save.destroyedAnchors.length > 0
  || save.tutorialComplete
  || save.completed
);
