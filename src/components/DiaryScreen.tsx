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
import { useCalendar } from '../hooks/useDemoData';
import { CalendarEventsDisplay } from './CalendarEventsDisplay';
import { ReportMigraineModal } from './ReportMigraineMigral';

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
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 9)); // October 2025
  const [selectedDay, setSelectedDay] = useState<number | null>(16);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(['predictions', 'attacks', 'triggers']);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Load real calendar data
  const { loading, calendarDays } = useCalendar(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  // Convert calendar data to day data format
  const dayDataMap: Record<number, DayData> = {};
  
  if (!loading) {
    calendarDays.forEach(day => {
      dayDataMap[day.day] = {
        day: day.day,
        risk: day.risk,
        hasAttack: day.hasAttack,
        triggers: day.hasAttack ? ['Based on patterns'] : [],
        sleep: 7.0, 
        hrv: 55,
        screenTime: 4.5,
        entries: day.hasAttack ? [
          { time: '09:00', type: 'attack' as const, title: 'Migraine attack', details: 'Predicted event' }
        ] : []
      };
    });
  }

  // Use live data instead of mock data
  const mockDayData = dayDataMap;

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-label text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

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
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
              style={{ borderRadius: '8px' }}
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <h1 className="text-h2 absolute left-1/2 -translate-x-1/2">Diary</h1>
            <div className="w-10 md:w-11" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border bg-card">
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

      {/* Main Content - Desktop: Two columns, Mobile: Stacked */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:px-6 lg:py-6">
        {/* Calendar Section */}
        <div className="px-4 md:px-6 lg:px-0 py-4 md:py-6 lg:py-0">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <button
              onClick={() => changeMonth(-1)}
              className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-lg hover:bg-muted transition-colors"
              aria-label="Previous month"
              style={{ borderRadius: '8px' }}
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <h2 className="text-lg md:text-h2 font-semibold">{monthName}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-lg hover:bg-muted transition-colors"
              aria-label="Next month"
              style={{ borderRadius: '8px' }}
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div 
            className="grid grid-cols-7 gap-1.5 md:gap-2 lg:gap-3"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '0.375rem'
            }}
          >
            {/* Day labels */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs md:text-label text-muted-foreground py-1 md:py-2">
                {day}
              </div>
            ))}

            {/* Days */}
            {allDays.map((day, i) => {
              const dayData = day ? mockDayData[day] : undefined;
              const isVisible = shouldShowDay(dayData);
              const isSelected = day === selectedDay;
              const isToday = day === 14; // Mock today
              const hasData = dayData && (dayData.hasAttack || dayData.entries?.length || dayData.sleep || dayData.hrv);

              return (
                <button
                  key={i}
                  onClick={() => day && setSelectedDay(day)}
                  disabled={!day}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-lg
                    transition-all duration-200 min-h-[48px] md:min-h-[56px] lg:min-h-[64px]
                    text-sm md:text-base
                    ${!day ? 'invisible' : ''}
                    ${isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    ${!isSelected && hasData ? 'bg-primary/10 hover:bg-primary/20' : ''}
                    ${!isSelected && !hasData && day ? 'hover:bg-muted active:scale-95' : ''}
                    ${!isVisible && day ? 'opacity-30' : ''}
                    ${isToday && !isSelected ? 'ring-2 ring-primary/30' : ''}
                  `}
                  style={{ borderRadius: '8px' }}
                  aria-label={day ? `Day ${day}` : undefined}
                >
                  {day && (
                    <>
                      {/* Migraine indicator - red dot in top left */}
                      {dayData?.hasAttack && (
                        <div className="absolute top-1 left-1 w-2 h-2 md:w-2.5 md:h-2.5 bg-critical rounded-full" />
                      )}
                      
                      <span className="font-medium">{day}</span>
                      
                      {/* Risk dot and attack pill */}
                      <div className="absolute bottom-1 md:bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 md:gap-1">
                        {/* Risk prediction dot */}
                        {dayData?.risk && activeFilters.includes('predictions') && (
                          <div
                            className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                            style={{ backgroundColor: getRiskDotColor(dayData.risk) }}
                            aria-label={`${dayData.risk} risk`}
                          />
                        )}
                        
                        {/* Attack pill - keep for backward compatibility but now also have top-left dot */}
                        {dayData?.hasAttack && activeFilters.includes('attacks') && (
                          <div
                            className={`w-3 h-1.5 md:w-4 md:h-2 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-critical'}`}
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
          <div className="px-4 md:px-6 lg:px-0 pb-6 lg:pb-0">
            <div
              className="rounded-xl border border-border bg-card p-4 md:p-6 lg:sticky lg:top-24"
              style={{ borderRadius: '12px' }}
            >
              {hasData ? (
                <>
                  {/* Header */}
                  <div className="flex items-start md:items-center justify-between mb-4 md:mb-6 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-h2 font-semibold truncate">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long' })} {selectedDay}
                      </h3>
                      <p className="text-sm md:text-label text-muted-foreground">
                        {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay).toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </div>
                    {selectedDayData?.risk && (
                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        <Circle className={`w-2.5 h-2.5 md:w-3 md:h-3 fill-current ${
                          selectedDayData.risk === 'low' ? 'text-success' :
                          selectedDayData.risk === 'medium' ? 'text-warning' : 'text-critical'
                        }`} />
                        <span className="text-xs md:text-label capitalize">{selectedDayData.risk} risk</span>
                      </div>
                    )}
                  </div>

                  {/* Mini Timeline - Health Metrics */}
                  {(selectedDayData?.sleep || selectedDayData?.hrv || selectedDayData?.screenTime) && (
                    <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-border">
                      <h4 className="text-sm md:text-label text-muted-foreground mb-3 md:mb-4">Health metrics</h4>
                      <div className="grid grid-cols-3 gap-2 md:gap-4">
                        {/* Sleep */}
                        {selectedDayData?.sleep && (
                          <div className="space-y-1.5 md:space-y-2">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-1.5 md:gap-2">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs md:text-label text-muted-foreground">Sleep</p>
                                <p className="text-sm md:text-body font-medium">{selectedDayData.sleep}h</p>
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
                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-1.5 md:gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                              <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs md:text-label text-muted-foreground">HRV</p>
                              <p className="text-sm md:text-body font-medium">{selectedDayData.hrv}ms</p>
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
                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-1.5 md:gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 text-warning" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs md:text-label text-muted-foreground">Screen</p>
                              <p className="text-sm md:text-body font-medium">{selectedDayData.screenTime}h</p>
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

                  {/* Timeline Entries */}
                  {selectedDayData?.entries && selectedDayData.entries.length > 0 && (
                    <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-border">
                      <h4 className="text-sm md:text-label text-muted-foreground mb-3 md:mb-4">Timeline</h4>
                      <div className="space-y-2.5 md:space-y-3">
                        {selectedDayData.entries.map((entry, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 md:gap-3">
                            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center">
                              {entry.type === 'attack' ? <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-critical" /> :
                               entry.type === 'medication' ? <Pill className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" /> :
                               entry.type === 'trigger' ? <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-warning" /> :
                               <Circle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2 mb-1">
                                <span className="text-xs md:text-label text-muted-foreground">{entry.time}</span>
                                <span className="text-sm md:text-body font-medium">{entry.title}</span>
                              </div>
                              {entry.details && (
                                <p className="text-xs md:text-label text-muted-foreground">{entry.details}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Calendar Events */}
                  <div className="mb-4 md:mb-6">
                    <CalendarEventsDisplay
                      userId="demo-user"
                      date={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay)}
                      compact={true}
                      onNavigateToProfile={() => onNavigate?.('profile')}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 md:gap-3">
                    <Button
                      className="flex-1 h-10 md:h-12 rounded-lg text-sm md:text-base"
                      style={{ borderRadius: '8px' }}
                      onClick={() => setShowDayDetails(true)}
                    >
                      <span className="hidden md:inline">View details</span>
                      <span className="md:hidden">Details</span>
                      <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 md:ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 md:h-12 rounded-lg px-3 md:px-4"
                      style={{ borderRadius: '8px' }}
                      onClick={() => alert('Export PDF functionality')}
                    >
                      <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </div>
              </>
              ) : (
                /* Empty State for Selected Day */
                <div className="text-center py-6 md:py-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted mx-auto mb-3 md:mb-4 flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg md:text-h2 font-semibold mb-2">No data for this day</h3>
                  <p className="text-sm md:text-body text-muted-foreground mb-4 md:mb-6 px-4">
                    Start tracking by logging an attack, symptom, or trigger
                  </p>
                  <Button
                    className="h-10 md:h-12 rounded-lg text-sm md:text-base"
                    style={{ borderRadius: '8px' }}
                    onClick={() => setShowReportModal(true)}
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
          <div className="px-4 md:px-6 lg:px-0 pb-6 lg:pb-0">
            <div
              className="rounded-xl border border-border bg-card p-8 md:p-12 text-center lg:sticky lg:top-24"
              style={{ borderRadius: '12px' }}
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted mx-auto mb-3 md:mb-4 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg md:text-h2 font-semibold mb-2">Select a day</h3>
              <p className="text-sm md:text-body text-muted-foreground px-4">
                Tap a day on the calendar to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab="diary" 
        onNavigate={onNavigate || ((tab) => tab === 'home' && onBack?.())} 
      />

      {/* Migraine Report Modal */}
      <ReportMigraineModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        initialDate={selectedDay ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay) : undefined}
      />
    </div>
  );
}
