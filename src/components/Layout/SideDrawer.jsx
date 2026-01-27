import { useEffect, useRef, memo } from 'react'
import {
    X,
    Trophy,
    Calendar,
    BookOpen,
    Scale,
    Eye,
    Download,
    Upload,
    FileSpreadsheet,
    Trash2,
    Dumbbell,
    ChevronRight,
    User,
    Home,
    RefreshCw
} from 'lucide-react'

const SideDrawer = ({
    isOpen,
    onClose,
    stats = {},
    // Navigation callbacks
    onShowCalendar,
    onShowGuide,
    onShowAchievements,
    // Settings callbacks
    onShowTrainingSettings,
    onShowBodyMetrics,
    onShowAccessibility,
    // Mode switching
    currentMode = 'home',
    onSwitchMode,
    // Data callbacks
    onExport,
    onExportCSV,
    onImport,
    onFactoryReset,
    // Theme
    theme = 'dark'
}) => {
    const drawerRef = useRef(null)

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Focus trap
    useEffect(() => {
        if (isOpen && drawerRef.current) {
            drawerRef.current.focus()
        }
    }, [isOpen])

    if (!isOpen) return null

    const bgColor = theme === 'light' ? 'bg-white' : 'bg-slate-900'
    const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'
    const textColor = theme === 'light' ? 'text-slate-900' : 'text-white'
    const subTextColor = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
    const hoverBg = theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'

    const MenuItem = ({ icon: Icon, label, onClick, badge, danger }) => (
        <button
            onClick={() => {
                onClick?.()
                onClose()
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : `${subTextColor} ${hoverBg}`
            }`}
        >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {badge && (
                <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                    {badge}
                </span>
            )}
            <ChevronRight size={16} className="text-slate-600" />
        </button>
    )

    const Divider = () => (
        <div className={`h-px ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'} my-2`} />
    )

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                tabIndex={-1}
                className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] ${bgColor} border-l ${borderColor} z-50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col`}
            >
                {/* Header */}
                <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
                    <h2 className={`text-lg font-bold ${textColor}`}>Menu</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                        aria-label="Close menu"
                    >
                        <X size={20} className={subTextColor} />
                    </button>
                </div>

                {/* User Stats Summary */}
                <div className={`p-4 border-b ${borderColor}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <User size={24} className="text-white" />
                        </div>
                        <div>
                            <p className={`font-bold ${textColor}`}>Your Progress</p>
                            <p className={`text-xs ${subTextColor}`}>Keep pushing forward</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'} text-center`}>
                            <p className="text-lg font-bold text-cyan-400">{stats.totalSessions || 0}</p>
                            <p className={`text-[10px] ${subTextColor}`}>Workouts</p>
                        </div>
                        <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'} text-center`}>
                            <p className="text-lg font-bold text-orange-400">{stats.currentStreak || 0}</p>
                            <p className={`text-[10px] ${subTextColor}`}>Streak</p>
                        </div>
                        <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'} text-center`}>
                            <p className="text-lg font-bold text-emerald-400">{stats.completedPlans || 0}</p>
                            <p className={`text-[10px] ${subTextColor}`}>Mastered</p>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-2">
                    {/* Main Navigation */}
                    <MenuItem
                        icon={Trophy}
                        label="Achievements"
                        onClick={onShowAchievements}
                        badge={stats.unlockedBadges || undefined}
                    />
                    <MenuItem
                        icon={Calendar}
                        label="Calendar"
                        onClick={onShowCalendar}
                    />
                    <MenuItem
                        icon={BookOpen}
                        label="Exercise Guide"
                        onClick={onShowGuide}
                    />

                    <Divider />

                    {/* Settings */}
                    <p className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${subTextColor}`}>
                        Settings
                    </p>
                    <MenuItem
                        icon={currentMode === 'home' ? Dumbbell : Home}
                        label={`Switch to ${currentMode === 'home' ? 'Gym' : 'Home'} Mode`}
                        onClick={onSwitchMode}
                    />
                    <MenuItem
                        icon={RefreshCw}
                        label="Training Settings"
                        onClick={onShowTrainingSettings}
                    />
                    <MenuItem
                        icon={Scale}
                        label="Body Metrics"
                        onClick={onShowBodyMetrics}
                    />
                    <MenuItem
                        icon={Eye}
                        label="Accessibility"
                        onClick={onShowAccessibility}
                    />

                    <Divider />

                    {/* Data Management */}
                    <p className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${subTextColor}`}>
                        Data
                    </p>
                    <MenuItem
                        icon={Download}
                        label="Backup Data"
                        onClick={onExport}
                    />
                    <MenuItem
                        icon={FileSpreadsheet}
                        label="Export to CSV"
                        onClick={onExportCSV}
                    />
                    <label className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${subTextColor} ${hoverBg} cursor-pointer transition-colors`}>
                        <Upload size={18} />
                        <span className="flex-1 text-left">Restore Data</span>
                        <ChevronRight size={16} className="text-slate-600" />
                        <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    onImport?.(e.target.files[0])
                                    onClose()
                                }
                            }}
                        />
                    </label>

                    <Divider />

                    {/* Danger Zone */}
                    <MenuItem
                        icon={Trash2}
                        label="Factory Reset"
                        onClick={onFactoryReset}
                        danger
                    />
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${borderColor} text-center`}>
                    <p className={`text-xs ${subTextColor}`}>
                        Shift6 Elite v2.0
                    </p>
                </div>
            </div>
        </>
    )
}

// ⚡ Bolt: Memoize SideDrawer to prevent re-renders from App.jsx state changes.
// All callback props must be wrapped in useCallback in the parent component.
export default memo(SideDrawer)
