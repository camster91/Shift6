// Custom SVG exercise icons - bold, clear stick figures

// Push-up: person in push-up position, arms extended
const PushupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Head */}
        <circle cx="52" cy="20" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Body - angled down */}
        <line x1="46" y1="24" x2="16" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Arms - supporting */}
        <path d="M40 26L38 42M22 30L20 42" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Legs */}
        <line x1="16" y1="32" x2="6" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Ground */}
        <line x1="4" y1="46" x2="60" y2="46" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// Squat: person in deep squat
const SquatIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Head */}
        <circle cx="32" cy="12" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Torso */}
        <line x1="32" y1="18" x2="32" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Arms out */}
        <path d="M32 24L44 20M32 24L20 20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Bent legs */}
        <path d="M32 32L22 38L16 50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 32L42 38L48 50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Ground */}
        <line x1="10" y1="54" x2="54" y2="54" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// Pull-up: person hanging from bar, pulling up
const PullupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Bar */}
        <line x1="12" y1="8" x2="52" y2="8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Arms gripping */}
        <path d="M24 8V18M40 8V18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Head */}
        <circle cx="32" cy="22" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Torso */}
        <line x1="32" y1="28" x2="32" y2="44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Legs */}
        <path d="M32 44L26 58M32 44L38 58" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
);

// Dip: person on parallel bars, lowered
const DipIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Bars */}
        <line x1="8" y1="20" x2="24" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <line x1="40" y1="20" x2="56" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Head */}
        <circle cx="32" cy="14" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Arms bent on bars */}
        <path d="M20 20L24 28L32 30M44 20L40 28L32 30" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Torso */}
        <line x1="32" y1="30" x2="32" y2="44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Legs */}
        <path d="M32 44L26 58M32 44L38 58" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
);

// Plank: person in plank position
const PlankIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Head */}
        <circle cx="54" cy="22" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Body - straight */}
        <line x1="48" y1="26" x2="12" y2="32" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        {/* Forearms on ground */}
        <path d="M40 28L36 40M24 30L20 40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Legs/toes */}
        <line x1="12" y1="32" x2="6" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Ground */}
        <line x1="4" y1="44" x2="60" y2="44" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// V-Up: person in V position
const VupIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Person forming V shape - body is pivot point */}
        {/* Torso/hips at bottom of V */}
        <circle cx="32" cy="40" r="4" fill="currentColor" fillOpacity="0.3" />
        {/* Upper body going up-left with arms */}
        <line x1="32" y1="40" x2="18" y2="18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Head */}
        <circle cx="14" cy="12" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Arms reaching */}
        <path d="M18 18L10 8M18 18L24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Legs going up-right */}
        <line x1="32" y1="40" x2="48" y2="18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <line x1="48" y1="18" x2="54" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Ground indicator */}
        <line x1="20" y1="52" x2="44" y2="52" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// Glute Bridge: person with hips raised
const GluteBridgeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Head on ground */}
        <circle cx="54" cy="44" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Shoulders on ground */}
        <line x1="48" y1="44" x2="40" y2="44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Back arched up - bridge shape */}
        <path d="M40 44Q32 20 24 28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* Thigh going down */}
        <line x1="24" y1="28" x2="16" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Lower leg - foot flat */}
        <line x1="16" y1="40" x2="10" y2="48" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Ground */}
        <line x1="6" y1="52" x2="58" y2="52" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// Lunge: person in lunge position
const LungeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Head */}
        <circle cx="32" cy="10" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Torso - upright */}
        <line x1="32" y1="16" x2="32" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Arms on hips (small) */}
        <path d="M32 24L26 28M32 24L38 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Front leg bent */}
        <path d="M32 32L44 40L50 52" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Back leg extended */}
        <path d="M32 32L18 42L10 52" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Ground */}
        <line x1="6" y1="56" x2="58" y2="56" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// Superman: person flying/lying with limbs extended
const SupermanIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Head lifted */}
        <circle cx="12" cy="24" r="6" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.15" />
        {/* Body - slight curve */}
        <path d="M18 28Q32 32 48 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* Arms extended forward */}
        <line x1="14" y1="22" x2="4" y2="14" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="14" y1="26" x2="4" y2="22" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Legs extended back */}
        <line x1="48" y1="30" x2="58" y2="22" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="48" y1="32" x2="58" y2="36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        {/* Ground indicator */}
        <line x1="20" y1="48" x2="44" y2="48" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
);

// Default exercise icon for custom exercises
const DefaultExerciseIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Simple dumbbell shape */}
        <rect x="8" y="26" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
        <rect x="44" y="26" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
        <line x1="20" y1="32" x2="44" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
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

    const IconComponent = iconMap[name] || DefaultExerciseIcon;

    // Large display mode for previews
    if (size >= 60) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden rounded-xl">
                {/* Grid background */}
                <div className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #0891b2 1px, transparent 1px), linear-gradient(to bottom, #0891b2 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-radial from-cyan-500/30 via-transparent to-transparent" />
                {/* Icon */}
                <div className="relative z-10 drop-shadow-[0_0_24px_rgba(34,211,238,0.5)]">
                    <IconComponent size={size} className="text-cyan-400" />
                </div>
            </div>
        );
    }

    return <IconComponent size={size} className={className} />;
};

export default NeoIcon;
