import { Home, Zap, BarChart3, Menu } from 'lucide-react'

const BottomNav = ({ activeTab, setActiveTab, onMenuClick, theme = 'dark' }) => {
    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'workout', label: 'Workout', icon: Zap },
        { id: 'progress', label: 'Progress', icon: BarChart3 },
        { id: 'menu', label: 'Menu', icon: Menu, isMenu: true },
    ]

    const bgColor = theme === 'light'
        ? 'bg-white/90 border-slate-200'
        : 'bg-slate-900/95 border-slate-700/50'

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
            <div className={`mx-auto max-w-lg px-4 pb-2`}>
                <div className={`${bgColor} backdrop-blur-xl border rounded-2xl shadow-2xl p-1 flex justify-between items-center`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id && !tab.isMenu

                        const handleClick = () => {
                            if (tab.isMenu) {
                                onMenuClick?.()
                            } else {
                                setActiveTab(tab.id)
                            }
                        }

                        return (
                            <button
                                key={tab.id}
                                onClick={handleClick}
                                className={`relative flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                                    isActive
                                        ? 'text-cyan-400'
                                        : theme === 'light'
                                            ? 'text-slate-500 hover:text-slate-700'
                                            : 'text-slate-400 hover:text-slate-200'
                                }`}
                                aria-label={tab.label}
                            >
                                {/* Active background */}
                                {isActive && (
                                    <div className="absolute inset-1 bg-cyan-500/10 rounded-xl -z-10 animate-in fade-in zoom-in-95 duration-200" />
                                )}

                                <Icon
                                    size={isActive ? 22 : 20}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : ''}
                                />
                                <span className={`text-[10px] font-semibold tracking-wide ${
                                    isActive ? 'text-cyan-400' : ''
                                }`}>
                                    {tab.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}

export default BottomNav
