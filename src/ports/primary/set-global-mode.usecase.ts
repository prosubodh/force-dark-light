import type { StoragePort } from '@ports/secondary/storage.port';
import { setGlobalMode, type ThemePreference } from '@domain/preferences/preferences';
import type { ThemeMode } from '@domain/theme-engine/theme-engine';

export class SetGlobalModeUseCase {
  constructor(private readonly storagePort: StoragePort) {}

  async execute(mode: ThemeMode): Promise<ThemePreference> {
    const current = await this.storagePort.loadPreferences();
    const updated = setGlobalMode(current, mode);
    await this.storagePort.savePreferences(updated);
    return updated;
  }
}
