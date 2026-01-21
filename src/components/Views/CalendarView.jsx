import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarView = ({ sessionHistory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

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
            <div
                key={day}
                className={`h-10 md:h-12 flex flex-col items-center justify-center rounded-lg relative transition-all ${
                    isToday
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : hasWorkout
                            ? 'bg-slate-800/50 hover:bg-slate-800'
                            : 'hover:bg-slate-800/30'
                }`}
                title={hasWorkout ? `${workouts.length} workout${workouts.length > 1 ? 's' : ''}` : ''}
            >
                <span className={`text-sm font-medium ${isToday ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {day}
                </span>
                {hasWorkout && (
                    <div className="flex gap-0.5 mt-0.5">
                        {exerciseColors.slice(0, 3).map((color, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full bg-${color}-500`}
                            />
                        ))}
                        {exerciseColors.length > 3 && (
                            <span className="text-[8px] text-slate-400">+{exerciseColors.length - 3}</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Count workouts this month
    const totalWorkoutsThisMonth = Object.values(workoutsByDay).reduce((sum, arr) => sum + arr.length, 0);
    const daysWithWorkouts = Object.keys(workoutsByDay).length;

    return (
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
        </div>
    );
};

export default CalendarView;
