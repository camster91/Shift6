import { useState, Children, cloneElement, isValidElement } from 'react'
import { X, List, LayoutGrid, Wrench } from 'lucide-react'

const MODE_CONFIG = {
    home: {
        accent: 'cyan',
        accentBg: 'bg-cyan-500',
        accentBgHover: 'hover:bg-cyan-600',
        accentText: 'text-cyan-400',
        accentBorder: 'border-cyan-500/30',
        accentBgSubtle: 'bg-cyan-500/20',
        title: 'My Program',
    },
    gym: {
        accent: 'purple',
        accentBg: 'bg-purple-500',
        accentBgHover: 'hover:bg-purple-600',
        accentText: 'text-purple-400',
        accentBorder: 'border-purple-500/30',
        accentBgSubtle: 'bg-purple-500/20',
        title: 'Gym Programs',
    },
}

const TABS = [
    { id: 'current', label: 'Current Program', icon: List },
    { id: 'templates', label: 'Templates', icon: LayoutGrid },
    { id: 'custom', label: 'Custom', icon: Wrench },
]

const ProgramManagerShell = ({
    mode = 'home',
    onClose,
    theme = 'dark',
    children,
}) => {
    const [activeTab, setActiveTab] = useState('current')
    const config = MODE_CONFIG[mode]

    const bgClassFull = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
    const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
    const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
    const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
    const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
    const tabBg = theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
    const tabHover = theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-800'
    const tabBarBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-900/50'

    // Inject activeTab, setActiveTab, mode, theme, and onClose into children
    const childrenWithProps = Children.map(children, child => {
        if (isValidElement(child)) {
            return cloneElement(child, { activeTab, setActiveTab, mode, theme, onClose })
        }
        return child
    })

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
            <div className={`fixed inset-0 ${bgClass} md:inset-4 md:rounded-2xl overflow-hidden flex flex-col`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
                    <h2 className={`text-xl font-bold ${textPrimary}`}>{config.title}</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg ${tabHover} transition-colors`}
                    >
                        <X className={`w-5 h-5 ${textSecondary}`} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`px-4 py-2 border-b ${borderColor} ${tabBarBg}`}>
                    <div className={`flex ${tabBg} rounded-lg p-1`}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeTab === tab.id
                                        ? `${config.accentBg} text-white`
                                        : `${textSecondary} hover:text-white`
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content — children receive activeTab via cloneElement */}
                <div className="flex-1 overflow-y-auto">
                    {childrenWithProps}
                </div>
            </div>
        </div>
    )
}

export default ProgramManagerShell