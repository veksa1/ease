import React, { useState } from 'react';
import { Button } from './ui/button';
import { PillChip } from './PillChip';

interface QuickCheckFlowProps {
  onComplete?: (data: QuickCheckData) => void;
  onBack?: () => void;
  streakCount?: number;
}

export interface QuickCheckData {
  caffeine: { level: 'none' | 'some' | 'lot' | null };
  water: { amount: 'none' | 'low' | 'medium' | 'high' | null };
  food: { level: number };
}

export function QuickCheckFlow({ onComplete, onBack, streakCount = 5 }: QuickCheckFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);
  const [data, setData] = useState<QuickCheckData>({
    caffeine: { level: null },
    water: { amount: null },
    food: { level: 5 },
  });

  const next = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep('success');
  };
  const back = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 'success') setStep(3);
    else onBack?.();
  };
  const finish = () => {
    onComplete?.(data);
    setStep('success');
  };
  const progress = step === 'success' ? 100 : (step - 1) * (100 / 3);

  if (step === 'success') {
    return (
      <div className="space-y-6">
        <h2 className="text-h2 text-center">Quick check saved</h2>
        <p className="text-label text-muted-foreground text-center">Streak: {streakCount} days</p>
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <span className="text-success text-h3">✔</span>
          </div>
        </div>
        <Button className="w-full" onClick={() => onBack?.()}>Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-200/20 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: progress + '%' }} />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-h2">Caffeine today?</h2>
          <div className="flex flex-col gap-3">
            {(['none', 'some', 'lot'] as const).map(level => (
              <button
                key={level}
                onClick={() => setData(d => ({ ...d, caffeine: { level } }))}
                className={`p-4 rounded-lg border text-left transition-colors ${data.caffeine.level === level ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted'}`}
                style={{ borderRadius: '12px' }}
              >
                <h3 className="text-body capitalize">{level}</h3>
                <p className="text-label text-muted-foreground">{level === 'none' ? '0 mg' : level === 'some' ? '~50–150 mg' : '200+ mg'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-h2">Hydration</h2>
          <div className="flex flex-wrap gap-2">
            {(['none', 'low', 'medium', 'high'] as const).map(amount => (
              <span key={amount}>
                <PillChip
                  label={amount}
                  variant={data.water.amount === amount ? 'primary' : 'default'}
                  onRemove={() => setData(d => ({ ...d, water: { amount } }))}
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-h2">Food quality</h2>
          <input
            type="range"
            min={0}
            max={10}
            value={data.food.level}
            onChange={e => setData(d => ({ ...d, food: { level: Number(e.target.value) } }))}
            className="w-full"
          />
          <div className="text-center text-label">Level: {data.food.level}/10</div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={back} className="flex-1">Back</Button>
        {step < 3 && (
          <Button onClick={next} className="flex-1" disabled={(step === 1 && data.caffeine.level === null) || (step === 2 && data.water.amount === null)}>Next</Button>
        )}
        {step === 3 && <Button onClick={finish} className="flex-1">Finish</Button>}
      </div>
    </div>
  );
}
