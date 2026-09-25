import type { StoragePort } from '@ports/secondary/storage.port';
import {
  setDomainOverride,
  removeDomainOverride,
  type ThemePreference,
} from '@domain/preferences/preferences';
import type { ThemeMode } from '@domain/theme-engine/theme-engine';

export class SetThemeOverrideUseCase {
  constructor(private readonly storagePort: StoragePort) {}

  async execute(domain: string, mode: ThemeMode | null, customCss?: string): Promise<ThemePreference> {
    const current = await this.storagePort.loadPreferences();

    const updated = mode === null
      ? removeDomainOverride(current, domain)
      : setDomainOverride(current, domain, mode, customCss);

    await this.storagePort.savePreferences(updated);
    return updated;
  }
}
