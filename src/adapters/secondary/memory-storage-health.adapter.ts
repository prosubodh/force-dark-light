import type { HealthStatus } from '@domain/health';
import type { StorageHealthPort } from '@ports/secondary/storage-health.port';

export class MemoryStorageHealthAdapter implements StorageHealthPort {
  constructor(private readonly healthy: boolean = true) {}

  async checkStorageHealth(): Promise<HealthStatus> {
    return this.healthy ? 'ok' : 'down';
  }
}
