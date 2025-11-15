/**
 * SQLite Service - Browser-based SQLite with IndexedDB persistence
 * 
 * Replaces localStorage with a proper relational database.
 * Uses sql.js (SQLite compiled to WebAssembly) with IndexedDB for persistence.
 */

import initSqlJs, { Database } from 'sql.js';
import { TriggerCombination, InterventionInstruction, InterventionEffectiveness, PersonalMigraineProfile, TriggerHypothesis } from '../types';

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
          // Check if migration is needed for personal_migraine_profile table
          await this.migratePersonalProfileTable();
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
   * Migrate personal_migraine_profile table to remove menstrual_phase column
   */
  private async migratePersonalProfileTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check if table exists and has menstrual_phase column
      const tableInfo = this.db.exec(`PRAGMA table_info(personal_migraine_profile)`);
      
      if (tableInfo.length === 0) {
        // Table doesn't exist yet, no migration needed
        return;
      }

      // Check if menstrual_phase column exists
      const columns = tableInfo[0].values;
      const hasMenstrualPhase = columns.some(col => col[1] === 'menstrual_phase');

      if (hasMenstrualPhase) {
        // Backup existing data
        const existingData = this.db.exec(`SELECT * FROM personal_migraine_profile WHERE id = 1`);
        
        // Drop the old table
        this.db.run(`DROP TABLE IF EXISTS personal_migraine_profile`);
        
        // Create new table without menstrual_phase (will be created in createSchema)
        // But we need to do it now to restore data
        this.db.run(`
          CREATE TABLE personal_migraine_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            migraine_history_years REAL NOT NULL,
            age REAL NOT NULL,
            weight_kg REAL,
            bmi REAL,
            updated_at TEXT NOT NULL
          )
        `);
        
        // Restore data if it existed (without menstrual_phase)
        if (existingData.length > 0 && existingData[0].values.length > 0) {
          const row = existingData[0].values[0];
          const columns = existingData[0].columns;
          
          // Find column indices
          const migraineYearsIdx = columns.indexOf('migraine_history_years');
          const ageIdx = columns.indexOf('age');
          const weightIdx = columns.indexOf('weight_kg');
          const bmiIdx = columns.indexOf('bmi');
          const updatedAtIdx = columns.indexOf('updated_at');
          
          this.db.run(
            `INSERT INTO personal_migraine_profile 
             (id, migraine_history_years, age, weight_kg, bmi, updated_at)
             VALUES (1, ?, ?, ?, ?, ?)`,
            [
              row[migraineYearsIdx],
              row[ageIdx],
              row[weightIdx] || null,
              row[bmiIdx] || null,
              row[updatedAtIdx]
            ]
          );
        }
        
        await this.saveToIndexedDB();
      }
    } catch (error) {
      console.warn('Migration check failed, will create fresh schema:', error);
      // If migration fails, we'll just create a fresh schema
    }
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
        age REAL NOT NULL,
        weight_kg REAL,
        bmi REAL,
        updated_at TEXT NOT NULL
      )
    `);

    // User trigger hypotheses
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_trigger_hypotheses (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        confidence REAL NOT NULL,
        freq_per_month REAL,
        threshold TEXT,
        onset_window_hours REAL,
        helps TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
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
       (id, migraine_history_years, age, weight_kg, bmi, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         migraine_history_years = excluded.migraine_history_years,
         age = excluded.age,
         weight_kg = excluded.weight_kg,
         bmi = excluded.bmi,
         updated_at = excluded.updated_at`,
      [
        profile.migraineHistoryYears,
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
      `SELECT migraine_history_years, age, weight_kg, bmi
       FROM personal_migraine_profile WHERE id = 1`
    );

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];

    return {
      migraineHistoryYears: row[0] as number,
      age: row[1] as number,
      weightKg: row[2] as number | null ?? undefined,
      bmi: row[3] as number | null ?? undefined,
    };
  }

  // ==================== Trigger Hypotheses ====================

  async saveTriggerHypothesis(h: Omit<TriggerHypothesis, 'createdAt' | 'updatedAt'>): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO user_trigger_hypotheses 
       (id, key, label, confidence, freq_per_month, threshold, onset_window_hours, helps, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         key = excluded.key,
         label = excluded.label,
         confidence = excluded.confidence,
         freq_per_month = excluded.freq_per_month,
         threshold = excluded.threshold,
         onset_window_hours = excluded.onset_window_hours,
         helps = excluded.helps,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [
        h.id,
        h.key,
        h.label,
        h.confidence,
        h.freqPerMonth ?? null,
        h.threshold ?? null,
        h.onsetWindowHours ?? null,
        h.helps ?? null,
        h.notes ?? null,
        now,
        now,
      ]
    );

    await this.saveToIndexedDB();
  }

  async updateTriggerHypothesis(id: string, partial: Partial<Omit<TriggerHypothesis, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const values: any[] = [];

    if (partial.key !== undefined) {
      updates.push('key = ?');
      values.push(partial.key);
    }
    if (partial.label !== undefined) {
      updates.push('label = ?');
      values.push(partial.label);
    }
    if (partial.confidence !== undefined) {
      updates.push('confidence = ?');
      values.push(partial.confidence);
    }
    if (partial.freqPerMonth !== undefined) {
      updates.push('freq_per_month = ?');
      values.push(partial.freqPerMonth);
    }
    if (partial.threshold !== undefined) {
      updates.push('threshold = ?');
      values.push(partial.threshold);
    }
    if (partial.onsetWindowHours !== undefined) {
      updates.push('onset_window_hours = ?');
      values.push(partial.onsetWindowHours);
    }
    if (partial.helps !== undefined) {
      updates.push('helps = ?');
      values.push(partial.helps);
    }
    if (partial.notes !== undefined) {
      updates.push('notes = ?');
      values.push(partial.notes);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.run(
      `UPDATE user_trigger_hypotheses SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    await this.saveToIndexedDB();
  }

  async getTriggerHypotheses(): Promise<TriggerHypothesis[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const results = this.db.exec(
      `SELECT id, key, label, confidence, freq_per_month, threshold, onset_window_hours, helps, notes, created_at, updated_at
       FROM user_trigger_hypotheses
       ORDER BY created_at ASC`
    );

    if (!results.length || !results[0].values.length) return [];

    return results[0].values.map(row => ({
      id: row[0] as string,
      key: row[1] as string,
      label: row[2] as string,
      confidence: row[3] as number,
      freqPerMonth: row[4] as number | null ?? undefined,
      threshold: row[5] as string | null ?? undefined,
      onsetWindowHours: row[6] as number | null ?? undefined,
      helps: row[7] as string | null ?? undefined,
      notes: row[8] as string | null ?? undefined,
      createdAt: row[9] as string,
      updatedAt: row[10] as string,
    }));
  }

  async deleteTriggerHypothesis(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM user_trigger_hypotheses WHERE id = ?', [id]);

    await this.saveToIndexedDB();
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
