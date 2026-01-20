import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { EXERCISE_PLANS, formatValue, getRest } from '../../data/exercises.jsx';
import { vibrate } from '../../utils/device';

const Plan = ({
    activeExercise,
    completedDays,
    startWorkout
}) => {
    const exercise = EXERCISE_PLANS[activeExercise];
    const completedCount = completedDays[activeExercise]?.length || 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Exercise Demo Image */}
            <div className="relative h-64 bg-slate-900/50 border border-cyan-500/20 rounded-xl overflow-hidden neon-border">
                <img
                    src={exercise.image}
                    alt={`${exercise.name} demonstration`}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                    <div>
                        <p className="text-cyan-400 font-bold text-sm tracking-wider uppercase text-glow">{exercise.name}</p>
                        <p className="text-slate-400 text-xs">Protocol Demonstration</p>
                    </div>
                </div>
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-400/50" />
                <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-400/50" />
            </div>

            {/* Exercise Header */}
            <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                {React.cloneElement(exercise.icon, { size: 20 })}
                            </div>
                            <h1 className="text-3xl font-bold text-white">{exercise.name}</h1>
                        </div>
                        <p className="text-sm text-slate-400">
                            18-day progression to <span className="text-cyan-400 font-semibold">{exercise.finalGoal}</span>
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg px-5 py-3 text-center">
                            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Completed</p>
                            <p className="text-xl font-bold text-white">{completedCount}/18</p>
                        </div>
                        <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-lg px-5 py-3 text-center">
                            <p className="text-xs text-cyan-400 mb-1 uppercase tracking-wider">Target</p>
                            <p className="text-xl font-bold text-cyan-400 text-glow">{exercise.finalGoal}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Training Weeks */}
            <div className="space-y-8">
                <h2 className="text-lg font-semibold text-cyan-400 px-1 uppercase tracking-wider">Elite Protocol</h2>

                <div className="space-y-12 relative">
                    {/* Vertical line */}
                    <div className="absolute left-[29px] top-8 bottom-8 w-[1px] bg-cyan-500/20 -z-10" />

                    {exercise.weeks.map((weekData, wIdx) => {
                        const isCurrentWeek = Math.floor(completedCount / 3) + 1 === weekData.week;
                        const isCompletedWeek = Math.floor(completedCount / 3) + 1 > weekData.week;

                        return (
                            <div key={weekData.week} className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center font-bold border-2 transition-all ${
                                        isCurrentWeek ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 animate-pulse-glow' :
                                        isCompletedWeek ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'bg-slate-900/50 border-slate-700 text-slate-500'
                                    }`}>
                                        <span className="text-xs opacity-60 uppercase">Week</span>
                                        <span className="text-lg">{weekData.week}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {isCurrentWeek ? '⚡ Current Week' : `Week ${weekData.week}`}
                                        </h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                                            Rest: {getRest(weekData.week)}s
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8 md:ml-16">
                                    {weekData.days.map((day, dIdx) => {
                                        const isCompleted = completedDays[activeExercise]?.includes(day.id);
                                        const isNext = !isCompleted && completedDays[activeExercise]?.length === (wIdx * 3) + dIdx;

                                        return (
                                            <button
                                                key={day.id}
                                                onClick={() => { vibrate(20); startWorkout(weekData.week, dIdx); }}
                                                className={`p-4 md:p-6 rounded-lg text-left transition-all ${
                                                    isCompleted ? 'bg-slate-900/30 border border-slate-700 opacity-50' :
                                                    isNext ? 'border-2 border-cyan-500 bg-slate-900/50 neon-border animate-pulse-glow' :
                                                    'border border-slate-700 bg-slate-900/50 hover:border-cyan-500/50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`text-xs font-medium uppercase tracking-wider ${isNext ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                        Day {dIdx + 1}
                                                    </span>
                                                    {isCompleted ? (
                                                        <CheckCircle2 size={16} className="text-green-400" />
                                                    ) : isNext ? (
                                                        <Zap size={16} className="text-cyan-400 fill-cyan-400" />
                                                    ) : null}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className={`text-xl font-bold ${isNext ? 'text-cyan-400' : 'text-white'}`}>
                                                        {day.reps.map(r => formatValue(r, exercise.unit)).join(' · ')}
                                                        {day.reps.length > 1 && !day.isFinal ? '+' : ''}
                                                    </div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Target Volume</p>
                                                </div>

                                                {isNext && (
                                                    <div className="mt-3 bg-cyan-500 text-slate-900 px-3 py-1 rounded text-xs font-bold text-center uppercase tracking-wider">
                                                        ⚡ Launch
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
