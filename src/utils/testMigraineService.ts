/**
 * Test utilities for Migraine Service
 * Run these functions in browser console to verify the service works correctly
 */

import { getMigraineService } from '../services/migraineService';
import type { MigraineReportFormData } from '../types/migraine';

/**
 * Create a sample migraine report for testing
 */
export async function createSampleReport() {
  const service = getMigraineService();
  
  const sampleData: MigraineReportFormData = {
    onsetDate: new Date(),
    severity: 7,
    durationHours: 4,
    auraPresent: true,
    auraTypes: ['visual', 'sensory'],
    painCharacter: 'throbbing',
    symptoms: ['nausea', 'photophobia', 'cognitive_fog'],
    triggers: ['stress', 'lack_of_sleep', 'bright_lights'],
    otherTriggerNotes: '',
    medicationTaken: 'Ibuprofen 400mg',
    medicationTiming: '0-1h',
    reliefLevel: 'partial',
    impactMissedWork: false,
    impactHadToRest: true,
    impactScore: 6,
    notes: 'Test migraine report - started during afternoon meeting'
  };

  try {
    const report = await service.createReport(sampleData);
    console.log('✅ Created sample report:', report);
    return report;
  } catch (error) {
    console.error('❌ Failed to create report:', error);
    throw error;
  }
}

/**
 * Fetch and display all stored reports
 */
export async function listAllReports() {
  const service = getMigraineService();
  
  try {
    const reports = await service.getAllReports();
    console.log(`✅ Found ${reports.length} reports:`);
    reports.forEach((report, index) => {
      console.log(`\n${index + 1}. Report ${report.id}`);
      console.log(`   Onset: ${new Date(report.onsetAt).toLocaleString()}`);
      console.log(`   Severity: ${report.severity}/10`);
      console.log(`   Duration: ${report.durationHours || 'N/A'} hours`);
      console.log(`   Symptoms: ${report.symptoms.join(', ')}`);
      console.log(`   Triggers: ${report.triggers.join(', ')}`);
    });
    return reports;
  } catch (error) {
    console.error('❌ Failed to fetch reports:', error);
    throw error;
  }
}

/**
 * Export all reports in ML-friendly format
 */
export async function exportForML() {
  const service = getMigraineService();
  
  try {
    const mlData = await service.exportForML();
    console.log('✅ ML Export:', mlData);
    console.log(`   Total samples: ${mlData.length}`);
    
    if (mlData.length > 0) {
      console.log('\n   Sample features:', Object.keys(mlData[0]));
    }
    
    return mlData;
  } catch (error) {
    console.error('❌ Failed to export for ML:', error);
    throw error;
  }
}

/**
 * Test reports within a date range
 */
export async function getReportsInRange(startDate: Date, endDate: Date) {
  const service = getMigraineService();
  
  try {
    const reports = await service.getReportsByDateRange(startDate, endDate);
    console.log(`✅ Found ${reports.length} reports between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`);
    return reports;
  } catch (error) {
    console.error('❌ Failed to fetch reports in range:', error);
    throw error;
  }
}

/**
 * Create multiple sample reports for testing
 */
export async function createMultipleSamples(count: number = 5) {
  const service = getMigraineService();
  const reports: Awaited<ReturnType<typeof service.createReport>>[] = [];
  
  console.log(`Creating ${count} sample reports...`);
  
  const painOptions: ('throbbing' | 'stabbing' | 'pressure' | 'other')[] = ['throbbing', 'stabbing', 'pressure', 'other'];
  const reliefOptions: ('none' | 'partial' | 'good')[] = ['none', 'partial', 'good'];
  const timingOptions: ('0-1h' | '1-3h' | '3-6h' | '>6h')[] = ['0-1h', '1-3h', '3-6h', '>6h'];
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const onsetDate = new Date();
    onsetDate.setDate(onsetDate.getDate() - daysAgo);
    
    const sampleData: MigraineReportFormData = {
      onsetDate,
      severity: Math.floor(Math.random() * 10) + 1,
      durationHours: Math.floor(Math.random() * 12) + 1,
      auraPresent: Math.random() > 0.5,
      auraTypes: Math.random() > 0.5 ? ['visual'] : [],
      painCharacter: painOptions[Math.floor(Math.random() * painOptions.length)],
      symptoms: ['nausea', 'photophobia', 'cognitive_fog'].slice(0, Math.floor(Math.random() * 3) + 1) as any,
      triggers: ['stress', 'lack_of_sleep', 'bright_lights'].slice(0, Math.floor(Math.random() * 3) + 1) as any,
      otherTriggerNotes: '',
      medicationTaken: Math.random() > 0.5 ? 'Ibuprofen 400mg' : '',
      medicationTiming: timingOptions[Math.floor(Math.random() * timingOptions.length)],
      reliefLevel: reliefOptions[Math.floor(Math.random() * reliefOptions.length)],
      impactMissedWork: Math.random() > 0.7,
      impactHadToRest: Math.random() > 0.5,
      impactScore: Math.floor(Math.random() * 10),
      notes: `Test report #${i + 1} from ${daysAgo} days ago`
    };
    
    try {
      const report = await service.createReport(sampleData);
      reports.push(report);
      console.log(`✅ Created report ${i + 1}/${count}`);
    } catch (error) {
      console.error(`❌ Failed to create report ${i + 1}:`, error);
    }
  }
  
  console.log(`\n✅ Created ${reports.length} sample reports`);
  return reports;
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🧪 Running Migraine Service Tests...\n');
  
  try {
    console.log('1️⃣ Creating sample report...');
    await createSampleReport();
    
    console.log('\n2️⃣ Listing all reports...');
    await listAllReports();
    
    console.log('\n3️⃣ Exporting for ML...');
    await exportForML();
    
    console.log('\n4️⃣ Testing date range query (last 7 days)...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    await getReportsInRange(startDate, endDate);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
  }
}

// Export for console usage
if (typeof window !== 'undefined') {
  (window as any).testMigraine = {
    createSampleReport,
    listAllReports,
    exportForML,
    getReportsInRange,
    createMultipleSamples,
    runAllTests
  };
  
  console.log('💡 Migraine test utilities loaded! Try:');
  console.log('   testMigraine.createSampleReport()');
  console.log('   testMigraine.listAllReports()');
  console.log('   testMigraine.exportForML()');
  console.log('   testMigraine.createMultipleSamples(5)');
  console.log('   testMigraine.runAllTests()');
}
