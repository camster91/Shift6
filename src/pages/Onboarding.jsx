import { useState, useMemo } from 'react';
import { Check, ChevronRight, ChevronLeft, Award, Search, Sparkles, X, Plus, Minus } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, EQUIPMENT_TYPES, BODY_PARTS } from '../data/exercises';

const BODY_PART_ICONS = {
  Chest: '💪', Back: '🔙', Shoulders: '🎯', Legs: '🦵',
  Arms: '💪', Core: '🔥', Glutes: '🍑',
};

const SUGGESTED_BY_LEVEL = {
  beginner: ['pushups', 'squats', 'glute_bridge', 'supermans', 'plank', 'lunges', 'tricep_dips', 'diamond_pushups', 'crunches'],
  intermediate: ['pushups', 'squats', 'pullups', 'plank', 'lunges', 'glute_bridge', 'supermans', 'tricep_dips', 'pike_pushups'],
  advanced: ['decline_pushups', 'pullups', 'chinups', 'barbell_squat', 'deadlift', 'lateral_raise', 'bench_press', 'inverted_rows', 'mountain_climbers'],
};

function getCoverage(selectedIds, allExercises) {
  const selected = selectedIds.map(id => allExercises.find(e => e.id === id)).filter(Boolean);
  const counts = {};
  (BODY_PARTS || []).forEach(bp => counts[bp] = 0);
  selected.forEach(ex => { counts[ex.bodyPart] = (counts[ex.bodyPart] || 0) + 1; });
  return counts;
}

export default function Onboarding() {
  const { allExercises, setExerciseList, setOnboardingDone, updateSettings } = useData();
  const [step, setStep] = useState(0);

  const [selectedEquip, setSelectedEquip] = useState(['none']);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [testExerciseId, setTestExerciseId] = useState('pushups');
  const [maxReps, setMaxReps] = useState(15);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [bodyFilter, setBodyFilter] = useState('All');

  const EQUIP_OPTIONS = EQUIPMENT_TYPES.filter(eq => eq.id !== 'none');

  // Pre-filtered exercises based on equipment
  const equipFilteredExercises = useMemo(() =>
    (allExercises || []).filter(ex => {
      if (ex.equipment !== 'none' && !selectedEquip.includes(ex.equipment)) return false;
      if (skillLevel === 'beginner') {
        const advancedEx = ['handstand_hold', 'v_ups', 'hanging_leg_raise', 'arnold_press', 'chest_dips', 'skull_crushers', 'weighted_step_ups', 'hip_thrusts', 'ab_wheel'];
        if (advancedEx.includes(ex.id)) return false;
      }
      return true;
    }),
    [allExercises, selectedEquip, skillLevel]
  );

  const toggleEquipment = (id) => {
    setSelectedEquip(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      // Pre-select balanced list based on level + equipment
      const sug = SUGGESTED_BY_LEVEL[skillLevel] || SUGGESTED_BY_LEVEL.beginner;
      const availIds = new Set(equipFilteredExercises.map(e => e.id));
      const defaults = sug.filter(id => availIds.has(id));
      setSelectedExercises(defaults.length > 0 ? defaults : equipFilteredExercises.slice(0, 9).map(e => e.id));
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBackStep = () => setStep(prev => Math.max(0, prev - 1));

  const handleFinish = () => {
    const targetSets = skillLevel === 'beginner' ? 2 : skillLevel === 'intermediate' ? 3 : 4;
    const calibratedReps = Math.max(2, Math.round(maxReps * 0.65));
    const chosen = selectedExercises.length > 0
      ? selectedExercises
      : equipFilteredExercises.slice(0, 9).map(e => e.id);

    updateSettings({
      equippedIds: selectedEquip,
      skillLevel,
      targetSets,
      calibratedStartReps: { [testExerciseId]: calibratedReps },
      streakFreezes: skillLevel === 'beginner' ? 2 : 1
    });

    setExerciseList(chosen);
    setOnboardingDone(true);
  };

  const handleQuickStart = () => {
    const targetSets = 3;
    const sug = SUGGESTED_BY_LEVEL.beginner;
    const avail = (allExercises || []).filter(e => e.equipment === 'none');
    const chosen = sug.map(id => avail.find(e => e.id === id)).filter(Boolean).map(e => e.id);
    const fallback = avail.slice(0, 9).map(e => e.id);

    updateSettings({
      equippedIds: ['none'],
      skillLevel: 'beginner',
      targetSets,
      streakFreezes: 2
    });
    setExerciseList(chosen.length > 0 ? chosen : fallback);
    setOnboardingDone(true);
  };

  const toggleExercise = (id) => {
    setSelectedExercises(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const autoSelectBalanced = () => {
    const sug = SUGGESTED_BY_LEVEL[skillLevel] || SUGGESTED_BY_LEVEL.beginner;
    const availIds = new Set(equipFilteredExercises.map(e => e.id));
    const matched = sug.filter(id => availIds.has(id));
    // Fill in with home exercises if we have fewer than 9
    const extra = equipFilteredExercises
      .filter(e => e.home && !matched.includes(e.id))
      .slice(0, 9 - matched.length)
      .map(e => e.id);
    const next = [...matched, ...extra];
    setSelectedExercises(next.length > 0 ? next : equipFilteredExercises.slice(0, 9).map(e => e.id));
  };

  // Step 4 filtered list
  const step4Filtered = useMemo(() => {
    let list = equipFilteredExercises;
    if (bodyFilter !== 'All') list = list.filter(e => e.bodyPart === bodyFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.bodyPart.toLowerCase().includes(q));
    }
    return list;
  }, [equipFilteredExercises, bodyFilter, searchTerm]);

  const coverage = useMemo(() => getCoverage(selectedExercises, allExercises || []), [selectedExercises, allExercises]);
  const missingParts = (BODY_PARTS || []).filter(bp => !coverage[bp]);

  const steps = [
    { title: 'Equipment', desc: 'What gear do you have?' },
    { title: 'Experience', desc: 'Set your experience level.' },
    { title: 'Baseline', desc: 'Quick calibration.' },
    { title: 'Your Routine', desc: 'Pick exercises to start.' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col animate-fade-in">
      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col px-6 py-6">

        {/* ─── Top Bar ─── */}
        <div className="shrink-0 flex items-center justify-between mb-4">
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
            <span className="text-cyan-400">Shift</span>6
          </span>
          <button
            onClick={handleQuickStart}
            className="text-[10px] font-bold text-slate-500 hover:text-cyan-400 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 active:scale-95 transition-all"
          >
            Just Start
          </button>
        </div>

        {/* ─── Step Progress ─── */}
        <div className="shrink-0 mb-2">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
            {steps[step].title} — Step {step + 1} of 4
          </p>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-cyan-500' : 'bg-slate-900'
              }`} />
            ))}
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Step 0: Equipment */}
          {step === 0 && (
            <div className="flex-1 flex flex-col min-h-0 animate-slide-up">
              <div className="shrink-0 mb-5">
                <h1 className="text-3xl font-black mb-2 text-white">What equipment do you have?</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We will personalize your routine with exercises matching your gear. You can update this later in Settings.
                </p>
              </div>

              <div className="shrink-0 mb-3">
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 relative flex items-center gap-3">
                  <span className="text-2xl">🏠</span>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-white">Bodyweight Only</span>
                    <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider block mt-0.5">Always Included</span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto -mx-1 px-1 no-scrollbar">
                <div className="grid grid-cols-2 gap-2.5 pb-2">
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
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </span>
                        )}
                        <span className="text-2xl mb-2">{eq.icon}</span>
                        <span className="text-sm font-bold text-white">{eq.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Skill Level */}
          {step === 1 && (
            <div className="flex-1 flex flex-col min-h-0 animate-slide-up">
              <div className="shrink-0 mb-5">
                <h1 className="text-3xl font-black mb-2 text-white">Your experience level?</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  This sets your default target sets, baseline reps, and rest timer. All of it is adjustable later.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pb-2">
                {[
                  { id: 'beginner', title: 'Beginner', desc: 'New or restarting. Builds core bodyweight habits.', detail: '2 sets • 2 streak freezes', icon: '🌱' },
                  { id: 'intermediate', title: 'Intermediate', desc: 'Consistent training. Comfortable with progressions.', detail: '3 sets • 1 streak freeze', icon: '⚡' },
                  { id: 'advanced', title: 'Advanced', desc: 'Experienced lifter chasing volume.', detail: '4 sets • 1 streak freeze', icon: '🏆' },
                ].map(opt => {
                  const selected = skillLevel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSkillLevel(opt.id)}
                      className={`w-full text-left border rounded-2xl p-4 flex items-start gap-3 active:scale-[0.99] transition-all ${
                        selected
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/50'
                      }`}
                    >
                      <span className="text-2xl p-1.5 bg-slate-800/50 rounded-xl shrink-0">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-base text-white">{opt.title}</span>
                          {selected && <Check size={16} className="text-cyan-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-1.5">{opt.detail}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Baseline */}
          {step === 2 && (
            <div className="flex-1 flex flex-col min-h-0 animate-slide-up">
              <div className="shrink-0 mb-5">
                <h1 className="text-3xl font-black mb-2 text-white">Calibrate your targets</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Pick a baseline exercise and enter your max clean reps. Or skip and we will use defaults.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Baseline Exercise</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'pushups', name: 'Push-Ups' },
                      { id: 'squats', name: 'Squats' },
                      { id: 'plank', name: 'Plank (sec)' },
                    ].map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => { setTestExerciseId(ex.id); setMaxReps(ex.id === 'plank' ? 30 : 15); }}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
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

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Max Clean Performance</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setMaxReps(prev => Math.max(1, prev - (testExerciseId === 'plank' ? 5 : 1)))}
                      className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus size={20} className="text-slate-400" />
                    </button>
                    <div className="text-center min-w-[100px]">
                      <span className="text-5xl font-black text-white tabular-nums">{maxReps}</span>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                        {testExerciseId === 'plank' ? 'seconds' : 'reps'}
                      </p>
                    </div>
                    <button
                      onClick={() => setMaxReps(prev => prev + (testExerciseId === 'plank' ? 5 : 1))}
                      className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus size={20} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 flex gap-3 items-start">
                  <Award size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Target: {Math.max(2, Math.round(maxReps * 0.65))} {testExerciseId === 'plank' ? 'sec' : 'reps'}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      We set your starting target to 65% of max. This gives you clean, repeatable sets.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Exercise Selection */}
          {step === 3 && (
            <div className="flex-1 flex flex-col min-h-0 animate-slide-up">
              {/* Header + Search */}
              <div className="shrink-0 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl font-black text-white">Your Routine</h1>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                    {selectedExercises.length} selected
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Fine-tune your rotation. We pre-selected a balanced list.
                </p>

                {/* Search */}
                <div className="relative mb-2.5">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search exercises..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                      <X size={12} className="text-slate-600" />
                    </button>
                  )}
                </div>

                {/* Body Part Chips */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setBodyFilter('All')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                      bodyFilter === 'All'
                        ? 'bg-cyan-500 text-white border-cyan-500'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    All
                  </button>
                  {(BODY_PARTS || []).map(bp => (
                    <button
                      key={bp}
                      onClick={() => setBodyFilter(bp)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95 flex items-center gap-1 ${
                        bodyFilter === bp
                          ? 'bg-cyan-500 text-white border-cyan-500'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {BODY_PART_ICONS[bp] || '💪'} {bp}
                      <span className={bodyFilter === bp ? 'text-white/60' : 'text-slate-600'}>{coverage[bp] || 0}</span>
                    </button>
                  ))}
                </div>

                {/* Coverage warning */}
                {missingParts.length > 0 && (
                  <p className="text-[10px] text-orange-400 mt-1.5 font-medium">
                    Missing coverage: {missingParts.join(', ')}
                  </p>
                )}

                {/* Auto-select */}
                <button
                  onClick={autoSelectBalanced}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors active:scale-95"
                >
                  <Sparkles size={12} /> Auto-select balanced routine
                </button>
              </div>

              {/* Scrollable Grid */}
              <div className="flex-1 overflow-y-auto -mx-1 px-1 pb-2 no-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                  {step4Filtered.map(ex => {
                    const selected = selectedExercises.includes(ex.id);
                    const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
                    const icon = BODY_PART_ICONS[ex.bodyPart] || '💪';

                    return (
                      <button
                        key={ex.id}
                        onClick={() => toggleExercise(ex.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all relative overflow-hidden active:scale-[0.98] ${
                          selected
                            ? `${colors.bg} ${colors.border} shadow-lg`
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                            <span className="text-sm">{icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white leading-tight truncate">{ex.name}</p>
                            <p className={`text-[10px] ${colors.text} font-medium`}>{ex.bodyPart}</p>
                          </div>
                          {selected && (
                            <div className={`w-5 h-5 rounded-full ${colors.solid} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {step4Filtered.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">No exercises match your search.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer Navigation ─── */}
        <div className="shrink-0 pt-4 border-t border-slate-900">
          <div className="flex gap-2.5">
            {step > 0 ? (
              <button
                onClick={handleBackStep}
                className="flex items-center justify-center gap-1 px-5 py-3.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl font-bold active:scale-95 transition-all"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div className="w-0" />
            )}

            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="flex-1 py-3.5 bg-cyan-500 text-white rounded-2xl font-bold text-base active:scale-95 transition-all shadow-lg"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-all shadow-lg"
              >
                Build Routine — {selectedExercises.length} Exercise{selectedExercises.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
