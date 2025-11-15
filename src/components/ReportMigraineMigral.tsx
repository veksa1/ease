// filepath: /Users/veikkosvynarenko/junk25/ease3/src/components/ReportMigraineMigral.tsx

/**
 * Report Migraine Modal Wrapper
 * 
 * Provides a dialog wrapper around the comprehensive ReportMigraineForm
 * This maintains backward compatibility with existing code while using the new form
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTrigger,
} from './ui/dialog';
import { Mic, ClipboardList, X } from 'lucide-react';
import { ReportMigraineForm } from './ReportMigraineForm';
import { VoiceMigraineAssistant } from './VoiceMigraineAssistant';
import { Button } from './ui/button';

interface ReportMigraineModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ReportMode = 'menu' | 'form' | 'voice';

interface ModeCard {
  id: ReportMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export function ReportMigraineModal({
  trigger,
  open,
  onOpenChange,
  initialDate,
}: ReportMigraineModalProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [mode, setMode] = useState<ReportMode>('menu');

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (!isOpen) {
      setMode('menu');
    }
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  const handleSuccess = () => {
    console.log('[ReportMigraine] Report submitted successfully');
  };

  const handleModeSelect = (selectedMode: ReportMode) => {
    if (selectedMode === 'menu') {
      setMode('menu');
      return;
    }

    setMode(selectedMode);
  };

  const modeCards: ModeCard[] = useMemo(
    () => [
      {
        id: 'voice',
        title: 'Speak it out',
        description:
          'Describe the episode in your own words and let the assistant ask any missing questions. Ideal when typing is hard.',
        icon: (
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
            <Mic className="w-6 h-6" />
          </div>
        ),
        badge: 'Conversational',
      },
      {
        id: 'form',
        title: 'Fill the form',
        description:
          'Enter details manually using the classic migraine intake form. Best for precise, self-paced reporting.',
        icon: (
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted text-foreground">
            <ClipboardList className="w-6 h-6" />
          </div>
        ),
        badge: 'Detailed',
      },
    ],
    []
  );

  const renderOverlay = (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" aria-hidden="true" />
  );

  const renderMenu = (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {renderOverlay}
      <div className="relative z-50 w-full max-w-sm rounded-2xl border border-black/80 bg-background shadow-[0_20px_50px_rgba(0,0,0,0.7)] ring-2 ring-black/70">
        <div className="flex items-start justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-primary mb-1">Report migraine</p>
            <h2 className="text-lg font-semibold">Choose a method</h2>
            <p className="text-sm text-muted-foreground">
              Switch any time without losing progress.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={handleClose}
            className="rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-3 p-4 bg-card/60 rounded-b-2xl border-t border-border/60">
          {modeCards.map(card => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleModeSelect(card.id)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {card.icon}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">{card.title}</p>
                  {card.badge && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {isOpen && mode === 'menu' && renderMenu}
      {isOpen && mode === 'form' && (
        <ReportMigraineForm onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {isOpen && mode === 'voice' && (
        <VoiceMigraineAssistant
          onCancel={() => handleModeSelect('menu')}
          onClose={handleClose}
          onSaved={() => {
            handleSuccess();
            handleClose();
          }}
        />
      )}
    </Dialog>
  );
}
