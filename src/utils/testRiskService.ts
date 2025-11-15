/**
 * Test script for Risk Prediction Service
 * 
 * This script demonstrates how to use the riskPredictionService
 * to fetch daily migraine risk predictions from the backend.
 * 
 * Run with: npm run test:risk-service
 * Or directly: node --loader tsx src/utils/testRiskService.ts
 */

import { riskPredictionService } from '../services/riskPredictionService';

/**
 * Test backend health check
 */
async function testHealthCheck() {
  console.log('🔍 Testing backend health check...');
  
  const isHealthy = await riskPredictionService.checkHealth();
  
  if (isHealthy) {
    console.log('✅ Backend is healthy and ready');
  } else {
    console.log('❌ Backend is not available');
  }
  
  return isHealthy;
}

/**
 * Test daily risk prediction
 */
async function testDailyRisk() {
  console.log('\n📊 Testing daily risk prediction...');
  
  const userId = 'test-user-123';
  const mockFeatures = riskPredictionService.generateMockFeatures(10);
  
  console.log(`Generated mock features: 24 hours x 10 features`);
  console.log(`Sample hour 0 features:`, mockFeatures[0].slice(0, 3).map(f => f.toFixed(3)));
  
  const prediction = await riskPredictionService.getDailyRisk(userId, mockFeatures);
  
  if (prediction) {
    console.log('✅ Successfully fetched prediction:');
    console.log(`   User ID: ${prediction.user_id}`);
    console.log(`   Mean Probability: ${(prediction.mean_probability * 100).toFixed(1)}%`);
    console.log(`   Confidence Interval: ${(prediction.lower_bound * 100).toFixed(1)}% - ${(prediction.upper_bound * 100).toFixed(1)}%`);
    console.log(`   Timestamp: ${prediction.timestamp}`);
    
    // Calculate confidence from interval width
    const intervalWidth = prediction.upper_bound - prediction.lower_bound;
    const confidence = Math.round(100 - (intervalWidth * 100));
    console.log(`   Confidence Score: ${confidence}%`);
    
  } else {
    console.log('❌ Failed to fetch prediction');
  }
  
  return prediction;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('========================================');
  console.log('  Risk Prediction Service Tests');
  console.log('========================================\n');
  
  try {
    // Test 1: Health check
    const isHealthy = await testHealthCheck();
    
    if (!isHealthy) {
      console.log('\n⚠️  Backend not available. Make sure the ALINE service is running:');
      console.log('   cd ALINE && uvicorn service.main:app --reload');
      return;
    }
    
    // Test 2: Daily risk prediction
    await testDailyRisk();
    
    console.log('\n========================================');
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

export { runTests, testHealthCheck, testDailyRisk };
