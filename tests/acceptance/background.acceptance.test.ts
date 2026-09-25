import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundCoordinator } from '../../src/entrypoints/background/coordinator';
import { MemoryStorageAdapter } from '../../src/adapters/secondary/memory-storage.adapter';
import { setDomainOverride, createDefaultPreference } from '../../src/domain/preferences/preferences';

describe('US-06: Background Service Worker & Shortcut (Acceptance)', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  it('should toggle active tab theme from light to dark on toggle-theme command', async () => {
    const sendTabMessage = vi.fn();
    const coordinator = new BackgroundCoordinator({
      storage,
      getActiveTab: async () => ({ id: 101, url: 'https://news.ycombinator.com' }),
      sendTabMessage,
      systemPrefersDark: false,
    });

    const nextMode = await coordinator.handleToggleCommand();
    expect(nextMode).toBe('dark');

    const prefs = await storage.loadPreferences();
    expect(prefs.domainOverrides['news.ycombinator.com']?.mode).toBe('dark');
    expect(sendTabMessage).toHaveBeenCalledWith(101, { action: 'toggle-theme', mode: 'dark' });
  });

  it('should toggle active tab theme from dark to light on toggle-theme command', async () => {
    const pref = setDomainOverride(createDefaultPreference(), 'github.com', 'dark');
    await storage.savePreferences(pref);

    const sendTabMessage = vi.fn();
    const coordinator = new BackgroundCoordinator({
      storage,
      getActiveTab: async () => ({ id: 202, url: 'https://github.com/pulls' }),
      sendTabMessage,
      systemPrefersDark: false,
    });

    const nextMode = await coordinator.handleToggleCommand();
    expect(nextMode).toBe('light');

    const prefs = await storage.loadPreferences();
    expect(prefs.domainOverrides['github.com']?.mode).toBe('light');
    expect(sendTabMessage).toHaveBeenCalledWith(202, { action: 'toggle-theme', mode: 'light' });
  });

  it('should ignore toggle command if active tab has no URL or is restricted', async () => {
    const sendTabMessage = vi.fn();
    const coordinator = new BackgroundCoordinator({
      storage,
      getActiveTab: async () => ({ id: 303, url: 'chrome://extensions' }),
      sendTabMessage,
      systemPrefersDark: false,
    });

    const nextMode = await coordinator.handleToggleCommand();
    expect(nextMode).toBeUndefined();
    expect(sendTabMessage).not.toHaveBeenCalled();
  });
});
