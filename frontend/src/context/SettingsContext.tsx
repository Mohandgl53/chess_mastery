import React, { createContext, useContext, useState } from 'react';
import type { CoachMode } from '../types/coach';
import { sounds } from '../utils/soundEffects';

export interface UserSettings {
  coachMode: CoachMode;
  showCoordinates: boolean;
  showLegalDots: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'zugora_settings_v1';

const COACH_MODES: CoachMode[] = [
  'FULL_COACHING',
  'IMPORTANT_MISTAKES',
  'HINTS_ONLY',
  'POST_GAME_ONLY'
];

export const DEFAULT_SETTINGS: UserSettings = {
  coachMode: 'FULL_COACHING',
  showCoordinates: true,
  showLegalDots: true,
  soundEnabled: true
};

interface SettingsContextType {
  settings: UserSettings;
  saveSettings: (next: UserSettings) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      coachMode: COACH_MODES.includes(parsed.coachMode as CoachMode)
        ? (parsed.coachMode as CoachMode)
        : DEFAULT_SETTINGS.coachMode,
      showCoordinates:
        typeof parsed.showCoordinates === 'boolean'
          ? parsed.showCoordinates
          : DEFAULT_SETTINGS.showCoordinates,
      showLegalDots:
        typeof parsed.showLegalDots === 'boolean'
          ? parsed.showLegalDots
          : DEFAULT_SETTINGS.showLegalDots,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const loaded = loadSettings();
    sounds.setSoundEnabled(loaded.soundEnabled);
    return loaded;
  });

  const saveSettings = (next: UserSettings) => {
    const normalized: UserSettings = {
      coachMode: COACH_MODES.includes(next.coachMode) ? next.coachMode : DEFAULT_SETTINGS.coachMode,
      showCoordinates: Boolean(next.showCoordinates),
      showLegalDots: Boolean(next.showLegalDots),
      soundEnabled: Boolean(next.soundEnabled)
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage quota/private-mode failures; settings still apply this session.
    }
    sounds.setSoundEnabled(normalized.soundEnabled);
    setSettings(normalized);
  };

  const resetSettings = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    sounds.setSoundEnabled(DEFAULT_SETTINGS.soundEnabled);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
