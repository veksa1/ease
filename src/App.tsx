import React, { useState, useEffect } from 'react';
import { Moon, Heart, Activity, MapPin, Calendar, Smartphone, Watch, Zap, Coffee, Droplets, Wind } from 'lucide-react';
import { sqliteService } from './services/sqliteService';
import { Button } from './components/ui/button';
import { AccessibleSwitch } from './components/ui/accessible-switch';
import { Label } from './components/ui/label';
import { OnboardingProgress } from './components/OnboardingProgress';
import { DataSourceCard } from './components/DataSourceCard';
import { ConsentItem } from './components/ConsentItem';
import { DeviceCard } from './components/DeviceCard';
import { HomeScreen } from './components/HomeScreen';
import { HomeScreenContainer } from './components/HomeScreenContainer';
import { BottomNav } from './components/BottomNav';
import { QuickCheckFlow } from './components/QuickCheckFlow';
import { DiaryScreen } from './components/DiaryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { SootheMode } from './components/SootheMode';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { useRiskPrediction } from './hooks/useDemoData';
import { RiskVariable } from './types';

export default function App() {
  const [lowStimulationMode, setLowStimulationMode] = useState(false);
  const [sootheModeData, setSootheModeData] = useState<{ riskVariables: RiskVariable[], riskPercentage: number } | null>(null);
  
  // Check if user has seen onboarding
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  
  useEffect(() => {
    sqliteService.getSetting('has_seen_onboarding').then(value => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);
  
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    // Skip onboarding if already seen
    if (hasSeenOnboarding) return 'home';
    return 'onboarding-1';
  });
  
  const [onboardingStep, setOnboardingStep] = useState(1);
  
  // Get risk prediction hook to update risk
  const { updateRiskWithQuickCheck } = useRiskPrediction();
  
  // Get streak count from SQLite
  const [streakCount, setStreakCount] = useState(7);
  
  useEffect(() => {
    sqliteService.getSetting('streak_count').then(value => {
      if (value) {
        setStreakCount(parseInt(value, 10));
      }
    });
  }, []);
  
  // Consent state
  const [consents, setConsents] = useState({
    hrv: true,
    sleep: false,
    calendar: true,
    weather: false,
    screenTime: false,
  });

  // Device connection state
  const [devices, setDevices] = useState({
    appleHealth: { connected: true, lastSync: '2 min ago' },
    fitbit: { connected: false, lastSync: undefined },
    garmin: { connected: true, lastSync: '1 hour ago' },
    oura: { connected: false, lastSync: undefined },
    whoop: { connected: false, lastSync: undefined },
  });

  const handleConsentChange = (key: keyof typeof consents) => (checked: boolean) => {
    setConsents(prev => ({ ...prev, [key]: checked }));
  };

  const hasRequiredConsent = () => {
    return consents.hrv || consents.sleep || consents.calendar;
  };

  const hasConnectedDevice = () => {
    return Object.values(devices).some(device => device.connected);
  };

  const isOnboarding = currentScreen.startsWith('onboarding');

  // Onboarding navigation
  const handleOnboardingNext = () => {
    if (onboardingStep === 1) {
      setOnboardingStep(2);
      setCurrentScreen('onboarding-2');
    } else if (onboardingStep === 2) {
      setOnboardingStep(3);
      setCurrentScreen('onboarding-3');
    } else if (onboardingStep === 3) {
      setCurrentScreen('connect-devices');
    }
  };

  const handleOnboardingComplete = () => {
    sqliteService.setSetting('has_seen_onboarding', 'true');
    setCurrentScreen('home');
  };

  const handleOnboardingSkip = () => {
    if (onboardingStep < 3) {
      setOnboardingStep(3);
      setCurrentScreen('onboarding-3');
    } else {
      handleOnboardingComplete();
    }
  };

  return (
    <div className={`min-h-screen bg-background flex flex-col ${lowStimulationMode ? 'low-stimulation' : ''}`}>
      {/* Onboarding Screens */}
      {currentScreen === 'onboarding-1' && (
        <>
          <header className="px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <OnboardingProgress currentStep={1} totalSteps={3} />
            </div>
          </header>
          <main className="flex-1 px-6 pb-6">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-4 pt-8 pb-6">
                <h1 className="text-display">Ease UI v0.1</h1>
                <p className="text-body text-muted-foreground max-w-sm mx-auto">
                  Predict and prevent migraines with personalized risk estimates based on your unique patterns.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-card border border-border" style={{ borderRadius: '12px' }}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-body">Early warnings</h3>
                      <p className="text-label text-muted-foreground">
                        Get alerts hours before risk peaks
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border" style={{ borderRadius: '12px' }}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-body">Learn what helps</h3>
                      <p className="text-label text-muted-foreground">
                        Discover your unique triggers and protective factors
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border" style={{ borderRadius: '12px' }}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <Moon className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-body">Private and secure</h3>
                      <p className="text-label text-muted-foreground">
                        On-device processing. You control your data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleOnboardingNext}
                  className="w-full h-12"
                  style={{ borderRadius: '12px' }}
                >
                  Get started
                </Button>
                <div className="text-center">
                  <button
                    onClick={handleOnboardingSkip}
                    className="text-label text-muted-foreground hover:text-foreground transition-colors p-2"
                    style={{ minHeight: '44px' }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {currentScreen === 'onboarding-2' && (
        <>
          <header className="px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <OnboardingProgress currentStep={2} totalSteps={3} />
            </div>
          </header>
          <main className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <h1 className="text-h1">What data helps?</h1>
                <p className="text-body text-muted-foreground">
                  Select the data sources you'd like to connect. The more data, the better Ease can learn your patterns.
                </p>
              </div>

              <div className="space-y-3">
                <DataSourceCard
                  icon={Activity}
                  title="Heart rate variability"
                  description="Stress and recovery tracking"
                  iconBgColor="bg-primary/10"
                  iconColor="text-primary"
                />
                <DataSourceCard
                  icon={Moon}
                  title="Sleep patterns"
                  description="Sleep quality and duration tracking"
                  iconBgColor="bg-accent/10"
                  iconColor="text-accent"
                />
                <DataSourceCard
                  icon={Smartphone}
                  title="Screen time"
                  description="Daily device usage patterns"
                  iconBgColor="bg-success/10"
                  iconColor="text-success"
                />
                <DataSourceCard
                  icon={Calendar}
                  title="Calendar events"
                  description="Detect stress patterns from your schedule"
                  iconBgColor="bg-warning/10"
                  iconColor="text-warning"
                />
                <DataSourceCard
                  icon={MapPin}
                  title="Location and weather"
                  description="Temperature, pressure, and air quality"
                  iconBgColor="bg-critical/10"
                  iconColor="text-critical"
                />
              </div>

              <div
                className="p-4 rounded-xl bg-muted border border-border space-y-2"
                style={{ borderRadius: '12px' }}
              >
                <h3 className="text-body flex items-center gap-2">
                  <span className="text-success">●</span>
                  Private and secure
                </h3>
                <ul className="space-y-1 text-label text-muted-foreground ml-4">
                  <li>• On-device processing where possible</li>
                  <li>• You control what data is shared</li>
                  <li>• Delete your data anytime</li>
                </ul>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  onClick={handleOnboardingNext}
                  className="w-full h-12"
                  style={{ borderRadius: '12px' }}
                >
                  Choose data sources
                </Button>
                <div className="text-center">
                  <button
                    onClick={handleOnboardingSkip}
                    className="text-label text-muted-foreground hover:text-foreground transition-colors p-2"
                    style={{ minHeight: '44px' }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {currentScreen === 'onboarding-3' && (
        <>
          <header className="px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <OnboardingProgress currentStep={3} totalSteps={3} />
            </div>
          </header>
          <main className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <h1 className="text-h1">Your permissions</h1>
                <p className="text-body text-muted-foreground">
                  Choose which data Ease can access. You can change these anytime in settings.
                </p>
              </div>

              <div className="space-y-3">
                <ConsentItem
                  icon={Activity}
                  label="Heart rate variability"
                  description="Stress and recovery patterns"
                  checked={consents.hrv}
                  onCheckedChange={handleConsentChange('hrv')}
                  required
                />
                <ConsentItem
                  icon={Moon}
                  label="Sleep patterns"
                  description="Sleep quality and duration"
                  checked={consents.sleep}
                  onCheckedChange={handleConsentChange('sleep')}
                  required
                />
                <ConsentItem
                  icon={Calendar}
                  label="Calendar events"
                  description="Identify stress from your schedule"
                  checked={consents.calendar}
                  onCheckedChange={handleConsentChange('calendar')}
                  required
                />
                <ConsentItem
                  icon={MapPin}
                  label="Location and weather"
                  description="Temperature, pressure, air quality"
                  checked={consents.weather}
                  onCheckedChange={handleConsentChange('weather')}
                />
                <ConsentItem
                  icon={Smartphone}
                  label="Screen time"
                  description="Device usage patterns"
                  checked={consents.screenTime}
                  onCheckedChange={handleConsentChange('screenTime')}
                />
              </div>

              <div
                className="p-4 rounded-xl bg-muted border border-border space-y-2"
                style={{ borderRadius: '12px' }}
              >
                <p className="text-label text-muted-foreground">
                  <strong>Note:</strong> At least one of Heart rate variability, Sleep patterns, or Calendar events is required for Ease to provide predictions.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleOnboardingNext}
                  disabled={!hasRequiredConsent()}
                  className="w-full h-12"
                  style={{ borderRadius: '12px' }}
                >
                  Agree and continue
                </Button>
              </div>
            </div>
          </main>
        </>
      )}

      {currentScreen === 'connect-devices' && (
        <main className="flex-1 px-6 pt-6 pb-6 overflow-y-auto">
          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-2">
              <h1 className="text-h1">Connect devices</h1>
              <p className="text-body text-muted-foreground">
                Connect your health devices to start tracking patterns.
              </p>
            </div>

            <div
              className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-2"
              style={{ borderRadius: '12px' }}
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-body">Why connect devices?</h3>
                  <p className="text-label text-muted-foreground">
                    HRV and sleep data are strong predictors of migraine onset. Connecting your devices helps Ease learn your unique patterns and provide early warnings.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <DeviceCard
                icon={Heart}
                name="Apple Health / Google Fit"
                status={devices.appleHealth.connected ? 'connected' : 'not-connected'}
                lastSync={devices.appleHealth.lastSync}
                onManageClick={() => {}}
                onConnectClick={() => {
                  setDevices(prev => ({
                    ...prev,
                    appleHealth: { connected: true, lastSync: 'Just now' }
                  }));
                }}
              />
              <DeviceCard
                icon={Activity}
                name="Fitbit"
                status={devices.fitbit.connected ? 'connected' : 'not-connected'}
                lastSync={devices.fitbit.lastSync}
                onManageClick={() => {}}
                onConnectClick={() => {
                  setDevices(prev => ({
                    ...prev,
                    fitbit: { connected: true, lastSync: 'Just now' }
                  }));
                }}
              />
              <DeviceCard
                icon={Watch}
                name="Garmin"
                status={devices.garmin.connected ? 'connected' : 'not-connected'}
                lastSync={devices.garmin.lastSync}
                onManageClick={() => {}}
                onConnectClick={() => {
                  setDevices(prev => ({
                    ...prev,
                    garmin: { connected: true, lastSync: 'Just now' }
                  }));
                }}
              />
              <DeviceCard
                icon={Moon}
                name="Oura Ring"
                status={devices.oura.connected ? 'connected' : 'not-connected'}
                lastSync={devices.oura.lastSync}
                onManageClick={() => {}}
                onConnectClick={() => {
                  setDevices(prev => ({
                    ...prev,
                    oura: { connected: true, lastSync: 'Just now' }
                  }));
                }}
              />
              <DeviceCard
                icon={Zap}
                name="WHOOP"
                status={devices.whoop.connected ? 'connected' : 'not-connected'}
                lastSync={devices.whoop.lastSync}
                onManageClick={() => {}}
                onConnectClick={() => {
                  setDevices(prev => ({
                    ...prev,
                    whoop: { connected: true, lastSync: 'Just now' }
                  }));
                }}
              />
            </div>

            <div className="pt-2 space-y-3">
              <Button
                onClick={handleOnboardingComplete}
                disabled={!hasConnectedDevice()}
                className="w-full h-12"
                style={{ borderRadius: '12px' }}
              >
                Continue
              </Button>
              <div className="text-center">
                <button
                  onClick={handleOnboardingComplete}
                  className="text-label text-muted-foreground hover:text-foreground transition-colors underline p-2"
                  style={{ minHeight: '44px' }}
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Main App Screens */}
      {currentScreen.startsWith('quick-check') && (
        <QuickCheckFlow
          onComplete={(data) => {
            // Update risk with QuickCheck data
            updateRiskWithQuickCheck(data);
            
            // Increment and save streak
            const newStreak = streakCount + 1;
            setStreakCount(newStreak);
            sqliteService.setSetting('streak_count', newStreak.toString());
            
            // Return to home
            setCurrentScreen('home');
          }}
          onBack={() => setCurrentScreen('home')}
          streakCount={streakCount}
        />
      )}

      {currentScreen === 'diary' && (
        <DiaryScreen
          onBack={() => setCurrentScreen('home')}
          onNavigate={(tab) => setCurrentScreen(tab)}
          onExportPDF={() => setCurrentScreen('share-with-clinician')}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileScreen
          onBack={() => setCurrentScreen('home')}
          onNavigate={(tab) => setCurrentScreen(tab)}
          onDevicesClick={() => setCurrentScreen('connect-devices')}
        />
      )}

      {currentScreen === 'insights' && (
        <InsightsScreen
          onBack={() => setCurrentScreen('home')}
          onNavigate={(tab) => setCurrentScreen(tab)}
        />
      )}

      {currentScreen === 'soothe-mode' && (
        sootheModeData ? (
          <SootheMode 
            onClose={() => setCurrentScreen('home')}
            riskVariables={sootheModeData.riskVariables}
            riskPercentage={sootheModeData.riskPercentage}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <p className="text-body text-muted-foreground">Loading personalized instructions...</p>
          </div>
        )
      )}

      {currentScreen === 'home' && (
        <>
          <HomeScreenContainer
            onQuickCheckClick={() => setCurrentScreen('quick-check')}
            onInsightsClick={() => setCurrentScreen('insights')}
            onSootheModeClick={(riskVariables, riskPercentage) => {
              setSootheModeData({ riskVariables, riskPercentage });
              setCurrentScreen('soothe-mode');
            }}
            lowStimulationMode={lowStimulationMode}
          />
          <BottomNav
            activeTab="home"
            onNavigate={(tab) => setCurrentScreen(tab)}
          />
        </>
      )}

      {currentScreen === 'home-low-stimulation' && (
        <>
          <HomeScreenContainer
            onQuickCheckClick={() => setCurrentScreen('quick-check')}
            onInsightsClick={() => setCurrentScreen('insights')}
            onSootheModeClick={(riskVariables, riskPercentage) => {
              setSootheModeData({ riskVariables, riskPercentage });
              setCurrentScreen('soothe-mode');
            }}
            lowStimulationMode={true}
          />
          <BottomNav
            activeTab="home"
            onNavigate={(tab) => setCurrentScreen(tab)}
          />
        </>
      )}
    </div>
  );
}
