
/**
 * Migraine Report Service
 * Handles CRUD operations for migraine reports using SQLite
 */

import { sqliteService } from './sqliteService';
import type { MigraineReport, MigraineReportFormData } from '../types/migraine';

class MigraineService {
  /**
   * Get the SQLite service instance
   */
  private get db() {
    return sqliteService;
  }

  /**
   * Initialize migraine reports table
   */
  async initSchema(): Promise<void> {
    await this.db.init();
    
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    // Create migraine_reports table
    db.run(`
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

    // Create indices for common queries
    db.run('CREATE INDEX IF NOT EXISTS idx_migraine_onset ON migraine_reports(onset_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_migraine_severity ON migraine_reports(severity)');
    db.run('CREATE INDEX IF NOT EXISTS idx_migraine_created ON migraine_reports(created_at)');

    await this.db['saveToIndexedDB']();
  }

  /**
   * Create a new migraine report
   */
  async createReport(formData: MigraineReportFormData): Promise<MigraineReport> {
    await this.db.init();
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    const report: MigraineReport = {
      id: this.generateId(),
      onsetAt: formData.onsetDate.toISOString(),
      durationHours: formData.durationHours,
      severity: formData.severity,
      auraPresent: formData.auraPresent,
      auraTypes: formData.auraTypes,
      painCharacter: formData.painCharacter,
      symptoms: formData.symptoms,
      triggers: formData.triggers,
      otherTriggerNotes: formData.otherTriggerNotes,
      notes: formData.notes,
      medicationTaken: formData.medicationTaken,
      medicationTiming: formData.medicationTiming,
      reliefLevel: formData.reliefLevel,
      impactMissedWork: formData.impactMissedWork,
      impactHadToRest: formData.impactHadToRest,
      impactScore: formData.impactScore,
      createdAt: new Date().toISOString(),
    };

    // Insert into database
    db.run(
      `
      INSERT INTO migraine_reports (
        id, user_id, onset_at, duration_hours, severity,
        aura_present, aura_types, pain_character, symptoms, triggers,
        other_trigger_notes, notes, medication_taken, medication_timing,
        relief_level, impact_missed_work, impact_had_to_rest, impact_score,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        report.id,
        report.userId || null,
        report.onsetAt,
        report.durationHours || null,
        report.severity,
        report.auraPresent ? 1 : 0,
        report.auraTypes ? JSON.stringify(report.auraTypes) : null,
        report.painCharacter || null,
        JSON.stringify(report.symptoms),
        JSON.stringify(report.triggers),
        report.otherTriggerNotes || null,
        report.notes || null,
        report.medicationTaken || null,
        report.medicationTiming || null,
        report.reliefLevel || null,
        report.impactMissedWork ? 1 : 0,
        report.impactHadToRest ? 1 : 0,
        report.impactScore || null,
        report.createdAt,
      ]
    );

    await this.db['saveToIndexedDB']();
    
    console.log('[MigraineService] Report created:', report.id);
    
    // Queue for ML processing (stub for future backend integration)
    this.queueForMLProcessing(report);

    return report;
  }

  /**
   * Get all migraine reports (newest first)
   */
  async getAllReports(): Promise<MigraineReport[]> {
    await this.db.init();
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(`
      SELECT * FROM migraine_reports
      ORDER BY onset_at DESC
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    const rows = result[0].values;

    return rows.map((row) => this.rowToReport(columns, row));
  }

  /**
   * Get reports within a date range
   */
  async getReportsByDateRange(startDate: Date, endDate: Date): Promise<MigraineReport[]> {
    await this.db.init();
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(
      `
      SELECT * FROM migraine_reports
      WHERE onset_at >= ? AND onset_at <= ?
      ORDER BY onset_at DESC
      `,
      [startDate.toISOString(), endDate.toISOString()]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    const rows = result[0].values;

    return rows.map((row) => this.rowToReport(columns, row));
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<MigraineReport | null> {
    await this.db.init();
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(
      `SELECT * FROM migraine_reports WHERE id = ?`,
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const columns = result[0].columns;
    const row = result[0].values[0];

    return this.rowToReport(columns, row);
  }

  /**
   * Get count of reports
   */
  async getReportCount(): Promise<number> {
    await this.db.init();
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    const result = db.exec('SELECT COUNT(*) as count FROM migraine_reports');
    
    if (result.length === 0) return 0;
    
    return result[0].values[0][0] as number;
  }

  /**
   * Delete a report
   */
  async deleteReport(id: string): Promise<void> {
    await this.db.init();
    const db = this.db['db'];
    if (!db) throw new Error('Database not initialized');

    db.run('DELETE FROM migraine_reports WHERE id = ?', [id]);
    await this.db['saveToIndexedDB']();
    
    console.log('[MigraineService] Report deleted:', id);
  }

  /**
   * Convert database row to MigraineReport object
   */
  private rowToReport(columns: string[], row: any[]): MigraineReport {
    const data: any = {};
    columns.forEach((col, index) => {
      data[col] = row[index];
    });

    return {
      id: data.id,
      userId: data.user_id || undefined,
      onsetAt: data.onset_at,
      durationHours: data.duration_hours || undefined,
      severity: data.severity,
      auraPresent: data.aura_present === 1,
      auraTypes: data.aura_types ? JSON.parse(data.aura_types) : undefined,
      painCharacter: data.pain_character || undefined,
      symptoms: JSON.parse(data.symptoms),
      triggers: JSON.parse(data.triggers),
      otherTriggerNotes: data.other_trigger_notes || undefined,
      notes: data.notes || undefined,
      medicationTaken: data.medication_taken || undefined,
      medicationTiming: data.medication_timing || undefined,
      reliefLevel: data.relief_level || undefined,
      impactMissedWork: data.impact_missed_work === 1,
      impactHadToRest: data.impact_had_to_rest === 1,
      impactScore: data.impact_score || undefined,
      createdAt: data.created_at,
    };
  }

  /**
   * Generate unique ID for reports
   */
  private generateId(): string {
    return `migraine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Queue report for ML processing (stub for future backend integration)
   */
  private queueForMLProcessing(report: MigraineReport): void {
    // This is a stub function for future ML pipeline integration
    // When backend is implemented, this will send data to the ML service
    console.log('[MigraineService] Queued for ML processing:', {
      id: report.id,
      severity: report.severity,
      triggers: report.triggers,
      symptoms: report.symptoms,
    });

    // Future: POST to /api/ml/process-migraine-report
  }

  /**
   * Export reports in ML-friendly format
   * This can be used to generate training data for the ML model
   */
  async exportForML(): Promise<any[]> {
    const reports = await this.getAllReports();
    
    return reports.map(report => ({
      timestamp: report.onsetAt,
      features: {
        severity: report.severity,
        aura_present: report.auraPresent ? 1 : 0,
        duration_hours: report.durationHours || 0,
        // Encode categorical variables
        triggers: this.encodeTriggers(report.triggers),
        symptoms: this.encodeSymptoms(report.symptoms),
        pain_character: report.painCharacter || 'unknown',
        medication_effectiveness: this.encodeReliefLevel(report.reliefLevel),
        impact_score: report.impactScore || 0,
      },
      labels: {
        had_migraine: 1,
        severity_class: this.getSeverityClass(report.severity),
      },
    }));
  }

  /**
   * Helper: Encode triggers as binary features
   */
  private encodeTriggers(triggers: string[]): Record<string, number> {
    const encoded: Record<string, number> = {};
    const allTriggers = [
      'stress', 'lack_of_sleep', 'oversleeping', 'skipped_meal',
      'dehydration', 'hormonal_menstruation', 'weather_pressure',
      'bright_lights', 'screen_time', 'caffeine_decrease',
    ];
    
    allTriggers.forEach(trigger => {
      encoded[trigger] = triggers.includes(trigger) ? 1 : 0;
    });
    
    return encoded;
  }

  /**
   * Helper: Encode symptoms as binary features
   */
  private encodeSymptoms(symptoms: string[]): Record<string, number> {
    const encoded: Record<string, number> = {};
    const allSymptoms = [
      'nausea', 'vomiting', 'photophobia', 'phonophobia',
      'dizziness', 'neck_pain', 'cognitive_fog',
    ];
    
    allSymptoms.forEach(symptom => {
      encoded[symptom] = symptoms.includes(symptom) ? 1 : 0;
    });
    
    return encoded;
  }

  /**
   * Helper: Encode relief level as numeric
   */
  private encodeReliefLevel(relief?: string): number {
    switch (relief) {
      case 'good': return 2;
      case 'partial': return 1;
      case 'none': return 0;
      default: return -1;
    }
  }

  /**
   * Helper: Classify severity
   */
  private getSeverityClass(severity: number): string {
    if (severity <= 3) return 'mild';
    if (severity <= 6) return 'moderate';
    return 'severe';
  }
}

// Singleton instance
let instance: MigraineService | null = null;

export function getMigraineService(): MigraineService {
  if (!instance) {
    instance = new MigraineService();
  }
  return instance;
}

// Export singleton instance for convenience
export const migraineService = getMigraineService();

export default MigraineService;
