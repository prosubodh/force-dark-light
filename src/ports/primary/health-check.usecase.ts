import { createSystemHealth, type SystemHealth } from '@domain/health';
import type { StorageHealthPort } from '@ports/secondary/storage-health.port';

export class HealthCheckUseCase {
  constructor(private readonly storagePort: StorageHealthPort) {}

  async execute(): Promise<SystemHealth> {
    try {
      const storageStatus = await this.storagePort.checkStorageHealth();
      return createSystemHealth(storageStatus, 'ok');
    } catch {
      return createSystemHealth('down', 'ok');
    }
  }
}
