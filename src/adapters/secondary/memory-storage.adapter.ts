import type { StoragePort } from '@ports/secondary/storage.port';
import {
  createDefaultPreference,
  type ThemePreference,
} from '@domain/preferences/preferences';

export class MemoryStorageAdapter implements StoragePort {
  private preference: ThemePreference;
  private readonly listeners: Set<(preference: ThemePreference) => void> = new Set();

  constructor(initialPreference?: ThemePreference) {
    this.preference = initialPreference ?? createDefaultPreference();
  }

  async loadPreferences(): Promise<ThemePreference> {
    return { ...this.preference };
  }

  async savePreferences(preference: ThemePreference): Promise<void> {
    this.preference = { ...preference };
    await Promise.all(Array.from(this.listeners).map((listener) => listener(this.preference)));
  }

  onPreferencesChanged(callback: (preference: ThemePreference) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
