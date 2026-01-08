import React from 'react';
import { LayoutDashboard, Calendar, Dumbbell, BookOpen } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab, getThemeClass }) => {
    const tabs = [
        { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
        { id: 'plan', label: 'Plan', icon: <Calendar size={20} /> },
        { id: 'workout', label: 'Train', icon: <Dumbbell size={20} /> },
        { id: 'guide', label: 'Guide', icon: <BookOpen size={20} /> },
    ];

    return (
        <nav className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-1.5 flex justify-between items-center relative overflow-hidden">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative z-10 flex-1 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <div className="flex flex-col items-center gap-0.5">
                                {React.cloneElement(tab.icon, {
                                    size: isActive ? 22 : 20,
                                    strokeWidth: isActive ? 2.5 : 2
                                })}
                                {isActive && <span className="text-[9px] font-black uppercase tracking-wide">{tab.label}</span>}
                            </div>

                            {/* Active background pill */}
                            {isActive && (
                                <div className={`absolute inset-0 bg-white/10 rounded-full -z-10 animate-in fade-in zoom-in duration-300`}></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
