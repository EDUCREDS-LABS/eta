import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { poicVersionManager } from './PoICVersionManager';
import { config } from '../config';

/**
 * PoICDataService - Local + Live Sync for PoIC Framework
 *
 * Provides:
 * - Local disk loading (fast, reliable fallback)
 * - Live URL sync (auto-updates, configurable interval)
 * - Version tracking for governance compliance
 * - Hash-based change detection
 * - Graceful degradation on sync failures
 */

export interface PoICSyncStatus {
  hasData: boolean;
  currentVersion: string;
  lastSyncTime: Date | null;
  nextSyncTime?: Date;
  dataSource: 'local' | 'live' | 'none';
  error?: string;
}

export class PoICDataService {
  private poicContent: string | null = null;
  private lastSyncTime: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncError: string | null = null;

  /**
   * Initialize service: Load local PoIC.md on startup
   */
  async initialize(): Promise<void> {
    try {
      await this.loadLocal();
      console.log('[PoICDataService] Initialized with local PoIC.md');
    } catch (error) {
      console.error('[PoICDataService] Failed to load local PoIC.md:', error);
      this.lastSyncError = String(error);
    }
  }

  /**
   * Load PoIC content from local disk
   * Local path from config: educreds-protocol/PoIC.md
   */
  private async loadLocal(): Promise<void> {
    const localPath = path.resolve(__dirname, config.poic.localFilePath);

    if (!fs.existsSync(localPath)) {
      throw new Error(`PoIC local file not found: ${localPath}`);
    }

    this.poicContent = fs.readFileSync(localPath, 'utf-8');

    // Extract version from content (look for "PoIC v" or "model_version")
    const versionMatch = this.poicContent.match(/[vV](\d+\.\d+\.\d+)/);
    const version = versionMatch ? `v${versionMatch[1]}` : 'v1.0.0';

    poicVersionManager.registerVersion(this.poicContent, version, 'local');
    console.log(`[PoICDataService] Loaded local PoIC.md (${version})`);
  }

  private async fetchWithRetry(url: string, attempts: number = 3): Promise<string> {
    let lastError: any;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await axios.get<string>(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'EduCreds-TrustAgent/1.0'
          }
        });

        return response.data;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[PoICDataService] Live sync attempt ${attempt} failed: ${error.message}`
        );
        if (attempt < attempts) {
          const delayMs = 500 * 2 ** (attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }

  /**
   * Sync PoIC content from live documentation URL
   * Called on startup (if enabled) and periodically via interval
   */
  async syncFromLive(): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[PoICDataService] Sync already in progress, skipping');
      return false;
    }

    this.isSyncing = true;
    this.lastSyncError = null;

    try {
      console.log(`[PoICDataService] Starting sync from ${config.poic.liveUrl}`);

      const liveContent = await this.fetchWithRetry(config.poic.liveUrl, 3);

      // Check if content actually changed
      if (liveContent === this.poicContent) {
        console.log('[PoICDataService] Live content unchanged, skipping update');
        this.lastSyncTime = new Date();
        return true;
      }

      // Extract version from live content
      const versionMatch = liveContent.match(/[vV](\d+\.\d+\.\d+)/);
      const version = versionMatch ? `v${versionMatch[1]}` : 'v1.0.0';

      // Update content and register new version
      this.poicContent = liveContent;
      poicVersionManager.registerVersion(liveContent, version, 'live');

      this.lastSyncTime = new Date();
      console.log(`[PoICDataService] Sync successful, updated to ${version}`);
      return true;
    } catch (error) {
      const errorMsg = String(error);
      this.lastSyncError = errorMsg;
      console.error('[PoICDataService] Sync failed:', errorMsg);
      console.log('[PoICDataService] Continuing with cached local PoIC.md');
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start periodic sync (call from server.ts on startup)
   */
  startPeriodicSync(): void {
    if (!config.poic.enableAutoSync) {
      console.log('[PoICDataService] Auto-sync disabled via config');
      return;
    }

    const intervalMs = config.poic.syncIntervalMinutes * 60 * 1000;
    console.log(
      `[PoICDataService] Starting periodic sync every ${config.poic.syncIntervalMinutes} minutes`
    );

    this.syncInterval = setInterval(() => {
      this.syncFromLive().catch((err) => {
        console.error('[PoICDataService] Periodic sync error:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic sync (call from server.ts on shutdown)
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[PoICDataService] Periodic sync stopped');
    }
  }

  /**
   * Get current PoIC framework content
   */
  getPoICContent(): string {
    if (!this.poicContent) {
      throw new Error('PoIC content not loaded');
    }
    return this.poicContent;
  }

  /**
   * Get PoIC content if available, or null if not yet loaded
   */
  getPoICContentSafe(): string | null {
    return this.poicContent;
  }

  /**
   * Check if PoIC data is available
   */
  hasData(): boolean {
    return this.poicContent !== null;
  }

  /**
   * Get sync status for health checks
   */
  getSyncStatus(): PoICSyncStatus {
    return {
      hasData: this.hasData(),
      currentVersion: poicVersionManager.getPoICVersion(),
      lastSyncTime: this.lastSyncTime,
      dataSource: this.poicContent ? 'local' : 'none',
      error: this.lastSyncError ?? undefined
    };
  }

  /**
   * Get time until next sync (useful for monitoring)
   */
  getNextSyncTime(): Date | null {
    if (!this.syncInterval || !config.poic.enableAutoSync) {
      return null;
    }

    const now = new Date();
    const intervalMs = config.poic.syncIntervalMinutes * 60 * 1000;
    const lastSync = this.lastSyncTime || now;
    return new Date(lastSync.getTime() + intervalMs);
  }

  /**
   * Get data source info
   */
  getDataSource(): 'local' | 'live' | 'none' {
    if (!this.poicContent) return 'none';
    return poicVersionManager.getSource() || 'local';
  }

  /**
   * Get detailed metadata for responses
   */
  getMetadata() {
    return {
      version: poicVersionManager.getPoICVersion(),
      versionHash: poicVersionManager.getVersionHash(),
      loadedAt: poicVersionManager.getLoadedAt()?.toISOString(),
      lastSyncTime: this.lastSyncTime?.toISOString(),
      dataSource: this.getDataSource(),
      syncEnabled: config.poic.enableAutoSync,
      nextSyncTime: this.getNextSyncTime()?.toISOString()
    };
  }

  /**
   * Force reload from local (bypass live sync)
   */
  async forceReloadLocal(): Promise<void> {
    console.log('[PoICDataService] Force reloading from local file');
    await this.loadLocal();
  }

  /**
   * Get version history
   */
  getVersionHistory() {
    return poicVersionManager.getVersionHistory();
  }
}

// Export singleton instance
export const poicDataService = new PoICDataService();
