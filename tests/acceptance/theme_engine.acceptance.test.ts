import { describe, it, expect } from 'vitest';
import {
  generateThemeCss,
  extractSiteHost,
  type ThemeMode,
} from '../../src/domain/theme-engine/theme-engine';

describe('US-01: Smart CSS Theme Inversion Engine (Acceptance)', () => {
  it('should generate forced dark mode CSS with root inversion and media preservation', () => {
    const mode: ThemeMode = 'dark';
    const css = generateThemeCss(mode);

    expect(css).toContain('filter: invert(1) hue-rotate(180deg)');
    expect(css).toContain('html');
    expect(css).toContain('img, video, canvas, picture, svg');
  });

  it('should generate light mode reset CSS when mode is light', () => {
    const mode: ThemeMode = 'light';
    const css = generateThemeCss(mode);

    expect(css).toContain('filter: none');
    expect(css).toContain('background-color: #ffffff');
  });

  it('should return empty string when mode is disabled', () => {
    const mode: ThemeMode = 'disabled';
    const css = generateThemeCss(mode);

    expect(css).toBe('');
  });

  it('should normalize URLs into clean SiteHost hostnames', () => {
    expect(extractSiteHost('https://github.com/trending?since=daily#top')).toBe('github.com');
    expect(extractSiteHost('http://sub.domain.example.org:3000/app')).toBe('sub.domain.example.org');
    expect(extractSiteHost('invalid-url')).toBe('unknown');
  });
});
