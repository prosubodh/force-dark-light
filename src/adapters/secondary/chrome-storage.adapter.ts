import type { StoragePort } from '@ports/secondary/storage.port';
import {
  parseThemePreference,
  type ThemePreference,
} from '@domain/preferences/preferences';

export const STORAGE_KEY = 'forceDarkLightPreferences';

export class ChromeStorageAdapter implements StoragePort {
  async loadPreferences(): Promise<ThemePreference> {
    const raw = await this.readRaw();
    return parseThemePreference(raw);
  }

  async savePreferences(preference: ThemePreference): Promise<void> {
    const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
    if (!ch?.storage) {
      return;
    }

    try {
      if (ch.storage.sync) {
        await new Promise<void>((resolve, reject) => {
          ch.storage.sync.set({ [STORAGE_KEY]: preference }, () => {
            if (ch.runtime?.lastError) {
              reject(ch.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        return;
      }
    } catch {
      // Fallback to local storage below
    }

    if (ch.storage.local) {
      await new Promise<void>((resolve) => {
        ch.storage.local.set({ [STORAGE_KEY]: preference }, () => {
          resolve();
        });
      });
    }
  }

  onPreferencesChanged(callback: (preference: ThemePreference) => void): () => void {
    const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
    if (!ch?.storage?.onChanged) {
      return () => {};
    }

    const listener = (
      changes: Record<string, { newValue?: unknown }>,
      _areaName: string
    ) => {
      const change = changes[STORAGE_KEY];
      if (change && change.newValue !== undefined) {
        callback(parseThemePreference(change.newValue));
      }
    };

    ch.storage.onChanged.addListener(listener);

    return () => {
      ch.storage.onChanged.removeListener(listener);
    };
  }

  private async readRaw(): Promise<unknown> {
    const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
    if (!ch?.storage) {
      return undefined;
    }

    try {
      if (ch.storage.sync) {
        const syncResult = await new Promise<unknown>((resolve, reject) => {
          ch.storage.sync.get([STORAGE_KEY], (items) => {
            if (ch.runtime?.lastError) {
              reject(ch.runtime.lastError);
            } else {
              resolve(items?.[STORAGE_KEY]);
            }
          });
        });
        if (syncResult !== undefined) {
          return syncResult;
        }
      }
    } catch {
      // Fallback to local
    }

    if (ch.storage.local) {
      return new Promise<unknown>((resolve) => {
        ch.storage.local.get([STORAGE_KEY], (items) => {
          resolve(items?.[STORAGE_KEY]);
        });
      });
    }

    return undefined;
  }
}
