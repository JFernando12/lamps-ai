import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Step } from './types';

interface Props {
  steps: { id: Step; label: string }[];
  currentStep: Step;
  onStepClick: (step: Step) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-center mb-8 gap-1.5">
      {steps.map((s, i) => {
        const currentIdx = steps.findIndex((x) => x.id === currentStep);
        const isCompleted = currentIdx > i;
        const isCurrent = currentStep === s.id;
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!isCompleted}
              onClick={() => isCompleted && onStepClick(s.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isCurrent
                  ? 'bg-amber-500 text-black'
                  : isCompleted
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer'
                    : 'bg-white/5 text-white/40 cursor-default',
              )}
            >
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="text-white/20 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
