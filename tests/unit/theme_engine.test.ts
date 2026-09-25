import { describe, it, expect } from 'vitest';
import {
  generateThemeCss,
  buildInvertToLightCss,
  extractSiteHost,
  MEDIA_PRESERVATION_SELECTORS,
} from '@domain/theme-engine/theme-engine';

describe('ThemeEngine Unit Tests', () => {
  describe('generateThemeCss', () => {
    it('should generate dark mode CSS with root invert and media un-invert', () => {
      const css = generateThemeCss('dark');
      expect(css).toContain('html {');
      expect(css).toContain('filter: invert(1) hue-rotate(180deg) !important;');
      expect(css).toContain('background-color: #121212 !important;');
      expect(css).toContain('body {');
      expect(css).toContain('background-color: #ffffff !important;');
      expect(css).toContain(`${MEDIA_PRESERVATION_SELECTORS} {`);
      expect(css).toContain('filter: invert(1) hue-rotate(180deg) !important;');
      expect(css).toContain('yt-icon svg');
      expect(css).toContain('[style*="background-image:url"]');
    });

    it('should append customCss when provided in dark mode', () => {
      const customCss = '.custom-banner { display: none !important; }';
      const css = generateThemeCss('dark', customCss);
      expect(css).toContain(customCss);
    });

    it('should generate light mode normalization CSS', () => {
      const css = generateThemeCss('light');
      expect(css).toContain('html {');
      expect(css).toContain('filter: none !important;');
      expect(css).toContain('background-color: #ffffff !important;');
    });

    it('should append customCss when provided in light mode', () => {
      const customCss = '.ad-box { visibility: hidden !important; }';
      const css = generateThemeCss('light', customCss);
      expect(css).toContain(customCss);
    });

    it('should return empty string or customCss when mode is dark and page is already dark', () => {
      expect(generateThemeCss('dark', undefined, true)).toBe('');
      const custom = '/* custom */';
      expect(generateThemeCss('dark', custom, true)).toBe(custom);
    });

    it('should generate invert-to-light CSS when mode is light and page is already dark', () => {
      const css = generateThemeCss('light', undefined, true);
      expect(css).toContain('html {');
      expect(css).toContain('filter: invert(1) hue-rotate(180deg) !important;');
      expect(css).toContain('body {');
      expect(css).toContain('background-color: #000000 !important;');

      const custom = '/* custom light */';
      const cssWithCustom = generateThemeCss('light', custom, true);
      expect(cssWithCustom).toContain(custom);
    });

    it('should generate standalone buildInvertToLightCss', () => {
      const css = buildInvertToLightCss();
      expect(css).toContain('body {');
      expect(css).toContain('background-color: #000000 !important;');
    });

    it('should return empty string when mode is disabled or system', () => {
      expect(generateThemeCss('disabled')).toBe('');
      expect(generateThemeCss('system')).toBe('');
    });
  });

  describe('extractSiteHost', () => {
    it('should extract hostname from standard https URL', () => {
      expect(extractSiteHost('https://developer.mozilla.org/en-US/docs/Web')).toBe('developer.mozilla.org');
    });

    it('should extract hostname from http URL with port and query', () => {
      expect(extractSiteHost('http://localhost:8080/dashboard?tab=1')).toBe('localhost');
    });

    it('should return unknown for invalid or empty URL', () => {
      expect(extractSiteHost('')).toBe('unknown');
      expect(extractSiteHost('not-a-valid-url')).toBe('unknown');
      expect(extractSiteHost('file:///home/user/document.html')).toBe('unknown');
    });
  });
});
