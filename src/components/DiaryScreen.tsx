import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Activity,
  Moon,
  Eye,
  Circle,
  Calendar as CalendarIcon,
  Clock,
  Pill,
  Zap,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { PillChip } from './PillChip';
import { DayDetailsScreen } from './DayDetailsScreen';
import { BottomNav } from './BottomNav';

// Mock data types
type RiskLevel = 'low' | 'medium' | 'high' | null;
type DayData = {
  day: number;
  risk?: RiskLevel;
  hasAttack?: boolean;
  triggers?: string[];
  sleep?: number; // hours
  hrv?: number; // ms
  screenTime?: number; // hours
  entries?: Entry[];
};

type Entry = {
  time: string;
  type: 'attack' | 'symptom' | 'trigger' | 'medication';
  title: string;
  details?: string;
};

type FilterType = 'predictions' | 'attacks' | 'triggers';

interface DiaryScreenProps {
  onBack?: () => void;
  onNavigate?: (tab: 'home' | 'diary' | 'profile') => void;
  onExportPDF?: () => void;
}

export function DiaryScreen({ onBack, onNavigate, onExportPDF }: DiaryScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10)); // November 2025
  const [selectedDay, setSelectedDay] = useState<number | null>(15);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(['predictions', 'attacks', 'triggers']);
  const [showDayDetails, setShowDayDetails] = useState(false);

  // Mock data - replace with real data
  const mockDayData: Record<number, DayData> = {
    3: { day: 3, risk: 'high', hasAttack: true, triggers: ['stress', 'poor sleep'], sleep: 5.2, hrv: 38, screenTime: 8.5, entries: [
      { time: '09:15', type: 'attack', title: 'Migraine attack', details: 'Moderate pain, left side' },
      { time: '09:30', type: 'medication', title: 'Took sumatriptan 50mg' },
    ]},
    7: { day: 7, risk: 'medium', sleep: 6.8, hrv: 52, screenTime: 5.2 },
    10: { day: 10, risk: 'low', sleep: 7.5, hrv: 65, screenTime: 4.1 },
    12: { day: 12, risk: 'medium', hasAttack: true, triggers: ['caffeine'], sleep: 6.2, hrv: 45, screenTime: 7.3, entries: [
      { time: '14:20', type: 'attack', title: 'Aura only', details: 'Visual disturbances, no pain' },
    ]},
    15: { day: 15, risk: 'low', sleep: 8.1, hrv: 72, screenTime: 3.5, entries: [
      { time: '08:00', type: 'trigger', title: 'Had 3 cups of coffee' },
      { time: '12:30', type: 'symptom', title: 'Mild sensitivity to light' },
    ]},
    18: { day: 18, risk: 'medium', sleep: 6.5, hrv: 48, screenTime: 6.8 },
    21: { day: 21, risk: 'high', sleep: 5.8, hrv: 42, screenTime: 9.2 },
    24: { day: 24, risk: 'low', sleep: 7.8, hrv: 68, screenTime: 4.5 },
    27: { day: 27, risk: 'medium', hasAttack: true, triggers: ['weather'], sleep: 6.9, hrv: 50, screenTime: 5.8, entries: [
      { time: '16:45', type: 'attack', title: 'Migraine attack', details: 'Severe pain, nausea' },
      { time: '17:00', type: 'medication', title: 'Took sumatriptan 100mg' },
      { time: '19:30', type: 'symptom', title: 'Nausea subsided' },
    ]},
  };

  const selectedDayData = selectedDay ? mockDayData[selectedDay] : null;
  const hasData = selectedDayData !== undefined && selectedDayData !== null;

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'low': return 'bg-success';
      case 'medium': return 'bg-warning';
      case 'high': return 'bg-critical';
      default: return 'bg-transparent';
    }
  };

  const getRiskDotColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return 'transparent';
    }
  };

  const shouldShowDay = (dayData: DayData | undefined) => {
    if (!dayData) return true; // Show empty days
    
    const filters = activeFilters;
    if (filters.length === 0) return true;

    let show = false;
    if (filters.includes('predictions') && dayData.risk) show = true;
    if (filters.includes('attacks') && dayData.hasAttack) show = true;
    if (filters.includes('triggers') && dayData.triggers && dayData.triggers.length > 0) show = true;

    return show;
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
    setSelectedDay(null);
  };

  const allDays = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - startDay + 1;
    return dayNum > 0 && dayNum <= daysInMonth ? dayNum : null;
  });

  // If showing day details, render that screen instead
  if (showDayDetails && selectedDay) {
    return (
      <DayDetailsScreen
        date={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay)}
        dayNumber={selectedDay}
        onBack={() => setShowDayDetails(false)}
        onExportPDF={onExportPDF}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
              style={{ borderRadius: '8px' }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-h2 absolute left-1/2 -translate-x-1/2">Diary</h1>
            <div className="w-11" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <PillChip
            label="Predictions"
            selected={activeFilters.includes('predictions')}
            onToggle={() => toggleFilter('predictions')}
          />
          <PillChip
            label="Attacks"
            selected={activeFilters.includes('attacks')}
            onToggle={() => toggleFilter('attacks')}
          />
          <PillChip
            label="Triggers"
            selected={activeFilters.includes('triggers')}
            onToggle={() => toggleFilter('triggers')}
          />
        </div>
      </div>

      {/* Calendar */}
      <div className="px-6 py-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => changeMonth(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
            aria-label="Previous month"
            style={{ borderRadius: '8px' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-h2">{monthName}</h2>
          <button
            onClick={() => changeMonth(1)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
            aria-label="Next month"
            style={{ borderRadius: '8px' }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day labels */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-label text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Days */}
          {allDays.map((day, i) => {
            const dayData = day ? mockDayData[day] : undefined;
            const isVisible = shouldShowDay(dayData);
            const isSelected = day === selectedDay;
            const isToday = day === 14; // Mock today

            return (
              <button
                key={i}
                onClick={() => day && setSelectedDay(day)}
                disabled={!day}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-lg
                  transition-all duration-200 min-h-[44px]
                  ${!day ? 'invisible' : ''}
                  ${isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  ${!isSelected && day ? 'hover:bg-muted' : ''}
                  ${!isVisible && day ? 'opacity-30' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-primary/30' : ''}
                `}
                style={{ borderRadius: '8px' }}
                aria-label={day ? `Day ${day}` : undefined}
              >
                {day && (
                  <>
                    <span className="text-body mb-0.5">{day}</span>
                    
                    {/* Risk dot and attack pill */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
                      {/* Risk prediction dot */}
                      {dayData?.risk && activeFilters.includes('predictions') && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getRiskDotColor(dayData.risk) }}
                          aria-label={`${dayData.risk} risk`}
                        />
                      )}
                      
                      {/* Attack pill */}
                      {dayData?.hasAttack && activeFilters.includes('attacks') && (
                        <div
                          className={`w-3 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-critical'}`}
                          aria-label="Attack logged"
                        />
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="px-6 pb-6">
          <div
            className="rounded-xl border border-border bg-card p-6"
            style={{ borderRadius: '12px' }}
          >
            {hasData ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-h2">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long' })} {selectedDay}
                    </h3>
                    <p className="text-label text-muted-foreground">
                      {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay).toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                  </div>
                  {selectedDayData?.risk && (
                    <div className="flex items-center gap-2">
                      <Circle className={`w-3 h-3 fill-current ${
                        selectedDayData.risk === 'low' ? 'text-success' :
                        selectedDayData.risk === 'medium' ? 'text-warning' : 'text-critical'
                      }`} />
                      <span className="text-label capitalize">{selectedDayData.risk} risk</span>
                    </div>
                  )}
                </div>

                {/* Mini Timeline - Health Metrics */}
                {(selectedDayData?.sleep || selectedDayData?.hrv || selectedDayData?.screenTime) && (
                  <div className="mb-6 pb-6 border-b border-border">
                    <h4 className="text-label text-muted-foreground mb-4">Health metrics</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Sleep */}
                      {selectedDayData?.sleep && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Moon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-label text-muted-foreground">Sleep</p>
                              <p className="text-body">{selectedDayData.sleep}h</p>
                            </div>
                          </div>
                          {/* Mini bar */}
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min((selectedDayData.sleep / 10) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* HRV */}
                      {selectedDayData?.hrv && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                              <Activity className="w-4 h-4 text-success" />
                            </div>
                            <div className="flex-1">
                              <p className="text-label text-muted-foreground">HRV</p>
                              <p className="text-body">{selectedDayData.hrv}ms</p>
                            </div>
                          </div>
                          {/* Mini bar */}
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full"
                              style={{ width: `${Math.min((selectedDayData.hrv / 100) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Screen Time */}
                      {selectedDayData?.screenTime && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-warning" />
                            </div>
                            <div className="flex-1">
                              <p className="text-label text-muted-foreground">Screen</p>
                              <p className="text-body">{selectedDayData.screenTime}h</p>
                            </div>
                          </div>
                          {/* Mini bar */}
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-warning rounded-full"
                              style={{ width: `${Math.min((selectedDayData.screenTime / 12) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Entries List */}
                {selectedDayData?.entries && selectedDayData.entries.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-label text-muted-foreground mb-4">Entries</h4>
                    <div className="space-y-3">
                      {selectedDayData.entries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          style={{ borderRadius: '8px' }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            entry.type === 'attack' ? 'bg-critical/10' :
                            entry.type === 'medication' ? 'bg-primary/10' :
                            entry.type === 'trigger' ? 'bg-warning/10' : 'bg-muted'
                          }`}>
                            {entry.type === 'attack' ? <Zap className="w-4 h-4 text-critical" /> :
                             entry.type === 'medication' ? <Pill className="w-4 h-4 text-primary" /> :
                             entry.type === 'trigger' ? <Info className="w-4 h-4 text-warning" /> :
                             <Circle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-label text-muted-foreground">{entry.time}</span>
                              <span className="text-body">{entry.title}</span>
                            </div>
                            {entry.details && (
                              <p className="text-label text-muted-foreground">{entry.details}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 h-12 rounded-lg"
                    style={{ borderRadius: '8px' }}
                    onClick={() => setShowDayDetails(true)}
                  >
                    View details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-lg px-4"
                    style={{ borderRadius: '8px' }}
                    onClick={() => alert('Export PDF functionality')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              /* Empty State for Selected Day */
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-h2 mb-2">No data for this day</h3>
                <p className="text-body text-muted-foreground mb-6">
                  Start tracking by logging an attack, symptom, or trigger
                </p>
                <Button
                  className="h-12 rounded-lg"
                  style={{ borderRadius: '8px' }}
                  onClick={() => alert('Add entry functionality')}
                >
                  Add entry
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State - No Day Selected */}
      {!selectedDay && (
        <div className="px-6 pb-6">
          <div
            className="rounded-xl border border-border bg-card p-12 text-center"
            style={{ borderRadius: '12px' }}
          >
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-h2 mb-2">Select a day</h3>
            <p className="text-body text-muted-foreground">
              Tap a day on the calendar to view details
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab="diary" 
        onNavigate={onNavigate || ((tab) => tab === 'home' && onBack?.())} 
      />
    </div>
  );
}
