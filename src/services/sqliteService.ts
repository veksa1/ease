/**
 * SQLite Service - Browser-based SQLite with IndexedDB persistence
 * 
 * Replaces localStorage with a proper relational database.
 * Uses sql.js (SQLite compiled to WebAssembly) with IndexedDB for persistence.
 */

import initSqlJs, { Database } from 'sql.js';

const DB_NAME = 'ease_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'sqlitedb';

class SQLiteService {
  private db: Database | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize SQLite database
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Initialize sql.js
        const SQL = await initSqlJs({
          locateFile: (file) => `https://sql.js.org/dist/${file}`
        });

        // Try to load existing database from IndexedDB
        const savedDb = await this.loadFromIndexedDB();
        
        if (savedDb) {
          this.db = new SQL.Database(savedDb);
        } else {
          // Create new database
          this.db = new SQL.Database();
          await this.createSchema();
        }
      } catch (error) {
        console.error('Failed to initialize SQLite:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Create database schema
   */
  private async createSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // User timeline entries
    this.db.run(`
      CREATE TABLE IF NOT EXISTS timeline_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // User settings and state
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Experiment tracking
    this.db.run(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_name TEXT NOT NULL,
        day_index INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        UNIQUE(experiment_name, day_index)
      )
    `);

    // Migraine reports
    this.db.run(`
      CREATE TABLE IF NOT EXISTS migraine_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        onset_at TEXT NOT NULL,
        duration_hours REAL,
        severity INTEGER NOT NULL,
        aura_present INTEGER,
        aura_types TEXT,
        pain_character TEXT,
        symptoms TEXT NOT NULL,
        triggers TEXT NOT NULL,
        other_trigger_notes TEXT,
        notes TEXT,
        medication_taken TEXT,
        medication_timing TEXT,
        relief_level TEXT,
        impact_missed_work INTEGER,
        impact_had_to_rest INTEGER,
        impact_score INTEGER,
        created_at TEXT NOT NULL
      )
    `);

    // Create indices for faster queries
    this.db.run('CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_entries(date)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_experiment_name ON experiments(experiment_name)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_migraine_onset ON migraine_reports(onset_at)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_migraine_severity ON migraine_reports(severity)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_migraine_created ON migraine_reports(created_at)');

    await this.saveToIndexedDB();
  }

  /**
   * Save database to IndexedDB
   */
  private async saveToIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const data = this.db!.export();
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(data, 'database');

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  /**
   * Load database from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close();
          resolve(null);
          return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get('database');

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  /**
   * Execute query and save to IndexedDB
   */
  private async exec(sql: string, params?: any[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(sql, params);
    await this.saveToIndexedDB();
  }

  /**
   * Execute query and return results
   */
  private async query(sql: string, params?: any[]): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    const results = this.db.exec(sql, params);
    if (!results.length) return [];

    const { columns, values } = results[0];
    return values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  // ==================== Timeline Operations ====================

  /**
   * Add timeline entry
   */
  async addTimelineEntry(date: string, type: string, data: any): Promise<void> {
    const dateKey = date.split('T')[0];
    await this.exec(
      'INSERT INTO timeline_entries (date, type, data, timestamp) VALUES (?, ?, ?, ?)',
      [dateKey, type, JSON.stringify(data), new Date().toISOString()]
    );
  }

  /**
   * Get timeline entries for a date
   */
  async getTimelineEntries(date: string): Promise<any[]> {
    const dateKey = date.split('T')[0];
    const results = await this.query(
      'SELECT * FROM timeline_entries WHERE date = ? ORDER BY timestamp ASC',
      [dateKey]
    );
    
    return results.map(row => ({
      type: row.type,
      data: JSON.parse(row.data),
      timestamp: row.timestamp
    }));
  }

  /**
   * Clear all timeline entries
   */
  async clearTimeline(): Promise<void> {
    await this.exec('DELETE FROM timeline_entries');
  }

  // ==================== Settings Operations ====================

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.exec(
      'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  /**
   * Get a setting value
   */
  async getSetting(key: string): Promise<string | null> {
    const results = await this.query(
      'SELECT value FROM user_settings WHERE key = ?',
      [key]
    );
    return results.length > 0 ? results[0].value : null;
  }

  /**
   * Remove a setting
   */
  async removeSetting(key: string): Promise<void> {
    await this.exec('DELETE FROM user_settings WHERE key = ?', [key]);
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const results = await this.query('SELECT key, value FROM user_settings');
    const settings: Record<string, string> = {};
    results.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  // ==================== Experiment Operations ====================

  /**
   * Set experiment day status
   */
  async setExperimentDay(experimentName: string, dayIndex: number, completed: boolean): Promise<void> {
    await this.exec(
      `INSERT OR REPLACE INTO experiments (experiment_name, day_index, completed, timestamp)
       VALUES (?, ?, ?, ?)`,
      [experimentName, dayIndex, completed ? 1 : 0, new Date().toISOString()]
    );
  }

  /**
   * Get experiment days
   */
  async getExperimentDays(experimentName: string): Promise<boolean[]> {
    const results = await this.query(
      'SELECT day_index, completed FROM experiments WHERE experiment_name = ? ORDER BY day_index ASC',
      [experimentName]
    );
    
    // Create array of 7 days
    const days = [false, false, false, false, false, false, false];
    results.forEach(row => {
      if (row.day_index >= 0 && row.day_index < 7) {
        days[row.day_index] = row.completed === 1;
      }
    });
    
    return days;
  }

  /**
   * Clear all experiments
   */
  async clearExperiments(): Promise<void> {
    await this.exec('DELETE FROM experiments');
  }

  // ==================== Utility Operations ====================

  /**
   * Reset entire database
   */
  async resetDatabase(): Promise<void> {
    await this.clearTimeline();
    await this.exec('DELETE FROM user_settings');
    await this.clearExperiments();
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const sqliteService = new SQLiteService();
