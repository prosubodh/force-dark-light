export interface StyleInjectorPort {
  applyTheme(css: string): void;
  removeTheme(): void;
  isThemeApplied(): boolean;
}
