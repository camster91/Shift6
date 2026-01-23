import { useState } from 'react';
import { Zap, ChevronRight, Flame, Trophy, ChevronDown, ChevronUp, Dumbbell, Play, X, Plus, Trash2, Info } from 'lucide-react';
import { EXERCISE_PLANS, EXERCISE_ACHIEVEMENTS, DIFFICULTY_LEVELS } from '../../data/exercises.jsx';
import { getDailyStack, getScheduleFocus, getNextSessionForExercise } from '../../utils/schedule';
import { vibrate } from '../../utils/device';
import { calculateStats, getPersonalRecords } from '../../utils/gamification';
import { BADGES, getUnlockedBadges } from '../../utils/gamification';
import NeoIcon from '../Visuals/NeoIcon';
import CalendarView from './CalendarView';

// Color classes for exercise themes
const colorClasses = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
};

// Exercise Info Modal
const ExerciseInfoModal = ({ exercise, onClose, onStart, completedDays, difficulty, onSetDifficulty, onDelete, isCustom, allExercises }) => {
    if (!exercise) return null;

    const colors = colorClasses[exercise.color] || colorClasses.cyan;
    const nextSession = getNextSessionForExercise(exercise.key, completedDays, allExercises);
    const isComplete = !nextSession;
    const completedCount = completedDays[exercise.key]?.length || 0;
    const dayNum = completedCount + 1;
    const currentDifficulty = difficulty || 3;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                                {exercise.image?.startsWith('neo:') ? (
                                    <NeoIcon name={exercise.image.replace('neo:', '')} size={24} className={colors.text} />
                                ) : (
                                    <Dumbbell className={colors.text} size={24} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
                                <p className="text-xs text-slate-400">
                                    {isComplete ? 'Completed!' : `Day ${dayNum} of 18`} • {exercise.unit}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Achievements */}
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Achievements</p>
                        <div className="flex flex-wrap gap-2">
                            {EXERCISE_ACHIEVEMENTS.map((ach) => {
                                const isUnlocked = completedCount >= ach.days;
                                return (
                                    <div
                                        key={ach.id}
                                        className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${
                                            isUnlocked
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-slate-800/50 text-slate-600 border border-slate-700'
                                        }`}
                                        title={ach.desc}
                                    >
                                        <span>{ach.icon}</span>
                                        <span>{ach.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Difficulty Selector */}
                    {exercise.variations && exercise.variations.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Difficulty Level</p>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6].map((level) => {
                                    const variation = exercise.variations.find(v => v.level === level);
                                    const levelInfo = DIFFICULTY_LEVELS[level];
                                    const isSelected = currentDifficulty === level;
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => onSetDifficulty && onSetDifficulty(exercise.key, level)}
                                            className={`p-2 rounded-lg border text-center transition-all ${
                                                isSelected
                                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                            title={variation?.desc || levelInfo.name}
                                        >
                                            <p className="text-xs font-bold">{levelInfo.name}</p>
                                            <p className="text-[10px] text-slate-500">{levelInfo.multiplier}x</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {exercise.variations[currentDifficulty - 1] && (
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    {exercise.variations[currentDifficulty - 1].name}: {exercise.variations[currentDifficulty - 1].desc}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Instructions */}
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">How to do it</p>
                        <p className="text-sm text-slate-300">{exercise.instructions}</p>
                    </div>

                    {/* Tips */}
                    {exercise.tips && exercise.tips.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {exercise.tips.map((tip, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                                    {tip}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{Math.min(completedCount, 18)}/18 days</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors.solid} transition-all`}
                                style={{ width: `${Math.min(completedCount / 18 * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Goal */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-xs text-slate-500">Final Goal</span>
                        <span className={`text-sm font-bold ${colors.text}`}>{exercise.finalGoal}</span>
                    </div>

                    {/* Action Buttons */}
                    {!isComplete && nextSession && (
                        <button
                            onClick={() => {
                                onStart(nextSession.week, nextSession.dayIndex, exercise.key);
                                onClose();
                            }}
                            className={`w-full py-4 ${colors.solid} text-white rounded-xl font-bold flex items-center justify-center gap-2`}
                        >
                            <Play size={18} />
                            Start Day {dayNum}
                        </button>
                    )}
                    {isComplete && (
                        <div className="text-center py-4 text-emerald-400 font-bold flex items-center justify-center gap-2">
                            <Trophy size={18} />
                            Exercise Mastered!
                        </div>
                    )}

                    {/* Delete Custom Exercise */}
                    {isCustom && onDelete && (
                        <button
                            onClick={() => {
                                onDelete(exercise.key);
                                onClose();
                            }}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Trash2 size={16} />
                            Delete Custom Exercise
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({
    completedDays,
    sessionHistory,
    startStack,
    startWorkout,
    allExercises = EXERCISE_PLANS,
    customExercises = {},
    exerciseDifficulty = {},
    onSetDifficulty,
    onDeleteExercise,
    onShowAddExercise,
    // eslint-disable-next-line no-unused-vars
    programMode,
    activeProgram,
    onShowExerciseLibrary,
    onShowProgramManager
}) => {
    const dailyStack = getDailyStack(completedDays, allExercises, activeProgram);
    const stats = calculateStats(completedDays, sessionHistory);
    const personalRecords = getPersonalRecords(sessionHistory);
    const [showMore, setShowMore] = useState(false);
    const [showAllExercises, setShowAllExercises] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState(null);

    // Show only active program exercises (or all if no activeProgram)
    const programExercises = activeProgram
        ? Object.fromEntries(activeProgram.map(k => [k, allExercises[k]]).filter(([, v]) => v))
        : allExercises;
    const exerciseCount = Object.keys(programExercises).length;
    const customCount = Object.keys(customExercises).length;

    // Get today's completed workouts
    const today = new Date().toISOString().split('T')[0];
    const todayWorkouts = sessionHistory.filter(s => s.date.startsWith(today));

    // Determine if it's a rest day
    const isRestDay = new Date().getDay() === 0;

    return (
        <div className="space-y-6 pb-8">
            {/* Today's Summary - Only show if worked out today */}
            {todayWorkouts.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <Trophy className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <p className="text-emerald-400 text-sm font-bold">Great work today!</p>
                            <p className="text-slate-300 text-xs">
                                You completed {todayWorkouts.map(w => EXERCISE_PLANS[w.exerciseKey]?.name).join(' & ')}
                            </p>
                        </div>
                    </div>
                    {dailyStack.length > 0 && (
                        <button
                            onClick={() => { vibrate(20); startStack(); }}
                            className="mt-3 w-full py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            Want to do more? →
                        </button>
                    )}
                </div>
            )}

            {/* Main CTA - Next Workout */}
            {dailyStack.length > 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                        Today
                                    </span>
                                    <span className="text-sm font-semibold text-white">
                                        {getScheduleFocus()}
                                    </span>
                                </div>
                                <h1 className="text-3xl font-black text-white">
                                    {dailyStack.length} exercise{dailyStack.length > 1 ? 's' : ''} ready
                                </h1>
                            </div>
                            <button
                                onClick={() => { vibrate(20); startStack(); }}
                                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                            >
                                <Zap size={18} className="fill-current" />
                                Start
                            </button>
                        </div>
                    </div>

                    {/* Next Workout Cards */}
                    <div className="p-4 space-y-3">
                        {dailyStack.map((item, i) => {
                            const ex = EXERCISE_PLANS[item.exerciseKey];
                            const pr = personalRecords[item.exerciseKey];
                            const dayNum = (completedDays[item.exerciseKey]?.length || 0) + 1;
                            const colors = colorClasses[ex.color] || colorClasses.cyan;

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        vibrate(10);
                                        setSelectedExercise({ ...ex, key: item.exerciseKey });
                                    }}
                                    className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all group"
                                >
                                    {/* Exercise Icon */}
                                    <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                                        {ex.image?.startsWith('neo:') ? (
                                            <NeoIcon name={ex.image.replace('neo:', '')} size={20} className={colors.text} />
                                        ) : (
                                            <span className={colors.text}>{ex.icon}</span>
                                        )}
                                    </div>

                                    {/* Exercise Info */}
                                    <div className="flex-1 text-left">
                                        <h3 className="text-white font-bold">{ex.name}</h3>
                                        <p className="text-xs text-slate-400">
                                            Day {dayNum} of 18
                                            {pr && <span className="text-amber-400 ml-2">PR: {pr.volume}</span>}
                                        </p>
                                    </div>

                                    {/* Info Icon */}
                                    <Info className="text-slate-500 group-hover:text-cyan-400 transition-colors" size={18} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Rest Day / All Caught Up */
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        {isRestDay ? (
                            <span className="text-3xl">😴</span>
                        ) : (
                            <Trophy className="text-cyan-400" size={28} />
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {isRestDay ? 'Rest Day' : 'All Caught Up!'}
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                        {isRestDay
                            ? 'Take it easy today. Recovery is part of the process.'
                            : 'Great job! Check back tomorrow or browse all exercises below.'}
                    </p>
                </div>
            )}

            {/* My Program Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowAllExercises(!showAllExercises)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Dumbbell size={18} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-white">My Program</h3>
                            <p className="text-xs text-slate-500">
                                {exerciseCount} exercises {customCount > 0 && `(${customCount} custom)`}
                            </p>
                        </div>
                    </div>
                    {showAllExercises ? (
                        <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={20} className="text-slate-400" />
                    )}
                </button>

                {showAllExercises && (
                    <div className="p-4 pt-0 space-y-3">
                        {/* Quick Actions */}
                        {(onShowExerciseLibrary || onShowProgramManager) && (
                            <div className="flex gap-2 mb-3">
                                {onShowExerciseLibrary && (
                                    <button
                                        onClick={() => { vibrate(10); onShowExerciseLibrary(); }}
                                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Browse Library
                                    </button>
                                )}
                                {onShowProgramManager && (
                                    <button
                                        onClick={() => { vibrate(10); onShowProgramManager(); }}
                                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                                    >
                                        Manage Program
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(programExercises).map(([key, ex]) => {
                                if (!ex) return null;
                                const colors = colorClasses[ex.color] || colorClasses.cyan;
                                const dayNum = (completedDays[key]?.length || 0) + 1;
                                const isComplete = dayNum > 18;
                                const pr = personalRecords[key];
                                const isCustom = !!customExercises[key];
                                const difficulty = exerciseDifficulty[key] || 3;
                                const diffLevel = DIFFICULTY_LEVELS[difficulty];

                                return (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            vibrate(10);
                                            setSelectedExercise({ ...ex, key, isCustom });
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-slate-800/50 ${
                                            isComplete
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : isCustom
                                                ? 'bg-purple-500/5 border-purple-500/20'
                                                : 'bg-slate-800/30 border-slate-700/50'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                                            {ex.image?.startsWith('neo:') ? (
                                                <NeoIcon name={ex.image.replace('neo:', '')} size={18} className={colors.text} />
                                            ) : (
                                                <Dumbbell className={colors.text} size={18} />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-white truncate">{ex.name}</h4>
                                                {isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Custom</span>}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {isComplete ? (
                                                    <span className="text-emerald-400">Complete</span>
                                                ) : (
                                                    `Day ${dayNum}/18`
                                                )}
                                                {difficulty !== 3 && (
                                                    <span className="text-cyan-400 ml-2">{diffLevel.name}</span>
                                                )}
                                                {pr && <span className="text-amber-400 ml-2">PR: {pr.volume}</span>}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Add Exercise Button */}
                        {onShowAddExercise && (
                            <button
                                onClick={() => {
                                    vibrate(10);
                                    onShowAddExercise();
                                }}
                                className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-400"
                            >
                                <Plus size={20} />
                                <span className="font-medium">Add Custom Exercise</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Streak Display */}
            {stats.currentStreak > 0 && (
                <div className="flex items-center justify-center gap-3 py-4">
                    <Flame className="text-orange-500" size={24} />
                    <span className="text-2xl font-bold text-white">{stats.currentStreak}</span>
                    <span className="text-slate-400 text-sm">day streak</span>
                </div>
            )}

            {/* Collapsible "More" Section */}
            <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
                {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showMore ? 'Show less' : 'View calendar & achievements'}
            </button>

            {showMore && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Calendar */}
                    <CalendarView
                        sessionHistory={sessionHistory}
                        completedDays={completedDays}
                        allExercises={allExercises}
                        activeProgram={activeProgram}
                        startWorkout={startWorkout}
                    />

                    {/* Achievements */}
                    {(() => {
                        const unlockedBadges = getUnlockedBadges(stats);
                        return (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-white">Achievements</h3>
                                    <span className="text-xs text-cyan-400">{unlockedBadges.length}/{BADGES.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {BADGES.map((badge) => {
                                        const isUnlocked = badge.condition(stats);
                                        return (
                                            <div
                                                key={badge.id}
                                                className={`px-2 py-1 rounded-lg text-xs ${
                                                    isUnlocked
                                                        ? 'bg-cyan-500/10 text-cyan-400'
                                                        : 'bg-slate-800/50 text-slate-600'
                                                }`}
                                                title={badge.desc}
                                            >
                                                {badge.icon} {badge.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-400">{stats.totalSessions}</div>
                            <div className="text-xs text-slate-500 uppercase">Total Workouts</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-400">{stats.completedPlans}</div>
                            <div className="text-xs text-slate-500 uppercase">Plans Mastered</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise Info Modal */}
            {selectedExercise && (
                <ExerciseInfoModal
                    exercise={selectedExercise}
                    completedDays={completedDays}
                    difficulty={exerciseDifficulty[selectedExercise.key]}
                    onSetDifficulty={onSetDifficulty}
                    onDelete={onDeleteExercise}
                    isCustom={selectedExercise.isCustom}
                    onClose={() => setSelectedExercise(null)}
                    onStart={startWorkout}
                    allExercises={allExercises}
                />
            )}
        </div>
    );
};

export default Dashboard;
