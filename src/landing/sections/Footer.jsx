export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚔️</span>
              <span className="font-black tracking-tight text-lg">
                <span className="text-cyan-400">Armor</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Metabolic armor, maximum VO₂ max, and 5 longevity pillars for busy professionals.
              Built by someone who knows the meeting runs long.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Product</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#protocol" className="hover:text-white transition-colors">Protocol</a></li>
              <li><a href="#pillars" className="hover:text-white transition-colors">5 Pillars</a></li>
              <li><a href="#contingency" className="hover:text-white transition-colors">Contingency</a></li>
              <li><a href="https://getshift6.com" className="hover:text-white transition-colors">Open Web App</a></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Legal</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              <li><a href="mailto:hi@getshift6.com" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400">© 2026 Armor. Built with no shortcuts, by hand.</p>
          <p className="text-[10px] text-slate-400">
            v3.0 · Local-first · WCAG 2.1 AA · <span className="text-cyan-400">Cloud sync optional</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
