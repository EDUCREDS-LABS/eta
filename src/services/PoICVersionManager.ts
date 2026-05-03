import * as crypto from 'crypto';

/**
 * PoICVersionManager - Tracks PoIC model versions for governance compliance
 *
 * Per PoIC Whitepaper §8 (Model Upgrade Policy):
 * - Each model version is hashed
 * - Upgrades require DAO proposal + vote
 * - No silent updates permitted
 * - Historical PoIC snapshots remain immutable
 */

interface VersionSnapshot {
  version: string;
  versionHash: string;
  loadedAt: Date;
  source: 'local' | 'live';
}

export class PoICVersionManager {
  private currentVersion: string | null = null;
  private currentHash: string | null = null;
  private loadedAt: Date | null = null;
  private source: 'local' | 'live' | null = null;
  private versionHistory: VersionSnapshot[] = [];
  private maxHistorySize = 5;

  /**
   * Register a new PoIC version
   * @param content - Full PoIC content/markdown
   * @param version - Version string (e.g., "v1.2.0")
   * @param source - Where this version came from
   */
  registerVersion(
    content: string,
    version: string,
    source: 'local' | 'live' = 'local'
  ): void {
    const newHash = this.hashContent(content);

    // Check if this is a new version
    if (newHash !== this.currentHash) {
      console.log(`[PoICVersionManager] New PoIC version detected: ${version} (${source})`);

      this.currentVersion = version;
      this.currentHash = newHash;
      this.loadedAt = new Date();
      this.source = source;

      // Add to history
      const snapshot: VersionSnapshot = {
        version,
        versionHash: newHash,
        loadedAt: this.loadedAt,
        source
      };

      this.versionHistory.unshift(snapshot);
      if (this.versionHistory.length > this.maxHistorySize) {
        this.versionHistory.pop();
      }

      // Log version change for audit trail
      console.log(
        `[PoICVersionManager] Registered version ${version} with hash ${newHash.substring(0, 8)}...`
      );
    }
  }

  /**
   * Get current PoIC version string
   */
  getPoICVersion(): string {
    return this.currentVersion || 'unknown';
  }

  /**
   * Get current version hash (first 16 chars for brevity, full hash available)
   */
  getVersionHash(full: boolean = false): string {
    if (!this.currentHash) return 'not-loaded';
    return full ? this.currentHash : this.currentHash.substring(0, 16);
  }

  /**
   * Get timestamp when current version was loaded
   */
  getLoadedAt(): Date | null {
    return this.loadedAt;
  }

  /**
   * Get source of current version
   */
  getSource(): 'local' | 'live' | null {
    return this.source;
  }

  /**
   * Get version history (up to 5 recent versions)
   */
  getVersionHistory(): VersionSnapshot[] {
    return [...this.versionHistory];
  }

  /**
   * Check if version is new (for warning on model upgrades)
   */
  isNewVersionSinceLoad(expectedVersion: string): boolean {
    return expectedVersion !== this.currentVersion;
  }

  /**
   * Get version metadata for response tagging
   */
  getVersionMetadata(): {
    version: string;
    versionHash: string;
    loadedAt: string;
    source: 'local' | 'live' | null;
  } {
    return {
      version: this.getPoICVersion(),
      versionHash: this.getVersionHash(),
      loadedAt: this.loadedAt?.toISOString() || 'not-loaded',
      source: this.source
    };
  }

  /**
   * Hash content using SHA-256 for version tracking
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Reset manager state (mainly for testing)
   */
  reset(): void {
    this.currentVersion = null;
    this.currentHash = null;
    this.loadedAt = null;
    this.source = null;
    this.versionHistory = [];
  }
}

// Export singleton instance
export const poicVersionManager = new PoICVersionManager();
