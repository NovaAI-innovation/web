'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const tiers = [
  {
    name: 'Luxury',
    price: 'Premium',
    features: ['Full custom design', 'High-end materials', 'Project management', 'Extended warranty'],
    color: 'gold',
  },
  {
    name: 'Quality',
    price: 'Standard',
    features: ['Detailed planning', 'Quality materials', 'On-time delivery', 'Standard warranty'],
    color: 'white',
  },
  {
    name: 'Smart',
    price: 'Value',
    features: ['Budget optimization', 'Essential upgrades', 'Efficient timeline', 'Basic warranty'],
    color: 'muted',
  },
];

export default function ServicesPage() {
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    setLoading(true);
    setTimeout(() => {
      setMatchResult('Based on your needs, we recommend the **Quality** tier.');
      setLoading(false);
    }, 1200);
  };

  return (
    <main className="bg-chimera-black text-white">
      <section className="min-h-[70vh] flex items-center bg-gradient-to-br from-black via-chimera-dark to-black">
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <div className="max-w-2xl">
            <div className="uppercase tracking-[4px] text-chimera-gold text-sm mb-6">OUR CRAFT</div>
            <h1 className="font-display text-8xl leading-none tracking-[-3px] mb-8">
              SERVICES THAT
              <br />
              DEFINE HOMES
            </h1>
            <p className="text-2xl text-chimera-text-secondary">Three tiers. One standard: excellence.</p>
          </div>
        </div>
      </section>

      <section className="py-20 border-b border-chimera-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-5xl mb-4">Find Your Perfect Fit</h2>
            <p className="text-chimera-text-muted">
              Answer a few questions and we&apos;ll recommend the right service tier.
            </p>
          </div>

          <div className="bg-chimera-surface border border-chimera-border rounded-xl p-12">
            <button
              onClick={handleMatch}
              disabled={loading}
              className="w-full py-6 bg-chimera-gold text-black font-semibold text-xl rounded-md hover:bg-white transition-colors disabled:opacity-70"
            >
              {loading ? 'Analyzing your needs...' : 'Get Personalized Recommendation'}
            </button>

            {matchResult && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mt-10 p-8 bg-black/50 rounded-md border border-chimera-gold/30 text-center"
              >
                <p className="text-xl text-chimera-text-secondary">{matchResult}</p>
                <button onClick={() => setMatchResult(null)} className="mt-6 text-sm text-chimera-gold underline">
                  Start over
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="border border-chimera-border rounded-xl p-10 hover:border-chimera-gold transition-colors group"
              >
                <div
                  className={`inline px-5 py-1 text-xs font-medium rounded-sm mb-6 ${
                    tier.color === 'gold' ? 'bg-chimera-gold text-black' : 'bg-white/10 border border-chimera-border'
                  }`}
                >
                  {tier.name}
                </div>

                <div className="text-5xl font-display mb-8">{tier.price}</div>

                <ul className="space-y-4 mb-12">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-chimera-text-secondary">
                      <span className="text-chimera-gold mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button className="w-full py-4 border border-chimera-gold text-chimera-gold rounded-md group-hover:bg-chimera-gold group-hover:text-black transition-colors">
                  Choose {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-chimera-surface">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-5xl text-center mb-16">Our Process</h2>

          <div className="space-y-16">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex gap-8">
                <div className="w-12 h-12 rounded-md bg-chimera-gold flex-shrink-0 flex items-center justify-center text-black font-mono font-bold">
                  {step}
                </div>
                <div>
                  <div className="font-semibold text-xl mb-2">Step {step}</div>
                  <p className="text-chimera-text-muted">
                    Detailed description of this phase of the renovation process.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
