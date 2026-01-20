const NeonBadge = ({ type, label, subtext }) => {
    const styles = {
        bronze: {
            color: 'text-orange-400',
            border: 'border-orange-500/50',
            shadow: 'shadow-orange-500/20',
            glow: 'group-hover:shadow-[0_0_20px_rgba(251,146,60,0.4)]',
            bg: 'bg-orange-500/5',
            icon: 'text-orange-300'
        },
        silver: {
            color: 'text-slate-300',
            border: 'border-slate-400/50',
            shadow: 'shadow-slate-400/20',
            glow: 'group-hover:shadow-[0_0_20px_rgba(148,163,184,0.4)]',
            bg: 'bg-slate-400/5',
            icon: 'text-slate-200'
        },
        gold: {
            color: 'text-yellow-400',
            border: 'border-yellow-500/50',
            shadow: 'shadow-yellow-500/20',
            glow: 'group-hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]',
            bg: 'bg-yellow-500/5',
            icon: 'text-yellow-200'
        }
    };

    const s = styles[type] || styles.bronze;

    return (
        <div className={`relative group w-full aspect-square md:aspect-[4/3] rounded-xl border ${s.border} ${s.bg} flex flex-col items-center justify-center p-4 transition-all duration-300 ${s.glow} hover:border-opacity-100 hover:scale-105 hover:-translate-y-1`}>
            {/* Inner Glow */}
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* Hexagon Shape (CSS) */}
            <div className={`w-12 h-12 md:w-16 md:h-16 mb-3 relative flex items-center justify-center`}>
                <div className={`absolute inset-0 border-2 ${s.border} rotate-45 rounded-lg transition-transform duration-700 group-hover:rotate-90`} />
                <div className={`absolute inset-0 border-2 ${s.border} rotate-[135deg] rounded-lg opacity-50 transition-transform duration-700 group-hover:-rotate-0`} />

                {/* Center Icon/Symbol */}
                <div className={`${s.color} font-black text-xl md:text-2xl drop-shadow-[0_0_10px_currentColor] z-10`}>
                    {type === 'bronze' && 'I'}
                    {type === 'silver' && 'II'}
                    {type === 'gold' && 'III'}
                </div>
            </div>

            {/* Labels */}
            <div className="text-center z-10">
                <div className={`font-bold text-xs md:text-sm uppercase tracking-wider ${s.color} mb-1 drop-shadow-sm`}>
                    {label}
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-tight group-hover:text-slate-400 transition-colors">
                    {subtext}
                </div>
            </div>
        </div>
    );
};

export default NeonBadge;
