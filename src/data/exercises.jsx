import React from 'react';
import {
    Dumbbell,
    Zap,
    Activity,
    Triangle,
    MoveUp,
    Clock,
    Move,
    MoveDown,
    Wind
} from 'lucide-react';

// Common rest logic: Weeks 1-3 = 60s, Weeks 4-6 = 90s
export const getRest = (week) => (week <= 3 ? 60 : 90);

// Helper to format display values (seconds for plank, numbers for others)
export const formatValue = (val, type) => {
    if (type === 'seconds') {
        const mins = Math.floor(val / 60);
        const secs = val % 60;
        if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}s`;
        return `${secs}s`;
    }
    return val;
};

export const EXERCISE_PLANS = {
    pushups: {
        name: "Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        finalGoal: "100 Reps",
        image: "/assets/images/icon-pushups.png",
        weeks: [
            { week: 1, days: [{ id: "p11", reps: [3, 4, 3, 3, 5] }, { id: "p12", reps: [4, 5, 4, 4, 6] }, { id: "p13", reps: [5, 6, 5, 5, 8] }] },
            { week: 2, days: [{ id: "p21", reps: [6, 7, 6, 6, 9] }, { id: "p22", reps: [8, 10, 8, 8, 12] }, { id: "p23", reps: [10, 12, 10, 10, 15] }] },
            { week: 3, days: [{ id: "p31", reps: [12, 15, 12, 12, 18] }, { id: "p32", reps: [14, 18, 14, 14, 20] }, { id: "p33", reps: [16, 20, 16, 16, 25] }] },
            { week: 4, days: [{ id: "p41", reps: [18, 22, 18, 18, 28] }, { id: "p42", reps: [20, 25, 20, 20, 30] }, { id: "p43", reps: [25, 30, 25, 25, 35] }] },
            { week: 5, days: [{ id: "p51", reps: [30, 35, 30, 30, 40] }, { id: "p52", reps: [35, 40, 35, 35, 45] }, { id: "p53", reps: [40, 50, 40, 40, 55] }] },
            { week: 6, days: [{ id: "p61", reps: [45, 55, 45, 45, 60] }, { id: "p62", reps: [50, 60, 50, 50, 70] }, { id: "p63", reps: [100], isFinal: true }] },
        ]
    },
    squats: {
        name: "Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps",
        finalGoal: "200 Reps",
        image: "/assets/images/icon-squats.png",
        weeks: [
            { week: 1, days: [{ id: "s11", reps: [15, 18, 15, 15, 20] }, { id: "s12", reps: [18, 22, 18, 18, 25] }, { id: "s13", reps: [20, 25, 20, 20, 30] }] },
            { week: 2, days: [{ id: "s21", reps: [25, 30, 25, 25, 35] }, { id: "s22", reps: [30, 35, 30, 30, 40] }, { id: "s23", reps: [35, 40, 35, 35, 50] }] },
            { week: 3, days: [{ id: "s31", reps: [40, 50, 40, 40, 60] }, { id: "s32", reps: [45, 55, 45, 45, 65] }, { id: "s33", reps: [50, 60, 50, 50, 70] }] },
            { week: 4, days: [{ id: "s41", reps: [55, 65, 55, 55, 80] }, { id: "s42", reps: [60, 75, 60, 60, 90] }, { id: "s43", reps: [65, 80, 65, 65, 100] }] },
            { week: 5, days: [{ id: "s51", reps: [75, 90, 75, 75, 110] }, { id: "s52", reps: [80, 100, 80, 80, 120] }, { id: "s53", reps: [90, 110, 90, 90, 130] }] },
            { week: 6, days: [{ id: "s61", reps: [100, 120, 100, 100, 140] }, { id: "s62", reps: [110, 130, 110, 110, 150] }, { id: "s63", reps: [200], isFinal: true }] },
        ]
    },
    glutebridge: {
        name: "Single Leg Glute Bridge",
        icon: <Activity size={20} />,
        color: "cyan",
        unit: "reps/leg",
        finalGoal: "50 Reps/Leg",
        image: "/assets/images/icon-glutebridge.png",
        weeks: [
            { week: 1, days: [{ id: "g11", reps: [5, 6, 5, 5, 8] }, { id: "g12", reps: [6, 8, 6, 6, 10] }, { id: "g13", reps: [8, 10, 8, 8, 12] }] },
            { week: 2, days: [{ id: "g21", reps: [10, 12, 10, 10, 15] }, { id: "g22", reps: [12, 15, 12, 12, 18] }, { id: "g23", reps: [15, 18, 15, 15, 20] }] },
            { week: 3, days: [{ id: "g31", reps: [18, 20, 18, 18, 25] }, { id: "g32", reps: [20, 22, 20, 20, 28] }, { id: "g33", reps: [22, 25, 22, 22, 30] }] },
            { week: 4, days: [{ id: "g41", reps: [25, 28, 25, 25, 35] }, { id: "g42", reps: [28, 30, 28, 28, 38] }, { id: "g43", reps: [30, 35, 30, 30, 40] }] },
            { week: 5, days: [{ id: "g51", reps: [35, 38, 35, 35, 45] }, { id: "g52", reps: [38, 40, 38, 38, 48] }, { id: "g53", reps: [40, 45, 40, 40, 50] }] },
            { week: 6, days: [{ id: "g61", reps: [45, 50, 45, 45, 55] }, { id: "g62", reps: [48, 55, 48, 48, 60] }, { id: "g63", reps: [50], isFinal: true }] },
        ]
    },
    vups: {
        name: "V-Ups",
        icon: <Triangle size={20} />,
        color: "emerald",
        unit: "reps",
        finalGoal: "100 Reps",
        image: "/assets/images/icon-vups.png",
        weeks: [
            { week: 1, days: [{ id: "v11", reps: [4, 5, 4, 4, 6] }, { id: "v12", reps: [5, 6, 5, 5, 8] }, { id: "v13", reps: [6, 8, 6, 6, 10] }] },
            { week: 2, days: [{ id: "v21", reps: [8, 10, 8, 8, 12] }, { id: "v22", reps: [10, 12, 10, 10, 15] }, { id: "v23", reps: [12, 15, 12, 12, 18] }] },
            { week: 3, days: [{ id: "v31", reps: [15, 18, 15, 15, 22] }, { id: "v32", reps: [18, 22, 18, 18, 25] }, { id: "v33", reps: [20, 25, 20, 20, 30] }] },
            { week: 4, days: [{ id: "v41", reps: [22, 28, 22, 22, 35] }, { id: "v42", reps: [25, 32, 25, 25, 40] }, { id: "v43", reps: [30, 35, 30, 30, 45] }] },
            { week: 5, days: [{ id: "v51", reps: [35, 40, 35, 35, 50] }, { id: "v52", reps: [40, 50, 40, 40, 60] }, { id: "v53", reps: [45, 55, 45, 45, 70] }] },
            { week: 6, days: [{ id: "v61", reps: [50, 60, 50, 50, 75] }, { id: "v62", reps: [60, 70, 60, 60, 85] }, { id: "v63", reps: [100], isFinal: true }] },
        ]
    },
    pullups: {
        name: "Pull-Ups",
        icon: <MoveUp size={20} />,
        color: "indigo",
        unit: "reps",
        finalGoal: "20 Reps",
        image: "https://images.unsplash.com/photo-1598971639041-9e3c3e3e8da0?w=800&h=600&fit=crop",
        weeks: [
            { week: 1, days: [{ id: "l11", reps: [1, 2, 1, 1, 2] }, { id: "l12", reps: [2, 2, 2, 2, 3] }, { id: "l13", reps: [2, 3, 2, 2, 4] }] },
            { week: 2, days: [{ id: "l21", reps: [3, 3, 3, 3, 4] }, { id: "l22", reps: [3, 4, 3, 3, 5] }, { id: "l23", reps: [4, 5, 4, 4, 6] }] },
            { week: 3, days: [{ id: "l31", reps: [4, 6, 4, 4, 7] }, { id: "l32", reps: [5, 6, 5, 5, 8] }, { id: "l33", reps: [5, 7, 5, 5, 9] }] },
            { week: 4, days: [{ id: "l41", reps: [6, 8, 6, 6, 10] }, { id: "l42", reps: [7, 9, 7, 7, 11] }, { id: "l43", reps: [8, 10, 8, 8, 12] }] },
            { week: 5, days: [{ id: "l51", reps: [9, 11, 9, 9, 13] }, { id: "l52", reps: [10, 12, 10, 10, 14] }, { id: "l53", reps: [11, 13, 11, 11, 15] }] },
            { week: 6, days: [{ id: "l61", reps: [12, 14, 12, 12, 16] }, { id: "l62", reps: [13, 15, 13, 13, 18] }, { id: "l63", reps: [20], isFinal: true }] },
        ]
    },
    plank: {
        name: "Plank",
        icon: <Clock size={20} />,
        color: "rose",
        unit: "seconds",
        finalGoal: "5 Mins",
        image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop",
        weeks: [
            { week: 1, days: [{ id: "k11", reps: [20, 30, 20, 20, 30] }, { id: "k12", reps: [25, 35, 25, 25, 40] }, { id: "k13", reps: [30, 40, 30, 30, 45] }] },
            { week: 2, days: [{ id: "k21", reps: [35, 45, 35, 35, 50] }, { id: "k22", reps: [40, 50, 40, 40, 60] }, { id: "k23", reps: [45, 60, 45, 45, 70] }] },
            { week: 3, days: [{ id: "k31", reps: [50, 70, 50, 50, 80] }, { id: "k32", reps: [60, 80, 60, 60, 90] }, { id: "k33", reps: [70, 90, 70, 70, 100] }] },
            { week: 4, days: [{ id: "k41", reps: [80, 100, 80, 80, 120] }, { id: "k42", reps: [90, 110, 90, 90, 130] }, { id: "k43", reps: [100, 120, 100, 100, 140] }] },
            { week: 5, days: [{ id: "k51", reps: [110, 130, 110, 110, 150] }, { id: "k52", reps: [120, 140, 120, 120, 160] }, { id: "k53", reps: [130, 150, 130, 130, 180] }] },
            { week: 6, days: [{ id: "k61", reps: [140, 160, 140, 140, 200] }, { id: "k62", reps: [150, 180, 150, 150, 220] }, { id: "k63", reps: [300], isFinal: true }] },
        ]
    },
    lunges: {
        name: "Lunges",
        icon: <Move size={20} />,
        color: "purple",
        unit: "reps/leg",
        finalGoal: "50 Reps/Leg",
        image: "/assets/images/icon-lunges.png",
        weeks: [
            { week: 1, days: [{ id: "u11", reps: [6, 8, 6, 6, 10] }, { id: "u12", reps: [8, 10, 8, 8, 12] }, { id: "u13", reps: [10, 12, 10, 10, 15] }] },
            { week: 2, days: [{ id: "u21", reps: [12, 14, 12, 12, 18] }, { id: "u22", reps: [14, 16, 14, 14, 20] }, { id: "u23", reps: [16, 18, 16, 16, 25] }] },
            { week: 3, days: [{ id: "u31", reps: [18, 22, 18, 18, 28] }, { id: "u32", reps: [20, 25, 20, 20, 30] }, { id: "u33", reps: [22, 28, 22, 22, 35] }] },
            { week: 4, days: [{ id: "u41", reps: [25, 30, 25, 25, 40] }, { id: "u42", reps: [28, 35, 28, 28, 45] }, { id: "u43", reps: [30, 40, 30, 30, 50] }] },
            { week: 5, days: [{ id: "u51", reps: [35, 45, 35, 35, 55] }, { id: "u52", reps: [40, 50, 40, 40, 60] }, { id: "u53", reps: [45, 55, 45, 45, 65] }] },
            { week: 6, days: [{ id: "u61", reps: [50, 60, 50, 50, 70] }, { id: "u62", reps: [55, 65, 55, 55, 80] }, { id: "u63", reps: [50], isFinal: true }] },
        ]
    },
    dips: {
        name: "Dips",
        icon: <MoveDown size={20} />,
        color: "fuchsia",
        unit: "reps",
        finalGoal: "50 Reps",
        image: "https://images.unsplash.com/photo-1598971639041-9e3c3e3e8da0?w=800&h=600&fit=crop",
        weeks: [
            { week: 1, days: [{ id: "d11", reps: [3, 4, 3, 3, 5] }, { id: "d12", reps: [4, 5, 4, 4, 6] }, { id: "d13", reps: [5, 6, 5, 5, 8] }] },
            { week: 2, days: [{ id: "d21", reps: [6, 8, 6, 6, 10] }, { id: "d22", reps: [8, 10, 8, 8, 12] }, { id: "d23", reps: [10, 12, 10, 10, 15] }] },
            { week: 3, days: [{ id: "d31", reps: [12, 14, 12, 12, 18] }, { id: "d32", reps: [14, 16, 14, 14, 20] }, { id: "d33", reps: [15, 18, 15, 15, 25] }] },
            { week: 4, days: [{ id: "d41", reps: [18, 20, 18, 18, 28] }, { id: "d42", reps: [20, 22, 20, 20, 30] }, { id: "d43", reps: [22, 25, 22, 22, 35] }] },
            { week: 5, days: [{ id: "d51", reps: [25, 30, 25, 25, 40] }, { id: "d52", reps: [28, 35, 28, 28, 45] }, { id: "d53", reps: [30, 38, 30, 30, 50] }] },
            { week: 6, days: [{ id: "d61", reps: [35, 40, 35, 35, 55] }, { id: "d62", reps: [40, 45, 40, 40, 60] }, { id: "d63", reps: [50], isFinal: true }] },
        ]
    },
    supermans: {
        name: "Supermans",
        icon: <Wind size={20} />,
        color: "amber",
        unit: "reps",
        finalGoal: "100 Reps",
        image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop",
        weeks: [
            { week: 1, days: [{ id: "m11", reps: [5, 6, 5, 5, 8] }, { id: "m12", reps: [6, 8, 6, 6, 10] }, { id: "m13", reps: [8, 10, 8, 8, 12] }] },
            { week: 2, days: [{ id: "m21", reps: [10, 12, 10, 10, 15] }, { id: "m22", reps: [12, 15, 12, 12, 18] }, { id: "m23", reps: [15, 18, 15, 15, 20] }] },
            { week: 3, days: [{ id: "m31", reps: [18, 20, 18, 18, 25] }, { id: "m32", reps: [20, 25, 20, 20, 30] }, { id: "m33", reps: [25, 30, 25, 25, 35] }] },
            { week: 4, days: [{ id: "m41", reps: [30, 35, 30, 30, 40] }, { id: "m42", reps: [35, 40, 35, 35, 45] }, { id: "m43", reps: [40, 50, 40, 40, 55] }] },
            { week: 5, days: [{ id: "m51", reps: [45, 55, 45, 45, 60] }, { id: "m52", reps: [50, 60, 50, 50, 70] }, { id: "m53", reps: [55, 65, 55, 55, 80] }] },
            { week: 6, days: [{ id: "m61", reps: [60, 70, 60, 60, 90] }, { id: "m62", reps: [70, 80, 70, 70, 100] }, { id: "m63", reps: [100], isFinal: true }] },
        ]
    }
};
