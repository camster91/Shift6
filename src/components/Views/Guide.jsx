import React from 'react';
import { Info, Clock, ArrowUp } from 'lucide-react';

const Guide = ({ getThemeClass }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden mesh-bg shadow-2xl ring-1 ring-white/10">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] transform scale-150">
                    <Info size={400} />
                </div>

                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/40">
                            <Info size={28} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Methodology</h1>
                    </div>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        The Shift6 architecture is engineered for compounding mastery. Understanding the mechanics of progress is as critical as the physical execution.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">The Protocols</h3>
                        <span className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Execution Laws</span>
                    </div>

                    <div className="space-y-8">
                        {[
                            { t: "Frequency Protocol", d: "3 sessions per week per muscle group. Consistency is the primary lever of adaptation. Maintain a 48-hour recovery window between identical loads." },
                            { t: "The Rule of Five", d: "Structure your sessions into five strategic sets. The final set is AMRAP (As Many Reps As Possible), driving your central nervous system to its baseline limit." },
                            { t: "Calibration Failure", d: "If a session target is not achieved, do not advance. Re-calibrate the load in 48 hours. Stagnation is a signal for recovery, not a reason for retreat." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-6 group">
                                <div className="text-3xl font-black text-slate-100 group-hover:text-blue-500 transition-colors duration-500">0{i + 1}</div>
                                <div>
                                    <p className="font-black text-slate-900 text-sm mb-2">{item.t}</p>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">{item.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Form Cues</h3>
                        <span className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Technical Mastery</span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3 font-black text-slate-900 text-sm mb-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Clock size={16} />
                                </div>
                                Core Stabilization (Plank)
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Actively compress your visceral midsection. Pull your elbows toward your toes as if trying to fold the floor in half. Maximum tension, zero movement.
                            </p>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-3 font-black text-slate-900 text-sm mb-4">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <ArrowUp size={16} />
                                </div>
                                Vertical Pull (Pull-Ups)
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Drive your elbows into your posterior pockets. Lead with the chest, not the chin. If baseline is not met, implement eccentric negatives for volume accumulation.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Guide;
