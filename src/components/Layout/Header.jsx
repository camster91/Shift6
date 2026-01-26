import { Volume2, VolumeX, Sun, Moon, RotateCcw } from 'lucide-react'

const Header = ({
    audioEnabled,
    setAudioEnabled,
    theme,
    setTheme,
    onSwitchMode,
    showSwitchMode = false
}) => {
    const handleHomeClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const bgColor = theme === 'light'
        ? 'bg-white/95 border-slate-200'
        : 'bg-slate-900/95 border-white/5'

    const textColor = theme === 'light' ? 'text-slate-900' : 'text-white'

    return (
        <header className={`${bgColor} backdrop-blur-xl sticky top-0 z-30 shadow-lg border-b pt-[env(safe-area-inset-top)]`}>
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                {/* Logo & Branding */}
                <button
                    onClick={handleHomeClick}
                    className="flex items-center gap-1 font-black tracking-tighter hover:opacity-80 transition-opacity"
                    aria-label="Go to home"
                >
                    <span className="text-xl text-cyan-500">SHIFT</span>
                    <span className={`text-xl ${textColor}`}>6</span>
                </button>

                <div className="flex items-center gap-2">
                    {/* Switch Mode Button */}
                    {showSwitchMode && onSwitchMode && (
                        <button
                            onClick={onSwitchMode}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                theme === 'light'
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                            title="Switch workout mode"
                        >
                            <RotateCcw size={14} />
                            <span className="hidden sm:inline">Switch</span>
                        </button>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`p-2 rounded-full transition-colors ${
                            theme === 'light'
                                ? 'text-slate-600 hover:bg-slate-100'
                                : 'text-slate-400 hover:bg-slate-800'
                        }`}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Audio Toggle */}
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`p-2 rounded-full transition-colors ${
                            theme === 'light'
                                ? 'text-slate-600 hover:bg-slate-100'
                                : 'text-slate-400 hover:bg-slate-800'
                        }`}
                        aria-label={audioEnabled ? 'Mute audio' : 'Unmute audio'}
                    >
                        {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                </div>
            </div>
        </header>
    )
}

export default Header
