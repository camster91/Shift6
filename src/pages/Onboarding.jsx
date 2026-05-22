import { useState } from 'react';
import { Check, ChevronRight, ChevronLeft, Award } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, EQUIPMENT_TYPES } from '../data/exercises';

const BODY_PART_ICONS = {
  Chest: '💪', Back: '🔙', Shoulders: '🎯', Legs: '🦵',
  Arms: '💪', Core: '🔥', Glutes: '🍑',
};

export default function Onboarding({ onDone }) {
  const { allExercises, setExerciseList, setOnboardingDone, updateSettings } = useData();
  const [step, setStep] = useState(0);
  
  // State for step 1: Equipment
  const [selectedEquip, setSelectedEquip] = useState(['none']);
  
  // State for step 2: Skill Level
  const [skillLevel, setSkillLevel] = useState('beginner');

  // State for step 3: Baseline Test
  const [testExerciseId, setTestExerciseId] = useState('pushups');
  const [maxReps, setMaxReps] = useState(15);
  
  // State for step 4: Exercise Selection Review
  const [selectedExercises, setSelectedExercises] = useState([]);

  // Equipment list for selection screen
  const EQUIP_OPTIONS = EQUIPMENT_TYPES.filter(eq => eq.id !== 'none');

  const toggleEquipment = (id) => {
    setSelectedEquip(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      // Based on selected equipment and skill level, pre-filter recommended exercises
      const filtered = allExercises.filter(ex => {
        // Equipment check
        if (ex.equipment !== 'none' && !selectedEquip.includes(ex.equipment)) return false;
        
        // Filter some advanced exercises if beginner
        if (skillLevel === 'beginner') {
          const advancedEx = ['pullups', 'handstand_hold', 'v_ups', 'hanging_leg_raise', 'arnold_press', 'chinups', 'chest_dips', 'skull_crushers'];
          if (advancedEx.includes(ex.id)) return false;
        }
        return true;
      });

      // Select default starter list matching filtered
      const defaultStarters = filtered.slice(0, 10).map(e => e.id);
      setSelectedExercises(defaultStarters);

      // Pre-populate test exercise based on what's available
      const testCandidates = ['pushups', 'squats', 'plank'].filter(id => 
        filtered.some(f => f.id === id)
      );
      if (testCandidates.length > 0) {
        setTestExerciseId(testCandidates[0]);
      }

      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBackStep = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  const handleFinish = () => {
    // Determine target sets based on skill level
    const targetSets = skillLevel === 'beginner' ? 2 : skillLevel === 'intermediate' ? 3 : 4;
    
    // Save calibrated baseline target for the test exercise
    const calibratedReps = Math.max(2, Math.round(maxReps * 0.65));
    const calibratedStartReps = { [testExerciseId]: calibratedReps };

    // Update settings
    updateSettings({
      equippedIds: selectedEquip,
      skillLevel,
      targetSets,
      calibratedStartReps,
      streakFreezes: skillLevel === 'beginner' ? 2 : 1
    });

    // Save final selected exercises
    const chosen = selectedExercises.length > 0 
      ? selectedExercises 
      : allExercises.filter(e => e.home).map(e => e.id);
    
    setExerciseList(chosen);
    setOnboardingDone(true);
    if (onDone) onDone();
  };

  const toggleExercise = (id) => {
    setSelectedExercises(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter exercises shown in Step 4 list
  const reviewFilteredExercises = allExercises.filter(ex => {
    if (ex.equipment !== 'none' && !selectedEquip.includes(ex.equipment)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 animate-fade-in">
      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col justify-between py-6">
        
        {/* Header / Step Indicator */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span className="text-cyan-400">Shift</span>6
            </span>
            <span className="text-xs text-slate-400 font-semibold bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              Step {step + 1} of 4
            </span>
          </div>

          <div className="flex gap-1.5 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-cyan-500' : 'bg-slate-900'
              }`} />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center">
          
          {/* Step 1: Equipment Selection */}
          {step === 0 && (
            <div className="animate-slide-up space-y-6">
              <div>
                <h1 className="text-3xl font-black mb-2 text-white">What equipment do you have?</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We will personalize your routine with exercises matching your gear. You can update this any time.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                {/* Bodyweight option - always selected */}
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 relative flex flex-col items-start text-left">
                  <span className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </span>
                  <span className="text-2xl mb-3">🏠</span>
                  <span className="text-sm font-bold text-white">Bodyweight Only</span>
                  <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider mt-1">Included</span>
                </div>

                {EQUIP_OPTIONS.map(eq => {
                  const selected = selectedEquip.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      onClick={() => toggleEquipment(eq.id)}
                      className={`p-4 rounded-2xl text-left border transition-all relative flex flex-col items-start active:scale-[0.98] ${
                        selected
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/50'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </span>
                      )}
                      <span className="text-2xl mb-3">{eq.icon}</span>
                      <span className="text-sm font-bold text-white">{eq.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Experience / Skill Level */}
          {step === 1 && (
            <div className="animate-slide-up space-y-6">
              <div>
                <h1 className="text-3xl font-black mb-2 text-white">Your experience level?</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We&apos;ll auto-regulate your set targets and baseline recovery timer.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'beginner',
                    title: 'Beginner',
                    desc: 'New to exercise or restarting. Focuses on core bodyweight habits.',
                    details: 'Target: 2 sets per exercise • 2 streak freezes',
                    icon: '🌱'
                  },
                  {
                    id: 'intermediate',
                    title: 'Intermediate',
                    desc: 'Consistent training history. Comfortable with bodyweight progressions.',
                    details: 'Target: 3 sets per exercise • 1 streak freeze',
                    icon: '⚡'
                  },
                  {
                    id: 'advanced',
                    title: 'Advanced',
                    desc: 'Experienced lifter or calisthenics practitioner looking to push volume.',
                    details: 'Target: 4 sets per exercise • 1 streak freeze',
                    icon: '🏆'
                  }
                ].map(opt => {
                  const selected = skillLevel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSkillLevel(opt.id)}
                      className={`p-5 rounded-2xl w-full text-left border transition-all flex items-start gap-4 active:scale-[0.99] ${
                        selected
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/50'
                      }`}
                    >
                      <span className="text-3xl p-1 bg-slate-800/50 rounded-xl">{opt.icon}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-base">{opt.title}</span>
                          {selected && <Check size={16} className="text-cyan-400" />}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider pt-0.5">{opt.details}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Baseline Calibration */}
          {step === 2 && (
            <div className="animate-slide-up space-y-6">
              <div>
                <h1 className="text-3xl font-black mb-2 text-white">Let&apos;s calibrate your targets</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Perform a quick mental calibration or enter your max consecutive clean reps of a baseline exercise.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Select Calibration Exercise
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'pushups', name: 'Push-Ups' },
                      { id: 'squats', name: 'Squats' },
                      { id: 'plank', name: 'Plank (sec)' }
                    ].map(ex => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setTestExerciseId(ex.id);
                          setMaxReps(ex.id === 'plank' ? 30 : 15);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          testExerciseId === ex.id
                            ? 'bg-cyan-500 text-white border-cyan-500'
                            : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                        }`}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                  <span className="text-xs text-slate-500 font-medium">YOUR MAX CLEAN PERFORMANCE</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setMaxReps(prev => Math.max(1, prev - (testExerciseId === 'plank' ? 5 : 1)))}
                      className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 font-bold active:scale-90"
                    >
                      −
                    </button>
                    <span className="text-3xl font-black text-white w-20 text-center">
                      {maxReps} <span className="text-xs text-slate-500 font-normal">{testExerciseId === 'plank' ? 's' : 'reps'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaxReps(prev => prev + (testExerciseId === 'plank' ? 5 : 1))}
                      className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 font-bold active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 flex gap-3 items-start">
                  <Award size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Coaching Calibration Active</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      We&apos;ll set your initial {testExerciseId === 'pushups' ? 'Push-Ups' : testExerciseId === 'squats' ? 'Squats' : 'Plank'} target to{' '}
                      <span className="text-cyan-400 font-bold">{Math.max(2, Math.round(maxReps * 0.65))} {testExerciseId === 'plank' ? 'seconds' : 'reps'}</span>{' '}
                      (65% of max). This guarantees consistent, safe volume accumulation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Exercise Review */}
          {step === 3 && (
            <div className="animate-slide-up space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-3xl font-black text-white">Your Routine</h1>
                  <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                    {selectedExercises.length} Exercises Selected
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Select the exercises to include in your initial rotation pool.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[48vh] overflow-y-auto pr-1 no-scrollbar border-y border-slate-900 py-2">
                {reviewFilteredExercises.map(ex => {
                  const selected = selectedExercises.includes(ex.id);
                  const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
                  const icon = BODY_PART_ICONS[ex.bodyPart] || '💪';
                  
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggleExercise(ex.id)}
                      className={`p-3 rounded-xl text-left border transition-all relative overflow-hidden active:scale-[0.98] ${
                        selected
                          ? `${colors.bg} border-${colors.text}/50 shadow-lg`
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/50'
                      }`}
                    >
                      {selected && (
                        <span className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full ${colors.solid} flex items-center justify-center`}>
                          <Check size={10} className="text-white" />
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mb-2`}>
                        <span className="text-sm">{icon}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-tight">{ex.name}</p>
                      <p className={`text-xs mt-0.5 ${colors.text}`}>{ex.bodyPart}</p>
                      {!ex.home && (
                        <span className="absolute bottom-1.5 right-2 text-[8px] text-slate-600">🏋️</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="flex gap-3 pt-6 border-t border-slate-900 mt-6">
          {step > 0 && (
            <button
              onClick={handleBackStep}
              className="flex items-center justify-center gap-1.5 px-6 py-4 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl font-bold active:scale-95 transition-all"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-cyan-500 text-white rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg shadow-cyan-500/10"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Check size={18} />
              Build Routine
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
