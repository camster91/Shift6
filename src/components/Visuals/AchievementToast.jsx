import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Achievement toast notification component
 * Shows a subtle notification at the bottom when a badge is earned
 */
const AchievementToast = ({ badge, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
        }, 300);
    }, [onDismiss]);

    useEffect(() => {
        // Animate in
        const showTimer = setTimeout(() => setIsVisible(true), 50);

        // Auto dismiss after 4 seconds
        const dismissTimer = setTimeout(() => {
            handleDismiss();
        }, 4000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, [handleDismiss]);

    if (!badge) return null;

    return (
        <div
            className={`fixed bottom-20 left-4 right-4 z-50 flex justify-center pointer-events-none transition-all duration-300 ${
                isVisible && !isExiting
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
            }`}
        >
            <div
                className="pointer-events-auto bg-slate-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-xl px-4 py-3 shadow-xl shadow-cyan-500/10 flex items-center gap-3 max-w-sm"
                onClick={handleDismiss}
            >
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center text-xl">
                    {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-cyan-400 uppercase tracking-wider">Achievement Unlocked</p>
                    <p className="text-sm font-bold text-white truncate">{badge.name}</p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                    <X size={14} className="text-slate-500" />
                </button>
            </div>
        </div>
    );
};

/**
 * Achievement toast manager - handles showing multiple toasts in sequence
 */
export const AchievementToastManager = ({ newBadges = [], onAllDismissed }) => {
    const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

    const handleDismiss = () => {
        if (currentBadgeIndex < newBadges.length - 1) {
            setCurrentBadgeIndex(prev => prev + 1);
        } else {
            onAllDismissed();
        }
    };

    if (newBadges.length === 0 || currentBadgeIndex >= newBadges.length) {
        return null;
    }

    return (
        <AchievementToast
            key={newBadges[currentBadgeIndex].id}
            badge={newBadges[currentBadgeIndex]}
            onDismiss={handleDismiss}
        />
    );
};

export default AchievementToast;
