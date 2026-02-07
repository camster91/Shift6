import { useState, useEffect, memo } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { isRunningAsPWA } from '../../utils/pwa'

/**
 * InstallPrompt - Shows a custom "Add to Home Screen" banner
 * when the app can be installed as a PWA.
 *
 * Captures the beforeinstallprompt event and shows a themed banner.
 * Remembers if the user dismissed it (per session via state, permanently via localStorage).
 */
const InstallPrompt = memo(({ theme = 'dark' }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [dismissed, setDismissed] = useState(false)
    const [installed, setInstalled] = useState(false)

    useEffect(() => {
        // Don't show if already installed as PWA
        if (isRunningAsPWA()) {
            setInstalled(true)
            return
        }

        // Check if user permanently dismissed
        const permanentlyDismissed = localStorage.getItem('shift6_install_dismissed')
        if (permanentlyDismissed === 'true') {
            setDismissed(true)
            return
        }

        const handleBeforeInstall = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault()
            setDeferredPrompt(e)
        }

        const handleAppInstalled = () => {
            setInstalled(true)
            setDeferredPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setInstalled(true)
        }
        setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setDismissed(true)
        localStorage.setItem('shift6_install_dismissed', 'true')
    }

    // Don't render if installed, dismissed, or no prompt available
    if (installed || dismissed || !deferredPrompt) return null

    const bgColor = theme === 'light'
        ? 'bg-white border-slate-200'
        : 'bg-slate-900 border-slate-700'
    const textColor = theme === 'light' ? 'text-slate-900' : 'text-white'
    const subText = theme === 'light' ? 'text-slate-500' : 'text-slate-400'

    return (
        <div role="complementary" aria-label="Install app prompt" className={`fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg animate-in slide-in-from-bottom duration-300`}>
            <div className={`${bgColor} border rounded-2xl shadow-2xl p-4`}>
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Smartphone size={20} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${textColor}`}>Install Shift6</p>
                        <p className={`text-xs ${subText} mt-0.5`}>
                            Add to your home screen for the full app experience with offline access.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className={`p-1 rounded-lg ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'} transition-colors flex-shrink-0`}
                        aria-label="Dismiss install prompt"
                    >
                        <X size={16} className={subText} />
                    </button>
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleDismiss}
                        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                            theme === 'light'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        Not now
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Download size={14} />
                        Install
                    </button>
                </div>
            </div>
        </div>
    )
})

InstallPrompt.displayName = 'InstallPrompt'

export default InstallPrompt
