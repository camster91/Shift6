import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { EXERCISE_PLANS, formatValue, getRest } from '../../data/exercises.jsx';
import { vibrate } from '../../utils/device';

const Plan = ({
    activeExercise,
    completedDays,
    startWorkout,
    getThemeClass
}) => {
    const exercise = EXERCISE_PLANS[activeExercise];
    const completedCount = completedDays[activeExercise]?.length || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Exercise Header & Progress */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden mesh-bg shadow-2xl ring-1 ring-white/10">
                <div className="absolute top-0 right-0 p-12 opacity-5 transform scale-150">
                    {React.cloneElement(exercise.icon, { size: 300 })}
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl ${getThemeClass('bg')} bg-opacity-20 ${getThemeClass('text')}`}>
                                {React.cloneElement(exercise.icon, { size: 28, strokeWidth: 2.5 })}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">{exercise.name}</h1>
                        </div>
                        <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                            Ascending through 18 levels of intensity. Current objective: <span className="text-white font-black">{exercise.finalGoal}</span>
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Completed</p>
                            <p className="text-2xl font-black">{completedCount}/18</p>
                        </div>
                        <div className="bg-blue-600 px-6 py-4 rounded-3xl text-center min-w-[120px] shadow-xl shadow-blue-900/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Target</p>
                            <p className="text-2xl font-black">{exercise.finalGoal}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Curriculum Timeline */}
            <div className="space-y-12">
                <div className="flex items-center gap-4 px-4">
                    <div className={`w-2 h-8 rounded-full ${getThemeClass('bg')}`} />
                    <h2 className="text-2xl font-black tracking-tighter">Training Curriculum</h2>
                </div>

                <div className="space-y-16 relative">
                    {/* Vertical Connector Line */}
                    <div className="absolute left-[39px] top-10 bottom-10 w-[2px] bg-slate-200 -z-0" />

                    {exercise.weeks.map((weekData, wIdx) => {
                        const isCurrentWeek = Math.floor(completedCount / 3) + 1 === weekData.week;
                        const isCompletedWeek = Math.floor(completedCount / 3) + 1 > weekData.week;

                        return (
                            <div key={weekData.week} className="relative z-10">
                                <div className="flex items-center gap-6 mb-8 group">
                                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black transition-all duration-500 shadow-xl ${isCurrentWeek ? `${getThemeClass('bg')} text-white scale-110` :
                                        isCompletedWeek ? 'bg-green-500 text-white' : 'bg-white border-2 border-slate-100 text-slate-300'
                                        }`}>
                                        <span className="text-[10px] uppercase tracking-widest opacity-60">Week</span>
                                        <span className="text-2xl leading-none">{weekData.week}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black tracking-tight text-slate-900">
                                            {isCurrentWeek ? 'Current Level' : `Phase ${weekData.week}`}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                                            Rest Intervals: {getRest(weekData.week)} SECONDS
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ml-10 md:ml-24">
                                    {weekData.days.map((day, dIdx) => {
                                        const isCompleted = completedDays[activeExercise]?.includes(day.id);
                                        const isNext = !isCompleted && completedDays[activeExercise]?.length === (wIdx * 3) + dIdx;

                                        return (
                                            <button
                                                key={day.id}
                                                onClick={() => { vibrate(20); startWorkout(weekData.week, dIdx); }}
                                                className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${isCompleted ? 'bg-white border-green-100 opacity-60' :
                                                    isNext ? `bg-white border-blue-600 shadow-2xl shadow-blue-100 scale-[1.02] z-20` :
                                                        `bg-slate-50 border-transparent hover:bg-white hover:border-slate-200`
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isNext ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        Day {dIdx + 1}
                                                    </span>
                                                    {isCompleted ? <CheckCircle2 size={18} className="text-green-500" /> : isNext ? <Zap size={18} className="text-blue-600 fill-blue-600 animate-pulse" /> : null}
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-2xl font-black text-slate-900 tracking-tighter">
                                                        {day.reps.map(r => formatValue(r, exercise.unit)).join(' · ')}
                                                        {day.reps.length > 1 && !day.isFinal ? '+' : ''}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Reps</p>
                                                </div>

                                                {isNext && (
                                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                                        Start Now
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Plan;
