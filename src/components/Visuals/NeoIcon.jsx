import React from 'react';
import {
    Activity,
    ArrowUp,
    ArrowDown,
    Triangle,
    Circle,
    Minus,
    MoveVertical,
    StretchHorizontal,
    Dumbbell,
    User
} from 'lucide-react';

const NeoIcon = ({ type }) => {
    // Map types to Lucide icons that best represent the movement
    const getIcon = () => {
        switch (type) {
            case 'plank':
                return <Minus size={80} className="text-cyan-400 rotate-0" />;
            case 'pullups':
                return <ArrowUp size={80} className="text-cyan-400" />;
            case 'dips':
                return <ArrowDown size={80} className="text-cyan-400" />;
            case 'supermans':
                return <Activity size={80} className="text-cyan-400" />;
            default:
                return <Circle size={80} className="text-cyan-400" />;
        }
    };

    return (
        <div className="w-full h-full bg-slate-950 flex items-center justify-center relative overflow-hidden group">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(to right, #0891b2 1px, transparent 1px), linear-gradient(to bottom, #0891b2 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Radial Glow */}
            <div className="absolute inset-0 bg-radial-gradient from-cyan-900/40 to-transparent opacity-50" />

            {/* Icon with Neon Glow */}
            <div className="relative z-10 filter drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-transform duration-500 group-hover:scale-110">
                {getIcon()}
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-20 animate-pulse pointer-events-none" />
        </div>
    );
};

export default NeoIcon;
