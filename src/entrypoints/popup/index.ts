import { ChromeStorageAdapter } from '@adapters/secondary/chrome-storage.adapter';
import { PopupController, type PopupViewElements } from './popup-controller';

export async function getActiveBrowserTabUrl(): Promise<string | undefined> {
  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
  if (!ch?.tabs?.query) {
    return undefined;
  }

  return new Promise((resolve) => {
    ch.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]?.url);
    });
  });
}

export async function sendActiveBrowserTabMessage(message: unknown): Promise<void> {
  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
  if (!ch?.tabs?.query || !ch?.tabs?.sendMessage) {
    return;
  }

  return new Promise((resolve) => {
    ch.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeId = tabs[0]?.id;
      if (activeId !== undefined) {
        ch.tabs.sendMessage(activeId, message, async () => {
          if (ch.runtime?.lastError && ch.scripting?.executeScript) {
            try {
              await ch.scripting.executeScript({
                target: { tabId: activeId, allFrames: true },
                files: ['content.js'],
              });
              ch.tabs.sendMessage(activeId, message, () => {
                void ch.runtime?.lastError;
                resolve();
              });
              return;
            } catch {
              // Ignore restricted tabs
            }
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

export async function initializePopup(
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
  getActiveUrl = getActiveBrowserTabUrl,
  sendMessage = sendActiveBrowserTabMessage
): Promise<PopupController | undefined> {
  if (!doc) {
    return undefined;
  }

  const siteHostEl = doc.getElementById('site-host');
  const currentModeBadge = doc.getElementById('current-mode-badge');
  const btnDark = doc.getElementById('btn-dark') as HTMLButtonElement | null;
  const btnLight = doc.getElementById('btn-light') as HTMLButtonElement | null;
  const btnReset = doc.getElementById('btn-reset') as HTMLButtonElement | null;
  const globalModeSelect = doc.getElementById('global-mode-select') as HTMLSelectElement | null;

  if (!siteHostEl || !currentModeBadge || !btnDark || !btnLight || !btnReset || !globalModeSelect) {
    return undefined;
  }

  const elements: PopupViewElements = {
    siteHostEl,
    currentModeBadge,
    btnDark,
    btnLight,
    btnReset,
    globalModeSelect,
  };

  const storage = new ChromeStorageAdapter();
  const systemPrefersDark = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  const controller = new PopupController({
    storage,
    getActiveTabUrl: getActiveUrl,
    systemPrefersDark,
    sendTabMessage: sendMessage,
  });

  await controller.init(elements);
  return controller;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    void initializePopup();
  });
}
