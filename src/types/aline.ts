/**
 * TypeScript types for ALINE demo data - Ticket 014
 * 
 * These types match the structure of demoUserAlex.json generated in Ticket 013
 */

export interface DemoUser {
  user_id: string;
  name: string;
  email: string;
  start_date: string;
  profile: {
    age: number;
    baseline_hrv: number;
    avg_sleep: number;
    stress_level: string;
  };
}

export interface HourlyRisk {
  hour: number;
  risk: number;
  lower: number;
  upper: number;
}

export interface DailyPrediction {
  day: number;
  date: string;
  daily_risk: {
    mean: number;
    lower: number;
    upper: number;
  };
  hourly_risks: HourlyRisk[];
  latents: {
    stress: number;
    sleep_debt: number;
    hormonal: number;
    environmental: number;
  };
  has_migraine: boolean;
}

export interface Correlation {
  id: string;
  label: string;
  strength: number;
  explanation: string;
}

export interface CalendarDay {
  day: number;
  date: string;
  risk: 'low' | 'medium' | 'high';
  hasAttack: boolean;
  riskPercentage: number;
}

export interface DemoDataset {
  user: DemoUser;
  predictions: DailyPrediction[];
  correlations: Correlation[];
  calendar: CalendarDay[];
  generated_at: string;
  model_version: string;
}

// User timeline (stored in localStorage)
export interface UserTimelineEntry {
  timestamp: string;
  type: 'quick_check' | 'migraine_report' | 'note';
  data: any;
}
