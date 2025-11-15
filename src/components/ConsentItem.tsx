import React from 'react';
import { Info, LucideIcon } from 'lucide-react';
import { AccessibleSwitch } from './ui/accessible-switch';
import { Label } from './ui/label';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

interface ConsentItemProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  infoText: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  badge?: 'recommended' | 'optional';
  lowStimulationMode?: boolean;
}

export function ConsentItem({ 
  id, 
  icon: Icon,
  title, 
  description, 
  infoText, 
  checked, 
  onCheckedChange,
  badge,
  lowStimulationMode = false
}: ConsentItemProps) {
  return (
    <div 
      className="flex items-start gap-4 py-4 px-4 cursor-pointer hover:bg-secondary/50 transition-colors duration-200 rounded-lg"
      onClick={() => onCheckedChange(!checked)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      style={{ borderRadius: '8px' }}
    >
      {/* Left: Icon + Content */}
      <div className="flex-1 min-w-0 flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "p-2 rounded-lg flex-shrink-0",
          checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Label 
              htmlFor={id} 
              className="cursor-pointer"
              style={{ fontSize: '16px', fontWeight: 600 }}
            >
              {title}
            </Label>
            {badge && (
              <span 
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-label",
                  badge === 'recommended' 
                    ? "bg-success/10 text-success" 
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {badge === 'recommended' ? 'Recommended' : 'Optional'}
              </span>
            )}
          </div>
          <p 
            className="text-muted-foreground"
            style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--color-muted-foreground)' }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Right: Info Button + Switch + Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Info Button - opens bottom sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
              onClick={(e) => e.stopPropagation()}
              aria-label={`More information about ${title}`}
            >
              <Info className="w-4 h-4" />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="rounded-t-xl" 
            style={{ borderRadius: '12px 12px 0 0' }}
          >
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" />
                {title}
              </SheetTitle>
              <SheetDescription className="text-left pt-4">
                {infoText}
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        {/* Switch + Status */}
        <div onClick={(e) => e.stopPropagation()}>
          <AccessibleSwitch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            showStatus={true}
            lowStimulationMode={lowStimulationMode}
            aria-label={title}
          />
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
