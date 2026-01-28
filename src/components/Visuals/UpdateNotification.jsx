import { useState, useEffect } from 'react'
import { RefreshCw, X, WifiOff } from 'lucide-react'
import { registerUpdateHandler, applyUpdate, isOnline, registerNetworkListeners } from '../../utils/pwa'

/**
 * UpdateNotification - Shows when a new version is available
 * Also shows offline/online status
 */
const UpdateNotification = ({ theme = 'dark' }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [offline, setOffline] = useState(!isOnline())
  const [showOfflineToast, setShowOfflineToast] = useState(false)

  useEffect(() => {
    // Register for update notifications
    const cleanupUpdate = registerUpdateHandler(() => {
      setUpdateAvailable(true)
    })

    // Register for network status
    const cleanupNetwork = registerNetworkListeners(
      () => {
        setOffline(false)
        setShowOfflineToast(false)
      },
      () => {
        setOffline(true)
        setShowOfflineToast(true)
        // Auto-hide offline toast after 3 seconds
        setTimeout(() => setShowOfflineToast(false), 3000)
      }
    )

    return () => {
      cleanupUpdate()
      cleanupNetwork()
    }
  }, [])

  const handleUpdate = () => {
    applyUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-slate-800'
  const textColor = theme === 'light' ? 'text-slate-900' : 'text-white'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'

  return (
    <>
      {/* Update Available Banner */}
      {updateAvailable && !dismissed && (
        <div className={`fixed top-0 left-0 right-0 z-50 ${bgColor} border-b ${borderColor} shadow-lg animate-in slide-in-from-top duration-300`}>
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className={`text-sm font-medium ${textColor}`}>Update available</p>
                <p className="text-xs text-slate-500">New features ready to install</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Update
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Toast */}
      {showOfflineToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <div className={`${bgColor} border ${borderColor} rounded-xl px-4 py-3 shadow-xl flex items-center gap-3`}>
            <WifiOff className="w-5 h-5 text-amber-400" />
            <p className={`text-sm ${textColor}`}>You&apos;re offline</p>
          </div>
        </div>
      )}

      {/* Persistent Offline Indicator (small) */}
      {offline && !showOfflineToast && (
        <div className="fixed top-2 right-2 z-40">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">Offline</span>
          </div>
        </div>
      )}
    </>
  )
}

export default UpdateNotification
