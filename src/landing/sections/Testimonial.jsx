import { useInView } from '../hooks/useInView';
import { Quote } from 'lucide-react';

const QUOTES = [
  {
    text: "I was about to skip the gym for the third time this week because of a client call that ran over. The 20-Minute Window got me through the squat rack in 18 minutes. Plate math was already done.",
    name: 'Marcus T.',
    role: 'Management Consultant',
    location: 'Toronto',
  },
  {
    text: "Tried four apps before this. All of them punished me for missing a day. Shift6's MVD mode treats my life like the constraint it is, instead of asking me to be a different person.",
    name: 'Priya K.',
    role: 'Pediatric Resident',
    location: 'Vancouver',
  },
  {
    text: "The VO₂ Max intervals are brutal but the app never makes me feel bad for skipping. I see my streak as protected, not broken. That's the difference.",
    name: 'James W.',
    role: 'Founder, Two Startups',
    location: 'Austin',
  },
];

export default function Testimonial() {
  const [ref, inView] = useInView();

  return (
    <section className="py-20 px-6">
      <div ref={ref} className={`max-w-5xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">From Early Testers</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-12 leading-tight">
          Built for people like you.
        </h2>

        <div className="grid md:grid-cols-3 gap-3">
          {QUOTES.map((q, i) => (
            <div key={i} className="card flex flex-col">
              <Quote size={20} className="text-cyan-400/40 mb-3" />
              <p className="text-sm text-slate-300 leading-relaxed mb-4 flex-1">&quot;{q.text}&quot;</p>
              <div className="pt-4 border-t border-white/[0.05]">
                <p className="text-xs font-bold text-white">{q.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{q.role} · {q.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
