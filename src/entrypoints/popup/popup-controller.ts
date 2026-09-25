import type { StoragePort } from '@ports/secondary/storage.port';
import { GetEffectiveThemeUseCase } from '@ports/primary/get-effective-theme.usecase';
import { SetThemeOverrideUseCase } from '@ports/primary/set-theme-override.usecase';
import { SetGlobalModeUseCase } from '@ports/primary/set-global-mode.usecase';
import { extractSiteHost, type ThemeMode } from '@domain/theme-engine/theme-engine';

export interface PopupViewElements {
  readonly siteHostEl: HTMLElement;
  readonly currentModeBadge: HTMLElement;
  readonly btnDark: HTMLButtonElement;
  readonly btnLight: HTMLButtonElement;
  readonly btnReset: HTMLButtonElement;
  readonly globalModeSelect: HTMLSelectElement;
}

export interface PopupControllerOptions {
  readonly storage: StoragePort;
  readonly getActiveTabUrl: () => Promise<string | undefined>;
  readonly systemPrefersDark: boolean;
  readonly sendTabMessage?: (message: unknown) => Promise<void> | void;
}

export class PopupController {
  private elements?: PopupViewElements;
  private currentUrl = '';
  private currentHost = '';
  private unsubscribeStorage?: (() => void) | undefined;

  private readonly getUseCase: GetEffectiveThemeUseCase;
  private readonly setOverrideUseCase: SetThemeOverrideUseCase;
  private readonly setGlobalUseCase: SetGlobalModeUseCase;

  constructor(private readonly options: PopupControllerOptions) {
    this.getUseCase = new GetEffectiveThemeUseCase(this.options.storage);
    this.setOverrideUseCase = new SetThemeOverrideUseCase(this.options.storage);
    this.setGlobalUseCase = new SetGlobalModeUseCase(this.options.storage);
  }

  async init(elements: PopupViewElements): Promise<void> {
    this.elements = elements;

    const url = await this.options.getActiveTabUrl();
    this.currentUrl = url ?? '';
    this.currentHost = this.currentUrl ? extractSiteHost(this.currentUrl) : 'unknown';

    this.bindEvents();
    await this.render();

    this.unsubscribeStorage = this.options.storage.onPreferencesChanged(async () => {
      await this.render();
    });
  }

  async handleSetDomainMode(mode: ThemeMode): Promise<void> {
    if (this.currentHost && this.currentHost !== 'unknown') {
      await this.setOverrideUseCase.execute(this.currentHost, mode);
      if (this.options.sendTabMessage) {
        await this.options.sendTabMessage({ action: 'toggle-theme', mode });
      }
      await this.render();
    }
  }

  async handleResetDomain(): Promise<void> {
    if (this.currentHost && this.currentHost !== 'unknown') {
      await this.setOverrideUseCase.execute(this.currentHost, null);
      if (this.options.sendTabMessage) {
        await this.options.sendTabMessage({ action: 'reset-theme', mode: 'disabled' });
      }
      await this.render();
    }
  }

  async handleSetGlobalMode(mode: ThemeMode): Promise<void> {
    await this.setGlobalUseCase.execute(mode);
    await this.render();
  }

  async render(): Promise<void> {
    if (!this.elements) {
      return;
    }

    const { siteHostEl, currentModeBadge, globalModeSelect, btnDark, btnLight, btnReset } = this.elements;

    const isRestricted = this.currentHost === 'unknown' ||
      this.currentUrl.startsWith('chrome://') ||
      this.currentUrl.startsWith('edge://') ||
      this.currentUrl.startsWith('about:') ||
      this.currentUrl.startsWith('chrome-extension://');

    if (isRestricted) {
      siteHostEl.textContent = this.currentUrl ? 'Restricted browser page' : 'No active tab';
      currentModeBadge.textContent = 'RESTRICTED';
      currentModeBadge.className = 'status-pill status-disabled';
      btnDark.disabled = true;
      btnLight.disabled = true;
      btnReset.disabled = true;
      return;
    }

    btnDark.disabled = false;
    btnLight.disabled = false;
    btnReset.disabled = false;

    siteHostEl.textContent = this.currentHost;

    const effective = await this.getUseCase.execute(
      this.currentUrl,
      this.options.systemPrefersDark
    );

    currentModeBadge.textContent = effective.mode.toUpperCase();
    currentModeBadge.className = `status-pill status-${effective.mode}`;

    const prefs = await this.options.storage.loadPreferences();
    if (globalModeSelect && globalModeSelect.value !== prefs.globalMode) {
      globalModeSelect.value = prefs.globalMode;
    }
  }

  destroy(): void {
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
      this.unsubscribeStorage = undefined;
    }
  }

  private bindEvents(): void {
    if (!this.elements) {
      return;
    }

    const { btnDark, btnLight, btnReset, globalModeSelect } = this.elements;

    btnDark.addEventListener('click', () => {
      void this.handleSetDomainMode('dark');
    });

    btnLight.addEventListener('click', () => {
      void this.handleSetDomainMode('light');
    });

    btnReset.addEventListener('click', () => {
      void this.handleResetDomain();
    });

    globalModeSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      void this.handleSetGlobalMode(target.value as ThemeMode);
    });
  }
}
