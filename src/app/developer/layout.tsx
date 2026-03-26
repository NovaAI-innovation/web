'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ChevronRight, Code2, LayoutDashboard, LogOut, Terminal } from 'lucide-react';

const navItems = [
  { href: '/developer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/developer/logs', label: 'Logs', icon: Terminal },
  { href: '/developer/api', label: 'API Docs', icon: Code2 },
  { href: '/developer/health', label: 'Health', icon: Activity },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (!r.ok) { router.replace('/login'); return; }
      const payload = await r.json() as { data: { role: string } | null };
      if (payload.data?.role !== 'developer') router.replace('/login');
    }).catch(() => router.replace('/login'));
  }, [router, pathname]);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="fixed inset-x-0 bottom-0 top-[109px] bg-chimera-black flex overflow-hidden">
      <aside className="fixed left-0 top-[109px] bottom-0 w-72 xl:w-80 border-r border-chimera-border bg-chimera-dark flex flex-col">
        <div className="px-6 py-6 border-b border-chimera-border">
          <div className="font-display text-2xl tracking-tight">
            <span className="text-chimera-gold">Chimera</span>
            <span className="text-chimera-text-muted text-base ml-1.5 font-sans">Dev</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition ${
                  active
                    ? 'bg-chimera-surface text-white'
                    : 'text-chimera-text-secondary hover:bg-chimera-surface/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-chimera-gold' : 'text-current'}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-4 h-4 text-chimera-text-muted" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-chimera-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base text-chimera-text-muted hover:text-white hover:bg-chimera-surface/50 transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto ml-72 xl:ml-80">
        {children}
      </main>
    </div>
  );
}
