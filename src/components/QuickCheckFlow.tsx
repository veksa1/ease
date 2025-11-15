import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Coffee as CoffeeIcon,
  Droplets,
  Utensils,
  Flame,
  X,
  Clock,
  Zap,
  Activity,
} from 'lucide-react';
import { Button } from './ui/button';
import { SegmentedControl } from './SegmentedControl';
import { Slider } from './ui/slider';
import { PillChip } from './PillChip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

interface QuickCheckFlowProps {
  onComplete?: (data: QuickCheckData) => void;
  onBack?: () => void;
  streakCount?: number;
}

export interface QuickCheckData {
  caffeine: {
    level: 'none' | 'some' | 'lot' | null;
    types?: string[];
    lastIntake?: string;
  };
  water: {
    amount: 'none' | 'low' | 'medium' | 'high' | null;
  };
  food: {
    level: number;
    note?: string;
  };
}

export function QuickCheckFlow({
  onComplete,
  onBack,
  streakCount = 5,
}: QuickCheckFlowProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 'success'>(1);
  const [data, setData] = useState<QuickCheckData>({
    caffeine: { level: null },
    water: { amount: null },
    food: { level: 5 },
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top whenever the step changes
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    });
  }, [currentStep]);

  const handleContinue = () => {
    if (currentStep === 1) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(3);
    else if (currentStep === 3) setCurrentStep('success');
  };

  const handleBack = () => {
    if (currentStep === 1) onBack?.();
    else if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 'success') setCurrentStep(3);
  };

  const handleSkip = () => {
    handleContinue();
  };

  const handleComplete = () => {
    onComplete?.(data);
  };

  const getProgress = () => {
    if (currentStep === 1) return 33;
    if (currentStep === 2) return 67;
    if (currentStep === 3 || currentStep === 'success') return 100;
    return 0;
  };

  const getStepLabel = () => {
    if (currentStep === 1) return '1/3';
    if (currentStep === 2) return '2/3';
    if (currentStep === 3) return '3/3';
    return '';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top App Bar */}
      {currentStep !== 'success' && (
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-muted transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-h2 absolute left-1/2 -translate-x-1/2">Quick Check</h1>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                <Flame className="w-4 h-4" />
                <span className="text-label">Streak {streakCount}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-label text-muted-foreground">{getStepLabel()}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {currentStep === 1 && (
          <CaffeineStep
            value={data.caffeine}
            onChange={(caffeine) => setData({ ...data, caffeine })}
            onContinue={handleContinue}
            onSkip={handleSkip}
          />
        )}
        {currentStep === 2 && (
          <WaterStep
            value={data.water}
            onChange={(water) => setData({ ...data, water })}
            onContinue={handleContinue}
            onSkip={handleSkip}
          />
        )}
        {currentStep === 3 && (
          <FoodStep
            value={data.food}
            onChange={(food) => setData({ ...data, food })}
            onContinue={handleContinue}
            onSkip={handleSkip}
          />
        )}
        {currentStep === 'success' && (
          <SuccessStep onComplete={handleComplete} data={data} streakCount={streakCount} />
        )}
      </div>
    </div>
  );
}

// STEP 1: Caffeine
interface CaffeineStepProps {
  value: QuickCheckData['caffeine'];
  onChange: (value: QuickCheckData['caffeine']) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function CaffeineStep({ value, onChange, onContinue, onSkip }: CaffeineStepProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(value.types || []);
  const [lastIntake, setLastIntake] = useState<string>(value.lastIntake || '');

  const caffeineOptions = [
    {
      id: 'none' as const,
      label: 'None (0 mg)',
      icon: (
        <div className="relative">
          <CoffeeIcon className="w-10 h-10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-0.5 bg-current rotate-45" />
          </div>
        </div>
      ),
    },
    {
      id: 'some' as const,
      label: 'Some (~50–150 mg)',
      icon: <CoffeeIcon className="w-10 h-10" />,
    },
    {
      id: 'lot' as const,
      label: 'A lot (200+ mg)',
      icon: (
        <div className="flex gap-1">
          <CoffeeIcon className="w-10 h-10" />
          <CoffeeIcon className="w-10 h-10" />
        </div>
      ),
    },
  ];

  const caffeineTypes = ['Coffee', 'Espresso', 'Tea', 'Energy drink'];
  const intakeTimes = ['Now', '<2h', '2–6h', '>6h'];

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const saveDetails = () => {
    onChange({
      ...value,
      types: selectedTypes,
      lastIntake,
    });
    setShowDetails(false);
  };

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-h2">How much caffeine have you consumed today?</h2>
        <p className="text-label text-muted-foreground">Refines today's prediction</p>
      </div>

      {/* Caffeine Cards */}
      <div className="space-y-3">
        {caffeineOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange({ ...value, level: option.id })}
            className={`
              w-full p-6 rounded-xl border-2 transition-all duration-200
              flex items-center gap-4 text-left
              ${
                value.level === option.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'border-border bg-card hover:border-muted-foreground/20'
              }
            `}
            style={{ borderRadius: '12px', minHeight: '88px' }}
          >
            <div
              className={`
                flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center
                ${value.level === option.id ? 'text-primary' : 'text-muted-foreground'}
              `}
              style={{ borderRadius: '8px' }}
            >
              {option.icon}
            </div>
            <span className="text-body flex-1">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Add Details Link */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetTrigger asChild>
          <button className="text-label text-primary hover:underline">
            Add details (type & time)
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader className="mb-6">
            <SheetTitle>Caffeine details</SheetTitle>
            <SheetDescription>Optional — helps refine your prediction</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 pb-6">
            {/* Type */}
            <div className="space-y-3">
              <h3 className="text-body">Type</h3>
              <div className="flex flex-wrap gap-2">
                {caffeineTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className="transition-transform active:scale-95"
                  >
                    <div
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-label
                        transition-colors duration-200 border
                        ${
                          selectedTypes.includes(type)
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-secondary text-secondary-foreground border-border'
                        }
                      `}
                    >
                      {type}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Last Intake */}
            <div className="space-y-3">
              <h3 className="text-body">Last intake</h3>
              <div className="flex flex-wrap gap-2">
                {intakeTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setLastIntake(time)}
                    className="transition-transform active:scale-95"
                  >
                    <div
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-label
                        transition-colors duration-200 border
                        ${
                          lastIntake === time
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-secondary text-secondary-foreground border-border'
                        }
                      `}
                    >
                      {time}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={saveDetails}
              className="w-full h-12 rounded-lg"
              style={{ borderRadius: '8px' }}
            >
              Save details
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Action Buttons */}
      <div className="pt-4 space-y-3">
        <Button
          onClick={onContinue}
          disabled={!value.level}
          className="w-full h-12 rounded-lg"
          style={{ borderRadius: '8px' }}
        >
          Continue
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-label text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// STEP 2: Water
interface WaterStepProps {
  value: QuickCheckData['water'];
  onChange: (value: QuickCheckData['water']) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function WaterStep({ value, onChange, onContinue, onSkip }: WaterStepProps) {
  const waterOptions = [
    { id: 'none' as const, label: 'None' },
    { id: 'low' as const, label: '~250–500 ml' },
    { id: 'medium' as const, label: '~500–1000 ml' },
    { id: 'high' as const, label: '>1 L' },
  ];

  const handleLog250ml = () => {
    // Quick action to log 250ml
    if (value.amount === 'none' || !value.amount) onChange({ amount: 'low' });
    alert('Logged 250 ml');
  };

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-h2">How much water have you had so far?</h2>
        <p className="text-label text-muted-foreground">Refines today's prediction</p>
      </div>

      {/* Segmented Control */}
      <div className="space-y-4">
        <SegmentedControl
          options={waterOptions}
          value={value.amount ?? 'none'}
          onChange={(id) => onChange({ amount: id as QuickCheckData['water']['amount'] })}
        />

        {/* Tip */}
        <div className="flex items-start justify-between gap-3 p-4 rounded-lg bg-muted/50">
          <p className="text-label text-muted-foreground flex-1">
            Tip: regular hydration may reduce risk for some people.
          </p>
          <button
            onClick={handleLog250ml}
            className="text-label text-primary hover:underline whitespace-nowrap"
          >
            Log 250 ml
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 space-y-3">
        <Button
          onClick={onContinue}
          className="w-full h-12 rounded-lg"
          style={{ borderRadius: '8px' }}
        >
          Continue
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-label text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// STEP 3: Food
interface FoodStepProps {
  value: QuickCheckData['food'];
  onChange: (value: QuickCheckData['food']) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function FoodStep({ value, onChange, onContinue, onSkip }: FoodStepProps) {
  const [showMealNote, setShowMealNote] = useState(false);
  const [mealNote, setMealNote] = useState(value.note || '');

  const getHelperText = (level: number) => {
    if (level <= 3) return 'Less than usual';
    if (level <= 6) return 'About normal';
    return 'More than usual';
  };

  const saveMealNote = () => {
    onChange({ ...value, note: mealNote });
    setShowMealNote(false);
  };

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-h2">Have you eaten more or less than normal?</h2>
        <p className="text-label text-muted-foreground">Refines today's prediction</p>
      </div>

      {/* Slider */}
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-label text-muted-foreground">Much less</span>
            <span className="text-h3 text-primary">{value.level}</span>
            <span className="text-label text-muted-foreground">Much more</span>
          </div>

          <Slider
            value={[value.level]}
            onValueChange={([level]) => onChange({ ...value, level })}
            min={0}
            max={10}
            step={1}
            className="w-full"
          />

          {/* Helper Text */}
          <div className="text-center">
            <p className="text-body text-muted-foreground">{getHelperText(value.level)}</p>
          </div>
        </div>
      </div>

      {/* Add Meal Note */}
      <Sheet open={showMealNote} onOpenChange={setShowMealNote}>
        <SheetTrigger asChild>
          <button className="text-label text-primary hover:underline">
            Add meal note (time/type)
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader className="mb-6">
            <SheetTitle>Meal note</SheetTitle>
            <SheetDescription>Optional details about your meals today</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <textarea
              value={mealNote}
              onChange={(e) => setMealNote(e.target.value)}
              placeholder="e.g., Skipped breakfast, light lunch at 1pm"
              className="w-full h-24 p-3 rounded-lg border border-border bg-card text-body resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ borderRadius: '8px' }}
            />

            <Button
              onClick={saveMealNote}
              className="w-full h-12 rounded-lg"
              style={{ borderRadius: '8px' }}
            >
              Save note
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Action Buttons */}
      <div className="pt-4 space-y-3">
        <Button
          onClick={onContinue}
          className="w-full h-12 rounded-lg"
          style={{ borderRadius: '8px' }}
        >
          Continue
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-label text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// SUCCESS STEP
interface SuccessStepProps {
  onComplete: () => void;
  data: QuickCheckData;
  streakCount?: number;
}

function SuccessStep({ onComplete, data, streakCount = 6 }: SuccessStepProps) {
  const [showWhy, setShowWhy] = useState(false);

  // Generate confetti dots - Brand v1.0 colors
  const confettiDots = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 40,
    size: Math.random() * 6 + 4,
    color: ['#FF7B66', '#FFB366', '#F5C94D', '#FFB3C6', '#E3DCFF'][Math.floor(Math.random() * 5)],
    opacity: Math.random() * 0.2 + 0.2,
  }));

  // Calculate impact metrics
  const signalsCount = [
    data.caffeine.level !== null,
    data.water.amount !== null,
    data.food.level !== 5, // Changed from default
  ].filter(Boolean).length;

  const accuracyDelta = signalsCount === 3 ? 8 : signalsCount === 2 ? 6 : 4;
  const prevWindow = '6h';
  const newWindow = signalsCount === 3 ? '3h' : signalsCount === 2 ? '4h' : '5h';

  // Determine suggested next action
  const getSuggestedAction = () => {
    if (data.water.amount === 'none' || data.water.amount === 'low') {
      return { label: 'Hydrate 250 ml', icon: Droplets };
    }
    if (data.food.level <= 3) {
      return { label: 'Have a light snack', icon: CoffeeIcon };
    }
    if (data.caffeine.level === 'lot') {
      return { label: 'Take a 5-min break', icon: Clock };
    }
    return null;
  };

  const suggestedAction = getSuggestedAction();

  const getExplanation = (): string[] => {
    const explanations: string[] = [];
    
    if (data.caffeine.level === 'lot') {
      explanations.push('High caffeine intake can sometimes trigger migraines.');
    } else if (data.caffeine.level === 'none') {
      explanations.push('No caffeine today — caffeine withdrawal can be a trigger.');
    }

    if (data.water.amount === 'none' || data.water.amount === 'low') {
      explanations.push('Low hydration is a common migraine trigger.');
    } else if (data.water.amount === 'high') {
      explanations.push('Good hydration helps maintain normal migraine risk.');
    }

    if (data.food.level <= 3) {
      explanations.push('Eating less than usual can increase migraine risk.');
    } else if (data.food.level >= 7) {
      explanations.push('Eating more than usual noted — may affect prediction.');
    }

    return explanations.length > 0
      ? explanations
      : ['Your inputs are within normal ranges.'];
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 relative overflow-hidden bg-background">
      {/* Confetti Dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiDots.map((dot) => (
          <div
            key={dot.id}
            className="absolute rounded-full"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              backgroundColor: dot.color,
              opacity: dot.opacity,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto space-y-6">
        {/* Hero Success State */}
        <div className="text-center space-y-4 pt-8">
          {/* Success Illustration */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-success/20 to-primary/10 flex items-center justify-center">
              <div
                className="absolute inset-2 rounded-2xl bg-success/10 flex items-center justify-center"
                style={{ borderRadius: '16px' }}
              >
                <Zap className="w-12 h-12 text-success" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-h1">Estimate updated</h1>
            <p className="text-body text-muted-foreground">
              Nice work keeping your streak! Your inputs refined today's prediction.
            </p>
          </div>
        </div>

        {/* Encouragement Banner */}
        <div
          className="rounded-full bg-primary/10 border border-primary/20 px-4 py-3 flex items-center gap-3"
          style={{ borderRadius: '24px' }}
        >
          <div className="flex items-center gap-2 flex-1">
            <Flame className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-label text-primary">
                Streak kept +1 • Day {streakCount}
              </span>
              <span className="text-label text-muted-foreground">
                Consistent check-ins improve accuracy over time.
              </span>
            </div>
          </div>
        </div>

        {/* Impact Card */}
        <div
          className="rounded-xl border border-border bg-card p-4 space-y-4"
          style={{ borderRadius: '12px' }}
        >
          <div className="space-y-3">
            {/* Prediction Confidence */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-success" />
                </div>
                <span className="text-body">Prediction confidence</span>
              </div>
              <span className="text-body text-success">+{accuracyDelta}%</span>
            </div>

            {/* Risk Window */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-body">Risk window narrowed</span>
              </div>
              <span className="text-body text-muted-foreground">
                {prevWindow} → {newWindow}
              </span>
            </div>

            {/* Signals Used */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-body">Signals used today</span>
              </div>
              <span className="text-body">{signalsCount}/3</span>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-label text-muted-foreground pt-2 border-t border-border">
            Estimates are indicative, not medical advice.
          </p>
        </div>

        {/* Suggested Next Step */}
        {suggestedAction && (
          <div
            className="rounded-xl border border-border bg-card p-4"
            style={{ borderRadius: '12px' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <suggestedAction.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-label text-muted-foreground">Suggested next</p>
                  <p className="text-body">{suggestedAction.label}</p>
                </div>
              </div>
              <button
                className="text-label text-primary hover:underline whitespace-nowrap"
                onClick={() => alert(`Action: ${suggestedAction.label}`)}
              >
                Do it now
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={onComplete}
            className="w-full h-12 rounded-lg"
            style={{ borderRadius: '8px' }}
          >
            Back to Home
          </Button>

          <Sheet open={showWhy} onOpenChange={setShowWhy}>
            <SheetTrigger asChild>
              <button className="w-full text-label text-primary hover:underline">
                See why
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh]">
              <SheetHeader className="mb-6">
                <SheetTitle>How your inputs affected the update</SheetTitle>
                <SheetDescription>
                  These factors were considered in refining your prediction
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-3 pb-6">
                {getExplanation().map((explanation, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted border border-border"
                    style={{ borderRadius: '8px' }}
                  >
                    <p className="text-label text-muted-foreground">{explanation}</p>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
