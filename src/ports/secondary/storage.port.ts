import type { ThemePreference } from '@domain/preferences/preferences';

export interface StoragePort {
  loadPreferences(): Promise<ThemePreference>;
  savePreferences(preference: ThemePreference): Promise<void>;
  onPreferencesChanged(callback: (preference: ThemePreference) => void): () => void;
}
