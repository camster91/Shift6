// Custom SVG exercise icons with detailed stick figures

// Push-up figure - person in push-up position
const PushupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head */}
        <circle cx="38" cy="16" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Body - horizontal */}
        <path d="M34 18L12 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms pushing */}
        <path d="M30 18L28 28M28 28L24 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 20L16 28M16 28L12 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Legs */}
        <path d="M12 22L6 26M6 26L4 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Ground line */}
        <path d="M2 34H46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// Squat figure - person in squat position
const SquatIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head */}
        <circle cx="24" cy="8" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Torso */}
        <path d="M24 12V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms out for balance */}
        <path d="M24 16L32 14M24 16L16 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Bent legs in squat */}
        <path d="M24 22L18 26L14 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 22L30 26L34 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Feet */}
        <path d="M12 34H16M32 34H36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ground */}
        <path d="M8 36H40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// Pull-up figure - person hanging from bar
const PullupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Bar */}
        <path d="M8 8H40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Hands on bar */}
        <circle cx="18" cy="8" r="2" fill="currentColor" />
        <circle cx="30" cy="8" r="2" fill="currentColor" />
        {/* Arms */}
        <path d="M18 10L20 16M30 10L28 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Head */}
        <circle cx="24" cy="14" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Torso */}
        <path d="M24 18V30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Legs hanging */}
        <path d="M24 30L20 42M24 30L28 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

// Dip figure - person on parallel bars
const DipIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Parallel bars */}
        <path d="M8 16H18M30 16H40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Hands gripping */}
        <circle cx="16" cy="16" r="2" fill="currentColor" />
        <circle cx="32" cy="16" r="2" fill="currentColor" />
        {/* Head */}
        <circle cx="24" cy="12" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Arms bent */}
        <path d="M16 16L18 22L24 24M32 16L30 22L24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Torso */}
        <path d="M24 24V34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Legs */}
        <path d="M24 34L20 44M24 34L28 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

// Plank figure - person in plank position
const PlankIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head */}
        <circle cx="40" cy="18" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Body - straight horizontal line */}
        <path d="M36 20L8 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Arms - forearms on ground */}
        <path d="M32 20L30 28L26 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 22L18 28L14 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Legs */}
        <path d="M8 24L4 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ground */}
        <path d="M2 34H46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// V-Up figure - person doing V-up
const VupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head */}
        <circle cx="24" cy="10" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Torso - angled up */}
        <path d="M24 14L24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms reaching up to toes */}
        <path d="M24 16L16 8M24 16L32 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Legs angled up in V */}
        <path d="M24 24L14 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 24L34 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Hands touching feet */}
        <circle cx="14" cy="10" r="2" fill="currentColor" fillOpacity="0.5" />
        <circle cx="34" cy="10" r="2" fill="currentColor" fillOpacity="0.5" />
        {/* Ground indicator */}
        <path d="M18 38H30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// Glute Bridge figure - person doing bridge
const GluteBridgeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head on ground */}
        <circle cx="40" cy="32" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Shoulders on ground */}
        <path d="M36 32H32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Back arched up */}
        <path d="M32 32C28 32 24 20 20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Hips up high */}
        <circle cx="20" cy="18" r="2" fill="currentColor" fillOpacity="0.3" />
        {/* Thigh */}
        <path d="M20 20L12 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Lower leg - foot on ground */}
        <path d="M12 28L8 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ground */}
        <path d="M4 36H44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// Lunge figure - person in lunge position
const LungeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head */}
        <circle cx="24" cy="8" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Torso - upright */}
        <path d="M24 12V24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms on hips */}
        <path d="M24 18L20 22M24 18L28 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Front leg bent */}
        <path d="M24 24L32 30L36 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Back leg extended */}
        <path d="M24 24L14 32L8 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Feet */}
        <path d="M34 38H40M6 38H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Ground */}
        <path d="M4 40H44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// Superman figure - person in superman pose
const SupermanIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Head lifted */}
        <circle cx="8" cy="18" r="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
        {/* Body - slight arch */}
        <path d="M12 20C16 22 28 22 36 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms extended forward */}
        <path d="M10 18L4 12M10 18L4 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Legs extended back and up */}
        <path d="M36 24L44 20M36 24L44 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ground */}
        <path d="M16 34H32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
        {/* Motion lines */}
        <path d="M2 10L6 10M2 14L4 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
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

    // If used as full-size display (for large previews)
    if (size >= 60) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden group rounded-xl">
                {/* Animated grid background */}
                <div className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #0891b2 1px, transparent 1px), linear-gradient(to bottom, #0891b2 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                    }}
                />

                {/* Radial glow */}
                <div className="absolute inset-0 bg-gradient-radial from-cyan-500/20 via-transparent to-transparent" />

                {/* Icon with neon glow effect */}
                <div className="relative z-10 filter drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-transform duration-500 group-hover:scale-110">
                    {IconComponent ? (
                        <IconComponent size={size} className="text-cyan-400" />
                    ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-cyan-400" />
                    )}
                </div>

                {/* Scan line animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-pulse pointer-events-none" />
            </div>
        );
    }

    // Regular inline icon usage
    if (IconComponent) {
        return <IconComponent size={size} className={className} />;
    }

    // Fallback circle
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
            <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
};

export default NeoIcon;
