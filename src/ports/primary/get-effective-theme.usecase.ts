import type { StoragePort } from '@ports/secondary/storage.port';
import { resolveEffectiveTheme } from '@domain/preferences/preferences';
import { generateThemeCss, extractSiteHost, type ThemeMode } from '@domain/theme-engine/theme-engine';

export interface EffectiveThemeResult {
  readonly domain: string;
  readonly mode: ThemeMode;
  readonly customCss?: string;
  readonly css: string;
}

export class GetEffectiveThemeUseCase {
  constructor(private readonly storagePort: StoragePort) {}

  async execute(url: string, systemPrefersDark: boolean): Promise<EffectiveThemeResult> {
    const preference = await this.storagePort.loadPreferences();
    const domain = extractSiteHost(url);
    const domainRule = preference.domainOverrides[domain];

    const mode = resolveEffectiveTheme(preference, url, systemPrefersDark);
    const customCss = domainRule?.customCss;
    const css = generateThemeCss(mode, customCss);

    return {
      domain,
      mode,
      ...(customCss !== undefined ? { customCss } : {}),
      css,
    };
  }
}
