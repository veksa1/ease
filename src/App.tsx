import React, { useState } from 'react';
import { Moon, Sun, Heart, Activity, MapPin, Calendar, Smartphone, Watch, Zap, Coffee, Droplets } from 'lucide-react';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { OnboardingProgress } from './components/OnboardingProgress';
import { DataSourceCard } from './components/DataSourceCard';
import { ConsentItem } from './components/ConsentItem';
import { DeviceCard } from './components/DeviceCard';
import { HomeScreen } from './components/HomeScreen';
import { BottomNav } from './components/BottomNav';
import { ImageWithFallback } from './components/figma/ImageWithFallback';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [lowStimulationMode, setLowStimulationMode] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'onboarding-1', 'onboarding-2', etc.
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [riskVariant, setRiskVariant] = useState<'low' | 'high'>('low'); // Toggle between low and high risk
  
  // Consent state - Mix of ON/OFF to demonstrate visibility
  const [consents, setConsents] = useState({
    hrv: true,
    sleep: false,
    screenTime: false,
    calendar: true,
    weather: false,
  });

  // Device connection state
  const [devices, setDevices] = useState({
    appleHealth: { connected: true, lastSync: '2 min ago' },
    fitbit: { connected: false, lastSync: undefined },
    garmin: { connected: true, lastSync: '1 hour ago' },
    oura: { connected: false, lastSync: undefined },
    whoop: { connected: false, lastSync: undefined },
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleNext = () => {
    if (onboardingStep < 4) {
      setOnboardingStep(onboardingStep + 1);
      setCurrentScreen(`onboarding-${onboardingStep + 1}`);
    } else {
      setCurrentScreen('home');
    }
  };

  const handleSkip = () => {
    // Skip to end or complete onboarding
    setCurrentScreen('home');
  };

  const handleConsentChange = (key: keyof typeof consents) => (checked: boolean) => {
    setConsents(prev => ({ ...prev, [key]: checked }));
  };

  const toggleRiskVariant = () => {
    setRiskVariant(riskVariant === 'low' ? 'high' : 'low');
  };

  // Show home screen or onboarding screens
  const isOnboarding = currentScreen.startsWith('onboarding');
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Only show for onboarding */}
      {isOnboarding && (
        <header className="px-6 pt-6 pb-4">
          <div className="max-w-md mx-auto flex items-center justify-between">
            {/* Progress */}
            <div className="flex-1 mr-4">
              <OnboardingProgress currentStep={onboardingStep} totalSteps={4} />
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Low Stimulation Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="low-stim"
                  checked={lowStimulationMode}
                  onCheckedChange={setLowStimulationMode}
                  className="scale-75"
                />
                <Label 
                  htmlFor="low-stim" 
                  className="text-label cursor-pointer whitespace-nowrap hidden sm:block"
                >
                  Low-stim
                </Label>
              </div>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      {currentScreen === 'home' ? (
        <>
          <HomeScreen
            userName="Alex"
            riskLevel={riskVariant === 'low' ? 'low' : 'high'}
            riskPercentage={riskVariant === 'low' ? 18 : 78}
            contextualAction={
              riskVariant === 'low'
                ? { icon: Coffee, label: 'Take a 5-min break' }
                : { icon: Droplets, label: 'Hydrate 250ml' }
            }
            streakCount={7}
            todayData={{
              sleepDuration: riskVariant === 'low' ? '7h 32m' : '5h 12m',
              hrvTrend: riskVariant === 'low' ? 'up' : 'down',
              hrvChange: riskVariant === 'low' ? '+8%' : '-12%',
              screenTime: riskVariant === 'low' ? '2h 15m' : '4h 48m',
              upcomingStressor:
                riskVariant === 'high' ? '3 back-to-back meetings' : undefined,
            }}
          />
          <BottomNav activeIndex={0} />
        </>
      ) : (
        <>
          <main className="flex-1 px-6 pb-24 overflow-y-auto">
            <div className="max-w-md mx-auto">
              {currentScreen === 'onboarding-1' && (
                <Screen1 onNext={handleNext} onSkip={handleSkip} lowStimMode={lowStimulationMode} />
              )}
              {currentScreen === 'onboarding-2' && <Screen2 onNext={handleNext} onSkip={handleSkip} />}
              {currentScreen === 'onboarding-3' && (
                <Screen3
                  consents={consents}
                  onConsentChange={handleConsentChange}
                  onComplete={handleNext}
                  lowStimulationMode={lowStimulationMode}
                />
              )}
              {currentScreen === 'onboarding-4' && (
                <Screen4
                  devices={devices}
                  onComplete={() => setCurrentScreen('home')}
                  onSkipForNow={() => setCurrentScreen('home')}
                />
              )}
            </div>
          </main>
        </>
      )}

      {/* Demo Controls (for toggling between screens and risk variants) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-3 px-6 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {currentScreen === 'home' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentScreen('onboarding-1')}
                className="rounded-lg"
                style={{ borderRadius: '8px' }}
              >
                Show Onboarding
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRiskVariant}
                className="rounded-lg"
                style={{ borderRadius: '8px' }}
              >
                Toggle Risk: {riskVariant === 'low' ? 'Low' : 'High'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onboardingStep > 1) {
                    setOnboardingStep(onboardingStep - 1);
                    setCurrentScreen(`onboarding-${onboardingStep - 1}`);
                  }
                }}
                disabled={onboardingStep === 1}
                className="rounded-lg"
                style={{ borderRadius: '8px' }}
              >
                Previous
              </Button>
              <span className="text-label text-muted-foreground">
                Step {onboardingStep} of 4
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onboardingStep < 4) {
                    setOnboardingStep(onboardingStep + 1);
                    setCurrentScreen(`onboarding-${onboardingStep + 1}`);
                  } else {
                    setCurrentScreen('home');
                  }
                }}
                className="rounded-lg"
                style={{ borderRadius: '8px' }}
              >
                {onboardingStep === 4 ? 'Home' : 'Next'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Screen 1: Value Proposition
function Screen1({ onNext, onSkip, lowStimMode }: { onNext: () => void; onSkip: () => void; lowStimMode: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-8 space-y-8 animate-in fade-in duration-500">
      {/* Skip Link */}
      <div className="self-end">
        <button
          onClick={onSkip}
          className="text-label text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div className={`w-full max-w-sm aspect-square rounded-3xl overflow-hidden transition-all duration-300 ${
        lowStimMode ? 'opacity-50 grayscale' : ''
      }`}>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1556816723-1ce827b9cfbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxtJTIwbWVkaXRhdGlvbiUyMGhlYWx0aCUyMHdlbGxuZXNzfGVufDF8fHx8MTc2MzE1OTM0NXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Calm meditation illustration"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="space-y-4 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <Heart className="w-4 h-4" />
          <span className="text-label">Migraine Prevention</span>
        </div>
        
        <h1 className="text-display">
          Predict migraines before they hit
        </h1>
        
        <p className="text-body text-muted-foreground max-w-sm mx-auto">
          Ease uses your health data and daily patterns to help you understand and prevent migraines before they start.
        </p>
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm pt-4">
        <Button
          onClick={onNext}
          className="w-full rounded-lg h-12"
          style={{ borderRadius: '8px' }}
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}

// Screen 2: Data Sources Overview
function Screen2({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col py-8 space-y-6 animate-in fade-in duration-500">
      {/* Skip Link */}
      <div className="self-end">
        <button
          onClick={onSkip}
          className="text-label text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-2 px-4">
        <h1 className="text-h1">Connect your data sources</h1>
        <p className="text-body text-muted-foreground">
          We analyze patterns from multiple sources to provide accurate predictions.
        </p>
      </div>

      {/* Data Source Cards */}
      <div className="space-y-3">
        <DataSourceCard
          icon={Activity}
          title="Heart Rate & HRV"
          description="From Apple Watch, Fitbit, or Garmin"
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />
        <DataSourceCard
          icon={Moon}
          title="Sleep Patterns"
          description="Sleep quality and duration tracking"
          iconBgColor="bg-accent/10"
          iconColor="text-accent"
        />
        <DataSourceCard
          icon={Smartphone}
          title="Screen Time"
          description="Daily device usage patterns"
          iconBgColor="bg-success/10"
          iconColor="text-success"
        />
        <DataSourceCard
          icon={Calendar}
          title="Calendar Events"
          description="Detect stress patterns from your schedule"
          iconBgColor="bg-warning/10"
          iconColor="text-warning"
        />
        <DataSourceCard
          icon={MapPin}
          title="Location & Weather"
          description="Temperature, pressure, and air quality"
          iconBgColor="bg-critical/10"
          iconColor="text-critical"
        />
      </div>

      {/* Privacy Note */}
      <div 
        className="p-4 rounded-xl bg-muted border border-border space-y-2"
        style={{ borderRadius: '12px' }}
      >
        <h3 className="text-body flex items-center gap-2">
          <span className="text-success">●</span>
          Private & Secure
        </h3>
        <ul className="space-y-1 text-label text-muted-foreground ml-4">
          <li>• On-device processing where possible</li>
          <li>• You control what data is shared</li>
          <li>• Delete your data anytime</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Button
          onClick={onNext}
          className="w-full rounded-lg h-12"
          style={{ borderRadius: '8px' }}
        >
          Choose data sources
        </Button>
      </div>
    </div>
  );
}

// Screen 3: Consent Granularity
function Screen3({ 
  consents, 
  onConsentChange, 
  onComplete,
  lowStimulationMode
}: { 
  consents: Record<string, boolean>; 
  onConsentChange: (key: string) => (checked: boolean) => void;
  onComplete: () => void;
  lowStimulationMode: boolean;
}) {
  const allRequired = consents.hrv || consents.sleep || consents.calendar;

  return (
    <div className="flex flex-col py-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-h1">Customize your permissions</h1>
        <p className="text-body text-muted-foreground">
          Choose which data sources Ease can access. You can change these anytime.
        </p>
      </div>

      {/* Consent Items */}
      <div 
        className="rounded-xl bg-card border border-border"
        style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
      >
        <ConsentItem
          id="consent-hrv"
          icon={Activity}
          title="Heart Rate Variability"
          description="Monitor stress levels and recovery"
          infoText="HRV data helps predict migraines by detecting changes in your autonomic nervous system. Processed on-device."
          checked={consents.hrv}
          onCheckedChange={onConsentChange('hrv')}
          badge="recommended"
          lowStimulationMode={lowStimulationMode}
        />
        
        <div className="border-t border-border" />
        
        <ConsentItem
          id="consent-sleep"
          icon={Moon}
          title="Sleep Data"
          description="Track sleep quality and duration"
          infoText="Poor sleep is a common migraine trigger. We analyze sleep patterns to identify potential risk periods."
          checked={consents.sleep}
          onCheckedChange={onConsentChange('sleep')}
          badge="recommended"
          lowStimulationMode={lowStimulationMode}
        />
        
        <div className="border-t border-border" />
        
        <ConsentItem
          id="consent-screen"
          icon={Smartphone}
          title="Screen Time"
          description="Monitor device usage patterns"
          infoText="Excessive screen time can trigger migraines. This data is processed locally and never leaves your device."
          checked={consents.screenTime}
          onCheckedChange={onConsentChange('screenTime')}
          badge="optional"
          lowStimulationMode={lowStimulationMode}
        />
        
        <div className="border-t border-border" />
        
        <ConsentItem
          id="consent-calendar"
          icon={Calendar}
          title="Calendar Access"
          description="Identify stressful periods and patterns"
          infoText="Calendar data helps identify stress patterns. We only analyze event metadata, not content."
          checked={consents.calendar}
          onCheckedChange={onConsentChange('calendar')}
          badge="optional"
          lowStimulationMode={lowStimulationMode}
        />
        
        <div className="border-t border-border" />
        
        <ConsentItem
          id="consent-weather"
          icon={MapPin}
          title="Location & Weather"
          description="Track environmental triggers"
          infoText="Weather changes are major migraine triggers. Location is used only for weather data and is not stored."
          checked={consents.weather}
          onCheckedChange={onConsentChange('weather')}
          badge="optional"
          lowStimulationMode={lowStimulationMode}
        />
      </div>

      {/* Legal Microcopy */}
      <div className="px-4 py-3 rounded-lg bg-muted/50 space-y-2">
        <p className="text-label text-muted-foreground">
          By continuing, you agree to Ease's{' '}
          <button className="text-primary hover:underline">Terms of Service</button>
          {' '}and{' '}
          <button className="text-primary hover:underline">Privacy Policy</button>.
        </p>
        <p className="text-label text-muted-foreground">
          Your health data is encrypted and stored securely. Ease is not a medical device and should not replace professional medical advice.
        </p>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Button
          onClick={onComplete}
          disabled={!allRequired}
          className="w-full rounded-lg h-12"
          style={{ borderRadius: '8px' }}
        >
          Agree & Continue
        </Button>
        {!allRequired && (
          <p className="text-label text-critical text-center mt-3">
            Please enable at least one health data source to continue
          </p>
        )}
      </div>
    </div>
  );
}

// Screen 4: Connect Devices
function Screen4({
  devices,
  onComplete,
  onSkipForNow,
}: {
  devices: Record<string, { connected: boolean; lastSync?: string }>;
  onComplete: () => void;
  onSkipForNow: () => void;
}) {
  const hasConnectedDevice = Object.values(devices).some((d) => d.connected);
  const allDisconnected = Object.values(devices).every((d) => !d.connected);

  return (
    <div className="flex flex-col py-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-h1">Connect devices</h1>
        <p className="text-body text-muted-foreground">
          Link your health apps and wearables to get the most accurate migraine predictions.
        </p>
      </div>

      {/* Info Banner */}
      <div
        className="p-4 rounded-xl bg-accent/10 border border-accent/20 space-y-2"
        style={{ borderRadius: '12px' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20 shrink-0"
          >
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

      {/* Device Cards or Empty State */}
      {allDisconnected ? (
        <div className="flex flex-col items-center text-center py-8 space-y-4">
          {/* Empty State Illustration */}
          <div className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1758348844355-2ef28345979d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGglMjB3ZWFyYWJsZSUyMHdhdGNofGVufDF8fHx8MTc2MzE2MDQ1N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Health wearables and devices"
              className="w-full h-full object-cover opacity-60"
            />
          </div>
          <div className="space-y-2 px-4">
            <h2 className="text-h2">No devices connected yet</h2>
            <p className="text-body text-muted-foreground">
              Connect at least one device to start tracking your health patterns.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Apple Health / Google Fit */}
          <DeviceCard
            icon={Heart}
            name="Apple Health / Google Fit"
            status={devices.appleHealth.connected ? 'connected' : 'not-connected'}
            lastSync={devices.appleHealth.lastSync}
            onManageClick={() => alert('Manage Apple Health permissions')}
            onConnectClick={() => alert('Connect Apple Health')}
          />

          {/* Fitbit */}
          <DeviceCard
            icon={Activity}
            name="Fitbit"
            status={devices.fitbit.connected ? 'connected' : 'not-connected'}
            lastSync={devices.fitbit.lastSync}
            onManageClick={() => alert('Manage Fitbit permissions')}
            onConnectClick={() => alert('Connect Fitbit')}
          />

          {/* Garmin */}
          <DeviceCard
            icon={Watch}
            name="Garmin"
            status={devices.garmin.connected ? 'connected' : 'not-connected'}
            lastSync={devices.garmin.lastSync}
            onManageClick={() => alert('Manage Garmin permissions')}
            onConnectClick={() => alert('Connect Garmin')}
          />

          {/* Oura */}
          <DeviceCard
            icon={Moon}
            name="Oura Ring"
            status={devices.oura.connected ? 'connected' : 'not-connected'}
            lastSync={devices.oura.lastSync}
            onManageClick={() => alert('Manage Oura permissions')}
            onConnectClick={() => alert('Connect Oura')}
          />

          {/* WHOOP */}
          <DeviceCard
            icon={Zap}
            name="WHOOP"
            status={devices.whoop.connected ? 'connected' : 'not-connected'}
            lastSync={devices.whoop.lastSync}
            onManageClick={() => alert('Manage WHOOP permissions')}
            onConnectClick={() => alert('Connect WHOOP')}
          />
        </div>
      )}

      {/* CTAs */}
      <div className="pt-2 space-y-3">
        <Button
          onClick={onComplete}
          disabled={!hasConnectedDevice}
          className="w-full rounded-lg h-12"
          style={{ borderRadius: '8px' }}
        >
          Continue
        </Button>
        
        {/* Secondary action */}
        <div className="text-center">
          <button
            onClick={onSkipForNow}
            className="text-label text-muted-foreground hover:text-foreground transition-colors underline"
          >
            I'll do this later
          </button>
        </div>

        {!hasConnectedDevice && (
          <p className="text-label text-warning text-center">
            Connect at least one device to continue
          </p>
        )}
      </div>
    </div>
  );
}
