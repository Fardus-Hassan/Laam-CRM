'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StepperStep = {
  id: string;
  label: string;
};

type StepperProps = {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
};

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-2', className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-xs font-medium',
                isComplete && 'border-primary bg-primary text-primary-foreground',
                isCurrent && 'border-primary text-primary',
                !isComplete && !isCurrent && 'border-border text-muted-foreground',
              )}
            >
              {isComplete ? <Check className="size-3.5" /> : stepNumber}
            </div>
            <span
              className={cn(
                'text-sm',
                isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 hidden h-px w-6 bg-border sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
