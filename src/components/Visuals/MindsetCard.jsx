import React from 'react';
import { Quote } from 'lucide-react';

const MindsetCard = () => {
    return (
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-default shadow-lg">
            {/* Dynamic Background - Darkened for readability */}
            <div className="absolute inset-0 bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />
                <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900 via-transparent to-transparent" />
            </div>

            <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-500 shadow-md">
                        <Quote size={24} className="fill-current" />
                    </div>
                </div>

                <div className="flex-1">
                    <span className="text-cyan-600 font-bold text-xs tracking-wider uppercase mb-3 block">
                        Elite Mindset
                    </span>
                    <blockquote className="text-xl md:text-2xl font-medium text-white italic leading-relaxed">
                        "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't."
                    </blockquote>
                </div>
            </div>
        </div>
    );
};

export default MindsetCard;
