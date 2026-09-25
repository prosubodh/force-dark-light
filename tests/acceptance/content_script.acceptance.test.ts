import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ContentScriptCoordinator,
  parseColorLuminance,
  isPageAlreadyDark,
} from '../../src/entrypoints/content/coordinator';
import { MemoryStorageAdapter } from '../../src/adapters/secondary/memory-storage.adapter';
import { DomStyleInjectorAdapter } from '../../src/adapters/secondary/dom-style-injector.adapter';
import { createDefaultPreference, setDomainOverride } from '../../src/domain/preferences/preferences';

describe('US-04: Content Script Coordinator (Acceptance)', () => {
  let storage: MemoryStorageAdapter;
  let appliedStyles: string[];
  let injector: DomStyleInjectorAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    appliedStyles = [];
    injector = {
      applyTheme: (css: string) => {
        appliedStyles.push(css);
      },
      removeTheme: () => {
        appliedStyles = [];
      },
      isThemeApplied: () => appliedStyles.length > 0,
    } as unknown as DomStyleInjectorAdapter;
  });

  it('should initialize and apply dark theme when domain override is dark', async () => {
    const pref = setDomainOverride(createDefaultPreference(), 'github.com', 'dark');
    await storage.savePreferences(pref);

    const coordinator = new ContentScriptCoordinator({
      storage,
      injector,
      currentUrl: 'https://github.com/explore',
      systemPrefersDark: false,
    });

    await coordinator.init();

    expect(coordinator.getCurrentMode()).toBe('dark');
    expect(appliedStyles.length).toBe(1);
    expect(appliedStyles[0]).toContain('filter: invert(1)');
  });

  it('should reactively update theme when storage preferences change', async () => {
    const coordinator = new ContentScriptCoordinator({
      storage,
      injector,
      currentUrl: 'https://github.com/explore',
      systemPrefersDark: false,
    });

    await coordinator.init();
    expect(coordinator.getCurrentMode()).toBe('light');

    const updated = setDomainOverride(createDefaultPreference(), 'github.com', 'dark');
    await storage.savePreferences(updated);

    expect(coordinator.getCurrentMode()).toBe('dark');
    expect(appliedStyles[appliedStyles.length - 1]).toContain('filter: invert(1)');
  });

  it('should toggle theme on toggle-theme message', async () => {
    const coordinator = new ContentScriptCoordinator({
      storage,
      injector,
      currentUrl: 'https://example.com',
      systemPrefersDark: false,
    });

    await coordinator.init();
    expect(coordinator.getCurrentMode()).toBe('light');

    const nextMode = await coordinator.toggleTheme();
    expect(nextMode).toBe('dark');
    expect(coordinator.getCurrentMode()).toBe('dark');

    const sendResponse = vi.fn();
    const handled = coordinator.handleMessage({ action: 'get-status' }, sendResponse);
    expect(handled).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ mode: 'dark' });
  });

  it('should handle toggle-theme with explicit mode, apply-theme, and unknown actions', async () => {
    const coordinator = new ContentScriptCoordinator({
      storage,
      injector,
      currentUrl: 'https://example.com',
      systemPrefersDark: false,
    });

    await coordinator.init();

    // toggle-theme with explicit mode
    const sendResp1 = vi.fn();
    const handled1 = coordinator.handleMessage({ action: 'toggle-theme', mode: 'dark' }, sendResp1);
    expect(handled1).toBe(true);
    await vi.waitFor(() => {
      expect(sendResp1).toHaveBeenCalledWith({ success: true, mode: 'light' });
    });

    // toggle-theme without explicit mode
    const sendResp2 = vi.fn();
    const handled2 = coordinator.handleMessage({ action: 'toggle-theme' }, sendResp2);
    expect(handled2).toBe(true);
    await vi.waitFor(() => {
      expect(sendResp2).toHaveBeenCalledWith({ success: true, mode: 'dark' });
    });

    // apply-theme action
    const sendResp3 = vi.fn();
    const handled3 = coordinator.handleMessage({ action: 'apply-theme' }, sendResp3);
    expect(handled3).toBe(true);
    await vi.waitFor(() => {
      expect(sendResp3).toHaveBeenCalledWith({ success: true, mode: 'dark' });
    });

    // unknown action
    const sendResp4 = vi.fn();
    const handled4 = coordinator.handleMessage({ action: 'non-existent' }, sendResp4);
    expect(handled4).toBe(false);
    expect(sendResp4).not.toHaveBeenCalled();

    coordinator.destroy();
  });

  it('should handle reset-theme action by completely removing themes and cleaning up', async () => {
    const coordinator = new ContentScriptCoordinator({
      storage,
      injector,
      currentUrl: 'https://example.com',
      systemPrefersDark: false,
    });

    await coordinator.init();

    const sendResp = vi.fn();
    const handled = coordinator.handleMessage({ action: 'reset-theme' }, sendResp);
    expect(handled).toBe(true);
    expect(sendResp).toHaveBeenCalledWith({ success: true, mode: 'disabled' });
    expect(coordinator.getCurrentMode()).toBe('disabled');
    expect(appliedStyles).toEqual([]);

    coordinator.destroy();
  });

  it('should preserve native dark theme on already dark pages when dark is selected, and invert to light when light is selected', async () => {
    // Mock document with html[dark="true"]
    const mockRoot = {
      hasAttribute: (attr: string) => attr === 'dark',
      getAttribute: () => null,
      classList: { contains: () => false },
    } as unknown as HTMLElement;

    const mockDoc = {
      documentElement: mockRoot,
      body: {
        getAttribute: () => null,
        classList: { contains: () => false },
      } as unknown as HTMLElement,
      head: {} as HTMLElement,
      readyState: 'complete',
      addEventListener: vi.fn(),
    } as unknown as Document;

    // Save dark domain override
    const prefDark = setDomainOverride(createDefaultPreference(), 'youtube.com', 'dark');
    await storage.savePreferences(prefDark);

    const coordinator = new ContentScriptCoordinator({
      storage,
      injector,
      currentUrl: 'https://youtube.com/watch?v=123',
      systemPrefersDark: true,
      doc: mockDoc,
    });

    await coordinator.init();

    // Because YouTube is already dark, selecting dark should NOT apply invert CSS!
    expect(coordinator.getCurrentMode()).toBe('dark');
    expect(appliedStyles).toEqual([]);

    // Now switch domain override to light
    const prefLight = setDomainOverride(createDefaultPreference(), 'youtube.com', 'light');
    await storage.savePreferences(prefLight);

    // Because YouTube is already dark, selecting light SHOULD apply invert-to-light CSS!
    expect(coordinator.getCurrentMode()).toBe('light');
    expect(appliedStyles.length).toBeGreaterThan(0);
    expect(appliedStyles[appliedStyles.length - 1]).toContain('filter: invert(1) hue-rotate(180deg) !important;');
    expect(appliedStyles[appliedStyles.length - 1]).toContain('body {');
    expect(appliedStyles[appliedStyles.length - 1]).toContain('background-color: #000000 !important;');

    coordinator.destroy();
  });

  it('should test luminance parsing and detection helper functions', () => {
    expect(parseColorLuminance('')).toBeNull();
    expect(parseColorLuminance('transparent')).toBeNull();
    expect(parseColorLuminance('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseColorLuminance('rgb(255, 255, 255)')).toBeCloseTo(255);
    expect(parseColorLuminance('rgb(0, 0, 0)')).toBeCloseTo(0);
    expect(parseColorLuminance('rgb(15, 15, 15)')).toBeLessThan(128);
    expect(parseColorLuminance('#000000')).toBeCloseTo(0);
    expect(parseColorLuminance('#ffffff')).toBeCloseTo(255);
    expect(parseColorLuminance('invalid-color')).toBeNull();

    expect(isPageAlreadyDark(undefined)).toBe(false);

    const docNoRoot = {} as Document;
    expect(isPageAlreadyDark(docNoRoot)).toBe(false);

    // test data-theme="dark"
    const docDataTheme = {
      documentElement: {
        hasAttribute: () => false,
        getAttribute: (attr: string) => attr === 'data-theme' ? 'dark' : null,
        classList: { contains: () => false },
      },
    } as unknown as Document;
    expect(isPageAlreadyDark(docDataTheme)).toBe(true);

    // test classList dark on body
    const docBodyClass = {
      documentElement: {
        hasAttribute: () => false,
        getAttribute: () => null,
        classList: { contains: () => false },
      },
      body: {
        getAttribute: () => null,
        classList: { contains: (cls: string) => cls === 'dark' },
      },
    } as unknown as Document;
    expect(isPageAlreadyDark(docBodyClass)).toBe(true);
  });
});
