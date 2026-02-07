import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
    let setActiveTab, onMenuToggle, onToggleTheme, onShowHelp

    beforeEach(() => {
        setActiveTab = vi.fn()
        onMenuToggle = vi.fn()
        onToggleTheme = vi.fn()
        onShowHelp = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const renderShortcuts = (overrides = {}) => {
        return renderHook(() => useKeyboardShortcuts({
            setActiveTab,
            onMenuToggle,
            onToggleTheme,
            onShowHelp,
            enabled: true,
            ...overrides
        }))
    }

    const pressKey = (key, options = {}) => {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
            ...options
        })
        window.dispatchEvent(event)
    }

    it('navigates to home tab on "1"', () => {
        renderShortcuts()
        pressKey('1')
        expect(setActiveTab).toHaveBeenCalledWith('home')
    })

    it('navigates to workout tab on "2"', () => {
        renderShortcuts()
        pressKey('2')
        expect(setActiveTab).toHaveBeenCalledWith('workout')
    })

    it('navigates to progress tab on "3"', () => {
        renderShortcuts()
        pressKey('3')
        expect(setActiveTab).toHaveBeenCalledWith('progress')
    })

    it('toggles menu on "m"', () => {
        renderShortcuts()
        pressKey('m')
        expect(onMenuToggle).toHaveBeenCalled()
    })

    it('toggles theme on "t"', () => {
        renderShortcuts()
        pressKey('t')
        expect(onToggleTheme).toHaveBeenCalled()
    })

    it('shows help on "?"', () => {
        renderShortcuts()
        pressKey('?')
        expect(onShowHelp).toHaveBeenCalled()
    })

    it('does not fire shortcuts when disabled', () => {
        renderShortcuts({ enabled: false })
        pressKey('1')
        pressKey('m')
        expect(setActiveTab).not.toHaveBeenCalled()
        expect(onMenuToggle).not.toHaveBeenCalled()
    })

    it('does not fire shortcuts with ctrl key', () => {
        renderShortcuts()
        pressKey('1', { ctrlKey: true })
        expect(setActiveTab).not.toHaveBeenCalled()
    })

    it('does not fire shortcuts with meta key', () => {
        renderShortcuts()
        pressKey('t', { metaKey: true })
        expect(onToggleTheme).not.toHaveBeenCalled()
    })

    it('does not fire shortcuts when input is focused', () => {
        renderShortcuts()
        const input = document.createElement('input')
        document.body.appendChild(input)
        input.focus()

        const event = new KeyboardEvent('keydown', {
            key: '1',
            bubbles: true,
            cancelable: true
        })
        input.dispatchEvent(event)

        expect(setActiveTab).not.toHaveBeenCalled()
        document.body.removeChild(input)
    })

    it('does not fire shortcuts when textarea is focused', () => {
        renderShortcuts()
        const textarea = document.createElement('textarea')
        document.body.appendChild(textarea)
        textarea.focus()

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            bubbles: true,
            cancelable: true
        })
        textarea.dispatchEvent(event)

        expect(onMenuToggle).not.toHaveBeenCalled()
        document.body.removeChild(textarea)
    })

    it('ignores unrecognized keys', () => {
        renderShortcuts()
        pressKey('x')
        expect(setActiveTab).not.toHaveBeenCalled()
        expect(onMenuToggle).not.toHaveBeenCalled()
        expect(onToggleTheme).not.toHaveBeenCalled()
        expect(onShowHelp).not.toHaveBeenCalled()
    })

    it('cleans up event listener on unmount', () => {
        const spy = vi.spyOn(window, 'removeEventListener')
        const { unmount } = renderShortcuts()
        unmount()
        expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
})
