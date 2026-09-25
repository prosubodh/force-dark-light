import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSystemHealth } from '@domain/health';
import { HealthCheckUseCase } from '@ports/primary/health-check.usecase';
import { MemoryStorageHealthAdapter } from '@adapters/secondary/memory-storage-health.adapter';
import { ChromeStorageHealthAdapter } from '@adapters/secondary/chrome-storage-health.adapter';
import { HealthCheckController } from '@adapters/primary/health-check.adapter';

describe('Health Domain & Services', () => {
  it('should create system health with status ok when all components are ok', () => {
    const health = createSystemHealth('ok', 'ok', '2026-09-25T00:00:00Z');
    expect(health.status).toBe('ok');
    expect(health.components.storage).toBe('ok');
    expect(health.components.runtime).toBe('ok');
    expect(health.timestamp).toBe('2026-09-25T00:00:00Z');
  });

  it('should create system health with default timestamp if not provided', () => {
    const health = createSystemHealth('ok', 'ok');
    expect(health.status).toBe('ok');
    expect(typeof health.timestamp).toBe('string');
  });

  it('should mark system health as down when any component is down', () => {
    const storageDown = createSystemHealth('down', 'ok');
    expect(storageDown.status).toBe('down');

    const runtimeDown = createSystemHealth('ok', 'down');
    expect(runtimeDown.status).toBe('down');
  });

  it('should mark system health as degraded when components are degraded', () => {
    const degraded = createSystemHealth('degraded', 'ok');
    expect(degraded.status).toBe('degraded');
  });
});

describe('HealthCheckUseCase', () => {
  it('should return system health based on storage port', async () => {
    const adapter = new MemoryStorageHealthAdapter(true);
    const useCase = new HealthCheckUseCase(adapter);

    const health = await useCase.execute();
    expect(health.status).toBe('ok');
    expect(health.components.storage).toBe('ok');
  });

  it('should handle storage port failures safely and return down status', async () => {
    const failingPort = {
      checkStorageHealth: vi.fn().mockRejectedValue(new Error('Storage failure')),
    };
    const useCase = new HealthCheckUseCase(failingPort);

    const health = await useCase.execute();
    expect(health.status).toBe('down');
    expect(health.components.storage).toBe('down');
  });
});

describe('MemoryStorageHealthAdapter', () => {
  it('should report ok when healthy is true or omitted', async () => {
    const adapterDefault = new MemoryStorageHealthAdapter();
    expect(await adapterDefault.checkStorageHealth()).toBe('ok');

    const adapterHealthy = new MemoryStorageHealthAdapter(true);
    expect(await adapterHealthy.checkStorageHealth()).toBe('ok');
  });

  it('should report down when healthy is false', async () => {
    const adapterUnhealthy = new MemoryStorageHealthAdapter(false);
    expect(await adapterUnhealthy.checkStorageHealth()).toBe('down');
  });
});

describe('ChromeStorageHealthAdapter', () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;

  afterEach(() => {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  });

  it('should return degraded if chrome.storage is not available', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    const adapter = new ChromeStorageHealthAdapter();
    const result = await adapter.checkStorageHealth();
    expect(result).toBe('degraded');
  });

  it('should return ok when chrome.storage.sync succeeds without lastError', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          get: (_keys: string[], cb: () => void) => {
            cb();
          },
        },
      },
      runtime: {
        lastError: null,
      },
    };

    const adapter = new ChromeStorageHealthAdapter();
    const result = await adapter.checkStorageHealth();
    expect(result).toBe('ok');
  });

  it('should fallback to chrome.storage.local when sync is unavailable', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: undefined,
        local: {
          get: (_keys: string[], cb: () => void) => {
            cb();
          },
        },
      },
      runtime: {
        lastError: null,
      },
    };

    const adapter = new ChromeStorageHealthAdapter();
    const result = await adapter.checkStorageHealth();
    expect(result).toBe('ok');
  });

  it('should return down if chrome.runtime.lastError is present', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          get: (_keys: string[], cb: () => void) => {
            cb();
          },
        },
      },
      runtime: {
        lastError: new Error('Quota exceeded'),
      },
    };

    const adapter = new ChromeStorageHealthAdapter();
    const result = await adapter.checkStorageHealth();
    expect(result).toBe('down');
  });

  it('should return down if chrome.storage throws an exception', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          get: () => {
            throw new Error('Immediate failure');
          },
        },
      },
      runtime: {
        lastError: null,
      },
    };

    const adapter = new ChromeStorageHealthAdapter();
    const result = await adapter.checkStorageHealth();
    expect(result).toBe('down');
  });
});

describe('HealthCheckController', () => {
  it('should return 200 for /healthz when healthy', async () => {
    const useCase = new HealthCheckUseCase(new MemoryStorageHealthAdapter(true));
    const controller = new HealthCheckController(useCase);

    const res = await controller.getHealthz();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return 503 for /healthz when down', async () => {
    const useCase = new HealthCheckUseCase(new MemoryStorageHealthAdapter(false));
    const controller = new HealthCheckController(useCase);

    const res = await controller.getHealthz();
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('down');
  });

  it('should return 200 for /readyz when status is ok', async () => {
    const useCase = new HealthCheckUseCase(new MemoryStorageHealthAdapter(true));
    const controller = new HealthCheckController(useCase);

    const res = await controller.getReadyz();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('should return 503 for /readyz when status is not ok', async () => {
    const useCase = new HealthCheckUseCase(new MemoryStorageHealthAdapter(false));
    const controller = new HealthCheckController(useCase);

    const res = await controller.getReadyz();
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
  });
});
