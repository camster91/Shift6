import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Dumbbell } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';

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

const DayDetailModal = ({ date, workouts, onClose }) => {
    if (!date) return null;

    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">{dateStr}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-4">
                    {workouts.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Dumbbell size={20} className="text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm">No workouts on this day</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">
                                {workouts.length} workout{workouts.length > 1 ? 's' : ''} completed
                            </p>
                            {workouts.map((workout, i) => {
                                const exercise = EXERCISE_PLANS[workout.exerciseKey];
                                const colorClass = colorClasses[exercise?.color] || 'bg-cyan-500';

                                return (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                                    >
                                        <div className={`w-2 h-10 rounded-full ${colorClass}`} />
                                        <div className="flex-1">
                                            <p className="font-semibold text-white text-sm">
                                                {exercise?.name || workout.exerciseKey}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {workout.volume} {workout.unit}
                                                {workout.dayId && (
                                                    <span className="text-slate-500 ml-2">
                                                        • Day {parseInt(workout.dayId.slice(-1)) || '?'}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {workout.notes && (
                                            <div className="text-xs text-slate-500 max-w-[100px] truncate" title={workout.notes}>
                                                📝 {workout.notes}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarView = ({ sessionHistory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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

    // Navigate months
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleDayClick = (day) => {
        const clickedDate = new Date(year, month, day);
        setSelectedDay({
            date: clickedDate,
            workouts: workoutsByDay[day] || []
        });
    };

    const today = new Date();
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
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </>
    );
};

export default CalendarView;
