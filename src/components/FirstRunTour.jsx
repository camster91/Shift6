import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    title: "Today's workout",
    body: 'Your daily workout is right here. Tap Start when you\'re ready to train.',
    anchor: 'h1', // targets the main title
  },
  {
    title: 'Protocol modifiers',
    body: 'Toggle CNS Fatigue or Travel mode if your day requires it. Long-press any chip for more info.',
    anchor: 'modifiers',
  },
  {
    title: 'Set your 1RMs',
    body: 'Head to Settings → Estimated 1RMs to get personalized weights. Takes 30 seconds.',
    anchor: 'nudge',
  },
];

export default function FirstRunTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const shown = localStorage.getItem('armor_tour_shown');
      if (!shown) setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('armor_tour_shown', '1');
    } catch { /* ignore */ }
    setDismissed(true);
    setVisible(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  if (!visible || dismissed) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop — partial opacity so user can still see content */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Tour card — positioned near the bottom center */}
      <div
        className="fixed z-50 bottom-28 left-4 right-4 max-w-sm mx-auto armor-surface-2 rounded-2xl p-5 shadow-2xl armor-entrance"
        style={{ backdropFilter: 'blur(20px)' }}
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding tour: ${current.title}`}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-6 h-1 rounded-full transition-all ${i === step ? 'bg-cyan-400 w-8' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss tour"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step number */}
        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">
          {step + 1} of {STEPS.length}
        </p>

        {/* Title */}
        <h3 className="text-base font-black text-white mb-2">{current.title}</h3>

        {/* Body */}
        <p className="text-sm text-slate-300 leading-relaxed">{current.body}</p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-5">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-xs text-slate-400 hover:text-white font-medium px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            className="armor-press flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            {isLast ? 'Got it' : 'Next'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </>
  );
}