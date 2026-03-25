'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  MessageSquare,
  Upload,
  LogOut,
  ChevronRight,
  Building2,
  PenTool,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/documents', label: 'Documents', icon: Upload },
  { href: '/admin/schematics', label: 'Schematics', icon: PenTool },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/admin' || pathname === '/admin/';

  // Secondary auth check — middleware handles the hard redirect, this catches
  // edge cases like an expired token that slips through on client navigation.
  useEffect(() => {
    if (isLoginPage) return;
    fetch('/api/admin/auth/me').then((r) => {
      if (!r.ok) router.replace('/admin');
    }).catch(() => router.replace('/admin'));
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  const handleSignOut = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/admin');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-chimera-black flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-chimera-border bg-chimera-dark flex flex-col sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-chimera-border">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-chimera-gold" />
            <span className="font-display text-lg tracking-tight">
              <span className="text-chimera-gold">Chimera</span>
              <span className="text-chimera-text-muted text-sm ml-1.5 font-sans">Admin</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition group ${
                  active
                    ? 'bg-chimera-surface text-white'
                    : 'text-chimera-text-secondary hover:bg-chimera-surface/50 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-chimera-gold' : 'text-current'}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 text-chimera-text-muted" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-chimera-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-chimera-text-muted hover:text-white hover:bg-chimera-surface/50 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
