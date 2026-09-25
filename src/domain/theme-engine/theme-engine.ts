export type ThemeMode = 'dark' | 'light' | 'system' | 'disabled';
export type SiteHost = string;

export const MEDIA_PRESERVATION_SELECTORS = 'img, video, canvas, picture, svg';

export function extractSiteHost(rawUrl: string): SiteHost {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

function buildDarkModeCss(customCss?: string): string {
  const baseRules = [
    'html {',
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '  background-color: #121212 !important;',
    '}',
    'body {',
    '  background-color: #ffffff !important;',
    '}',
    `${MEDIA_PRESERVATION_SELECTORS} {`,
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '}',
    'svg:not([role="img"]),',
    'svg[aria-hidden="true"],',
    'svg[class*="icon"],',
    'svg[class*="Icon"],',
    '[class*="icon"] svg,',
    '[class*="Icon"] svg,',
    'ytd-app svg,',
    'yt-icon svg {',
    '  filter: none !important;',
    '}',
    '[style*="background:url"],',
    '[style*="background-image:url"],',
    '[style*="background: url"],',
    '[style*="background-image: url"] {',
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '}',
  ].join('\n');

  if (customCss) {
    return `${baseRules}\n${customCss}`;
  }
  return baseRules;
}

export function buildInvertToLightCss(customCss?: string): string {
  const baseRules = [
    'html {',
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '  background-color: #ffffff !important;',
    '}',
    'body {',
    '  background-color: #000000 !important;',
    '}',
    `${MEDIA_PRESERVATION_SELECTORS} {`,
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '}',
    'svg:not([role="img"]),',
    'svg[aria-hidden="true"],',
    'svg[class*="icon"],',
    'svg[class*="Icon"],',
    '[class*="icon"] svg,',
    '[class*="Icon"] svg,',
    'ytd-app svg,',
    'yt-icon svg {',
    '  filter: none !important;',
    '}',
    '[style*="background:url"],',
    '[style*="background-image:url"],',
    '[style*="background: url"],',
    '[style*="background-image: url"] {',
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '}',
  ].join('\n');

  if (customCss) {
    return `${baseRules}\n${customCss}`;
  }
  return baseRules;
}

export function buildLightModeCss(customCss?: string): string {
  const baseRules = [
    'html {',
    '  filter: none !important;',
    '  background-color: #ffffff !important;',
    '}',
    'body {',
    '  background-color: #ffffff !important;',
    '}',
  ].join('\n');

  if (customCss) {
    return `${baseRules}\n${customCss}`;
  }
  return baseRules;
}

export function generateThemeCss(mode: ThemeMode, customCss?: string, isPageDark = false): string {
  if (mode === 'dark') {
    if (isPageDark) {
      return customCss ?? '';
    }
    return buildDarkModeCss(customCss);
  }

  if (mode === 'light') {
    if (isPageDark) {
      return buildInvertToLightCss(customCss);
    }
    return buildLightModeCss(customCss);
  }

  return '';
}
