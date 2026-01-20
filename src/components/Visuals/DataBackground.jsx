const DataBackground = ({ type = 'grid' }) => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Base Dark Gradient */}
            <div className="absolute inset-0 bg-slate-900" />

            {/* Grid Pattern - Simplified */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: type === 'grid'
                        ? 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)'
                        : 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: type === 'grid' ? '40px 40px' : '20px 20px',
                    maskImage: 'linear-gradient(to bottom, black, transparent)'
                }}
            />

            {/* Subtle Ambient Light - No more clear shapes */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-cyan-900/10 to-transparent" />
        </div>
    );
};

export default DataBackground;
