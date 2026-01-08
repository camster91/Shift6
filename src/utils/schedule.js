import { EXERCISE_PLANS } from '../data/exercises';

export const getNextSessionForExercise = (exKey, completedDays) => {
    const plan = EXERCISE_PLANS[exKey];
    if (!plan) return null;

    // Find first incomplete day
    for (let w = 0; w < plan.weeks.length; w++) {
        const week = plan.weeks[w];
        for (let d = 0; d < week.days.length; d++) {
            const day = week.days[d];
            // Check if completed
            const completed = completedDays[exKey]?.includes(day.id);
            if (!completed) {
                return {
                    exerciseKey: exKey,
                    week: week.week,
                    dayIndex: d,
                    dayId: day.id,
                    name: plan.name
                };
            }
        }
    }
    return null; // All done
};

export const getScheduleFocus = () => {
    const day = new Date().getDay();
    if (day === 0) return 'Rest & Recovery';
    if (day % 2 === 1) return 'Upper Body Focus'; // Mon, Wed, Fri
    return 'Lower Body & Core'; // Tue, Thu, Sat
};

export const getDailyStack = (completedDays) => {
    const day = new Date().getDay();
    const upper = ['pushups', 'dips', 'pullups', 'supermans'];
    const lower = ['squats', 'lunges', 'glutebridge', 'vups', 'plank'];

    let targetKeys = [];
    if (day === 0) targetKeys = []; // Sunday rest
    else if (day % 2 === 1) targetKeys = upper; // Mon, Wed, Fri
    else targetKeys = lower; // Tue, Thu, Sat

    const stack = [];
    targetKeys.forEach(key => {
        const next = getNextSessionForExercise(key, completedDays);
        if (next) stack.push(next);
    });
    return stack;
};
