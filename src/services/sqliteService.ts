/**
 * SQLite Service - Browser-based SQLite with IndexedDB persistence
 * 
 * Replaces localStorage with a proper relational database.
 * Uses sql.js (SQLite compiled to WebAssembly) with IndexedDB for persistence.
 */

import initSqlJs, { Database } from 'sql.js';
import { TriggerCombination, InterventionInstruction, InterventionEffectiveness, PersonalMigraineProfile } from '../types';

const DB_NAME = 'ease_app_db';
const DB_VERSION = 2;
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
          // Ensure schema exists (for migrations/updates)
          await this.createSchema();
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

    // SootheMode sessions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS soothemode_sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        trigger_combination_id TEXT NOT NULL,
        trigger_labels TEXT NOT NULL,
        completed_instruction_ids TEXT NOT NULL,
        duration_minutes REAL NOT NULL,
        outcome TEXT,
        follow_up_at TEXT,
        timestamp TEXT NOT NULL
      )
    `);

    // Intervention effectiveness tracking
    this.db.run(`
      CREATE TABLE IF NOT EXISTS intervention_effectiveness (
        instruction_id TEXT NOT NULL,
        trigger_combination_id TEXT NOT NULL,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        last_used TEXT NOT NULL,
        PRIMARY KEY (instruction_id, trigger_combination_id)
      )
    `);

    // Personal migraine profile (single row)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS personal_migraine_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        migraine_history_years REAL NOT NULL,
        menstrual_phase TEXT NOT NULL,
        age REAL NOT NULL,
        weight_kg REAL,
        bmi REAL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indices for faster queries
    this.db.run('CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_entries(date)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_experiment_name ON experiments(experiment_name)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_migraine_onset ON migraine_reports(onset_at)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_migraine_severity ON migraine_reports(severity)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_migraine_created ON migraine_reports(created_at)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_soothemode_outcome ON soothemode_sessions(outcome)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_soothemode_followup ON soothemode_sessions(follow_up_at)');

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

  // ==================== SootheMode Session Operations ====================

  /**
   * Save SootheMode session
   */
  async saveSootheModeSession(session: {
    id: string;
    startedAt: string;
    triggerCombination: TriggerCombination;
    instructions: InterventionInstruction[];
    completedInstructionIds: string[];
    durationMinutes: number;
    outcome?: string;
  }): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO soothemode_sessions 
       (id, started_at, trigger_combination_id, trigger_labels, completed_instruction_ids, duration_minutes, outcome, follow_up_at, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.startedAt,
        session.triggerCombination.id,
        session.triggerCombination.label,
        JSON.stringify(session.completedInstructionIds),
        session.durationMinutes,
        session.outcome || null,
        session.outcome ? null : new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
        new Date().toISOString(),
      ]
    );

    await this.saveToIndexedDB();
  }

  /**
   * Update session outcome after follow-up
   */
  async updateSessionOutcome(sessionId: string, outcome: 'prevented' | 'reduced' | 'no-effect'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `UPDATE soothemode_sessions SET outcome = ?, follow_up_at = NULL WHERE id = ?`,
      [outcome, sessionId]
    );

    // Update effectiveness stats
    const results = this.db.exec(
      `SELECT trigger_combination_id, completed_instruction_ids FROM soothemode_sessions WHERE id = ?`,
      [sessionId]
    );

    if (results.length > 0 && results[0].values.length > 0) {
      const [triggerCombId, completedIds] = results[0].values[0];
      const instructionIds = JSON.parse(completedIds as string) as string[];
      const success = outcome === 'prevented' || outcome === 'reduced' ? 1 : 0;
      const failure = success ? 0 : 1;

      instructionIds.forEach((instructionId: string) => {
        this.db!.run(
          `INSERT INTO intervention_effectiveness 
           (instruction_id, trigger_combination_id, success_count, failure_count, last_used)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(instruction_id, trigger_combination_id) 
           DO UPDATE SET 
             success_count = success_count + ?,
             failure_count = failure_count + ?,
             last_used = ?`,
          [
            instructionId,
            triggerCombId,
            success,
            failure,
            new Date().toISOString(),
            success,
            failure,
            new Date().toISOString(),
          ]
        );
      });
    }

    await this.saveToIndexedDB();
  }

  /**
   * Get intervention effectiveness data
   */
  async getInterventionEffectiveness(): Promise<InterventionEffectiveness[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const results = this.db.exec(`
      SELECT 
        instruction_id,
        trigger_combination_id,
        success_count,
        failure_count,
        last_used,
        CAST(success_count AS FLOAT) / (success_count + failure_count) as average_effectiveness
      FROM intervention_effectiveness
      WHERE success_count + failure_count > 0
      ORDER BY average_effectiveness DESC
    `);

    if (!results || results.length === 0) return [];

    return results[0].values.map(row => ({
      instructionId: row[0] as string,
      triggerCombinationId: row[1] as string,
      successCount: row[2] as number,
      failureCount: row[3] as number,
      lastUsed: row[4] as string,
      averageEffectiveness: row[5] as number,
    }));
  }

  /**
   * Get sessions pending follow-up
   */
  async getPendingFollowUps(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const results = this.db.exec(`
      SELECT id, trigger_labels, follow_up_at
      FROM soothemode_sessions
      WHERE outcome IS NULL 
        AND follow_up_at IS NOT NULL
        AND follow_up_at <= ?
      ORDER BY follow_up_at ASC
    `, [new Date().toISOString()]);

    if (!results || results.length === 0) return [];

    return results[0].values.map(row => ({
      id: row[0] as string,
      triggerLabels: row[1] as string,
      followUpAt: row[2] as string,
    }));
  }

  // ==================== Personal Migraine Profile ====================

  async savePersonalMigraineProfile(profile: PersonalMigraineProfile): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO personal_migraine_profile 
       (id, migraine_history_years, menstrual_phase, age, weight_kg, bmi, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         migraine_history_years = excluded.migraine_history_years,
         menstrual_phase = excluded.menstrual_phase,
         age = excluded.age,
         weight_kg = excluded.weight_kg,
         bmi = excluded.bmi,
         updated_at = excluded.updated_at`,
      [
        profile.migraineHistoryYears,
        profile.menstrualPhase,
        profile.age,
        profile.weightKg ?? null,
        profile.bmi ?? null,
        new Date().toISOString(),
      ]
    );

    await this.saveToIndexedDB();
  }

  async getPersonalMigraineProfile(): Promise<PersonalMigraineProfile | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const results = this.db.exec(
      `SELECT migraine_history_years, menstrual_phase, age, weight_kg, bmi
       FROM personal_migraine_profile WHERE id = 1`
    );

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];

    return {
      migraineHistoryYears: row[0] as number,
      menstrualPhase: row[1] as PersonalMigraineProfile['menstrualPhase'],
      age: row[2] as number,
      weightKg: row[3] as number | null ?? undefined,
      bmi: row[4] as number | null ?? undefined,
    };
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
