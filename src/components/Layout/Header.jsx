import React from 'react';
import { ChevronDown, ChevronLeft, Settings, Download, Upload, Trash2, Volume2, VolumeX, FileSpreadsheet, Timer, Sun, Moon } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';

const Header = ({
    activeTab,
    activeExercise,
    setActiveExercise,
    isSelectorOpen,
    setIsSelectorOpen,
    getThemeClass,
    setActiveTab,
    onExport,
    onExportCSV,
    onImport,
    onFactoryReset,
    audioEnabled,
    setAudioEnabled,
    restTimerOverride,
    setRestTimerOverride,
    theme,
    setTheme
}) => {
    const exercise = EXERCISE_PLANS[activeExercise];

    return (
        <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-2xl border-b border-white/5 pt-[env(safe-area-inset-top)] mesh-bg">
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Logo & Branding */}
                <div className="flex items-center gap-6">
                    {activeTab !== 'dashboard' && (
                        <button
                            onClick={() => window.history.back()}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 group"
                        >
                            <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className="flex flex-col items-start font-black tracking-tighter hover:opacity-80 transition-opacity active-scale"
                    >
                        <div className="flex items-center gap-1 text-2xl md:text-3xl">
                            <span className="text-cyan-400 text-glow">SHIFT</span><span className="text-white">6</span>
                        </div>
                        <span className="text-[10px] md:text-xs text-cyan-400/70 tracking-widest font-semibold">ELITE</span>
                    </button>
                </div>

                {/* Right Side: Exercise Selector & Settings */}
                <div className="flex items-center gap-4">
                    {/* Exercise Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isSelectorOpen
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-transparent border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${getThemeClass('bg')}`}></span>
                            <span className="text-xs md:text-sm font-bold">{exercise.name}</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSelectorOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSelectorOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Select Plan</p>
                                    {Object.entries(EXERCISE_PLANS).map(([key, ex]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setActiveExercise(key);
                                                setIsSelectorOpen(false);
                                                setActiveTab('plan');
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all hover:bg-slate-800 ${activeExercise === key ? 'text-white bg-slate-800/50' : 'text-slate-400'
                                                }`}
                                        >
                                            <span className={`p-2 rounded-lg ${activeExercise === key
                                                ? `bg-${ex.color}-500/20 text-${ex.color}-400`
                                                : 'bg-slate-800 text-slate-600'}`}>
                                                {React.cloneElement(ex.icon, { size: 16 })}
                                            </span>
                                            {ex.name}
                                            {activeExercise === key && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Settings / Data Menu */}
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

const DataMenu = ({ onExport, onExportCSV, onImport, onFactoryReset, audioEnabled, setAudioEnabled, restTimerOverride, setRestTimerOverride, theme, setTheme }) => {
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
                className={`p-2 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all ${isOpen ? 'bg-slate-800' : ''}`}
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
