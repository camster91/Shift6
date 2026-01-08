import React from 'react';
import { History, LayoutDashboard, CheckCircle2 } from 'lucide-react';
import { EXERCISE_PLANS, formatValue, getRest } from '../../data/exercises';

const Plan = ({
    activeExercise,
    completedDays,
    startWorkout,
    getThemeClass
}) => {
    const exercise = EXERCISE_PLANS[activeExercise];
    const completedCount = completedDays[activeExercise]?.length || 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total Progress</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-black">{completedCount}</span>
                        <span className="text-slate-400 font-bold mb-1">/ 18 Days</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Goal</p>
                    <div className="flex items-end gap-2">
                        <span className={`text-3xl font-black ${getThemeClass('text')}`}>{exercise.finalGoal}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Next Session</p>
                        <p className="font-bold">Week {Math.min(6, Math.floor(completedCount / 3) + 1)}</p>
                    </div>
                    <div className={`p-2 rounded-full ${getThemeClass('bg')} bg-opacity-10 ${getThemeClass('text')}`}>
                        <History size={20} />
                    </div>
                </div>
            </div>

            {/* Curriculum List */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <LayoutDashboard className={getThemeClass('text')} size={20} />
                    Training Curriculum
                </h2>
                <div className="space-y-10">
                    {exercise.weeks.map((weekData) => (
                        <div key={weekData.week} className="relative">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${getThemeClass('bg')}`}>
                                    {weekData.week}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Week {weekData.week}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        Rest: {getRest(weekData.week)}s Between Sets
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ml-5 pl-8 border-l-2 border-slate-100">
                                {weekData.days.map((day, idx) => {
                                    const isCompleted = completedDays[activeExercise]?.includes(day.id);
                                    return (
                                        <button
                                            key={day.id}
                                            onClick={() => startWorkout(weekData.week, idx)}
                                            className={`group p-4 rounded-xl border text-left transition-all hover:shadow-md ${isCompleted
                                                ? 'bg-green-50 border-green-200'
                                                : `bg-white border-slate-200 ${getThemeClass('hover')}`
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-slate-400">SESSION {idx + 1}</span>
                                                {isCompleted && <CheckCircle2 size={14} className="text-green-600" />}
                                            </div>
                                            <div className="text-sm font-mono font-bold text-slate-700">
                                                {day.reps.map(r => formatValue(r, exercise.unit)).join(', ')}
                                                {day.reps.length > 1 && !day.isFinal ? '+' : ''}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Plan;
