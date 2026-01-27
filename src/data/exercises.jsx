import {
    Dumbbell,
    Zap,
    Activity,
    Triangle,
    Move,
    ArrowUp,
    ArrowDown,
    Minus,
    Circle,
    Target
} from 'lucide-react';

/**
 * Shift6 Calisthenics Exercise System
 *
 * Organized by Movement Patterns with Progressive Difficulty:
 * - PUSH: Wall → Knee → Standard → Diamond → Archer → One-Arm
 * - PULL: Dead Hang → Scapular → Row → Negative → Chin-up → Pull-up → L-Sit Pull-up
 * - SQUAT: Air → Split → Lunge → Bulgarian → Pistol → Shrimp
 * - HINGE: Glute Bridge → Single Leg Bridge → Nordic Curl
 * - CORE: Plank → Side Plank → Hollow → V-Up → L-Sit → Dragon Flag
 *
 * Users unlock harder progressions by:
 * 1. Completing all 18 days of an exercise, OR
 * 2. Achieving a specific rep milestone
 */

// Common rest logic: Weeks 1-3 = 60s, Weeks 4-6 = 90s
export const getRest = (week) => (week <= 3 ? 60 : 90);

// ============================================
// TRAINING PREFERENCE CONFIGURATIONS
// Research-based rep schemes and progression rates
// ============================================

export const REP_SCHEME_CONFIGS = {
    balanced: {
        id: 'balanced',
        name: 'Balanced',
        desc: 'Mix of all rep ranges for general fitness',
        longDesc: 'A well-rounded approach that builds strength, muscle, and endurance together.',
        repRange: [8, 15],
        defaultSets: 5,
        restSeconds: 60,
        multiplier: 1.0,
        progressionStyle: 'standard',
        icon: '⚖️',
        color: 'cyan'
    },
    hypertrophy: {
        id: 'hypertrophy',
        name: 'Hypertrophy',
        desc: 'Moderate reps, optimal for muscle growth',
        longDesc: 'The sweet spot for building muscle mass. Moderate reps with controlled tempo.',
        repRange: [8, 15],
        defaultSets: 4,
        restSeconds: 60,
        multiplier: 1.0,
        progressionStyle: 'reps_then_sets',
        icon: '💪',
        color: 'blue'
    },
    strength: {
        id: 'strength',
        name: 'Strength',
        desc: 'Lower reps, builds maximal strength',
        longDesc: 'Focus on building raw strength with lower reps and longer rest periods.',
        repRange: [3, 8],
        defaultSets: 5,
        restSeconds: 90,
        multiplier: 0.6,
        progressionStyle: 'intensity',
        icon: '🏋️',
        color: 'orange'
    },
    endurance: {
        id: 'endurance',
        name: 'Endurance',
        desc: 'Higher reps, builds stamina and muscular endurance',
        longDesc: 'Focus on muscular endurance with higher rep ranges. Great for building work capacity and stamina.',
        repRange: [15, 25],
        defaultSets: 3,
        restSeconds: 30,
        multiplier: 1.3,
        progressionStyle: 'volume',
        icon: '🏃',
        color: 'emerald'
    }
};

export const PROGRESSION_RATES = {
    conservative: {
        id: 'conservative',
        name: 'Conservative',
        desc: 'Slower progression, great for injury prevention',
        longDesc: 'Ideal for beginners or those recovering from injury. Prioritizes consistency over speed.',
        weeklyIncrease: 0.05,
        deloadFrequency: 3,
        deloadReduction: 0.2,
        icon: '🐢',
        color: 'green'
    },
    moderate: {
        id: 'moderate',
        name: 'Moderate',
        desc: 'Balanced progression for most users',
        longDesc: 'The recommended rate for most people. Sustainable progress without burnout.',
        weeklyIncrease: 0.08,
        deloadFrequency: 4,
        deloadReduction: 0.15,
        icon: '🎯',
        color: 'cyan'
    },
    aggressive: {
        id: 'aggressive',
        name: 'Aggressive',
        desc: 'Fast progression for experienced athletes',
        longDesc: 'For those with a solid training base who can handle rapid increases.',
        weeklyIncrease: 0.12,
        deloadFrequency: 5,
        deloadReduction: 0.1,
        icon: '🚀',
        color: 'orange'
    }
};

export const FITNESS_LEVEL_PRESETS = {
    beginner: {
        id: 'beginner',
        name: 'Beginner',
        desc: 'New to fitness or returning after a long break',
        defaults: {
            trainingDaysPerWeek: 3,
            repScheme: 'endurance',
            progressionRate: 'conservative',
            setsPerExercise: 3,
            programDuration: 6,
            targetSessionDuration: 20
        },
        icon: '🌱',
        color: 'green'
    },
    intermediate: {
        id: 'intermediate',
        name: 'Intermediate',
        desc: 'Consistent training for 6+ months',
        defaults: {
            trainingDaysPerWeek: 4,
            repScheme: 'balanced',
            progressionRate: 'moderate',
            setsPerExercise: 5,
            programDuration: 6,
            targetSessionDuration: 30
        },
        icon: '💪',
        color: 'cyan'
    },
    advanced: {
        id: 'advanced',
        name: 'Advanced',
        desc: 'Years of consistent training experience',
        defaults: {
            trainingDaysPerWeek: 5,
            repScheme: 'strength',
            progressionRate: 'aggressive',
            setsPerExercise: 6,
            programDuration: 8,
            targetSessionDuration: 45
        },
        icon: '🏆',
        color: 'orange'
    }
};

export const DEFAULT_TRAINING_PREFERENCES = {
    trainingDaysPerWeek: 3,
    preferredDays: [],
    targetSessionDuration: 30,
    repScheme: 'balanced',
    setsPerExercise: 5,
    progressionRate: 'moderate',
    programDuration: 6,
    restBetweenSets: 'auto',
    fitnessLevel: 'intermediate',
    createdAt: null,
    updatedAt: null
};

// ============================================
// MOVEMENT PATTERNS & PROGRESSIONS
// ============================================

export const MOVEMENT_PATTERNS = {
    push: { name: 'Push', color: 'blue', icon: 'ArrowUp', description: 'Pushing movements for chest, shoulders, triceps' },
    pull: { name: 'Pull', color: 'yellow', icon: 'ArrowDown', description: 'Pulling movements for back, biceps, grip' },
    squat: { name: 'Squat', color: 'orange', icon: 'ChevronDown', description: 'Squatting movements for quads, glutes' },
    hinge: { name: 'Hinge', color: 'cyan', icon: 'RotateCw', description: 'Hip hinge movements for glutes, hamstrings' },
    core: { name: 'Core', color: 'emerald', icon: 'Circle', description: 'Core stability and strength' }
};

/**
 * Progression Chains - defines the order of exercises in each movement pattern
 * Users unlock the next exercise when they:
 * 1. Complete all 18 days of current exercise, OR
 * 2. Achieve a specific rep/time milestone
 */
export const PROGRESSION_CHAINS = {
    push: [
        { key: 'wallPushups', unlockAt: null, unlockReps: null }, // Always unlocked
        { key: 'kneePushups', unlockAt: 'wallPushups', unlockReps: 30 },
        { key: 'pushups', unlockAt: 'kneePushups', unlockReps: 20 },
        { key: 'diamondPushups', unlockAt: 'pushups', unlockReps: 30 },
        { key: 'archerPushups', unlockAt: 'diamondPushups', unlockReps: 20 },
        { key: 'oneArmPushups', unlockAt: 'archerPushups', unlockReps: 15 }
    ],
    pull: [
        { key: 'deadHangs', unlockAt: null, unlockReps: null }, // Always unlocked (seconds)
        { key: 'scapularPulls', unlockAt: 'deadHangs', unlockReps: 45 }, // 45 seconds
        { key: 'australianRows', unlockAt: 'scapularPulls', unlockReps: 15 },
        { key: 'negativePullups', unlockAt: 'australianRows', unlockReps: 20 },
        { key: 'chinups', unlockAt: 'negativePullups', unlockReps: 10 },
        { key: 'pullups', unlockAt: 'chinups', unlockReps: 12 },
        { key: 'lsitPullups', unlockAt: 'pullups', unlockReps: 10 }
    ],
    squat: [
        { key: 'squats', unlockAt: null, unlockReps: null }, // Always unlocked
        { key: 'splitSquats', unlockAt: 'squats', unlockReps: 40 },
        { key: 'lunges', unlockAt: 'splitSquats', unlockReps: 20 },
        { key: 'bulgarianSplitSquats', unlockAt: 'lunges', unlockReps: 25 },
        { key: 'pistolSquats', unlockAt: 'bulgarianSplitSquats', unlockReps: 15 },
        { key: 'shrimpSquats', unlockAt: 'pistolSquats', unlockReps: 10 }
    ],
    hinge: [
        { key: 'gluteBridges', unlockAt: null, unlockReps: null }, // Always unlocked
        { key: 'glutebridge', unlockAt: 'gluteBridges', unlockReps: 30 }, // Single leg
        { key: 'nordicCurls', unlockAt: 'glutebridge', unlockReps: 25 }
    ],
    core: [
        { key: 'plank', unlockAt: null, unlockReps: null }, // Always unlocked (seconds)
        { key: 'sidePlank', unlockAt: 'plank', unlockReps: 90 }, // 90 seconds
        { key: 'hollowBodyHold', unlockAt: 'sidePlank', unlockReps: 45 },
        { key: 'vups', unlockAt: 'hollowBodyHold', unlockReps: 30 },
        { key: 'lSits', unlockAt: 'vups', unlockReps: 25 },
        { key: 'dragonFlags', unlockAt: 'lSits', unlockReps: 15 }
    ]
};

// ============================================
// DIFFICULTY & SCALING
// ============================================

export const DIFFICULTY_LEVELS = {
    1: { name: 'Assisted', multiplier: 0.5, color: 'emerald', description: 'Use support or easier variation' },
    2: { name: 'Beginner', multiplier: 0.7, color: 'green', description: 'Reduced volume for learning' },
    3: { name: 'Standard', multiplier: 1.0, color: 'cyan', description: 'Normal progression' },
    4: { name: 'Intermediate', multiplier: 1.3, color: 'yellow', description: 'Increased challenge' },
    5: { name: 'Advanced', multiplier: 1.6, color: 'orange', description: 'High volume training' },
    6: { name: 'Elite', multiplier: 2.0, color: 'red', description: 'Maximum intensity' }
};

export const EXERCISE_CATEGORIES = {
    push: { name: 'Push', icon: '💪', color: 'blue' },
    pull: { name: 'Pull', icon: '🏋️', color: 'yellow' },
    squat: { name: 'Squat', icon: '🦵', color: 'orange' },
    hinge: { name: 'Hinge', icon: '🍑', color: 'cyan' },
    core: { name: 'Core', icon: '🎯', color: 'emerald' },
    full: { name: 'Full Body', icon: '⚡', color: 'purple' }
};

// ============================================
// PROGRESSION & GENERATION FUNCTIONS
// ============================================

const generateSetPattern = (baseRep, sets, schemeConfig) => {
    const pattern = [];

    switch (schemeConfig.progressionStyle) {
        case 'volume':
            for (let i = 0; i < sets; i++) {
                pattern.push(i === sets - 1 ? Math.round(baseRep * 1.1) : baseRep);
            }
            break;
        case 'intensity':
            for (let i = 0; i < sets; i++) {
                const factor = 0.7 + (0.3 * Math.min(i / 2, 1));
                pattern.push(Math.max(1, Math.round(baseRep * factor)));
            }
            break;
        case 'reps_then_sets':
            for (let i = 0; i < sets; i++) {
                const factor = i === 0 ? 0.9 : (i === sets - 1 ? 1.1 : 1.0);
                pattern.push(Math.max(1, Math.round(baseRep * factor)));
            }
            break;
        default: {
            const standardPattern = [0.8, 1.0, 0.8, 0.8, 1.2];
            for (let i = 0; i < sets; i++) {
                const factor = standardPattern[i % standardPattern.length];
                pattern.push(Math.max(1, Math.round(baseRep * factor)));
            }
        }
    }

    return pattern;
};

export const generateCustomProgression = (startReps, finalGoal, preferences = {}) => {
    const {
        trainingDaysPerWeek = 3,
        programDuration = 6,
        repScheme = 'balanced',
        setsPerExercise = 5,
        progressionRate = 'moderate'
    } = preferences;

    const schemeConfig = REP_SCHEME_CONFIGS[repScheme] || REP_SCHEME_CONFIGS.balanced;
    const rateConfig = PROGRESSION_RATES[progressionRate] || PROGRESSION_RATES.moderate;

    const adjustedGoal = Math.round(finalGoal * schemeConfig.multiplier);
    // Minimum of 3 as safety net (caller should apply smarter minimums based on exercise type)
    const adjustedStart = Math.max(3, startReps);
    const totalDays = programDuration * trainingDaysPerWeek;

    const weeks = [];
    let dayCount = 0;

    for (let week = 1; week <= programDuration; week++) {
        const isDeloadWeek = rateConfig.deloadFrequency > 0 && week % rateConfig.deloadFrequency === 0;
        const days = [];

        for (let d = 0; d < trainingDaysPerWeek; d++) {
            const progress = totalDays > 1 ? dayCount / (totalDays - 1) : 1;
            let baseRep = Math.round(adjustedStart + (adjustedGoal - adjustedStart) * progress);

            if (isDeloadWeek) {
                baseRep = Math.round(baseRep * (1 - rateConfig.deloadReduction));
            }

            const isFinal = week === programDuration && d === trainingDaysPerWeek - 1;

            if (isFinal) {
                days.push({
                    id: `w${week}d${d + 1}`,
                    reps: [adjustedGoal],
                    isFinal: true
                });
            } else {
                const reps = generateSetPattern(baseRep, setsPerExercise, schemeConfig);
                days.push({ id: `w${week}d${d + 1}`, reps });
            }
            dayCount++;
        }
        weeks.push({ week, days });
    }

    return weeks;
};

export const getCustomRest = (week, preferences = {}) => {
    const { restBetweenSets = 'auto', repScheme = 'balanced', programDuration = 6 } = preferences;

    if (restBetweenSets !== 'auto' && typeof restBetweenSets === 'number') {
        return restBetweenSets;
    }

    const schemeConfig = REP_SCHEME_CONFIGS[repScheme] || REP_SCHEME_CONFIGS.balanced;
    const baseRest = schemeConfig.restSeconds;

    const midpoint = Math.ceil(programDuration / 2);
    const weekMultiplier = week > midpoint ? 1.1 : 1.0;

    return Math.round(baseRest * weekMultiplier);
};

export const generateProgression = (startReps, finalGoal) => {
    const weeks = [];
    const totalDays = 18;
    const increment = (finalGoal - startReps) / (totalDays - 1);

    let dayCount = 0;
    for (let week = 1; week <= 6; week++) {
        const days = [];
        for (let d = 0; d < 3; d++) {
            const baseRep = Math.round(startReps + (increment * dayCount));
            const isFinal = week === 6 && d === 2;

            if (isFinal) {
                days.push({
                    id: `w${week}d${d + 1}`,
                    reps: [finalGoal],
                    isFinal: true
                });
            } else {
                const reps = [
                    Math.round(baseRep * 0.8),
                    baseRep,
                    Math.round(baseRep * 0.8),
                    Math.round(baseRep * 0.8),
                    Math.round(baseRep * 1.2)
                ];
                days.push({ id: `w${week}d${d + 1}`, reps });
            }
            dayCount++;
        }
        weeks.push({ week, days });
    }
    return weeks;
};

// ============================================
// ACHIEVEMENTS
// ============================================

export const EXERCISE_ACHIEVEMENTS = [
    { id: 'first_rep', name: 'First Rep', desc: 'Complete your first workout', icon: '🌱', days: 1 },
    { id: 'week_1', name: 'Week 1 Done', desc: 'Complete week 1', icon: '📅', days: 3 },
    { id: 'week_2', name: 'Week 2 Done', desc: 'Complete week 2', icon: '📅', days: 6 },
    { id: 'halfway', name: 'Halfway Hero', desc: 'Complete 9 days', icon: '🏃', days: 9 },
    { id: 'week_4', name: 'Week 4 Done', desc: 'Complete week 4', icon: '📅', days: 12 },
    { id: 'week_5', name: 'Almost There', desc: 'Complete week 5', icon: '🔥', days: 15 },
    { id: 'mastery', name: 'Mastery', desc: 'Complete all 18 days', icon: '👑', days: 18 }
];

export const getExerciseAchievements = (completedDaysCount) => {
    return EXERCISE_ACHIEVEMENTS.filter(a => completedDaysCount >= a.days);
};

// ============================================
// PROGRESSION UNLOCK FUNCTIONS
// ============================================

/**
 * Check if an exercise is unlocked for a user
 * @param {string} exerciseKey - The exercise to check
 * @param {Object} completedDays - User's completed days { exerciseKey: [dayIds] }
 * @param {Object} personalRecords - User's PRs { exerciseKey: maxReps }
 * @returns {Object} { unlocked: boolean, reason: string, prerequisite: string|null }
 */
export const isExerciseUnlocked = (exerciseKey, completedDays = {}, personalRecords = {}) => {
    // Find which chain this exercise belongs to
    for (const [, chain] of Object.entries(PROGRESSION_CHAINS)) {
        const index = chain.findIndex(p => p.key === exerciseKey);
        if (index === -1) continue;

        const progression = chain[index];

        // First exercise in chain is always unlocked
        if (!progression.unlockAt) {
            return { unlocked: true, reason: 'Starter exercise', prerequisite: null };
        }

        const prerequisite = progression.unlockAt;
        const prerequisiteProgress = completedDays[prerequisite] || [];
        const prerequisitePR = personalRecords[prerequisite] || 0;

        // Check if completed all 18 days of prerequisite
        if (prerequisiteProgress.length >= 18) {
            return { unlocked: true, reason: `Mastered ${EXERCISE_PLANS[prerequisite]?.name || prerequisite}`, prerequisite };
        }

        // Check if achieved unlock rep count
        if (progression.unlockReps && prerequisitePR >= progression.unlockReps) {
            const unit = EXERCISE_PLANS[prerequisite]?.unit || 'reps';
            return { unlocked: true, reason: `Achieved ${progression.unlockReps} ${unit}`, prerequisite };
        }

        const prereqName = EXERCISE_PLANS[prerequisite]?.name || prerequisite;
        const prereqUnit = EXERCISE_PLANS[prerequisite]?.unit || 'reps';
        return {
            unlocked: false,
            reason: `Complete ${prereqName} (18 days) or achieve ${progression.unlockReps} ${prereqUnit}`,
            prerequisite
        };
    }

    // Exercise not in any chain - check if it exists
    if (EXERCISE_PLANS[exerciseKey]) {
        return { unlocked: true, reason: 'Available', prerequisite: null };
    }

    return { unlocked: false, reason: 'Exercise not found', prerequisite: null };
};

/**
 * Get next progression for an exercise
 */
export const getNextProgression = (exerciseKey) => {
    for (const chain of Object.values(PROGRESSION_CHAINS)) {
        const index = chain.findIndex(p => p.key === exerciseKey);
        if (index !== -1 && index < chain.length - 1) {
            return chain[index + 1].key;
        }
    }
    return null;
};

/**
 * Get previous progression for an exercise
 */
export const getPreviousProgression = (exerciseKey) => {
    for (const chain of Object.values(PROGRESSION_CHAINS)) {
        const index = chain.findIndex(p => p.key === exerciseKey);
        if (index > 0) {
            return chain[index - 1].key;
        }
    }
    return null;
};

/**
 * Get all unlocked exercises for a user
 */
export const getUnlockedExercises = (completedDays = {}, personalRecords = {}) => {
    const unlocked = [];

    for (const exerciseKey of Object.keys(EXERCISE_PLANS)) {
        const { unlocked: isUnlocked } = isExerciseUnlocked(exerciseKey, completedDays, personalRecords);
        if (isUnlocked) {
            unlocked.push(exerciseKey);
        }
    }

    return unlocked;
};

/**
 * Get starter exercises (first in each progression chain)
 */
export const getStarterExercises = () => {
    const starters = [];

    for (const chain of Object.values(PROGRESSION_CHAINS)) {
        if (chain[0]) {
            starters.push(chain[0].key);
        }
    }

    // Add standalone exercises
    return [...starters, 'dips', 'supermans', 'burpees'];
};

/**
 * Get exercises by movement pattern
 */
export const getExercisesByPattern = (pattern) => {
    const chain = PROGRESSION_CHAINS[pattern];
    if (!chain) return [];
    return chain.map(p => ({ key: p.key, ...EXERCISE_PLANS[p.key] })).filter(e => e.name);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const EXERCISE_COLORS = ['blue', 'orange', 'cyan', 'emerald', 'yellow', 'teal', 'purple', 'pink', 'indigo', 'red', 'amber', 'lime'];

export const formatValue = (val, type) => {
    if (type === 'seconds') {
        const mins = Math.floor(val / 60);
        const secs = val % 60;
        if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}s`;
        return `${secs}s`;
    }
    return val;
};

// ============================================
// EXERCISE PLANS - CALISTHENICS ONLY
// ============================================

export const EXERCISE_PLANS = {
    // ============================================================
    // PUSH PROGRESSION
    // ============================================================
    wallPushups: {
        name: "Wall Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        startReps: 10,
        finalGoal: "50 Reps",
        image: "neo:wallPushups",
        youtubeId: "a6YHbXD2XlU",
        instructions: "Stand facing a wall at arms length. Place hands on wall at shoulder height. Bend elbows to bring chest toward wall, then push back.",
        tips: ["Keep core tight", "Great for beginners", "Perfect for learning form"],
        category: "push",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        nextProgression: 'kneePushups',
        unlockCriteria: 'Complete all 18 days or achieve 30 consecutive reps',
        weeks: generateProgression(10, 50)
    },

    kneePushups: {
        name: "Knee Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        startReps: 8,
        finalGoal: "40 Reps",
        image: "neo:kneePushups",
        youtubeId: "jWxvty2KROs",
        instructions: "Start in push-up position with knees on ground. Lower chest to floor keeping back straight, then push back up.",
        tips: ["Keep hips in line with shoulders", "Great stepping stone to full push-ups", "Full range of motion"],
        category: "push",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'wallPushups',
        nextProgression: 'pushups',
        unlockCriteria: 'Complete all 18 days or achieve 20 consecutive reps',
        weeks: generateProgression(8, 40)
    },

    pushups: {
        name: "Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        startReps: 5,
        finalGoal: "100 Reps",
        image: "neo:pushups",
        youtubeId: "IODxDxX7oi4",
        instructions: "Keep body straight from head to heels. Lower chest to floor, elbows at 45°. Push through palms, engage core throughout.",
        tips: ["Don't let hips sag", "Full range of motion", "Breathe out on push"],
        category: "push",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'kneePushups',
        nextProgression: 'diamondPushups',
        unlockCriteria: 'Complete all 18 days or achieve 30 consecutive reps',
        variations: [
            { level: 1, name: "Wall Push-Ups", desc: "Stand facing wall, push away" },
            { level: 2, name: "Knee Push-Ups", desc: "Knees on ground" },
            { level: 3, name: "Standard Push-Ups", desc: "Full push-up position" },
            { level: 4, name: "Diamond Push-Ups", desc: "Hands close together" },
            { level: 5, name: "Archer Push-Ups", desc: "Shift weight to one arm" },
            { level: 6, name: "One-Arm Push-Ups", desc: "Single arm, ultimate challenge" }
        ],
        weeks: [
            { week: 1, days: [{ id: "p11", reps: [3, 4, 3, 3, 5] }, { id: "p12", reps: [4, 5, 4, 4, 6] }, { id: "p13", reps: [5, 6, 5, 5, 8] }] },
            { week: 2, days: [{ id: "p21", reps: [6, 7, 6, 6, 9] }, { id: "p22", reps: [8, 10, 8, 8, 12] }, { id: "p23", reps: [10, 12, 10, 10, 15] }] },
            { week: 3, days: [{ id: "p31", reps: [12, 15, 12, 12, 18] }, { id: "p32", reps: [14, 18, 14, 14, 20] }, { id: "p33", reps: [16, 20, 16, 16, 25] }] },
            { week: 4, days: [{ id: "p41", reps: [18, 22, 18, 18, 28] }, { id: "p42", reps: [20, 25, 20, 20, 30] }, { id: "p43", reps: [25, 30, 25, 25, 35] }] },
            { week: 5, days: [{ id: "p51", reps: [30, 35, 30, 30, 40] }, { id: "p52", reps: [35, 40, 35, 35, 45] }, { id: "p53", reps: [40, 50, 40, 40, 55] }] },
            { week: 6, days: [{ id: "p61", reps: [45, 55, 45, 45, 60] }, { id: "p62", reps: [50, 60, 50, 50, 70] }, { id: "p63", reps: [100], isFinal: true }] },
        ]
    },

    diamondPushups: {
        name: "Diamond Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        startReps: 5,
        finalGoal: "40 Reps",
        image: "neo:diamondPushups",
        youtubeId: "J0DnG1_S92I",
        instructions: "Place hands together forming a diamond shape with thumbs and index fingers. Perform push-ups with elbows close to body.",
        tips: ["Emphasizes triceps", "Keep elbows tucked", "Great for arm definition"],
        category: "push",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'pushups',
        nextProgression: 'archerPushups',
        unlockCriteria: 'Complete all 18 days or achieve 20 consecutive reps',
        weeks: generateProgression(5, 40)
    },

    archerPushups: {
        name: "Archer Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        startReps: 3,
        finalGoal: "20 Reps",
        image: "neo:archerPushups",
        youtubeId: "ykI7YW0ECcE",
        instructions: "Start in wide push-up position. Lower toward one hand while extending the other arm out straight. Alternate sides.",
        tips: ["Progression to one-arm push-ups", "Keep extended arm straight", "Control the movement"],
        category: "push",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'diamondPushups',
        nextProgression: 'oneArmPushups',
        unlockCriteria: 'Complete all 18 days or achieve 15 consecutive reps per side',
        weeks: generateProgression(3, 20)
    },

    oneArmPushups: {
        name: "One-Arm Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        startReps: 1,
        finalGoal: "15 Reps",
        image: "neo:oneArmPushups",
        youtubeId: "WJmbiMnSuKg",
        instructions: "Take wide stance, place one hand behind back. Lower chest toward ground using single arm, then push back up.",
        tips: ["Elite exercise", "Wide stance helps balance", "Keep hips level"],
        category: "push",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'archerPushups',
        nextProgression: null,
        unlockCriteria: 'Master level achieved!',
        weeks: generateProgression(1, 15)
    },

    dips: {
        name: "Dips",
        icon: <ArrowDown size={20} />,
        color: "pink",
        unit: "reps",
        startReps: 5,
        finalGoal: "50 Reps",
        image: "neo:dips",
        youtubeId: "2z8JmcrW-As",
        instructions: "Grip parallel bars, arms straight. Lower until upper arms parallel to floor. Push back up to full extension.",
        tips: ["Lean slightly forward for chest", "Don't go too deep initially", "Keep elbows close to body"],
        category: "push",
        equipment: ['dipBars'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        variations: [
            { level: 1, name: "Bench Dips", desc: "Hands on bench behind you" },
            { level: 2, name: "Assisted Dips", desc: "Use band or assistance" },
            { level: 3, name: "Parallel Bar Dips", desc: "Standard dip form" },
            { level: 4, name: "Ring Dips", desc: "Unstable ring surface" },
            { level: 5, name: "Weighted Dips", desc: "Add weight belt" },
            { level: 6, name: "Korean Dips", desc: "Bar behind back" }
        ],
        weeks: [
            { week: 1, days: [{ id: "d11", reps: [3, 4, 3, 3, 5] }, { id: "d12", reps: [4, 5, 4, 4, 6] }, { id: "d13", reps: [5, 6, 5, 5, 8] }] },
            { week: 2, days: [{ id: "d21", reps: [6, 8, 6, 6, 10] }, { id: "d22", reps: [8, 10, 8, 8, 12] }, { id: "d23", reps: [10, 12, 10, 10, 15] }] },
            { week: 3, days: [{ id: "d31", reps: [12, 14, 12, 12, 18] }, { id: "d32", reps: [14, 16, 14, 14, 20] }, { id: "d33", reps: [15, 18, 15, 15, 25] }] },
            { week: 4, days: [{ id: "d41", reps: [18, 20, 18, 18, 28] }, { id: "d42", reps: [20, 22, 20, 20, 30] }, { id: "d43", reps: [22, 25, 22, 22, 35] }] },
            { week: 5, days: [{ id: "d51", reps: [25, 30, 25, 25, 40] }, { id: "d52", reps: [28, 35, 28, 28, 45] }, { id: "d53", reps: [30, 38, 30, 30, 50] }] },
            { week: 6, days: [{ id: "d61", reps: [35, 40, 35, 35, 55] }, { id: "d62", reps: [40, 45, 40, 40, 60] }, { id: "d63", reps: [50], isFinal: true }] },
        ]
    },

    // ============================================================
    // PULL PROGRESSION
    // ============================================================
    deadHangs: {
        name: "Dead Hangs",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "seconds",
        startReps: 15,
        finalGoal: "90 Seconds",
        image: "neo:deadHangs",
        youtubeId: "nPpkPdeP9dg",
        instructions: "Hang from bar with arms fully extended, shoulders engaged. Hold as long as possible.",
        tips: ["Builds grip strength", "Good for shoulder health", "Decompress spine"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        nextProgression: 'scapularPulls',
        unlockCriteria: 'Complete all 18 days or achieve 45 second hold',
        weeks: generateProgression(15, 90)
    },

    scapularPulls: {
        name: "Scapular Pulls",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "reps",
        startReps: 5,
        finalGoal: "25 Reps",
        image: "neo:scapularPulls",
        youtubeId: "V_ZpG0V7K5g",
        instructions: "Hang from bar with arms straight. Without bending elbows, squeeze shoulder blades down and back to raise body slightly.",
        tips: ["Activates back muscles", "Foundation for pull-ups", "Small controlled movement"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'deadHangs',
        nextProgression: 'australianRows',
        unlockCriteria: 'Complete all 18 days or achieve 15 consecutive reps',
        weeks: generateProgression(5, 25)
    },

    australianRows: {
        name: "Australian Rows",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "reps",
        startReps: 8,
        finalGoal: "40 Reps",
        image: "neo:australianRows",
        youtubeId: "hXTc1mDnZCw",
        instructions: "Set bar at waist height. Hang underneath with feet on ground, body straight. Pull chest to bar, then lower.",
        tips: ["Also called inverted rows", "Lower bar = harder", "Great pull-up progression"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'scapularPulls',
        nextProgression: 'negativePullups',
        unlockCriteria: 'Complete all 18 days or achieve 20 consecutive reps',
        weeks: generateProgression(8, 40)
    },

    negativePullups: {
        name: "Negative Pull-Ups",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "reps",
        startReps: 3,
        finalGoal: "20 Reps",
        image: "neo:negativePullups",
        youtubeId: "gbPURTSxQLY",
        instructions: "Jump or step up to top position of pull-up. Lower yourself as slowly as possible (5+ seconds) to full hang.",
        tips: ["Great for building pull-up strength", "Focus on slow controlled descent", "5-10 second negatives"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'australianRows',
        nextProgression: 'chinups',
        unlockCriteria: 'Complete all 18 days or achieve 10 slow negatives',
        weeks: generateProgression(3, 20)
    },

    chinups: {
        name: "Chin-Ups",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "reps",
        startReps: 3,
        finalGoal: "25 Reps",
        image: "neo:chinups",
        youtubeId: "brhRXlOhsAM",
        instructions: "Hang from bar with palms facing you (supinated grip). Pull up until chin clears bar, then lower with control.",
        tips: ["Emphasizes biceps", "Easier than pull-ups for most", "Full range of motion"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'negativePullups',
        nextProgression: 'pullups',
        unlockCriteria: 'Complete all 18 days or achieve 12 consecutive reps',
        weeks: generateProgression(3, 25)
    },

    pullups: {
        name: "Pull-Ups",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "reps",
        startReps: 3,
        finalGoal: "50 Reps",
        image: "neo:pullups",
        youtubeId: "eGo4IYlbE5g",
        instructions: "Grip bar shoulder-width, palms away. Pull until chin clears bar, leading with chest. Lower with control.",
        tips: ["Engage lats before pulling", "Don't swing or kip", "Use negatives to build strength"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'chinups',
        nextProgression: 'lsitPullups',
        unlockCriteria: 'Complete all 18 days or achieve 10 consecutive reps',
        variations: [
            { level: 1, name: "Dead Hangs", desc: "Just hang from bar, build grip" },
            { level: 2, name: "Negative Pull-Ups", desc: "Jump up, lower slowly" },
            { level: 3, name: "Standard Pull-Ups", desc: "Full pull-up, palms away" },
            { level: 4, name: "Chin-Ups", desc: "Palms facing you, bicep focus" },
            { level: 5, name: "Wide Grip Pull-Ups", desc: "Hands wider than shoulders" },
            { level: 6, name: "Muscle-Ups", desc: "Pull over the bar completely" }
        ],
        weeks: [
            { week: 1, days: [{ id: "l11", reps: [1, 2, 1, 1, 2] }, { id: "l12", reps: [2, 2, 2, 2, 3] }, { id: "l13", reps: [2, 3, 2, 2, 4] }] },
            { week: 2, days: [{ id: "l21", reps: [3, 3, 3, 3, 4] }, { id: "l22", reps: [3, 4, 3, 3, 5] }, { id: "l23", reps: [4, 5, 4, 4, 6] }] },
            { week: 3, days: [{ id: "l31", reps: [4, 6, 4, 4, 7] }, { id: "l32", reps: [5, 6, 5, 5, 8] }, { id: "l33", reps: [5, 7, 5, 5, 9] }] },
            { week: 4, days: [{ id: "l41", reps: [6, 8, 6, 6, 10] }, { id: "l42", reps: [7, 9, 7, 7, 11] }, { id: "l43", reps: [8, 10, 8, 8, 12] }] },
            { week: 5, days: [{ id: "l51", reps: [9, 11, 9, 9, 13] }, { id: "l52", reps: [10, 12, 10, 10, 14] }, { id: "l53", reps: [11, 13, 11, 11, 15] }] },
            { week: 6, days: [{ id: "l61", reps: [12, 14, 12, 12, 16] }, { id: "l62", reps: [13, 15, 13, 13, 18] }, { id: "l63", reps: [20], isFinal: true }] },
        ]
    },

    lsitPullups: {
        name: "L-Sit Pull-Ups",
        icon: <ArrowUp size={20} />,
        color: "yellow",
        unit: "reps",
        startReps: 2,
        finalGoal: "15 Reps",
        image: "neo:lsitPullups",
        youtubeId: "Q7Bh--3pxeI",
        instructions: "Hang from bar with legs extended straight in front (L position). Perform pull-ups while maintaining L-sit.",
        tips: ["Intense core engagement", "Keep legs parallel to ground", "Advanced exercise"],
        category: "pull",
        equipment: ['pullupBar'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'pullups',
        nextProgression: null,
        unlockCriteria: 'Master level achieved!',
        weeks: generateProgression(2, 15)
    },

    supermans: {
        name: "Supermans",
        icon: <Activity size={20} />,
        color: "indigo",
        unit: "reps",
        startReps: 10,
        finalGoal: "50 Reps",
        image: "neo:supermans",
        youtubeId: "cc6UVRS7PW4",
        instructions: "Lie face down, arms extended. Simultaneously lift arms, chest, and legs off floor. Hold briefly, lower with control.",
        tips: ["Squeeze glutes and lower back", "Keep neck neutral", "Don't hyperextend"],
        category: "pull",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        variations: [
            { level: 1, name: "Bird Dogs", desc: "On all fours, opposite arm/leg" },
            { level: 2, name: "Cobra", desc: "Just lift upper body" },
            { level: 3, name: "Standard Superman", desc: "Full lift, brief hold" },
            { level: 4, name: "Superman Hold", desc: "Hold for 3 seconds" },
            { level: 5, name: "Swimming", desc: "Alternate flutter arms/legs" },
            { level: 6, name: "Weighted Superman", desc: "Hold weight in hands" }
        ],
        weeks: [
            { week: 1, days: [{ id: "m11", reps: [5, 6, 5, 5, 8] }, { id: "m12", reps: [6, 8, 6, 6, 10] }, { id: "m13", reps: [8, 10, 8, 8, 12] }] },
            { week: 2, days: [{ id: "m21", reps: [10, 12, 10, 10, 15] }, { id: "m22", reps: [12, 15, 12, 12, 18] }, { id: "m23", reps: [15, 18, 15, 15, 20] }] },
            { week: 3, days: [{ id: "m31", reps: [18, 20, 18, 18, 25] }, { id: "m32", reps: [20, 25, 20, 20, 30] }, { id: "m33", reps: [25, 30, 25, 25, 35] }] },
            { week: 4, days: [{ id: "m41", reps: [30, 35, 30, 30, 40] }, { id: "m42", reps: [35, 40, 35, 35, 45] }, { id: "m43", reps: [40, 50, 40, 40, 55] }] },
            { week: 5, days: [{ id: "m51", reps: [45, 55, 45, 45, 60] }, { id: "m52", reps: [50, 60, 50, 50, 70] }, { id: "m53", reps: [55, 65, 55, 55, 80] }] },
            { week: 6, days: [{ id: "m61", reps: [60, 70, 60, 60, 90] }, { id: "m62", reps: [70, 80, 70, 70, 100] }, { id: "m63", reps: [100], isFinal: true }] },
        ]
    },

    // ============================================================
    // SQUAT PROGRESSION
    // ============================================================
    squats: {
        name: "Air Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps",
        startReps: 15,
        finalGoal: "200 Reps",
        image: "neo:squats",
        youtubeId: "YaXPRqUwItQ",
        instructions: "Feet shoulder-width apart, toes slightly out. Sit back and down, keeping knees tracking over toes. Drive through heels to stand.",
        tips: ["Keep chest up", "Depth: thighs parallel or below", "Don't let knees cave in"],
        category: "squat",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        nextProgression: 'splitSquats',
        unlockCriteria: 'Complete all 18 days or achieve 40 consecutive reps',
        variations: [
            { level: 1, name: "Chair Squats", desc: "Sit to chair, stand up" },
            { level: 2, name: "Half Squats", desc: "Partial depth squat" },
            { level: 3, name: "Standard Squats", desc: "Full depth bodyweight" },
            { level: 4, name: "Jump Squats", desc: "Explosive jump at top" },
            { level: 5, name: "Bulgarian Split Squats", desc: "Rear foot elevated" },
            { level: 6, name: "Pistol Squats", desc: "Single leg, full depth" }
        ],
        weeks: [
            { week: 1, days: [{ id: "s11", reps: [15, 18, 15, 15, 20] }, { id: "s12", reps: [18, 22, 18, 18, 25] }, { id: "s13", reps: [20, 25, 20, 20, 30] }] },
            { week: 2, days: [{ id: "s21", reps: [25, 30, 25, 25, 35] }, { id: "s22", reps: [30, 35, 30, 30, 40] }, { id: "s23", reps: [35, 40, 35, 35, 50] }] },
            { week: 3, days: [{ id: "s31", reps: [40, 50, 40, 40, 60] }, { id: "s32", reps: [45, 55, 45, 45, 65] }, { id: "s33", reps: [50, 60, 50, 50, 70] }] },
            { week: 4, days: [{ id: "s41", reps: [55, 65, 55, 55, 80] }, { id: "s42", reps: [60, 75, 60, 60, 90] }, { id: "s43", reps: [65, 80, 65, 65, 100] }] },
            { week: 5, days: [{ id: "s51", reps: [75, 90, 75, 75, 110] }, { id: "s52", reps: [80, 100, 80, 80, 120] }, { id: "s53", reps: [90, 110, 90, 90, 130] }] },
            { week: 6, days: [{ id: "s61", reps: [100, 120, 100, 100, 140] }, { id: "s62", reps: [110, 130, 110, 110, 150] }, { id: "s63", reps: [200], isFinal: true }] },
        ]
    },

    splitSquats: {
        name: "Split Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps/leg",
        startReps: 8,
        finalGoal: "30 Reps/Leg",
        image: "neo:splitSquats",
        youtubeId: "1FGJJnbvqfM",
        instructions: "Stand in staggered stance, one foot forward. Lower back knee toward ground, then push back up. Complete all reps on one side.",
        tips: ["Keep torso upright", "Front knee over ankle", "Great for balance"],
        category: "squat",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'squats',
        nextProgression: 'lunges',
        unlockCriteria: 'Complete all 18 days or achieve 20 reps per leg',
        weeks: generateProgression(8, 30)
    },

    lunges: {
        name: "Walking Lunges",
        icon: <Move size={20} />,
        color: "orange",
        unit: "reps/leg",
        startReps: 8,
        finalGoal: "50 Reps/Leg",
        image: "neo:lunges",
        youtubeId: "QOVaHwm-Q6U",
        instructions: "Step forward, lower until both knees at 90°. Front knee stays over ankle. Push through front heel to return.",
        tips: ["Keep torso upright", "Don't let knee pass toes", "Control the descent"],
        category: "squat",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'splitSquats',
        nextProgression: 'bulgarianSplitSquats',
        unlockCriteria: 'Complete all 18 days or achieve 25 reps per leg',
        variations: [
            { level: 1, name: "Static Lunges", desc: "Stay in split stance" },
            { level: 2, name: "Reverse Lunges", desc: "Step backward instead" },
            { level: 3, name: "Forward Lunges", desc: "Step forward, return" },
            { level: 4, name: "Walking Lunges", desc: "Continuous forward motion" },
            { level: 5, name: "Jump Lunges", desc: "Explosive switch legs" },
            { level: 6, name: "Deficit Lunges", desc: "Front foot elevated" }
        ],
        weeks: [
            { week: 1, days: [{ id: "u11", reps: [6, 8, 6, 6, 10] }, { id: "u12", reps: [8, 10, 8, 8, 12] }, { id: "u13", reps: [10, 12, 10, 10, 15] }] },
            { week: 2, days: [{ id: "u21", reps: [12, 14, 12, 12, 18] }, { id: "u22", reps: [14, 16, 14, 14, 20] }, { id: "u23", reps: [16, 18, 16, 16, 25] }] },
            { week: 3, days: [{ id: "u31", reps: [18, 22, 18, 18, 28] }, { id: "u32", reps: [20, 25, 20, 20, 30] }, { id: "u33", reps: [22, 28, 22, 22, 35] }] },
            { week: 4, days: [{ id: "u41", reps: [25, 30, 25, 25, 40] }, { id: "u42", reps: [28, 35, 28, 28, 45] }, { id: "u43", reps: [30, 40, 30, 30, 50] }] },
            { week: 5, days: [{ id: "u51", reps: [35, 45, 35, 35, 55] }, { id: "u52", reps: [40, 50, 40, 40, 60] }, { id: "u53", reps: [45, 55, 45, 45, 65] }] },
            { week: 6, days: [{ id: "u61", reps: [50, 60, 50, 50, 70] }, { id: "u62", reps: [55, 65, 55, 55, 80] }, { id: "u63", reps: [50], isFinal: true }] },
        ]
    },

    bulgarianSplitSquats: {
        name: "Bulgarian Split Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps/leg",
        startReps: 5,
        finalGoal: "25 Reps/Leg",
        image: "neo:bulgarianSplitSquats",
        youtubeId: "2C-uNgKwPLE",
        instructions: "Place rear foot on elevated surface behind you. Lower into deep single-leg squat, then drive back up.",
        tips: ["Challenging balance", "Most weight on front leg", "Great leg builder"],
        category: "squat",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'lunges',
        nextProgression: 'pistolSquats',
        unlockCriteria: 'Complete all 18 days or achieve 15 reps per leg',
        weeks: generateProgression(5, 25)
    },

    pistolSquats: {
        name: "Pistol Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps/leg",
        startReps: 1,
        finalGoal: "20 Reps/Leg",
        image: "neo:pistolSquats",
        youtubeId: "qDcniqppFPA",
        instructions: "Stand on one leg, extend other leg forward. Lower into deep single-leg squat, then stand back up.",
        tips: ["Advanced exercise", "Use support if needed", "Requires flexibility and strength"],
        category: "squat",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'bulgarianSplitSquats',
        nextProgression: 'shrimpSquats',
        unlockCriteria: 'Complete all 18 days or achieve 10 reps per leg',
        weeks: generateProgression(1, 20)
    },

    shrimpSquats: {
        name: "Shrimp Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps/leg",
        startReps: 1,
        finalGoal: "15 Reps/Leg",
        image: "neo:shrimpSquats",
        youtubeId: "k-GJe4ACEyA",
        instructions: "Stand on one leg, grab opposite foot behind you. Lower until back knee touches ground, then stand back up.",
        tips: ["Very advanced", "Similar difficulty to pistol squats", "Use support at first"],
        category: "squat",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'pistolSquats',
        nextProgression: null,
        unlockCriteria: 'Master level achieved!',
        weeks: generateProgression(1, 15)
    },

    // ============================================================
    // HINGE PROGRESSION
    // ============================================================
    gluteBridges: {
        name: "Glute Bridges",
        icon: <Activity size={20} />,
        color: "cyan",
        unit: "reps",
        startReps: 15,
        finalGoal: "50 Reps",
        image: "neo:gluteBridges",
        youtubeId: "wPM8icPu6H8",
        instructions: "Lie on back with knees bent, feet flat on floor. Drive through heels to lift hips toward ceiling. Squeeze glutes at top.",
        tips: ["Pause and squeeze at top", "Don't hyperextend lower back", "Foundation for hip strength"],
        category: "hinge",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        nextProgression: 'glutebridge',
        unlockCriteria: 'Complete all 18 days or achieve 30 consecutive reps',
        weeks: generateProgression(15, 50)
    },

    glutebridge: {
        name: "Single Leg Glute Bridge",
        icon: <Activity size={20} />,
        color: "cyan",
        unit: "reps/leg",
        startReps: 8,
        finalGoal: "50 Reps/Leg",
        image: "neo:glutebridge",
        youtubeId: "AVAXhy6pl7o",
        instructions: "Lie on back, one foot flat on floor. Drive through heel, squeeze glutes at top. Lower with control, keep hips level.",
        tips: ["Don't hyperextend lower back", "Squeeze glutes hard at top", "Keep core engaged"],
        category: "hinge",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'gluteBridges',
        nextProgression: 'nordicCurls',
        unlockCriteria: 'Complete all 18 days or achieve 25 reps per leg',
        variations: [
            { level: 1, name: "Two-Leg Bridge", desc: "Both feet on ground" },
            { level: 2, name: "Marching Bridge", desc: "Alternate lifting legs" },
            { level: 3, name: "Single Leg Bridge", desc: "One leg extended" },
            { level: 4, name: "Elevated Bridge", desc: "Foot on raised surface" },
            { level: 5, name: "Weighted Bridge", desc: "Add weight on hips" },
            { level: 6, name: "Single Leg Hip Thrust", desc: "Back on bench, single leg" }
        ],
        weeks: [
            { week: 1, days: [{ id: "g11", reps: [5, 6, 5, 5, 8] }, { id: "g12", reps: [6, 8, 6, 6, 10] }, { id: "g13", reps: [8, 10, 8, 8, 12] }] },
            { week: 2, days: [{ id: "g21", reps: [10, 12, 10, 10, 15] }, { id: "g22", reps: [12, 15, 12, 12, 18] }, { id: "g23", reps: [15, 18, 15, 15, 20] }] },
            { week: 3, days: [{ id: "g31", reps: [18, 20, 18, 18, 25] }, { id: "g32", reps: [20, 22, 20, 20, 28] }, { id: "g33", reps: [22, 25, 22, 22, 30] }] },
            { week: 4, days: [{ id: "g41", reps: [25, 28, 25, 25, 35] }, { id: "g42", reps: [28, 30, 28, 28, 38] }, { id: "g43", reps: [30, 35, 30, 30, 40] }] },
            { week: 5, days: [{ id: "g51", reps: [35, 38, 35, 35, 45] }, { id: "g52", reps: [38, 40, 38, 38, 48] }, { id: "g53", reps: [40, 45, 40, 40, 50] }] },
            { week: 6, days: [{ id: "g61", reps: [45, 50, 45, 45, 55] }, { id: "g62", reps: [48, 55, 48, 48, 60] }, { id: "g63", reps: [50], isFinal: true }] },
        ]
    },

    nordicCurls: {
        name: "Nordic Curls",
        icon: <Activity size={20} />,
        color: "cyan",
        unit: "reps",
        startReps: 3,
        finalGoal: "15 Reps",
        image: "neo:nordicCurls",
        youtubeId: "d8AAPcYxPo8",
        instructions: "Kneel with feet anchored. Lower torso forward as slowly as possible, using hamstrings to control descent. Push back up.",
        tips: ["Very challenging", "Focus on eccentric control", "Use hands to assist if needed"],
        category: "hinge",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'glutebridge',
        nextProgression: null,
        unlockCriteria: 'Master level achieved!',
        weeks: generateProgression(3, 15)
    },

    // ============================================================
    // CORE PROGRESSION
    // ============================================================
    plank: {
        name: "Plank",
        icon: <Minus size={20} />,
        color: "teal",
        unit: "seconds",
        startReps: 20,
        finalGoal: "180 Seconds",
        image: "neo:plank",
        youtubeId: "ASdvN_XEl_c",
        instructions: "Forearms and toes on ground, body in straight line. Squeeze core, glutes, and quads. Breathe steadily.",
        tips: ["Don't let hips sag or pike", "Look at floor, neutral neck", "Engage entire core"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        nextProgression: 'sidePlank',
        unlockCriteria: 'Complete all 18 days or achieve 90 second hold',
        variations: [
            { level: 1, name: "Knee Plank", desc: "Knees on ground, easier" },
            { level: 2, name: "Incline Plank", desc: "Hands on raised surface" },
            { level: 3, name: "Standard Plank", desc: "Forearms and toes" },
            { level: 4, name: "High Plank", desc: "Arms extended, pushup position" },
            { level: 5, name: "Side Plank", desc: "On one forearm, stack feet" },
            { level: 6, name: "Plank with Leg Lift", desc: "Alternate lifting legs" }
        ],
        weeks: [
            { week: 1, days: [{ id: "k11", reps: [20, 30, 20, 20, 30] }, { id: "k12", reps: [25, 35, 25, 25, 40] }, { id: "k13", reps: [30, 40, 30, 30, 45] }] },
            { week: 2, days: [{ id: "k21", reps: [35, 45, 35, 35, 50] }, { id: "k22", reps: [40, 50, 40, 40, 60] }, { id: "k23", reps: [45, 60, 45, 45, 70] }] },
            { week: 3, days: [{ id: "k31", reps: [50, 70, 50, 50, 80] }, { id: "k32", reps: [60, 80, 60, 60, 90] }, { id: "k33", reps: [70, 90, 70, 70, 100] }] },
            { week: 4, days: [{ id: "k41", reps: [80, 100, 80, 80, 120] }, { id: "k42", reps: [90, 110, 90, 90, 130] }, { id: "k43", reps: [100, 120, 100, 100, 140] }] },
            { week: 5, days: [{ id: "k51", reps: [110, 130, 110, 110, 150] }, { id: "k52", reps: [120, 140, 120, 120, 160] }, { id: "k53", reps: [130, 150, 130, 130, 180] }] },
            { week: 6, days: [{ id: "k61", reps: [140, 160, 140, 140, 200] }, { id: "k62", reps: [150, 180, 150, 150, 220] }, { id: "k63", reps: [180], isFinal: true }] },
        ]
    },

    sidePlank: {
        name: "Side Plank",
        icon: <Minus size={20} />,
        color: "emerald",
        unit: "seconds",
        startReps: 15,
        finalGoal: "90 Seconds",
        image: "neo:sidePlank",
        youtubeId: "K2VljzCC16g",
        instructions: "Lie on side, prop up on elbow directly under shoulder. Raise hips off ground, body in straight line. Hold.",
        tips: ["Stack feet or stagger", "Don't let hips drop", "Do both sides"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'plank',
        nextProgression: 'hollowBodyHold',
        unlockCriteria: 'Complete all 18 days or achieve 45 seconds per side',
        weeks: generateProgression(15, 90)
    },

    hollowBodyHold: {
        name: "Hollow Body Hold",
        icon: <Circle size={20} />,
        color: "emerald",
        unit: "seconds",
        startReps: 15,
        finalGoal: "90 Seconds",
        image: "neo:hollowBodyHold",
        youtubeId: "LlDNef_Ztsc",
        instructions: "Lie on back, press lower back into floor. Raise legs and shoulders off ground, arms extended overhead. Hold position.",
        tips: ["Lower back stays pressed down", "Bend knees to make easier", "Foundation for gymnastics"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'sidePlank',
        nextProgression: 'vups',
        unlockCriteria: 'Complete all 18 days or achieve 30 second hold',
        weeks: generateProgression(15, 90)
    },

    vups: {
        name: "V-Ups",
        icon: <Triangle size={20} />,
        color: "emerald",
        unit: "reps",
        startReps: 8,
        finalGoal: "100 Reps",
        image: "neo:vups",
        youtubeId: "7UVgs18Y1P4",
        instructions: "Lie flat, arms overhead. Simultaneously lift legs and torso, reaching hands toward toes. Lower with control.",
        tips: ["Keep legs straight", "Touch toes at top", "Control the negative"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'hollowBodyHold',
        nextProgression: 'lSits',
        unlockCriteria: 'Complete all 18 days or achieve 25 consecutive reps',
        variations: [
            { level: 1, name: "Crunches", desc: "Upper body only, hands behind head" },
            { level: 2, name: "Tuck-Ups", desc: "Knees bent, touch shins" },
            { level: 3, name: "V-Ups", desc: "Full V-up, legs straight" },
            { level: 4, name: "Weighted V-Ups", desc: "Hold weight overhead" },
            { level: 5, name: "V-Up Hold", desc: "Pause at top for 2 seconds" },
            { level: 6, name: "Hollow Body V-Ups", desc: "Start from hollow hold" }
        ],
        weeks: [
            { week: 1, days: [{ id: "v11", reps: [4, 5, 4, 4, 6] }, { id: "v12", reps: [5, 6, 5, 5, 8] }, { id: "v13", reps: [6, 8, 6, 6, 10] }] },
            { week: 2, days: [{ id: "v21", reps: [8, 10, 8, 8, 12] }, { id: "v22", reps: [10, 12, 10, 10, 15] }, { id: "v23", reps: [12, 15, 12, 12, 18] }] },
            { week: 3, days: [{ id: "v31", reps: [15, 18, 15, 15, 22] }, { id: "v32", reps: [18, 22, 18, 18, 25] }, { id: "v33", reps: [20, 25, 20, 20, 30] }] },
            { week: 4, days: [{ id: "v41", reps: [22, 28, 22, 22, 35] }, { id: "v42", reps: [25, 32, 25, 25, 40] }, { id: "v43", reps: [30, 35, 30, 30, 45] }] },
            { week: 5, days: [{ id: "v51", reps: [35, 40, 35, 35, 50] }, { id: "v52", reps: [40, 50, 40, 40, 60] }, { id: "v53", reps: [45, 55, 45, 45, 70] }] },
            { week: 6, days: [{ id: "v61", reps: [50, 60, 50, 50, 75] }, { id: "v62", reps: [60, 70, 60, 60, 85] }, { id: "v63", reps: [100], isFinal: true }] },
        ]
    },

    lSits: {
        name: "L-Sits",
        icon: <Target size={20} />,
        color: "emerald",
        unit: "seconds",
        startReps: 5,
        finalGoal: "45 Seconds",
        image: "neo:lSits",
        youtubeId: "IUZJoSP66HI",
        instructions: "Sit with legs extended. Place hands beside hips, push down to lift body off ground with legs extended forward. Hold.",
        tips: ["Very challenging", "Can use parallettes", "Keep legs straight"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'vups',
        nextProgression: 'dragonFlags',
        unlockCriteria: 'Complete all 18 days or achieve 15 second hold',
        weeks: generateProgression(5, 45)
    },

    dragonFlags: {
        name: "Dragon Flags",
        icon: <Target size={20} />,
        color: "emerald",
        unit: "reps",
        startReps: 2,
        finalGoal: "15 Reps",
        image: "neo:dragonFlags",
        youtubeId: "pvz7k5gO-DE",
        instructions: "Lie on bench holding edge behind head. Keep body straight and rigid, lower legs toward ground, then raise back up.",
        tips: ["Very advanced", "Start with negatives", "Keep body straight as a board"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        previousProgression: 'lSits',
        nextProgression: null,
        unlockCriteria: 'Master level achieved!',
        weeks: generateProgression(2, 15)
    },

    // ============================================================
    // FULL BODY / ADDITIONAL
    // ============================================================
    burpees: {
        name: "Burpees",
        icon: <Zap size={20} />,
        color: "purple",
        unit: "reps",
        startReps: 5,
        finalGoal: "50 Reps",
        image: "neo:burpees",
        youtubeId: "dZgVxmf6jkA",
        instructions: "From standing, drop to push-up position, perform push-up, jump feet to hands, then jump up with arms overhead.",
        tips: ["Full body exercise", "Can modify by stepping", "Great for conditioning"],
        category: "full",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        weeks: generateProgression(5, 50)
    },

    mountainClimbers: {
        name: "Mountain Climbers",
        icon: <Activity size={20} />,
        color: "emerald",
        unit: "reps",
        startReps: 20,
        finalGoal: "100 Reps",
        image: "neo:mountainClimbers",
        youtubeId: "nmwgirgXLYM",
        instructions: "Start in push-up position. Drive one knee toward chest, then quickly switch legs in running motion.",
        tips: ["Keep hips low", "Can go slow or fast", "Great cardio"],
        category: "core",
        equipment: ['none'],
        isBuiltIn: true,
        progressionType: 'bodyweight',
        weeks: generateProgression(20, 100)
    }
};
