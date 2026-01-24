import { useState, useEffect } from 'react'
import { X, Type, Eye, Gauge, MessageSquare, Clock, MousePointer } from 'lucide-react'
import {
  getAccessibilitySettings,
  saveAccessibilitySettings,
  applyAccessibilitySettings,
  ACCESSIBILITY_OPTIONS
} from '../../utils/accessibility'
import { vibrate } from '../../utils/device'

/**
 * Toggle switch component
 */
const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative w-12 h-6 rounded-full transition-colors ${
      checked ? 'bg-cyan-500' : 'bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
)

/**
 * Setting row component
 */
const SettingRow = ({ icon: Icon, label, description, children }) => (
  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
        <Icon size={20} className="text-slate-400" />
      </div>
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
    {children}
  </div>
)

/**
 * AccessibilitySettings Component
 * Allows users to configure accessibility options
 */
const AccessibilitySettings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState(getAccessibilitySettings())

  // Apply settings when they change
  useEffect(() => {
    applyAccessibilitySettings(settings)
    saveAccessibilitySettings(settings)
  }, [settings])

  const updateSetting = (key, value) => {
    vibrate(20)
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Accessibility</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Font Size */}
          <div className="p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                <Type size={20} className="text-slate-400" />
              </div>
              <div>
                <p className="text-white font-medium">Text Size</p>
                <p className="text-xs text-slate-400">Adjust the base font size</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ACCESSIBILITY_OPTIONS.fontSize.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('fontSize', option.value)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    settings.fontSize === option.value
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <SettingRow
            icon={Eye}
            label="High Contrast"
            description="Increase color contrast"
          >
            <Toggle
              checked={settings.highContrast}
              onChange={(v) => updateSetting('highContrast', v)}
            />
          </SettingRow>

          {/* Reduced Motion */}
          <SettingRow
            icon={Gauge}
            label="Reduce Motion"
            description="Minimize animations"
          >
            <Toggle
              checked={settings.reducedMotion}
              onChange={(v) => updateSetting('reducedMotion', v)}
            />
          </SettingRow>

          {/* Simple Language */}
          <SettingRow
            icon={MessageSquare}
            label="Simple Language"
            description="Replace fitness jargon"
          >
            <Toggle
              checked={settings.simpleLanguage}
              onChange={(v) => updateSetting('simpleLanguage', v)}
            />
          </SettingRow>

          {/* Longer Rest Times */}
          <SettingRow
            icon={Clock}
            label="Longer Rest Times"
            description="50% more rest between sets"
          >
            <Toggle
              checked={settings.longerRestTimes}
              onChange={(v) => updateSetting('longerRestTimes', v)}
            />
          </SettingRow>

          {/* Larger Buttons */}
          <SettingRow
            icon={MousePointer}
            label="Larger Touch Targets"
            description="Bigger buttons and controls"
          >
            <Toggle
              checked={settings.largerButtons}
              onChange={(v) => updateSetting('largerButtons', v)}
            />
          </SettingRow>

          {/* Preview */}
          <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Preview</p>
            <p className="text-white">
              This is how text will appear with your current settings.
            </p>
            <button className="mt-2 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg font-medium">
              Sample Button
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => {
              setSettings(getAccessibilitySettings())
              onClose()
            }}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessibilitySettings
