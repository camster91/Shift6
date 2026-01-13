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
        <div className="space-y-6 pb-20">
            {/* Exercise Demo Image Placeholder */}
            <div className="relative h-48 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-3">{React.cloneElement(exercise.icon, { size: 64, className: "text-slate-300 mx-auto" })}</div>
                        <p className="text-sm text-slate-500 font-semibold">{exercise.name} Demonstration</p>
                        <p className="text-xs text-slate-400 mt-1">Exercise photo/video placeholder</p>
                    </div>
                </div>
            </div>

            {/* Exercise Header */}
            <div className="border border-slate-200 rounded-lg p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${getThemeClass('bg')} ${getThemeClass('text')}`}>
                                {React.cloneElement(exercise.icon, { size: 20 })}
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900">{exercise.name}</h1>
                        </div>
                        <p className="text-sm text-slate-600">
                            18-day progression to {exercise.finalGoal}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="border border-slate-200 rounded-lg px-5 py-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Completed</p>
                            <p className="text-xl font-bold text-slate-900">{completedCount}/18</p>
                        </div>
                        <div className={`${getThemeClass('bg')} ${getThemeClass('text')} rounded-lg px-5 py-3 text-center`}>
                            <p className="text-xs opacity-75 mb-1">Target</p>
                            <p className="text-xl font-bold">{exercise.finalGoal}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Training Weeks */}
            <div className="space-y-8">
                <h2 className="text-lg font-semibold text-slate-900 px-1">Training Plan</h2>

                <div className="space-y-12 relative">
                    {/* Vertical line */}
                    <div className="absolute left-[29px] top-8 bottom-8 w-[1px] bg-slate-200 -z-10" />

                    {exercise.weeks.map((weekData, wIdx) => {
                        const isCurrentWeek = Math.floor(completedCount / 3) + 1 === weekData.week;
                        const isCompletedWeek = Math.floor(completedCount / 3) + 1 > weekData.week;

                        return (
                            <div key={weekData.week} className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center font-bold transition-all ${
                                        isCurrentWeek ? `${getThemeClass('bg')} ${getThemeClass('text')}` :
                                        isCompletedWeek ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-400'
                                    }`}>
                                        <span className="text-xs opacity-60">Week</span>
                                        <span className="text-lg">{weekData.week}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">
                                            {isCurrentWeek ? 'Current Week' : `Week ${weekData.week}`}
                                        </h3>
                                        <p className="text-xs text-slate-500">
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
                                                className={`p-5 rounded-lg text-left transition-all ${
                                                    isCompleted ? 'bg-slate-50 border border-slate-200 opacity-60' :
                                                    isNext ? 'border-2 border-blue-600 bg-white' :
                                                    'border border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`text-xs font-medium ${isNext ? 'text-blue-600' : 'text-slate-500'}`}>
                                                        Day {dIdx + 1}
                                                    </span>
                                                    {isCompleted ? (
                                                        <CheckCircle2 size={16} className="text-green-600" />
                                                    ) : isNext ? (
                                                        <Zap size={16} className="text-blue-600 fill-blue-600" />
                                                    ) : null}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="text-xl font-bold text-slate-900">
                                                        {day.reps.map(r => formatValue(r, exercise.unit)).join(' · ')}
                                                        {day.reps.length > 1 && !day.isFinal ? '+' : ''}
                                                    </div>
                                                    <p className="text-xs text-slate-500">Target reps</p>
                                                </div>

                                                {isNext && (
                                                    <div className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium text-center">
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
