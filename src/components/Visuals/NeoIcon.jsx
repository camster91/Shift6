// Custom SVG exercise icons with neon styling

// Push-up figure SVG
const PushupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
            d="M4 16h3l2-4h6l2 4h3M8 12l1-3h6l1 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="17" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

// Squat figure SVG
const SquatIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M12 7v3M9 10l-2 5 3-1M15 10l2 5-3-1M10 14l-1 6M14 14l1 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Pull-up figure SVG
const PullupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 4h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M10 6V4M14 6V4M12 10v4M9 14l-2 6M15 14l2 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Dip figure SVG
const DipIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 6h5M15 6h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M9 6v3l-1 2M15 6v3l1 2M12 10v5M10 15l-1 5M14 15l1 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Plank figure SVG
const PlankIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="19" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M17 11L6 13M6 13l-2 4M6 13l6 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// V-Up figure SVG
const VupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M12 8l-4 8M12 8l4 8M8 16l-2 2M16 16l2 2M10 10l-3-4M14 10l3-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Glute Bridge figure SVG
const GluteBridgeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="18" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M16 11L10 10C8 10 6 12 6 14M10 10l2 6M6 14l3 4M6 14l-2 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Lunge figure SVG
const LungeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M12 6v4M12 10l-4 4v6M12 10l4 2 2 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Superman figure SVG
const SupermanIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M6 12h8M14 12l4-4M14 12l4 4M6 10l-2-4M6 14l-2 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const NeoIcon = ({ name, size = 24, className = "" }) => {
    const iconMap = {
        pushups: PushupIcon,
        squats: SquatIcon,
        pullups: PullupIcon,
        dips: DipIcon,
        plank: PlankIcon,
        vups: VupIcon,
        glutebridge: GluteBridgeIcon,
        lunges: LungeIcon,
        supermans: SupermanIcon,
    };

    const IconComponent = iconMap[name];

    // If used as full-size display (like before)
    if (size === 80 || !name) {
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
                    {IconComponent ? (
                        <IconComponent size={80} className="text-cyan-400" />
                    ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-cyan-400" />
                    )}
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-20 animate-pulse pointer-events-none" />
            </div>
        );
    }

    // If used as inline icon
    if (IconComponent) {
        return <IconComponent size={size} className={className} />;
    }

    // Fallback
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
};

export default NeoIcon;
