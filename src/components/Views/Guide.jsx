import React from 'react';
import { Info, Clock, ArrowUp } from 'lucide-react';

const Guide = ({ getThemeClass }) => {
    return (
        <div className="space-y-6 pb-20">
            <div className="border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-600 text-white">
                        <Info size={20} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Guide</h1>
                </div>
                <p className="text-sm text-slate-600">
                    Training methodology and form guidelines
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="border border-slate-200 p-6 space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                        <h3 className="text-sm font-semibold text-slate-900">Training Protocols</h3>
                    </div>

                    <div className="space-y-6">
                        {[
                            { t: "Frequency Protocol", d: "3 sessions per week per muscle group. Maintain 48-hour recovery between sessions." },
                            { t: "Five-Set Structure", d: "Each session has 5 sets. Final set is AMRAP (As Many Reps As Possible) to test your limit." },
                            { t: "Progressive Overload", d: "If you can't complete the target, repeat the session after 48 hours before advancing." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="text-2xl font-bold text-slate-200">0{i + 1}</div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm mb-1">{item.t}</p>
                                    <p className="text-xs text-slate-600">{item.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="border border-slate-200 p-6 space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                        <h3 className="text-sm font-semibold text-slate-900">Form Guidelines</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="border border-slate-200 overflow-hidden">
                            {/* Form Demo Image Placeholder */}
                            <div className="h-32 bg-gradient-to-br from-blue-50 to-slate-50 border-b border-slate-200 flex items-center justify-center">
                                <div className="text-3xl">🧘</div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-600">
                                        <Clock size={14} />
                                    </div>
                                    Plank / Core
                                </div>
                                <p className="text-xs text-slate-600">
                                    Squeeze core tight. Pull elbows toward toes. Maximum tension, zero movement.
                                </p>
                            </div>
                        </div>

                        <div className="border border-slate-200 overflow-hidden">
                            {/* Form Demo Image Placeholder */}
                            <div className="h-32 bg-gradient-to-br from-indigo-50 to-slate-50 border-b border-slate-200 flex items-center justify-center">
                                <div className="text-3xl">💪</div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600">
                                        <ArrowUp size={14} />
                                    </div>
                                    Pull-Ups
                                </div>
                                <p className="text-xs text-slate-600">
                                    Drive elbows down. Lead with chest, not chin. Use negatives if needed.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <section className="border border-slate-200 p-6">
                <div className="border-b border-slate-200 pb-4 mb-6">
                    <h3 className="text-sm font-semibold text-slate-900">Terminology</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { t: "Volume History", d: "Total work (reps × sets) over time. Tracks consistency and capacity." },
                        { t: "Daily Stack", d: "Exercises scheduled for today. Complete them in order." },
                        { t: "AMRAP", d: "As Many Reps As Possible. Final set to judge strength reserve." },
                        { t: "Course Progress", d: "Your journey through the 18-day program for each exercise." },
                        { t: "Baseline Test", d: "Initial assessment that sets your starting difficulty level." }
                    ].map((item, i) => (
                        <div key={i} className="space-y-1">
                            <p className="font-semibold text-slate-900 text-sm">{item.t}</p>
                            <p className="text-xs text-slate-600">{item.d}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Guide;
