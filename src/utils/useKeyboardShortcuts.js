import { useEffect, useCallback } from 'react'

/**
 * Keyboard shortcuts hook for the Shift6 app.
 *
 * Shortcuts (when no modal/input is focused):
 * - 1: Go to Home tab
 * - 2: Go to Workout tab
 * - 3: Go to Progress tab
 * - m: Open/close menu drawer
 * - t: Toggle theme (dark/light)
 * - ?: Show help
 *
 * @param {Object} options
 * @param {function} options.setActiveTab - Tab navigation setter
 * @param {function} options.onMenuToggle - Menu open/close callback
 * @param {function} options.onToggleTheme - Theme toggle callback
 * @param {function} options.onShowHelp - Show help callback
 * @param {boolean} options.enabled - Whether shortcuts are active (disable during modals/sessions)
 */
export const useKeyboardShortcuts = ({
    setActiveTab,
    onMenuToggle,
    onToggleTheme,
    onShowHelp,
    enabled = true
}) => {
    const handleKeyDown = useCallback((e) => {
        if (!enabled) return

        // Don't trigger shortcuts when typing in input fields
        const tag = (e.target?.tagName || '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
            return
        }

        // Don't trigger with modifier keys (allow browser shortcuts)
        if (e.ctrlKey || e.metaKey || e.altKey) return

        switch (e.key) {
            case '1':
                e.preventDefault()
                setActiveTab?.('home')
                break
            case '2':
                e.preventDefault()
                setActiveTab?.('workout')
                break
            case '3':
                e.preventDefault()
                setActiveTab?.('progress')
                break
            case 'm':
                e.preventDefault()
                onMenuToggle?.()
                break
            case 't':
                e.preventDefault()
                onToggleTheme?.()
                break
            case '?':
                e.preventDefault()
                onShowHelp?.()
                break
            default:
                break
        }
    }, [enabled, setActiveTab, onMenuToggle, onToggleTheme, onShowHelp])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}
