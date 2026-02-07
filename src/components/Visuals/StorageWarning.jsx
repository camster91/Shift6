import { useState, useEffect, memo } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { getStorageInfo } from '../../utils/pwa'

/**
 * StorageWarning - Shows a warning banner when localStorage usage
 * exceeds 80% of the estimated quota.
 *
 * Checks storage on mount and dismisses per session.
 */
const StorageWarning = memo(({ theme = 'dark' }) => {
    const [storageInfo, setStorageInfo] = useState(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const checkStorage = async () => {
            const info = await getStorageInfo()
            if (info.percent >= 80) {
                setStorageInfo(info)
            }
        }
        checkStorage()
    }, [])

    if (!storageInfo || dismissed) return null

    const bgColor = theme === 'light'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-amber-900/20 border-amber-500/30'
    const textColor = theme === 'light' ? 'text-amber-800' : 'text-amber-300'

    return (
        <div className={`fixed top-16 left-4 right-4 z-40 mx-auto max-w-lg animate-in slide-in-from-top duration-300`}>
            <div className={`${bgColor} border rounded-xl shadow-lg p-3`}>
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        <AlertTriangle size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${textColor}`}>
                            Storage {storageInfo.percent}% full
                        </p>
                        <p className={`text-xs ${theme === 'light' ? 'text-amber-600' : 'text-amber-400/70'} mt-0.5`}>
                            {storageInfo.usage} MB of {storageInfo.quota} MB used. Consider backing up and clearing old data.
                        </p>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
                            theme === 'light' ? 'hover:bg-amber-100' : 'hover:bg-amber-800/30'
                        }`}
                        aria-label="Dismiss storage warning"
                    >
                        <X size={14} className={textColor} />
                    </button>
                </div>
            </div>
        </div>
    )
})

StorageWarning.displayName = 'StorageWarning'

export default StorageWarning
