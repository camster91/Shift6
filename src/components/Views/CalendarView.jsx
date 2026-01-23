import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Dumbbell, Play, Calendar, Clock } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';
import { EXERCISE_LIBRARY } from '../../data/exerciseLibrary.js';
import { getNextSessionForExercise } from '../../utils/schedule';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

// Color mapping for exercise themes
const colorClasses = {
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    teal: 'bg-teal-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
};

const DayDetailModal = ({ date, workouts, plannedExercises, isPast, isToday, isFuture, onClose, onStartWorkout, allExercises }) => {
    if (!date) return null;

    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const dayOfWeek = date.getDay();
    const isRestDay = dayOfWeek === 0; // Sunday

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div>
                        <h3 className="text-lg font-bold text-white">{dateStr}</h3>
                        {!isRestDay && (
                            <p className="text-xs text-cyan-400">Workout Day</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {isRestDay ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Calendar size={20} className="text-emerald-400" />
                            </div>
                            <p className="text-emerald-400 font-medium">Rest Day</p>
                            <p className="text-slate-500 text-sm mt-1">Recovery is part of the program</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Completed Workouts */}
                            {workouts.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        {workouts.length} Completed
                                    </p>
                                    {workouts.map((workout, i) => {
                                        const exercise = allExercises[workout.exerciseKey] || EXERCISE_PLANS[workout.exerciseKey];
                                        const colorClass = colorClasses[exercise?.color] || 'bg-cyan-500';

                                        return (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                                            >
                                                <div className={`w-2 h-10 rounded-full ${colorClass}`} />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white text-sm">
                                                        {exercise?.name || workout.exerciseKey}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {workout.volume} {workout.unit}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Planned/Suggested Exercises */}
                            {plannedExercises.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Clock size={12} />
                                        {isPast ? 'Could Have Done' : isToday ? 'Today\'s Plan' : 'Planned'}
                                    </p>
                                    {plannedExercises.map((planned, i) => {
                                        const exercise = allExercises[planned.exerciseKey] || EXERCISE_PLANS[planned.exerciseKey];
                                        const colorClass = colorClasses[exercise?.color] || 'bg-cyan-500';

                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-3 p-3 rounded-lg border ${
                                                    isPast
                                                        ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                                }`}
                                            >
                                                <div className={`w-2 h-10 rounded-full ${colorClass} ${isPast ? 'opacity-50' : ''}`} />
                                                <div className="flex-1">
                                                    <p className={`font-semibold text-sm ${isPast ? 'text-slate-400' : 'text-white'}`}>
                                                        {exercise?.name || planned.exerciseKey}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Week {planned.week} • Day {planned.dayIndex + 1}
                                                    </p>
                                                </div>
                                                {(isToday || isFuture) && onStartWorkout && (
                                                    <button
                                                        onClick={() => {
                                                            onStartWorkout(planned.week, planned.dayIndex, planned.exerciseKey);
                                                            onClose();
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${colorClass} text-white hover:opacity-90`}
                                                    >
                                                        <Play size={12} fill="currentColor" />
                                                        Start
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {workouts.length === 0 && plannedExercises.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Dumbbell size={20} className="text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 text-sm">No exercises scheduled</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarView = ({ sessionHistory, completedDays = {}, allExercises = {}, activeProgram = [], startWorkout }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Merge exercise data
    const mergedExercises = { ...EXERCISE_PLANS, ...EXERCISE_LIBRARY, ...allExercises };

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Create workout map for this month
    const workoutsByDay = {};
    sessionHistory.forEach(session => {
        const sessionDate = new Date(session.date);
        if (sessionDate.getFullYear() === year && sessionDate.getMonth() === month) {
            const day = sessionDate.getDate();
            if (!workoutsByDay[day]) workoutsByDay[day] = [];
            workoutsByDay[day].push(session);
        }
    });

    // Get planned exercises for a given day (all active exercises)
    const getPlannedForDay = (dayOfWeek) => {
        if (dayOfWeek === 0) return []; // Sunday rest

        const programKeys = activeProgram.length > 0 ? activeProgram : Object.keys(EXERCISE_PLANS);
        const planned = [];

        // Include all active exercises that have incomplete sessions
        programKeys.forEach(key => {
            const next = getNextSessionForExercise(key, completedDays, mergedExercises);
            if (next) {
                planned.push(next);
            }
        });

        return planned;
    };

    // Navigate months
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleDayClick = (day) => {
        const clickedDate = new Date(year, month, day);
        clickedDate.setHours(0, 0, 0, 0);
        const dayOfWeek = clickedDate.getDay();
        const isPast = clickedDate < today;
        const isToday = clickedDate.getTime() === today.getTime();
        const isFuture = clickedDate > today;

        setSelectedDay({
            date: clickedDate,
            workouts: workoutsByDay[day] || [],
            plannedExercises: getPlannedForDay(dayOfWeek),
            isPast,
            isToday,
            isFuture
        });
    };

    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Build calendar grid
    const calendarDays = [];

    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="h-10 md:h-12" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const workouts = workoutsByDay[day] || [];
        const isToday = isCurrentMonth && today.getDate() === day;
        const hasWorkout = workouts.length > 0;

        // Get unique exercise colors for this day
        const exerciseColors = [...new Set(workouts.map(w => EXERCISE_PLANS[w.exerciseKey]?.color))];

        calendarDays.push(
            <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-10 md:h-12 flex flex-col items-center justify-center rounded-lg relative transition-all cursor-pointer ${
                    isToday
                        ? 'bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30'
                        : hasWorkout
                            ? 'bg-slate-800/50 hover:bg-slate-700'
                            : 'hover:bg-slate-800/50'
                }`}
                title={hasWorkout ? `${workouts.length} workout${workouts.length > 1 ? 's' : ''} - Click to view` : 'Click to view'}
            >
                <span className={`text-sm font-medium ${isToday ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {day}
                </span>
                {hasWorkout && (
                    <div className="flex gap-0.5 mt-0.5">
                        {exerciseColors.slice(0, 3).map((color, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${colorClasses[color] || 'bg-cyan-500'}`}
                            />
                        ))}
                        {exerciseColors.length > 3 && (
                            <span className="text-[8px] text-slate-400">+{exerciseColors.length - 3}</span>
                        )}
                    </div>
                )}
            </button>
        );
    }

    // Count workouts this month
    const totalWorkoutsThisMonth = Object.values(workoutsByDay).reduce((sum, arr) => sum + arr.length, 0);
    const daysWithWorkouts = Object.keys(workoutsByDay).length;

    return (
        <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} className="text-slate-400" />
                    </button>
                    <div className="text-center">
                        <h3 className="text-sm font-semibold text-white">{MONTHS[month]} {year}</h3>
                        <p className="text-xs text-slate-500">{totalWorkoutsThisMonth} workouts • {daysWithWorkouts} days</p>
                    </div>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        disabled={isCurrentMonth}
                    >
                        <ChevronRight size={18} className={isCurrentMonth ? 'text-slate-700' : 'text-slate-400'} />
                    </button>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 px-3 py-2 border-b border-slate-800/50">
                    {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 p-3">
                    {calendarDays}
                </div>

                {/* Hint */}
                <div className="px-4 pb-3">
                    <p className="text-[10px] text-slate-600 text-center">Tap any day to view workout details</p>
                </div>
            </div>

            {/* Day Detail Modal */}
            {selectedDay && (
                <DayDetailModal
                    date={selectedDay.date}
                    workouts={selectedDay.workouts}
                    plannedExercises={selectedDay.plannedExercises}
                    isPast={selectedDay.isPast}
                    isToday={selectedDay.isToday}
                    isFuture={selectedDay.isFuture}
                    onClose={() => setSelectedDay(null)}
                    onStartWorkout={startWorkout}
                    allExercises={mergedExercises}
                />
            )}
        </>
    );
};

export default CalendarView;
