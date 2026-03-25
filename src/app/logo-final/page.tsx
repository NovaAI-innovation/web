import Image from 'next/image';

const assets = [
  { name: 'Primary On Dark', file: '/brand/final/chimera-primary-on-dark.svg', dark: true },
  { name: 'Primary On Light', file: '/brand/final/chimera-primary-on-light.svg', dark: false },
  { name: 'Horizontal On Dark', file: '/brand/final/chimera-horizontal-on-dark.svg', dark: true },
  { name: 'Icon CE On Dark', file: '/brand/final/chimera-icon-ce-on-dark.svg', dark: true },
  { name: '1-Color Black', file: '/brand/final/chimera-primary-1color-black.svg', dark: false },
  { name: '1-Color White', file: '/brand/final/chimera-primary-1color-white.svg', dark: true },
];

export default function LogoFinalPage() {
  return (
    <main className="min-h-screen bg-chimera-black text-chimera-text-primary">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="font-display text-6xl mb-4">Final Logo Package</h1>
        <p className="text-chimera-text-muted mb-10">Production draft assets for the approved system (A primary + C icon).</p>
        <div className="space-y-8">
          {assets.map((asset) => (
            <section key={asset.file} className="border border-chimera-border rounded-xl p-5 bg-chimera-surface">
              <h2 className="font-medium mb-4">{asset.name}</h2>
              <div className={`relative h-48 ${asset.dark ? 'bg-black border border-chimera-border rounded-md overflow-hidden' : 'bg-white border border-chimera-border rounded-md overflow-hidden'}`}>
                <Image src={asset.file} alt={asset.name} fill className="object-contain p-4" />
              </div>
              <p className="text-xs text-chimera-text-muted mt-3">{asset.file}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
