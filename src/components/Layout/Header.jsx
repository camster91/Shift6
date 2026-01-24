import React from 'react';
import { Settings, Download, Upload, Trash2, Volume2, VolumeX, FileSpreadsheet, Timer, Sun, Moon, Dumbbell, Scale, Flame, Home } from 'lucide-react';

const Header = ({
    onExport,
    onExportCSV,
    onImport,
    onFactoryReset,
    audioEnabled,
    setAudioEnabled,
    restTimerOverride,
    setRestTimerOverride,
    theme,
    setTheme,
    warmupEnabled,
    setWarmupEnabled,
    onShowTrainingSettings,
    onShowBodyMetrics,
    programMode,
    onChangeProgramMode
}) => {
    const handleHomeClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleMode = () => {
        const newMode = programMode === 'bodyweight' ? 'gym' : 'bodyweight';
        onChangeProgramMode?.(newMode);
    };

    return (
        <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-2xl border-b border-white/5 pt-[env(safe-area-inset-top)] mesh-bg">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo & Branding - Clickable Home Button */}
                <button
                    onClick={handleHomeClick}
                    className="flex flex-col items-start font-black tracking-tighter hover:opacity-80 transition-opacity"
                    aria-label="Go to home"
                >
                    <div className="flex items-center gap-1 text-2xl">
                        <span className="text-cyan-400 text-glow">SHIFT</span><span className="text-white">6</span>
                    </div>
                    <span className="text-[9px] text-cyan-400/70 tracking-widest font-semibold">ELITE</span>
                </button>

                <div className="flex items-center gap-3">
                    {/* Quick Mode Toggle (Hybrid Hustler) */}
                    {programMode && onChangeProgramMode && (
                        <button
                            onClick={toggleMode}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${programMode === 'gym'
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                }`}
                            title={`Switch to ${programMode === 'gym' ? 'Home' : 'Gym'} mode`}
                        >
                            {programMode === 'gym' ? (
                                <>
                                    <Dumbbell size={14} />
                                    <span className="hidden sm:inline">Gym</span>
                                </>
                            ) : (
                                <>
                                    <Home size={14} />
                                    <span className="hidden sm:inline">Home</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Settings Menu */}
                    <DataMenu
                        onExport={onExport}
                        onExportCSV={onExportCSV}
                        onImport={onImport}
                        onFactoryReset={onFactoryReset}
                        audioEnabled={audioEnabled}
                        setAudioEnabled={setAudioEnabled}
                        restTimerOverride={restTimerOverride}
                        setRestTimerOverride={setRestTimerOverride}
                        theme={theme}
                        setTheme={setTheme}
                        warmupEnabled={warmupEnabled}
                        setWarmupEnabled={setWarmupEnabled}
                        onShowTrainingSettings={onShowTrainingSettings}
                        onShowBodyMetrics={onShowBodyMetrics}
                    />
                </div>
            </div>
        </header>
    );
};

const REST_OPTIONS = [
    { value: null, label: 'Auto' },
    { value: 30, label: '30s' },
    { value: 45, label: '45s' },
    { value: 60, label: '60s' },
    { value: 90, label: '90s' },
    { value: 120, label: '120s' }
];

const DataMenu = ({ onExport, onExportCSV, onImport, onFactoryReset, audioEnabled, setAudioEnabled, restTimerOverride, setRestTimerOverride, theme, setTheme, warmupEnabled, setWarmupEnabled, onShowTrainingSettings, onShowBodyMetrics }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const cycleRestTimer = () => {
        const currentIndex = REST_OPTIONS.findIndex(o => o.value === restTimerOverride);
        const nextIndex = (currentIndex + 1) % REST_OPTIONS.length;
        setRestTimerOverride(REST_OPTIONS[nextIndex].value);
    };

    const currentRestLabel = REST_OPTIONS.find(o => o.value === restTimerOverride)?.label || 'Auto';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all ${isOpen ? 'bg-slate-800' : ''}`}
            >
                <Settings size={18} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 overflow-hidden py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            {audioEnabled ? 'Sound On' : 'Sound Off'}
                        </button>
                        <button
                            onClick={cycleRestTimer}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <span className="flex items-center gap-3">
                                <Timer size={16} /> Rest Timer
                            </span>
                            <span className="text-cyan-400">{currentRestLabel}</span>
                        </button>
                        <button
                            onClick={() => setWarmupEnabled(!warmupEnabled)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <span className="flex items-center gap-3">
                                <Flame size={16} /> Warm-Up
                            </span>
                            <span className={warmupEnabled ? 'text-orange-400' : 'text-slate-500'}>{warmupEnabled ? 'On' : 'Off'}</span>
                        </button>
                        <button
                            onClick={() => { onShowTrainingSettings?.(); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <Dumbbell size={16} /> Training Settings
                        </button>
                        <button
                            onClick={() => { onShowBodyMetrics?.(); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <Scale size={16} /> Body Metrics
                        </button>
                        <div className="h-[1px] bg-slate-800 my-1" />
                        <button
                            onClick={() => { onExport(); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <Download size={16} /> Backup Data
                        </button>
                        <button
                            onClick={() => { onExportCSV(); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <FileSpreadsheet size={16} /> Export CSV
                        </button>
                        <label className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
                            <Upload size={16} /> Restore Data
                            <input type="file" accept=".json" className="hidden" onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    onImport(e.target.files[0]);
                                    setIsOpen(false);
                                }
                            }} />
                        </label>
                        <div className="h-[1px] bg-slate-800 my-1" />
                        <button
                            onClick={() => { onFactoryReset(); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                            <Trash2 size={16} /> Factory Reset
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Header;
