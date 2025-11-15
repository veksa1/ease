/**
 * Posterior Service
 * 
 * Connects to the ALINE backend /posterior/hourly endpoint to fetch
 * hourly posterior distributions based on user features.
 * This is used to get detailed hourly risk patterns from Quick Check data.
 */

import { apiClient } from '../utils/api';

export interface PosteriorRequest {
  user_id: string;
  features: number[][];  // 24 hours of features, shape [24, n_features]
}

export interface HourlyPosterior {
  hour: number;
  mean: number[];  // Mean latent state [z_dim]
  std: number[];   // Std latent state [z_dim]
}

export interface PosteriorResponse {
  user_id: string;
  hourly_posteriors: HourlyPosterior[];
  timestamp: string;
}

class PosteriorService {
  /**
   * Fetch hourly posterior distributions from the backend
   * 
   * @param userId - User identifier
   * @param features - 24 hours of feature data [24, n_features]
   * @returns Hourly posterior distributions
   */
  async getHourlyPosterior(userId: string, features: number[][]): Promise<PosteriorResponse | null> {
    try {
      const requestBody: PosteriorRequest = {
        user_id: userId,
        features: features,
      };

      const response = await apiClient.post<PosteriorResponse>(
        '/posterior/hourly',
        requestBody
      );

      if (response.error) {
        console.error('Error fetching hourly posterior:', response.error);
        return null;
      }

      return response.data || null;
    } catch (error) {
      console.error('Exception in getHourlyPosterior:', error);
      return null;
    }
  }

  /**
   * Calculate risk scores from posterior distributions
   * Higher uncertainty and certain latent patterns indicate higher risk
   * 
   * @param posteriors - Hourly posterior data
   * @returns Array of risk scores for each hour [0-1]
   */
  calculateHourlyRisks(posteriors: HourlyPosterior[]): number[] {
    return posteriors.map(posterior => {
      // Calculate average uncertainty (higher std = higher risk)
      const avgStd = posterior.std.reduce((sum, s) => sum + s, 0) / posterior.std.length;
      
      // Calculate latent state magnitude (some patterns indicate risk)
      const magnitude = Math.sqrt(
        posterior.mean.reduce((sum, m) => sum + m * m, 0)
      );
      
      // Combine uncertainty and magnitude into risk score
      // Normalize to 0-1 range (these are heuristic thresholds)
      const uncertaintyScore = Math.min(1, avgStd / 2);
      const magnitudeScore = Math.min(1, magnitude / 10);
      
      // Weight uncertainty more heavily (70% uncertainty, 30% magnitude)
      const risk = 0.7 * uncertaintyScore + 0.3 * magnitudeScore;
      
      return Math.max(0, Math.min(1, risk));
    });
  }

  /**
   * Find the hours with highest risk
   * 
   * @param posteriors - Hourly posterior data
   * @param topK - Number of top risk hours to return
   * @returns Array of hour indices sorted by risk (descending)
   */
  getHighRiskHours(posteriors: HourlyPosterior[], topK: number = 3): number[] {
    const risks = this.calculateHourlyRisks(posteriors);
    
    // Create array of [hour, risk] pairs
    const hourRiskPairs = risks.map((risk, hour) => ({ hour, risk }));
    
    // Sort by risk descending
    hourRiskPairs.sort((a, b) => b.risk - a.risk);
    
    // Return top K hours
    return hourRiskPairs.slice(0, topK).map(pair => pair.hour);
  }
}

// Export singleton instance
export const posteriorService = new PosteriorService();
