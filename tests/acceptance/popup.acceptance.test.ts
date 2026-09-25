import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PopupController, type PopupViewElements } from '../../src/entrypoints/popup/popup-controller';
import { MemoryStorageAdapter } from '../../src/adapters/secondary/memory-storage.adapter';
import { createDefaultPreference, setDomainOverride } from '../../src/domain/preferences/preferences';

describe('US-05: Popup UI & Active Tab Controls (Acceptance)', () => {
  let storage: MemoryStorageAdapter;
  let elements: PopupViewElements;
  let activeTabUrl: string;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    activeTabUrl = 'https://github.com/trending';

    elements = {
      siteHostEl: { textContent: '' } as HTMLElement,
      currentModeBadge: { textContent: '', className: '' } as HTMLElement,
      btnDark: { addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } } as unknown as HTMLButtonElement,
      btnLight: { addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } } as unknown as HTMLButtonElement,
      btnReset: { addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } } as unknown as HTMLButtonElement,
      globalModeSelect: { value: 'system', addEventListener: vi.fn() } as unknown as HTMLSelectElement,
    };
  });

  it('should initialize and display active site domain and effective mode', async () => {
    const controller = new PopupController({
      storage,
      getActiveTabUrl: async () => activeTabUrl,
      systemPrefersDark: false,
    });

    await controller.init(elements);

    expect(elements.siteHostEl.textContent).toBe('github.com');
    expect(elements.currentModeBadge.textContent).toBe('LIGHT');
  });

  it('should set domain override to dark when user clicks dark button', async () => {
    const sendTabMessage = vi.fn();
    const controller = new PopupController({
      storage,
      getActiveTabUrl: async () => activeTabUrl,
      systemPrefersDark: false,
      sendTabMessage,
    });

    await controller.init(elements);
    await controller.handleSetDomainMode('dark');

    const prefs = await storage.loadPreferences();
    expect(prefs.domainOverrides['github.com']?.mode).toBe('dark');
    expect(elements.currentModeBadge.textContent).toBe('DARK');
    expect(sendTabMessage).toHaveBeenCalledWith({ action: 'toggle-theme', mode: 'dark' });
  });

  it('should reset domain override when user clicks reset button', async () => {
    const pref = setDomainOverride(createDefaultPreference(), 'github.com', 'dark');
    await storage.savePreferences(pref);

    const controller = new PopupController({
      storage,
      getActiveTabUrl: async () => activeTabUrl,
      systemPrefersDark: false,
    });

    await controller.init(elements);
    expect(elements.currentModeBadge.textContent).toBe('DARK');

    await controller.handleResetDomain();

    const prefs = await storage.loadPreferences();
    expect(prefs.domainOverrides['github.com']).toBeUndefined();
    expect(elements.currentModeBadge.textContent).toBe('LIGHT');
  });

  it('should change global mode when user selects a different global setting', async () => {
    const controller = new PopupController({
      storage,
      getActiveTabUrl: async () => 'https://unoverridden.com',
      systemPrefersDark: false,
    });

    await controller.init(elements);
    await controller.handleSetGlobalMode('dark');

    const prefs = await storage.loadPreferences();
    expect(prefs.globalMode).toBe('dark');
    expect(elements.currentModeBadge.textContent).toBe('DARK');
  });

  it('should disable controls and display restricted page indicator on internal browser pages', async () => {
    const controller = new PopupController({
      storage,
      getActiveTabUrl: async () => 'chrome://extensions',
      systemPrefersDark: false,
    });

    await controller.init(elements);

    expect(elements.siteHostEl.textContent).toBe('Restricted browser page');
    expect(elements.currentModeBadge.textContent).toBe('RESTRICTED');
    expect(elements.btnDark.disabled).toBe(true);
    expect(elements.btnLight.disabled).toBe(true);
    expect(elements.btnReset.disabled).toBe(true);
  });
});
