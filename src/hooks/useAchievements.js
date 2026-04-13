import { useState, useEffect, useCallback, useRef } from 'react';
import { usePersistedState } from './usePersistedState';
import { calculateStats, getUnlockedBadges } from '../utils/gamification';
import {
    checkStreakNotification,
    notifyBadgeEarned,
    showDailyReminder,
    registerNotificationChecks,
    calculateStreakForNotification
} from '../utils/notifications';

/**
 * Manages achievement badges, streak notifications, and daily reminders.
 * Supports both home and gym workout data.
 */
export function useAchievements({ completedDays, sessionHistory, dailyGoal, gymHistory = [], gymStreak = 0 }) {
    const [seenBadgeIds, setSeenBadgeIds] = usePersistedState('seen_badges', []);
    const [newBadges, setNewBadges] = useState([]);
    const prevStatsRef = useRef(null);

    // Detect new badges
    useEffect(() => {
        const stats = calculateStats(completedDays, sessionHistory, gymHistory, gymStreak);
        const unlockedBadges = getUnlockedBadges(stats);
        const unlockedIds = unlockedBadges.map(b => b.id);

        const newlyUnlocked = unlockedBadges.filter(b => !seenBadgeIds.includes(b.id));

        if (newlyUnlocked.length > 0 && prevStatsRef.current !== null) {
            setNewBadges(prev => {
                const existingIds = new Set(prev.map(b => b.id));
                const trulyNew = newlyUnlocked.filter(b => !existingIds.has(b.id));
                return [...prev, ...trulyNew];
            });
            setSeenBadgeIds(unlockedIds);
            newlyUnlocked.forEach(badge => notifyBadgeEarned(badge));
        } else if (prevStatsRef.current === null) {
            setSeenBadgeIds(unlockedIds);
        }

        const streakData = calculateStreakForNotification(sessionHistory);
        checkStreakNotification(streakData);

        prevStatsRef.current = stats;
    }, [completedDays, sessionHistory, gymHistory, gymStreak]); // eslint-disable-line react-hooks/exhaustive-deps

    // Daily reminder + notification registration
    useEffect(() => {
        const cleanup = registerNotificationChecks();
        const timer = setTimeout(() => {
            const todaysSessions = sessionHistory.filter(s => {
                return new Date(s.date).toDateString() === new Date().toDateString();
            });
            showDailyReminder({ workoutsCompleted: todaysSessions.length, dailyGoal });
        }, 5000);

        return () => { cleanup(); clearTimeout(timer); };
    }, [sessionHistory, dailyGoal]);

    const badgeTimerRef = useRef(null);

    const handleCloseBadges = useCallback(() => {
        setNewBadges([]);
        if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = setTimeout(() => {
            const stats = calculateStats(completedDays, sessionHistory, gymHistory, gymStreak);
            const unlockedIds = getUnlockedBadges(stats).map(b => b.id);
            setSeenBadgeIds(unlockedIds);
        }, 100);
    }, [completedDays, sessionHistory, gymHistory, gymStreak, setSeenBadgeIds]);

    // Cleanup badge timer on unmount
    useEffect(() => {
        return () => {
            if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
        };
    }, []);

    return { newBadges, handleCloseBadges };
}
