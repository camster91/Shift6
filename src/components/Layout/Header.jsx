import React from 'react';
import { ChevronDown, Settings, Download, Upload } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises';

const Header = ({
    activeExercise,
    setActiveExercise,
    isSelectorOpen,
    setIsSelectorOpen,
    getThemeClass,
    setActiveTab,
    onExport,
    onImport
}) => {
    const exercise = EXERCISE_PLANS[activeExercise];

    return (
        <header className="bg-slate-900 text-white sticky top-0 z-20 shadow-xl border-b border-slate-800 pt-[env(safe-area-inset-top)]">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo & Branding */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 font-black text-xl md:text-2xl tracking-tighter">
                        <span className="text-blue-500">Shift</span>6
                    </div>
                </div>

                {/* Right Side: Exercise Selector & Settings */}
                <div className="flex items-center gap-2">
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
                                            <span className={`p-2 rounded-lg ${activeExercise === key ? ex.color.replace('text-', 'bg-').replace('600', '500') + '/20 text-' + ex.color.replace('text-', '') + '-400' : 'bg-slate-800 text-slate-600'}`}>
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
                    <DataMenu onExport={onExport} onImport={onImport} />
                </div>
            </div>
        </header>
    );
};

const DataMenu = ({ onExport, onImport }) => {
    const [isOpen, setIsOpen] = React.useState(false);

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
                            onClick={() => { onExport(); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <Download size={16} /> Backup Data
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
                    </div>
                </>
            )}
        </div>
    );
};

export default Header;
