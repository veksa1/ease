import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Moon,
  Activity,
  Eye,
  Calendar as CalendarIcon,
  CloudRain,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Plus,
} from 'lucide-react';
import { MiniLineChart } from './MiniLineChart';
import { Button } from './ui/button';
import { PillChip } from './PillChip';
import { useHourlyRisk, useTimeline } from '../hooks/useDemoData';
import { useHourlyPosterior } from '../hooks/useHourlyPosterior';
import type { QuickCheckData } from '../services/featureConverter';

interface DayDetailsScreenProps {
  date: Date;
  dayNumber: number;
  onBack: () => void;
  onExportPDF?: () => void;
}

type MetricCard = {
  title: string;
  icon: React.ElementType;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  quality?: 'good' | 'warning' | 'critical' | 'neutral';
  details?: { label: string; value: string }[];
};

type Correlation = {
  label: string;
  significance: string;
};

export function DayDetailsScreen({ date, dayNumber, onBack, onExportPDF }: DayDetailsScreenProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [quickCheckData, setQuickCheckData] = useState<QuickCheckData | undefined>(undefined);

  // Fetch timeline entries for this specific date
  const dateString = date.toISOString().split('T')[0];
  const { entries } = useTimeline(dateString);

  // Extract Quick Check data from timeline for this day
  useEffect(() => {
    const quickCheckEntry = entries.find(e => e.type === 'quick_check');
    if (quickCheckEntry && quickCheckEntry.data) {
      setQuickCheckData(quickCheckEntry.data as QuickCheckData);
    }
  }, [entries]);

  // Fetch hourly posterior using the actual Quick Check data from that day
  const { loading: loadingPosterior, hourlyData } = useHourlyPosterior(quickCheckData);

  // Fallback to demo hourly risk data if no Quick Check data available
  const { loading: loadingDemoRisk, hourlyData: demoHourlyData } = useHourlyRisk(dateString);

  // Determine which data source to use
  const loading = quickCheckData ? loadingPosterior : loadingDemoRisk;
  const actualHourlyData = quickCheckData ? hourlyData : demoHourlyData;

  // Convert hourly risk data to chart data (0-100 scale)
  const predictionData = loading
    ? Array(24).fill(0).map((_, i) => 25 + Math.random() * 50) // Loading placeholder
    : actualHourlyData.map(h => h.risk * 100); // Real data from backend or demo

  // Fallback to mock data if no hourly data available
  const chartData = predictionData.length === 24
    ? predictionData
    : [
        25, 28, 32, 35, 40, 45, 52, 58, 62, 68, 72, 75, // Morning: gradually increasing
        78, 76, 74, 70, 65, 58, 52, 48, 42, 38, 32, 28, // Afternoon/Evening: decreasing
      ];

  // Mock metric cards data
  const metricCards: MetricCard[] = [
    {
      title: 'Sleep',
      icon: Moon,
      value: '6h 15m',
      subtitle: '78% efficiency',
      trend: 'down',
      trendValue: '-1.5h vs avg',
      quality: 'warning',
      details: [
        { label: 'Deep sleep', value: '1h 24m' },
        { label: 'REM sleep', value: '1h 12m' },
        { label: 'Light sleep', value: '3h 39m' },
        { label: 'Awake', value: '32m' },
      ],
    },
    {
      title: 'HRV',
      icon: Activity,
      value: '42ms',
      subtitle: 'Below baseline',
      trend: 'down',
      trendValue: '-18ms vs baseline',
      quality: 'critical',
      details: [
        { label: 'Your baseline', value: '60ms' },
        { label: 'Morning avg', value: '38ms' },
        { label: 'Evening avg', value: '46ms' },
      ],
    },
    {
      title: 'Screen time',
      icon: Eye,
      value: '7h 42m',
      subtitle: 'Above average',
      trend: 'up',
      trendValue: '+3h vs avg',
      quality: 'warning',
      details: [
        { label: 'Social media', value: '2h 18m' },
        { label: 'Work apps', value: '4h 12m' },
        { label: 'Other', value: '1h 12m' },
      ],
    },
    {
      title: 'Calendar load',
      icon: CalendarIcon,
      value: '6 meetings',
      subtitle: '3 back-to-back',
      trend: 'up',
      trendValue: 'High stress day',
      quality: 'critical',
      details: [
        { label: 'Total meeting time', value: '4h 30m' },
        { label: 'Breaks between', value: '3 × 15m' },
        { label: 'Longest stretch', value: '2h 30m' },
      ],
    },
    {
      title: 'Weather',
      icon: CloudRain,
      value: 'Pressure drop',
      subtitle: '-12 hPa in 6h',
      trend: 'down',
      trendValue: 'Significant change',
      quality: 'warning',
      details: [
        { label: 'Start pressure', value: '1013 hPa' },
        { label: 'End pressure', value: '1001 hPa' },
        { label: 'Temperature', value: '18°C → 14°C' },
      ],
    },
  ];

  // Mock correlations data
  const correlations: Correlation[] = [
    { label: 'Low HRV → Higher risk', significance: 'p<0.05' },
    { label: 'Poor sleep → Higher risk', significance: 'p<0.01' },
    { label: 'Pressure drop → Attacks', significance: 'p<0.05' },
    { label: 'Long screen time → Triggers', significance: 'p<0.1' },
  ];

  const formatDate = () => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getQualityColor = (quality?: 'good' | 'warning' | 'critical' | 'neutral') => {
    switch (quality) {
      case 'good':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'critical':
        return 'text-critical';
      default:
        return 'text-muted-foreground';
    }
  };

  const getQualityBgColor = (quality?: 'good' | 'warning' | 'critical' | 'neutral') => {
    switch (quality) {
      case 'good':
        return 'bg-success/10';
      case 'warning':
        return 'bg-warning/10';
      case 'critical':
        return 'bg-critical/10';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
              style={{ borderRadius: '8px' }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            {onExportPDF && (
              <Button
                onClick={onExportPDF}
                variant="outline"
                size="sm"
                className="gap-2"
                style={{ borderRadius: '8px' }}
              >
                <Plus className="w-4 h-4" />
                Export PDF
              </Button>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-h1 mb-1">{formatDate()}</h1>
            <p className="text-label text-muted-foreground">Day details & insights</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 pb-24 space-y-6">
        {/* Prediction Over 24h Chart */}
        <div
          className="rounded-xl border border-border bg-card p-6"
          style={{ borderRadius: '12px' }}
        >
          <div className="mb-4">
            <h2 className="text-h2 mb-1">Prediction over 24h</h2>
            <p className="text-label text-muted-foreground">
              Migraine risk throughout the day
            </p>
          </div>

          {/* Chart */}
          <div className="relative">
            {/* Y-axis labels */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex flex-col items-end text-label text-muted-foreground w-12 space-y-4">
                <span>100%</span>
                <span>50%</span>
                <span>0%</span>
              </div>
              <div className="flex-1 overflow-hidden max-w-full" style={{ aspectRatio: '280/120' }}>
                {loadingHourlyRisk ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-label text-muted-foreground">Loading hourly predictions...</p>
                  </div>
                ) : (
                  <MiniLineChart
                    data={chartData}
                    width={280}
                    height={120}
                    color="#EF4444"
                  />
                )}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex items-center gap-4">
              <div className="w-12" /> {/* Spacer for Y-axis */}
              <div className="flex-1 flex justify-between text-label text-muted-foreground">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>12am</span>
              </div>
            </div>
          </div>

          {/* Peak info */}
          <div
            className="mt-4 p-3 rounded-lg bg-critical/10 flex items-start gap-3"
            style={{ borderRadius: '8px' }}
          >
            <Info className="w-5 h-5 text-critical flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body text-critical">Peak risk at 12:00 PM (78%)</p>
              <p className="text-label text-muted-foreground">
                Consider taking preventive measures during this window
              </p>
            </div>
          </div>
        </div>

        {/* Health Metrics Cards */}
        <div>
          <h2 className="text-h2 mb-4">Health metrics</h2>
          <div className="space-y-3">
            {metricCards.map((card, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-card p-5"
                style={{ borderRadius: '12px' }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${getQualityBgColor(card.quality)} flex items-center justify-center`}
                      style={{ borderRadius: '8px' }}
                    >
                      <card.icon className={`w-5 h-5 ${getQualityColor(card.quality)}`} />
                    </div>
                    <div>
                      <h3 className="text-body">{card.title}</h3>
                      <p className="text-label text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-h2 ${getQualityColor(card.quality)}`}>
                      {card.value}
                    </p>
                  </div>
                </div>

                {/* Trend */}
                {card.trend && card.trendValue && (
                  <div
                    className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${getQualityBgColor(card.quality)}`}
                    style={{ borderRadius: '8px' }}
                  >
                    {getTrendIcon(card.trend)}
                    <span className={`text-label ${getQualityColor(card.quality)}`}>
                      {card.trendValue}
                    </span>
                  </div>
                )}

                {/* Details */}
                {card.details && card.details.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    {card.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-label text-muted-foreground">
                          {detail.label}
                        </span>
                        <span className="text-body">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Correlations Section */}
        <div
          className="rounded-xl border border-border bg-card p-6"
          style={{ borderRadius: '12px' }}
        >
          <div className="mb-4">
            <h2 className="text-h2 mb-1">Correlations</h2>
            <p className="text-label text-muted-foreground">
              Statistical relationships in your data
            </p>
          </div>

          {/* Correlation chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {correlations.map((correlation, index) => (
              <div
                key={index}
                className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2"
                style={{ borderRadius: '24px' }}
              >
                <span className="text-label text-primary">{correlation.label}</span>
                <span className="text-label text-primary/60">({correlation.significance})</span>
              </div>
            ))}
          </div>

          {/* Methodology button */}
          <Button
            variant="outline"
            className="w-full h-11 rounded-lg"
            style={{ borderRadius: '8px' }}
            onClick={() => setShowMethodology(!showMethodology)}
          >
            <Info className="w-4 h-4 mr-2" />
            {showMethodology ? 'Hide methodology' : 'See methodology'}
          </Button>

          {/* Methodology content */}
          {showMethodology && (
            <div
              className="mt-4 p-4 rounded-lg bg-muted space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
              style={{ borderRadius: '8px' }}
            >
              <div>
                <h4 className="text-body mb-1">Statistical significance</h4>
                <p className="text-label text-muted-foreground">
                  p-values indicate the probability that the correlation occurred by chance.
                  Lower values mean stronger evidence.
                </p>
              </div>
              <div>
                <h4 className="text-body mb-1">Interpretation</h4>
                <ul className="text-label text-muted-foreground space-y-1 list-disc list-inside">
                  <li>p &lt; 0.01: Very strong evidence</li>
                  <li>p &lt; 0.05: Strong evidence</li>
                  <li>p &lt; 0.1: Moderate evidence</li>
                </ul>
              </div>
              <div>
                <h4 className="text-body mb-1">Data source</h4>
                <p className="text-label text-muted-foreground">
                  Correlations are calculated from your last 90 days of tracked data using
                  Pearson correlation coefficients.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Note CTA */}
        <Button
          className="w-full h-14 rounded-lg"
          style={{ borderRadius: '8px' }}
          onClick={() => alert('Add note functionality')}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add note
        </Button>
      </div>
    </div>
  );
}
