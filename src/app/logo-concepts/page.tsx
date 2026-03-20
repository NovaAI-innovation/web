const concepts = [
  {
    id: 'A',
    title: 'Concept A - Steel Wordmark',
    file: '/brand/logo-concepts/concept-a-steel-wordmark.svg',
    score: 93,
    notes: 'Primary recommendation. Strongest professional contractor impression.',
  },
  {
    id: 'C',
    title: 'Concept C - Structural Monogram',
    file: '/brand/logo-concepts/concept-c-structural-monogram.svg',
    score: 84,
    notes: 'Secondary/icon system. Best for favicon, hard hats, social avatars.',
  },
  {
    id: 'B',
    title: 'Concept B - Shield Structure Mark',
    file: '/brand/logo-concepts/concept-b-shield-structure.svg',
    score: 84,
    notes: 'Fallback trust-forward option for a more institutional look.',
  },
];

export default function LogoConceptsPage() {
  return (
    <main className="min-h-screen bg-chimera-black text-chimera-text-primary">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <header className="mb-12">
          <p className="text-chimera-gold tracking-[3px] text-sm uppercase mb-3">Brand Exploration</p>
          <h1 className="font-display text-6xl mb-4">Logo Concept Review</h1>
          <p className="text-chimera-text-muted max-w-3xl">
            Ranked in recommended order: A, C, B. These are draft SVG concepts for direction alignment.
          </p>
        </header>

        <div className="space-y-10">
          {concepts.map((concept) => (
            <section key={concept.id} className="border border-chimera-border bg-chimera-surface rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-3xl">{concept.title}</h2>
                <div className="text-sm text-chimera-gold">Score: {concept.score}/100</div>
              </div>
              <p className="text-chimera-text-muted mb-5">{concept.notes}</p>
              <div className="bg-black border border-chimera-border rounded-md overflow-hidden">
                <img src={concept.file} alt={concept.title} className="w-full h-auto" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
