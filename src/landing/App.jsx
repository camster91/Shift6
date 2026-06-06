import { useEffect, useRef } from 'react';
import { useInView } from './hooks/useInView';
import Hero from './sections/Hero';
import Problem from './sections/Problem';
import Protocol from './sections/Protocol';
import Pillars from './sections/Pillars';
import Contingency from './sections/Contingency';
import Showcase from './sections/Showcase';
import Testimonial from './sections/Testimonial';
import CTA from './sections/CTA';
import Footer from './sections/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden">
      <BackgroundOrbs />
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Protocol />
        <Pillars />
        <Contingency />
        <Showcase />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <span className="font-black tracking-tight text-lg">
            <span className="text-cyan-400">Armor</span>
          </span>
        </a>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
          <a href="#pillars" className="hover:text-white transition-colors">5 Pillars</a>
          <a href="#contingency" className="hover:text-white transition-colors">Contingency</a>
          <a href="#showcase" className="hover:text-white transition-colors">Inside</a>
        </div>
        <a href="#download" className="btn-primary text-sm px-5 py-2.5">
          Get Armor
        </a>
      </div>
    </nav>
  );
}

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="orb"
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          top: '-10%', left: '-10%',
        }}
      />
      <div
        className="orb"
        style={{
          width: 500, height: 500,
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
          top: '40%', right: '-15%',
          animationDelay: '6s',
        }}
      />
      <div
        className="orb"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          bottom: '5%', left: '20%',
          animationDelay: '12s',
        }}
      />
    </div>
  );
}
