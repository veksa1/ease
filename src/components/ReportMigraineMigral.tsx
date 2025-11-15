// filepath: /Users/veikkosvynarenko/junk25/ease3/src/components/ReportMigraineMigral.tsx

/**
 * Report Migraine Modal Wrapper
 * 
 * Provides a dialog wrapper around the comprehensive ReportMigraineForm
 * This maintains backward compatibility with existing code while using the new form
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
} from './ui/dialog';
import { ReportMigraineForm } from './ReportMigraineForm';

interface ReportMigraineModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportMigraineModal({
  trigger,
  open,
  onOpenChange,
}: ReportMigraineModalProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <ReportMigraineForm onClose={handleClose} onSuccess={handleSuccess} />
        </div>
      )}
    </Dialog>
  );
}
