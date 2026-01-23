import { useState } from 'react'

const NeonBadge = ({ type, label, subtext, isNew = false, onClick }) => {
    const [isPressed, setIsPressed] = useState(false)

    const styles = {
        bronze: {
            color: 'text-orange-400',
            border: 'border-orange-500/50',
            shadow: 'shadow-orange-500/20',
            glow: 'group-hover:shadow-[0_0_25px_rgba(251,146,60,0.5)]',
            bg: 'bg-orange-500/5',
            icon: 'text-orange-300',
            shimmer: 'from-orange-500/0 via-orange-400/30 to-orange-500/0',
            pulse: 'bg-orange-500',
        },
        silver: {
            color: 'text-slate-300',
            border: 'border-slate-400/50',
            shadow: 'shadow-slate-400/20',
            glow: 'group-hover:shadow-[0_0_25px_rgba(148,163,184,0.5)]',
            bg: 'bg-slate-400/5',
            icon: 'text-slate-200',
            shimmer: 'from-slate-400/0 via-slate-300/30 to-slate-400/0',
            pulse: 'bg-slate-400',
        },
        gold: {
            color: 'text-yellow-400',
            border: 'border-yellow-500/50',
            shadow: 'shadow-yellow-500/20',
            glow: 'group-hover:shadow-[0_0_25px_rgba(250,204,21,0.5)]',
            bg: 'bg-yellow-500/5',
            icon: 'text-yellow-200',
            shimmer: 'from-yellow-500/0 via-yellow-400/30 to-yellow-500/0',
            pulse: 'bg-yellow-500',
        },
        platinum: {
            color: 'text-cyan-400',
            border: 'border-cyan-500/50',
            shadow: 'shadow-cyan-500/20',
            glow: 'group-hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]',
            bg: 'bg-cyan-500/5',
            icon: 'text-cyan-200',
            shimmer: 'from-cyan-500/0 via-cyan-400/40 to-cyan-500/0',
            pulse: 'bg-cyan-500',
        }
    }

    const s = styles[type] || styles.bronze

    return (
        <div
            className={`
                relative group w-full aspect-square md:aspect-[4/3] rounded-xl border-2
                ${s.border} ${s.bg}
                flex flex-col items-center justify-center p-4
                transition-all duration-300
                ${s.glow}
                hover:border-opacity-100
                hover:scale-105
                hover:-translate-y-1
                cursor-pointer
                overflow-hidden
                ${isPressed ? 'scale-95' : ''}
                ${isNew ? 'animate-badge-pulse' : ''}
            `}
            onClick={onClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
        >
            {/* Shimmer Effect */}
            <div className={`
                absolute inset-0 -translate-x-full
                bg-gradient-to-r ${s.shimmer}
                group-hover:translate-x-full
                transition-transform duration-1000 ease-in-out
            `} />

            {/* New Badge Indicator */}
            {isNew && (
                <div className="absolute top-2 right-2 z-20">
                    <span className={`
                        inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold
                        ${s.pulse} text-white
                        animate-pulse
                    `}>
                        NEW
                    </span>
                </div>
            )}

            {/* Inner Glow */}
            <div className={`
                absolute inset-0 rounded-xl
                bg-gradient-to-br from-white/5 to-transparent
                opacity-0 group-hover:opacity-100
                transition-opacity duration-500
            `} />

            {/* Hexagon Shape (CSS) */}
            <div className={`w-12 h-12 md:w-16 md:h-16 mb-3 relative flex items-center justify-center`}>
                <div className={`
                    absolute inset-0 border-2 ${s.border}
                    rotate-45 rounded-lg
                    transition-transform duration-700
                    group-hover:rotate-[135deg]
                    ${isNew ? 'animate-spin-slow' : ''}
                `} />
                <div className={`
                    absolute inset-0 border-2 ${s.border}
                    rotate-[135deg] rounded-lg opacity-50
                    transition-transform duration-700
                    group-hover:rotate-45
                    ${isNew ? 'animate-spin-slow-reverse' : ''}
                `} />

                {/* Center Icon/Symbol */}
                <div className={`
                    ${s.color} font-black text-xl md:text-2xl
                    drop-shadow-[0_0_10px_currentColor] z-10
                    group-hover:scale-110 transition-transform duration-300
                `}>
                    {type === 'bronze' && 'I'}
                    {type === 'silver' && 'II'}
                    {type === 'gold' && 'III'}
                    {type === 'platinum' && '★'}
                </div>
            </div>

            {/* Labels */}
            <div className="text-center z-10">
                <div className={`
                    font-bold text-xs md:text-sm uppercase tracking-wider
                    ${s.color} mb-1 drop-shadow-sm
                    group-hover:tracking-widest transition-all duration-300
                `}>
                    {label}
                </div>
                <div className={`
                    text-[10px] text-slate-500 font-mono tracking-tight
                    group-hover:text-slate-400 transition-colors
                `}>
                    {subtext}
                </div>
            </div>

            {/* Particle Effects on Hover (CSS only) */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className={`absolute top-1/4 left-1/4 w-1 h-1 rounded-full ${s.pulse} animate-float-1`} />
                <div className={`absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full ${s.pulse} animate-float-2`} />
                <div className={`absolute bottom-1/4 left-1/3 w-1 h-1 rounded-full ${s.pulse} animate-float-3`} />
                <div className={`absolute bottom-1/3 right-1/3 w-1.5 h-1.5 rounded-full ${s.pulse} animate-float-4`} />
            </div>

            {/* Custom CSS Animations */}
            <style>{`
                @keyframes badge-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
                    50% { box-shadow: 0 0 0 10px rgba(6, 182, 212, 0); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(45deg); }
                    to { transform: rotate(405deg); }
                }
                @keyframes spin-slow-reverse {
                    from { transform: rotate(135deg); }
                    to { transform: rotate(-225deg); }
                }
                @keyframes float-1 {
                    0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
                    50% { transform: translate(-10px, -15px) scale(1); opacity: 0.8; }
                }
                @keyframes float-2 {
                    0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
                    50% { transform: translate(8px, -12px) scale(1); opacity: 0.6; }
                }
                @keyframes float-3 {
                    0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
                    50% { transform: translate(-5px, 10px) scale(1); opacity: 0.7; }
                }
                @keyframes float-4 {
                    0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
                    50% { transform: translate(12px, 8px) scale(1); opacity: 0.5; }
                }
                .animate-badge-pulse { animation: badge-pulse 2s infinite; }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                .animate-spin-slow-reverse { animation: spin-slow-reverse 8s linear infinite; }
                .animate-float-1 { animation: float-1 3s ease-in-out infinite; }
                .animate-float-2 { animation: float-2 3.5s ease-in-out infinite 0.3s; }
                .animate-float-3 { animation: float-3 2.8s ease-in-out infinite 0.6s; }
                .animate-float-4 { animation: float-4 3.2s ease-in-out infinite 0.9s; }
            `}</style>
        </div>
    )
}

export default NeonBadge
