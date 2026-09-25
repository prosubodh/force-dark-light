import { describe, it, expect, vi, afterEach } from 'vitest';
import { initializeContentScript } from '../../src/entrypoints/content/index';
import {
  queryActiveTab,
  sendTabMessage,
  setActionBadge,
  initializeBackgroundWorker,
} from '../../src/entrypoints/background/index';
import {
  getActiveBrowserTabUrl,
  sendActiveBrowserTabMessage,
  initializePopup,
} from '../../src/entrypoints/popup/index';

describe('Content Script Entrypoint', () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;

  afterEach(() => {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  });

  it('should initialize content script coordinator and register listener if chrome.runtime.onMessage exists', () => {
    let messageListener: ((msg: unknown, sender: unknown, sendResp: (res: unknown) => void) => boolean) | undefined;
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((cb) => {
            messageListener = cb;
          }),
        },
      },
    };

    const coordinator = initializeContentScript('https://github.com', undefined, false);
    expect(coordinator).toBeDefined();
    expect(messageListener).toBeDefined();

    const sendResponse = vi.fn();
    const handled = messageListener!({ action: 'get-status' }, null, sendResponse);
    expect(handled).toBe(true);

    coordinator.destroy();
  });

  it('should handle undefined chrome safely in initializeContentScript', () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    const coordinator = initializeContentScript('https://example.com', undefined, true);
    expect(coordinator).toBeDefined();
    coordinator.destroy();
  });
});

describe('Background Worker Entrypoint', () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;

  afterEach(() => {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  });

  it('should query active tab via chrome.tabs.query', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      tabs: {
        query: (_q: unknown, cb: (tabs: Array<{ id: number; url: string }>) => void) => {
          cb([{ id: 7, url: 'https://example.com' }]);
        },
      },
    };

    const tab = await queryActiveTab();
    expect(tab).toEqual({ id: 7, url: 'https://example.com' });
  });

  it('should return undefined from queryActiveTab if no tabs or chrome missing', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    expect(await queryActiveTab()).toBeUndefined();

    (globalThis as unknown as { chrome?: unknown }).chrome = {
      tabs: {
        query: (_q: unknown, cb: (tabs: unknown[]) => void) => cb([]),
      },
    };
    expect(await queryActiveTab()).toBeUndefined();
  });

  it('should send tab message via chrome.tabs.sendMessage', async () => {
    const sendMock = vi.fn((_id: number, _msg: unknown, cb: () => void) => cb());
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      tabs: {
        sendMessage: sendMock,
      },
    };

    await sendTabMessage(5, { test: 1 });
    expect(sendMock).toHaveBeenCalledWith(5, { test: 1 }, expect.any(Function));
  });

  it('should auto-inject content script and retry sendTabMessage if receiving end is missing', async () => {
    let callCount = 0;
    const sendMock = vi.fn((_id: number, _msg: unknown, cb: () => void) => {
      callCount++;
      if (callCount === 1) {
        chromeMock.runtime = { lastError: new Error('Receiving end does not exist') };
      } else {
        chromeMock.runtime = { lastError: null };
      }
      cb();
    });
    const executeScriptMock = vi.fn().mockResolvedValue([]);

    const chromeMock: Record<string, unknown> = {
      tabs: { sendMessage: sendMock },
      scripting: { executeScript: executeScriptMock },
      runtime: { lastError: null },
    };
    (globalThis as unknown as { chrome?: unknown }).chrome = chromeMock;

    await sendTabMessage(5, { test: 1 });
    expect(executeScriptMock).toHaveBeenCalledWith({
      target: { tabId: 5, allFrames: true },
      files: ['content.js'],
    });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should handle missing chrome in sendTabMessage', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    await expect(sendTabMessage(5, { test: 1 })).resolves.toBeUndefined();
  });

  it('should set action badge via chrome.action.setBadgeText', async () => {
    const badgeMock = vi.fn((_opts: unknown, cb: () => void) => cb());
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      action: {
        setBadgeText: badgeMock,
      },
    };

    await setActionBadge(5, 'DARK');
    expect(badgeMock).toHaveBeenCalledWith({ tabId: 5, text: 'DARK' }, expect.any(Function));
  });

  it('should handle missing chrome in setActionBadge', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    await expect(setActionBadge(5, 'DARK')).resolves.toBeUndefined();
  });

  it('should initialize BackgroundCoordinator and register listeners', async () => {
    let commandCb: ((cmd: string) => void) | undefined;
    let installedCb: (() => void) | undefined;

    (globalThis as unknown as { chrome?: unknown }).chrome = {
      commands: {
        onCommand: {
          addListener: vi.fn((cb) => {
            commandCb = cb;
          }),
        },
      },
      runtime: {
        onInstalled: {
          addListener: vi.fn((cb) => {
            installedCb = cb;
          }),
        },
      },
    };

    const coordinator = initializeBackgroundWorker(
      async () => ({ id: 1, url: 'https://site.com' }),
      async () => {},
      async () => {}
    );

    expect(coordinator).toBeDefined();
    expect(commandCb).toBeDefined();
    expect(installedCb).toBeDefined();

    if (commandCb) {
      commandCb('toggle-theme');
      commandCb('other-command');
    }

    if (installedCb) {
      installedCb();
    }
  });

  it('should handle undefined chrome in initializeBackgroundWorker', () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    const coordinator = initializeBackgroundWorker();
    expect(coordinator).toBeDefined();
  });
});

describe('Popup Entrypoint', () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;

  afterEach(() => {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  });

  it('should query active browser tab URL', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      tabs: {
        query: (_q: unknown, cb: (tabs: Array<{ url?: string }>) => void) => {
          cb([{ url: 'https://test.com' }]);
        },
      },
    };

    expect(await getActiveBrowserTabUrl()).toBe('https://test.com');
  });

  it('should return undefined from getActiveBrowserTabUrl when chrome is missing', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    expect(await getActiveBrowserTabUrl()).toBeUndefined();
  });

  it('should send active browser tab message', async () => {
    const sendMock = vi.fn((_id: number, _msg: unknown, cb: () => void) => cb());
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      tabs: {
        query: (_q: unknown, cb: (tabs: Array<{ id?: number }>) => void) => {
          cb([{ id: 99 }]);
        },
        sendMessage: sendMock,
      },
    };

    await sendActiveBrowserTabMessage({ action: 'test' });
    expect(sendMock).toHaveBeenCalledWith(99, { action: 'test' }, expect.any(Function));
  });

  it('should auto-inject content script and retry sendActiveBrowserTabMessage if receiving end is missing', async () => {
    let callCount = 0;
    const sendMock = vi.fn((_id: number, _msg: unknown, cb: () => void) => {
      callCount++;
      if (callCount === 1) {
        chromeMock.runtime = { lastError: new Error('Receiving end does not exist') };
      } else {
        chromeMock.runtime = { lastError: null };
      }
      cb();
    });
    const executeScriptMock = vi.fn().mockResolvedValue([]);

    const chromeMock: Record<string, unknown> = {
      tabs: {
        query: (_q: unknown, cb: (tabs: Array<{ id?: number }>) => void) => {
          cb([{ id: 99 }]);
        },
        sendMessage: sendMock,
      },
      scripting: { executeScript: executeScriptMock },
      runtime: { lastError: null },
    };
    (globalThis as unknown as { chrome?: unknown }).chrome = chromeMock;

    await sendActiveBrowserTabMessage({ action: 'test' });
    expect(executeScriptMock).toHaveBeenCalledWith({
      target: { tabId: 99, allFrames: true },
      files: ['content.js'],
    });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should handle missing active tab id in sendActiveBrowserTabMessage', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      tabs: {
        query: (_q: unknown, cb: (tabs: Array<{ id?: number }>) => void) => {
          cb([{}]);
        },
        sendMessage: vi.fn(),
      },
    };

    await expect(sendActiveBrowserTabMessage({ action: 'test' })).resolves.toBeUndefined();
  });

  it('should handle undefined chrome in sendActiveBrowserTabMessage', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    await expect(sendActiveBrowserTabMessage({ action: 'test' })).resolves.toBeUndefined();
  });

  it('should return undefined from initializePopup if document is undefined', async () => {
    expect(await initializePopup(undefined)).toBeUndefined();
  });

  it('should return undefined from initializePopup if elements are missing', async () => {
    const mockDoc = {
      getElementById: () => null,
    } as unknown as Document;

    expect(await initializePopup(mockDoc)).toBeUndefined();
  });

  it('should initialize PopupController when elements exist', async () => {
    const elements: Record<string, unknown> = {
      'site-host': { textContent: '' },
      'current-mode-badge': { textContent: '', className: '' },
      'btn-dark': { addEventListener: vi.fn() },
      'btn-light': { addEventListener: vi.fn() },
      'btn-reset': { addEventListener: vi.fn() },
      'global-mode-select': { value: 'system', addEventListener: vi.fn() },
    };

    const mockDoc = {
      getElementById: (id: string) => elements[id] ?? null,
    } as unknown as Document;

    const controller = await initializePopup(
      mockDoc,
      async () => 'https://example.com',
      async () => {}
    );

    expect(controller).toBeDefined();
    controller?.destroy();
  });
});
