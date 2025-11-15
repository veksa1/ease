/**
 * Test script for Posterior Service and Quick Check Integration
 * 
 * Demonstrates how Quick Check data is converted to features
 * and sent to the /posterior/hourly endpoint.
 * 
 * Run with: npm run test:posterior
 */

import { posteriorService } from '../services/posteriorService';
import { quickCheckToFeatures, type QuickCheckData } from '../services/featureConverter';
import { riskPredictionService } from '../services/riskPredictionService';

/**
 * Create sample Quick Check data
 */
function createSampleQuickCheck(): QuickCheckData {
  return {
    caffeine: {
      level: 'some',
      types: ['coffee'],
      lastIntake: '2 hours ago',
    },
    water: {
      amount: 'medium',
    },
    food: {
      level: 7,
      note: 'Had regular meals',
    },
    sleep: {
      hours: 7.5,
      quality: 8,
    },
  };
}

/**
 * Test feature conversion
 */
function testFeatureConversion() {
  console.log('🔧 Testing Quick Check to Features conversion...\n');
  
  const checkData = createSampleQuickCheck();
  
  console.log('Quick Check Input:');
  console.log('  Caffeine:', checkData.caffeine.level);
  console.log('  Water:', checkData.water.amount);
  console.log('  Food level:', checkData.food.level + '/10');
  console.log('  Sleep:', checkData.sleep?.hours + 'hrs, quality ' + checkData.sleep?.quality + '/10');
  
  const features = quickCheckToFeatures(checkData, 10);
  
  console.log('\n✅ Generated feature matrix:');
  console.log(`  Shape: [${features.length}, ${features[0].length}]`);
  console.log('  Sample features for hour 0:', features[0].map(f => f.toFixed(3)));
  console.log('  Sample features for hour 12:', features[12].map(f => f.toFixed(3)));
  
  return features;
}

/**
 * Test hourly posterior prediction
 */
async function testHourlyPosterior() {
  console.log('\n📊 Testing hourly posterior prediction...\n');
  
  // Check backend health
  const isHealthy = await riskPredictionService.checkHealth();
  
  if (!isHealthy) {
    console.log('❌ Backend not available. Start the ALINE service:');
    console.log('   cd ALINE && uvicorn service.main:app --reload\n');
    return null;
  }
  
  console.log('✅ Backend is healthy\n');
  
  // Generate features from Quick Check
  const checkData = createSampleQuickCheck();
  const features = quickCheckToFeatures(checkData, 20);
  
  // Fetch posterior
  const userId = 'test-user';
  const response = await posteriorService.getHourlyPosterior(userId, features);
  
  if (!response) {
    console.log('❌ Failed to fetch posterior data\n');
    return null;
  }
  
  console.log('✅ Received hourly posterior data:');
  console.log(`  User: ${response.user_id}`);
  console.log(`  Timestamp: ${response.timestamp}`);
  console.log(`  Hours: ${response.hourly_posteriors.length}`);
  
  // Show sample posteriors
  const sample = response.hourly_posteriors[0];
  console.log(`\n  Sample (Hour 0):`);
  console.log(`    Latent dimensions: ${sample.mean.length}`);
  console.log(`    Mean (first 3): [${sample.mean.slice(0, 3).map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`    Std (first 3): [${sample.std.slice(0, 3).map(v => v.toFixed(3)).join(', ')}]`);
  
  return response;
}

/**
 * Test risk calculation from posteriors
 */
function testRiskCalculation(response: any) {
  console.log('\n🎯 Testing risk calculation from posteriors...\n');
  
  if (!response || !response.hourly_posteriors) {
    console.log('⚠️  No posterior data to analyze\n');
    return;
  }
  
  const risks = posteriorService.calculateHourlyRisks(response.hourly_posteriors);
  
  console.log('✅ Calculated hourly risks:');
  
  // Show all 24 hours in a compact format
  const risksByPeriod = {
    'Night (12AM-6AM)': risks.slice(0, 6),
    'Morning (6AM-12PM)': risks.slice(6, 12),
    'Afternoon (12PM-6PM)': risks.slice(12, 18),
    'Evening (6PM-12AM)': risks.slice(18, 24),
  };
  
  for (const [period, periodRisks] of Object.entries(risksByPeriod)) {
    const avg = periodRisks.reduce((sum, r) => sum + r, 0) / periodRisks.length;
    console.log(`  ${period}: avg ${(avg * 100).toFixed(1)}%`);
  }
  
  // Identify high-risk hours
  const highRiskHours = posteriorService.getHighRiskHours(response.hourly_posteriors, 3);
  console.log('\n  Top 3 high-risk hours:', highRiskHours.map(h => {
    const display = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h-12}PM`;
    return `${display} (${(risks[h] * 100).toFixed(1)}%)`;
  }).join(', '));
  
  console.log('\n');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('========================================');
  console.log('  Quick Check → Posterior Integration');
  console.log('========================================\n');
  
  try {
    // Test 1: Feature conversion
    testFeatureConversion();
    
    // Test 2: Hourly posterior
    const posteriorResponse = await testHourlyPosterior();
    
    // Test 3: Risk calculation
    if (posteriorResponse) {
      testRiskCalculation(posteriorResponse);
    }
    
    console.log('========================================');
    console.log('  All tests completed!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, testFeatureConversion, testHourlyPosterior, testRiskCalculation };
