import { useState, useEffect } from 'react'
import {
  Bell,
  BellOff,
  Clock,
  Flame,
  Trophy,
  Vibrate,
  ChevronRight,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import {
  getNotificationSettings,
  saveNotificationSettings,
  isNotificationSupported,
  requestNotificationPermission,
  getPermissionStatus,
  scheduleDailyReminder,
  cancelDailyReminder
} from '../../utils/notifications'

const NotificationSettings = ({ onClose, theme = 'dark', mode = 'home' }) => {
  const [settings, setSettings] = useState(getNotificationSettings())
  const [permissionStatus, setPermissionStatus] = useState(getPermissionStatus())
  const [isRequesting, setIsRequesting] = useState(false)

  const isSupported = isNotificationSupported()

  // Theme classes
  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const hoverBg = theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'

  // Accent colors based on mode
  const accentBg = mode === 'gym' ? 'bg-purple-500/20' : 'bg-cyan-500/20'
  const accentText = mode === 'gym' ? 'text-purple-400' : 'text-cyan-400'
  const accentSolid = mode === 'gym' ? 'bg-purple-500' : 'bg-cyan-500'

  useEffect(() => {
    setPermissionStatus(getPermissionStatus())
  }, [])

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    const result = await requestNotificationPermission()
    setPermissionStatus(result)
    setSettings(prev => ({
      ...prev,
      permission: result,
      enabled: result === 'granted'
    }))
    setIsRequesting(false)
  }

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    saveNotificationSettings(updated)

    // Handle daily reminder scheduling
    if (key === 'dailyReminders') {
      if (updated.dailyReminders) {
        scheduleDailyReminder(updated.dailyReminderTime)
      } else {
        cancelDailyReminder()
      }
    }
  }

  const handleTimeChange = (time) => {
    const updated = { ...settings, dailyReminderTime: time }
    setSettings(updated)
    saveNotificationSettings(updated)
    if (settings.dailyReminders) {
      scheduleDailyReminder(time)
    }
  }

  const Toggle = ({ checked, onChange, disabled }) => (
    <button
      onClick={() => !disabled && onChange()}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? accentSolid : 'bg-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
        checked ? 'left-6' : 'left-0.5'
      }`} />
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center">
      <div className={`w-full max-w-lg ${bgClass} rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 ${accentText}`} />
            <h2 className={`text-xl font-bold ${textPrimary}`}>Notifications</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${hoverBg}`}>
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Permission Status */}
          {!isSupported ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Notifications Not Supported</span>
              </div>
              <p className="text-sm text-amber-400/70 mt-1">
                Your browser doesn&apos;t support notifications.
              </p>
            </div>
          ) : permissionStatus === 'denied' ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400">
                <BellOff className="w-5 h-5" />
                <span className="font-medium">Notifications Blocked</span>
              </div>
              <p className="text-sm text-red-400/70 mt-1">
                Please enable notifications in your browser settings.
              </p>
            </div>
          ) : permissionStatus !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className={`w-full ${accentSolid} text-white rounded-xl p-4 flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-semibold">Enable Notifications</p>
                  <p className="text-sm opacity-80">Get workout reminders & updates</p>
                </div>
              </div>
              {isRequesting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">Notifications Enabled</span>
              </div>
            </div>
          )}

          {/* Notification Options (only show if permission granted) */}
          {permissionStatus === 'granted' && (
            <>
              {/* Streak Reminders */}
              <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}>
                      <Flame className={`w-5 h-5 ${accentText}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>Streak Reminders</p>
                      <p className={`text-xs ${textSecondary}`}>Warn when streak is at risk</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.streakReminders}
                    onChange={() => handleToggle('streakReminders')}
                  />
                </div>
              </div>

              {/* Daily Reminders */}
              <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}>
                      <Clock className={`w-5 h-5 ${accentText}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>Daily Reminder</p>
                      <p className={`text-xs ${textSecondary}`}>Remind me to work out</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.dailyReminders}
                    onChange={() => handleToggle('dailyReminders')}
                  />
                </div>

                {settings.dailyReminders && (
                  <div className="mt-3 ml-13">
                    <label className={`text-xs ${textSecondary} block mb-2`}>
                      Reminder Time
                    </label>
                    <input
                      type="time"
                      value={settings.dailyReminderTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className={`w-full ${cardBg} border ${borderColor} rounded-lg p-2 ${textPrimary}`}
                    />
                  </div>
                )}
              </div>

              {/* Badge Notifications */}
              <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}>
                      <Trophy className={`w-5 h-5 ${accentText}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>Badge Notifications</p>
                      <p className={`text-xs ${textSecondary}`}>Celebrate achievements</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.badgeNotifications}
                    onChange={() => handleToggle('badgeNotifications')}
                  />
                </div>
              </div>

              {/* Vibration */}
              <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}>
                      <Vibrate className={`w-5 h-5 ${accentText}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>Vibration</p>
                      <p className={`text-xs ${textSecondary}`}>Vibrate with notifications</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.vibrate}
                    onChange={() => handleToggle('vibrate')}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderColor}`}>
          <button
            onClick={onClose}
            className={`w-full py-3 ${cardBg} ${textPrimary} rounded-xl font-medium ${hoverBg}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
