import type { StoragePort } from '@ports/secondary/storage.port';
import type { StyleInjectorPort } from '@ports/secondary/style-injector.port';
import { GetEffectiveThemeUseCase } from '@ports/primary/get-effective-theme.usecase';
import { SetThemeOverrideUseCase } from '@ports/primary/set-theme-override.usecase';
import { extractSiteHost, generateThemeCss, type ThemeMode } from '@domain/theme-engine/theme-engine';

export interface CoordinatorOptions {
  readonly storage: StoragePort;
  readonly injector: StyleInjectorPort;
  readonly currentUrl: string;
  readonly systemPrefersDark: boolean;
  readonly doc?: Document;
}

export function parseColorLuminance(color: string): number | null {
  if (!color || color === 'transparent') {
    return null;
  }

  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbMatch && rgbMatch[1] !== undefined && rgbMatch[2] !== undefined && rgbMatch[3] !== undefined) {
    const alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (alpha === 0) {
      return null;
    }
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (hexMatch && hexMatch[1] !== undefined && hexMatch[2] !== undefined && hexMatch[3] !== undefined) {
    const r = parseInt(hexMatch[1], 16);
    const g = parseInt(hexMatch[2], 16);
    const b = parseInt(hexMatch[3], 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return null;
}

export function isPageAlreadyDark(doc?: Document): boolean {
  let documentRef: Document | undefined = doc;
  if (!documentRef && typeof document !== 'undefined') {
    documentRef = document;
  }
  if (!documentRef) {
    return false;
  }

  const root = documentRef.documentElement;
  const body = documentRef.body;
  if (!root) {
    return false;
  }

  // 1. YouTube specific attribute
  if (root.hasAttribute('dark')) {
    return true;
  }

  // 2. Check HTML / Body attributes
  const darkAttrs = ['data-theme', 'data-color-mode', 'color-scheme', 'theme'];
  for (const attr of darkAttrs) {
    const rootVal = root.getAttribute(attr);
    if (rootVal === 'dark' || rootVal === 'true') {
      return true;
    }
    if (body) {
      const bodyVal = body.getAttribute(attr);
      if (bodyVal === 'dark' || bodyVal === 'true') {
        return true;
      }
    }
  }

  // 3. Check CSS class 'dark'
  if (root.classList?.contains('dark') || (body && body.classList?.contains('dark'))) {
    return true;
  }

  // 4. Computed background color luminance of body or root
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const targets = [body, root].filter((el): el is HTMLElement => Boolean(el));
    for (const el of targets) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      if (bg) {
        const luminance = parseColorLuminance(bg);
        if (luminance !== null) {
          return luminance < 128;
        }
      }
      if (style.colorScheme === 'dark') {
        return true;
      }
    }
  }

  return false;
}

export class ContentScriptCoordinator {
  private currentMode: ThemeMode = 'system';
  private unsubscribeStorage?: (() => void) | undefined;
  private observer?: MutationObserver | undefined;
  private isStyleExpected = false;
  private readonly getUseCase: GetEffectiveThemeUseCase;
  private readonly setOverrideUseCase: SetThemeOverrideUseCase;

  constructor(private readonly options: CoordinatorOptions) {
    this.getUseCase = new GetEffectiveThemeUseCase(this.options.storage);
    this.setOverrideUseCase = new SetThemeOverrideUseCase(this.options.storage);
  }

  async init(): Promise<void> {
    await this.applyEffectiveTheme();

    this.unsubscribeStorage = this.options.storage.onPreferencesChanged(async () => {
      await this.applyEffectiveTheme();
    });

    const doc = this.options.doc ?? (typeof document !== 'undefined' ? document : undefined);
    if (doc) {
      if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', () => {
          void this.applyEffectiveTheme();
        }, { once: true });
      }

      if (typeof MutationObserver !== 'undefined') {
        this.observer = new MutationObserver(() => {
          if (this.isStyleExpected && !this.options.injector.isThemeApplied()) {
            void this.applyEffectiveTheme();
          }
        });
        const target = doc.head ?? doc.documentElement;
        if (target) {
          this.observer.observe(target, { childList: true, subtree: false });
        }
      }
    }
  }

  getCurrentMode(): ThemeMode {
    return this.currentMode;
  }

  async toggleTheme(): Promise<ThemeMode> {
    const isDark = isPageAlreadyDark(this.options.doc);
    const currentlyDark = this.currentMode === 'dark' || (this.currentMode === 'system' && isDark);
    const nextMode: ThemeMode = currentlyDark ? 'light' : 'dark';
    const domain = extractSiteHost(this.getEffectiveUrl());

    await this.setOverrideUseCase.execute(domain, nextMode);
    await this.applyEffectiveTheme();
    return nextMode;
  }

  handleMessage(
    message: { action?: string; mode?: ThemeMode },
    sendResponse: (res: unknown) => void
  ): boolean {
    if (message.action === 'reset-theme') {
      this.isStyleExpected = false;
      this.options.injector.removeTheme();
      this.currentMode = 'disabled';
      sendResponse({ success: true, mode: 'disabled' });
      return true;
    }

    if (message.action === 'toggle-theme') {
      if (message.mode !== undefined) {
        void this.applyEffectiveTheme().then(() => {
          sendResponse({ success: true, mode: this.currentMode });
        });
      } else {
        void this.toggleTheme().then((mode) => {
          sendResponse({ success: true, mode });
        });
      }
      return true;
    }

    if (message.action === 'apply-theme') {
      void this.applyEffectiveTheme().then(() => {
        sendResponse({ success: true, mode: this.currentMode });
      });
      return true;
    }

    if (message.action === 'get-status') {
      sendResponse({ mode: this.currentMode });
      return true;
    }

    return false;
  }

  destroy(): void {
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
      this.unsubscribeStorage = undefined;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  private getEffectiveUrl(): string {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    return this.options.currentUrl;
  }

  private async applyEffectiveTheme(): Promise<void> {
    const activeUrl = this.getEffectiveUrl();
    const domain = extractSiteHost(activeUrl);
    const prefs = await this.options.storage.loadPreferences();
    const domainRule = prefs.domainOverrides[domain];

    const result = await this.getUseCase.execute(
      activeUrl,
      this.options.systemPrefersDark
    );

    this.currentMode = result.mode;

    // 1. If domain has no override and globalMode is 'system' or 'disabled', clean up completely
    if (!domainRule && (prefs.globalMode === 'system' || prefs.globalMode === 'disabled')) {
      this.isStyleExpected = false;
      this.options.injector.removeTheme();
      return;
    }

    // 2. If result mode is 'disabled', clean up
    if (result.mode === 'disabled') {
      this.isStyleExpected = false;
      this.options.injector.removeTheme();
      return;
    }

    // 3. Check if page is already natively dark
    const isDark = isPageAlreadyDark(this.options.doc);

    // If page already matches the requested mode natively:
    // - Dark requested on natively dark page -> crisp native dark, remove theme!
    // - Light requested on natively light page -> crisp native light, remove theme!
    if ((result.mode === 'dark' && isDark) || (result.mode === 'light' && !isDark)) {
      this.isStyleExpected = false;
      this.options.injector.removeTheme();
      return;
    }

    // 4. Otherwise generate inversion style
    const customCss = domainRule?.customCss;
    const css = generateThemeCss(result.mode, customCss, isDark);

    if (css.length > 0) {
      this.isStyleExpected = true;
      this.options.injector.applyTheme(css);
    } else {
      this.isStyleExpected = false;
      this.options.injector.removeTheme();
    }
  }
}
