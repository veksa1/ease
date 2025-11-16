/**
 * Policy Service
 * 
 * Connects to ALINE /policy/topk endpoint to get
 * recommendations for optimal measurement hours
 */

import { apiClient } from '../utils/api';

export interface PolicyRequest {
  user_id: string;
  features: number[][];  // 24 hours of features [24, n_features]
  k: number;             // Number of hours to recommend
}

export interface SelectedHour {
  hour: number;
  priority_score: number;
}

export interface PolicyResponse {
  user_id: string;
  selected_hours: SelectedHour[];
  k: number;
  timestamp: string;
}

interface CacheEntry {
  data: PolicyResponse;
  timestamp: number;
}

class PolicyService {
  private cache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cache key from features
   */
  private getCacheKey(userId: string, features: number[][]): string {
    // Hash features to create stable key
    // Use first 20 features and every 3rd hour to reduce key size
    const featureHash = features
      .filter((_, hour) => hour % 3 === 0)
      .map(hourFeatures => hourFeatures.slice(0, 10).map(f => f.toFixed(1)).join(','))
      .join('|');
    return `${userId}:${featureHash}`;
  }

  /**
   * Get top-k hours with caching
   */
  async getTopKHours(
    userId: string,
    features: number[][],
    k: number = 3
  ): Promise<PolicyResponse | null> {
    const cacheKey = this.getCacheKey(userId, features);
    const cached = this.cache.get(cacheKey);

    // Return cached if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('✅ Using cached policy recommendations');
      return cached.data;
    }

    // Fetch from API
    console.log('📡 Fetching fresh policy recommendations from API');
    const data = await this.fetchFromAPI(userId, features, k);

    if (data) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  }

  /**
   * Fetch policy recommendations from backend API
   */
  private async fetchFromAPI(
    userId: string,
    features: number[][],
    k: number
  ): Promise<PolicyResponse | null> {
    try {
      const requestBody: PolicyRequest = {
        user_id: userId,
        features: features,
        k: k,
      };

      const response = await apiClient.post<PolicyResponse>(
        '/policy/topk',
        requestBody
      );

      if (response.error) {
        console.error('Error fetching policy recommendations:', response.error);
        return this.buildMockPolicyResponse(userId, k);
      }

      return response.data || this.buildMockPolicyResponse(userId, k);
    } catch (error) {
      console.error('Exception in fetchFromAPI:', error);
      return this.buildMockPolicyResponse(userId, k);
    }
  }

  /**
   * Check if the backend policy endpoint is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health');
      return !response.error;
    } catch {
      return false;
    }
  }

  /**
   * Format hour as human-readable time
   */
  formatHour(hour: number): string {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  }

  /**
   * Get urgency level based on priority score
   */
  getUrgencyLevel(score: number): 'high' | 'medium' | 'low' {
    if (score > 1.2) return 'high';
    if (score > 0.8) return 'medium';
    return 'low';
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Policy cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    const entries = Array.from(this.cache.values());
    const oldestEntry = entries.length > 0
      ? Math.min(...entries.map(e => e.timestamp))
      : null;
    
    return {
      size: this.cache.size,
      oldestEntry,
    };
  }

  private buildMockPolicyResponse(userId: string, k: number): PolicyResponse {
    const selectedHours: SelectedHour[] = [
      { hour: 10, priority_score: 1.25 },
      { hour: 14, priority_score: 1.05 },
      { hour: 19, priority_score: 0.9 },
    ].slice(0, k);

    console.warn('[PolicyService] Using mock policy recommendations (offline mode)');

    return {
      user_id: userId,
      selected_hours: selectedHours,
      k,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const policyService = new PolicyService();
