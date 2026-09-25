import type { StyleInjectorPort } from '@ports/secondary/style-injector.port';

export const INJECTED_STYLE_ID = 'force-dark-light-style';

export class DomStyleInjectorAdapter implements StyleInjectorPort {
  private readonly doc: Document | undefined;

  constructor(doc?: Document) {
    this.doc = doc;
  }

  applyTheme(css: string): void {
    if (!this.doc) {
      return;
    }

    let styleEl = this.doc.getElementById(INJECTED_STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = this.doc.createElement('style');
      styleEl.id = INJECTED_STYLE_ID;
      const target = this.doc.head ?? this.doc.documentElement;
      if (target) {
        target.appendChild(styleEl);
      }
    }

    styleEl.textContent = css;
  }

  removeTheme(): void {
    if (!this.doc) {
      return;
    }

    const styleEl = this.doc.getElementById(INJECTED_STYLE_ID);
    if (styleEl) {
      styleEl.remove();
    }
  }

  isThemeApplied(): boolean {
    if (!this.doc) {
      return false;
    }
    return this.doc.getElementById(INJECTED_STYLE_ID) !== null;
  }
}
