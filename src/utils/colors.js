/**
 * Centralized color classes for exercise themes
 * Used across Dashboard, Progress, WorkoutQuickStart, etc.
 */
export const exerciseColorClasses = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
}

/**
 * Get theme-aware styling classes
 * @param {string} theme - 'dark' or 'light'
 * @returns {object} Theme styling classes
 */
export const getThemeClasses = (theme = 'dark') => ({
    cardBg: theme === 'light' ? 'bg-white' : 'bg-slate-900',
    textPrimary: theme === 'light' ? 'text-slate-900' : 'text-white',
    textSecondary: theme === 'light' ? 'text-slate-600' : 'text-slate-400',
    textMuted: theme === 'light' ? 'text-slate-500' : 'text-slate-500',
    borderColor: theme === 'light' ? 'border-slate-200' : 'border-slate-800',
    borderSubtle: theme === 'light' ? 'border-slate-100' : 'border-slate-700',
    hoverBg: theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800/50',
    divider: theme === 'light' ? 'bg-slate-200' : 'bg-slate-800',
})

/**
 * Mode-specific accent colors
 * @param {string} mode - 'home' or 'gym'
 * @returns {object} Mode accent classes
 */
export const getModeAccentClasses = (mode = 'home') => {
    const isGym = mode === 'gym'
    return {
        accentColor: isGym ? 'purple' : 'cyan',
        accentText: isGym ? 'text-purple-400' : 'text-cyan-400',
        accentBg: isGym ? 'bg-purple-500/10' : 'bg-cyan-500/10',
        accentBorder: isGym ? 'border-purple-500/30' : 'border-cyan-500/30',
        accentSolid: isGym ? 'bg-purple-500' : 'bg-cyan-500',
        gradientFrom: isGym ? 'from-purple-600' : 'from-cyan-600',
        gradientTo: isGym ? 'to-pink-600' : 'to-teal-600',
        gradientClass: isGym
            ? 'bg-gradient-to-br from-purple-600 to-pink-600'
            : 'bg-gradient-to-br from-cyan-600 to-teal-600',
        gradientHover: isGym
            ? 'hover:from-purple-500 hover:to-pink-500'
            : 'hover:from-cyan-500 hover:to-teal-500',
    }
}
