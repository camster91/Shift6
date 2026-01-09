import React from 'react';
import { Info, Clock, ArrowUp } from 'lucide-react';

const Guide = ({ getThemeClass }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                    <Info className="text-blue-600" size={24} />
                    Methodology
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-6">
                        <h3 className="font-black text-slate-900 border-b-2 border-slate-100 pb-2 uppercase tracking-widest text-xs">The Rules</h3>
                        <div className="space-y-4">
                            {[
                                { t: "Frequency", d: "3 days per week per exercise. Ideally: Mon/Wed/Fri for all, or alternate days." },
                                { t: "The Rule of Five", d: "5 sets per session. The last set is always AMRAP (As Many Reps/Seconds As Possible)." },
                                { t: "The Fail Rule", d: "If you fail a day, rest 48 hours and retry. Do not advance until completed." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <span className={`font-black text-xl text-blue-500`}>0{i + 1}</span>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm mb-1">{item.t}</p>
                                        <p className="text-slate-600 text-xs leading-relaxed font-medium">{item.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h3 className="font-black text-slate-900 border-b-2 border-slate-100 pb-2 uppercase tracking-widest text-xs">Form Cues</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
                                    <Clock size={16} className="text-rose-600" /> Plank Tips
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    Don't just hang out there. Actively pull your elbows towards your toes (without moving them) to create massive core tension.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
                                    <ArrowUp size={16} className="text-indigo-600" /> Pull-Up Tips
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    Imagine driving your elbows down into your back pockets. If you can't do one yet, do "negatives" (jump up, lower slowly).
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Guide;
