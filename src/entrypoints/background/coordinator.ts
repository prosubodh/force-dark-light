import type { StoragePort } from '@ports/secondary/storage.port';
import { GetEffectiveThemeUseCase } from '@ports/primary/get-effective-theme.usecase';
import { SetThemeOverrideUseCase } from '@ports/primary/set-theme-override.usecase';
import { extractSiteHost, type ThemeMode } from '@domain/theme-engine/theme-engine';

export interface ActiveTabInfo {
  readonly id?: number | undefined;
  readonly url?: string | undefined;
}

export interface BackgroundCoordinatorOptions {
  readonly storage: StoragePort;
  readonly getActiveTab: () => Promise<ActiveTabInfo | undefined>;
  readonly sendTabMessage: (tabId: number, message: unknown) => Promise<void> | void;
  readonly systemPrefersDark: boolean;
  readonly setBadge?: (tabId: number, text: string) => Promise<void> | void;
}

export class BackgroundCoordinator {
  private readonly getUseCase: GetEffectiveThemeUseCase;
  private readonly setOverrideUseCase: SetThemeOverrideUseCase;

  constructor(private readonly options: BackgroundCoordinatorOptions) {
    this.getUseCase = new GetEffectiveThemeUseCase(this.options.storage);
    this.setOverrideUseCase = new SetThemeOverrideUseCase(this.options.storage);
  }

  async handleToggleCommand(): Promise<ThemeMode | undefined> {
    const tab = await this.options.getActiveTab();
    if (!tab?.url) {
      return undefined;
    }

    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    ) {
      return undefined;
    }

    const domain = extractSiteHost(tab.url);
    if (domain === 'unknown') {
      return undefined;
    }

    const current = await this.getUseCase.execute(tab.url, this.options.systemPrefersDark);
    const nextMode: ThemeMode = current.mode === 'dark' ? 'light' : 'dark';

    await this.setOverrideUseCase.execute(domain, nextMode);

    if (tab.id !== undefined) {
      await this.options.sendTabMessage(tab.id, { action: 'toggle-theme', mode: nextMode });

      if (this.options.setBadge) {
        await this.options.setBadge(tab.id, nextMode === 'dark' ? 'DARK' : 'LGT');
      }
    }

    return nextMode;
  }
}
