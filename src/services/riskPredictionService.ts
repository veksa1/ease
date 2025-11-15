/**
 * Risk Prediction Service
 * 
 * Connects to the ALINE backend /risk/daily endpoint to fetch
 * daily migraine risk predictions based on user features.
 */

import { apiClient } from '../utils/api';

export interface DailyRiskRequest {
  user_id: string;
  features: number[][];  // 24 hours of features, shape [24, n_features]
}

export interface DailyRiskResponse {
  user_id: string;
  mean_probability: number;
  lower_bound: number;
  upper_bound: number;
  timestamp: string;
}

class RiskPredictionService {
  /**
   * Fetch daily risk prediction from the backend
   * 
   * @param userId - User identifier
   * @param features - 24 hours of feature data [24, n_features]
   * @returns Daily risk prediction with confidence intervals
   */
  async getDailyRisk(userId: string, features: number[][]): Promise<DailyRiskResponse | null> {
    try {
      const requestBody: DailyRiskRequest = {
        user_id: userId,
        features: features,
      };

      const response = await apiClient.post<DailyRiskResponse>(
        '/risk/daily',
        requestBody
      );

      if (response.error) {
        console.error('Error fetching daily risk:', response.error);
        return null;
      }

      return response.data || null;
    } catch (error) {
      console.error('Exception in getDailyRisk:', error);
      return null;
    }
  }

  /**
   * Generate mock feature data for testing
   * In production, this would come from actual user data
   * 
   * @returns Mock 24-hour feature array
   */
  generateMockFeatures(numFeatures: number = 20): number[][] {
    const hours = 24;
    const features: number[][] = [];
    
    for (let hour = 0; hour < hours; hour++) {
      const hourlyFeatures: number[] = [];
      
      for (let feature = 0; feature < numFeatures; feature++) {
        // Generate reasonable mock values
        // In production, replace with actual sensor data
        hourlyFeatures.push(Math.random() * 2 - 1); // Random values between -1 and 1
      }
      
      features.push(hourlyFeatures);
    }
    
    return features;
  }

  /**
   * Check if the backend is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ status: string }>('/health');
      return response.data?.status === 'healthy' || response.data?.status === 'ok';
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const riskPredictionService = new RiskPredictionService();
