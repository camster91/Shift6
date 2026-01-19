import React from 'react';
import { Info, Clock, ArrowUp, Target, Zap, TrendingUp } from 'lucide-react';

const Guide = ({ getThemeClass }) => {
    return (
        <div className="space-y-8 pb-24">
            {/* Header Section */}
            <div className="relative bg-slate-900 border border-cyan-500/20 rounded-xl p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
                <div className="relative flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                        <Info size={24} className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Training Guide</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Methodology and form guidelines
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Training Protocols */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                    <div className="border-b border-slate-800 px-6 py-4">
                        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <Target size={14} />
                            Training Protocols
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {[
                            { icon: <Zap size={16} />, t: "Frequency Protocol", d: "3 sessions per week per muscle group. Maintain 48-hour recovery between sessions." },
                            { icon: <TrendingUp size={16} />, t: "Five-Set Structure", d: "Each session has 5 sets. Final set is AMRAP (As Many Reps As Possible) to test your limit." },
                            { icon: <Target size={16} />, t: "Progressive Overload", d: "If you can't complete the target, repeat the session after 48 hours before advancing." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="flex-shrink-0 w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-colors">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm mb-1">{item.t}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">{item.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Form Guidelines */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                    <div className="border-b border-slate-800 px-6 py-4">
                        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <Info size={14} />
                            Form Guidelines
                        </h3>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-teal-500/50 transition-colors group">
                            <div className="h-24 bg-gradient-to-br from-teal-500/20 to-slate-800 border-b border-slate-700 flex items-center justify-center">
                                <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center">
                                    <Clock size={28} className="text-teal-400" />
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                                    <div className="p-1.5 bg-teal-500/20 border border-teal-500/30 rounded">
                                        <Clock size={12} className="text-teal-400" />
                                    </div>
                                    Plank / Core
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Squeeze core tight. Pull elbows toward toes. Maximum tension, zero movement.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-yellow-500/50 transition-colors group">
                            <div className="h-24 bg-gradient-to-br from-yellow-500/20 to-slate-800 border-b border-slate-700 flex items-center justify-center">
                                <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center">
                                    <ArrowUp size={28} className="text-yellow-400" />
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                                    <div className="p-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded">
                                        <ArrowUp size={12} className="text-yellow-400" />
                                    </div>
                                    Pull-Ups
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Drive elbows down. Lead with chest, not chin. Use negatives if needed.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Terminology Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                <div className="border-b border-slate-800 px-6 py-4">
                    <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Terminology</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { t: "Volume History", d: "Total work (reps × sets) over time. Tracks consistency and capacity." },
                            { t: "Daily Stack", d: "Exercises scheduled for today. Complete them in order." },
                            { t: "AMRAP", d: "As Many Reps As Possible. Final set to judge strength reserve." },
                            { t: "Course Progress", d: "Your journey through the 18-day program for each exercise." },
                            { t: "Baseline Test", d: "Initial assessment that sets your starting difficulty level." }
                        ].map((item, i) => (
                            <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500/30 transition-colors">
                                <p className="font-semibold text-white text-sm mb-2">{item.t}</p>
                                <p className="text-xs text-slate-400 leading-relaxed">{item.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Guide;
