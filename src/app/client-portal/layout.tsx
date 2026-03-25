'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, FileText, FolderKanban, LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';
import { ToastProvider } from '@/components/portal/ToastProvider';

const navLinks = [
  { href: '/client-portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/client-portal/projects', label: 'Projects', icon: FolderKanban },
  { href: '/client-portal/documents', label: 'Documents', icon: FileText },
  { href: '/client-portal/messages', label: 'Messages', icon: MessageSquare, hasBadge: true },
  { href: '/client-portal/invoices', label: 'Invoices', icon: FileText },
  { href: '/client-portal/settings', label: 'Settings', icon: Settings },
];

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const isPublicRoute = pathname === '/client-portal' || pathname === '/client-portal/register';
  const isMessagesRoute = pathname.startsWith('/client-portal/messages');

  useEffect(() => {
    try {
      setIsAuthenticated(Boolean(localStorage.getItem('portalToken')));
      const user = localStorage.getItem('portalUser');
      if (user) {
        const parsed = JSON.parse(user) as { name?: string };
        setUserName(parsed.name ?? '');
      } else {
        setUserName('');
      }
    } catch {
      setIsAuthenticated(false);
      setUserName('');
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated && !isPublicRoute) {
      router.push('/client-portal');
    }
  }, [isAuthenticated, isHydrated, isPublicRoute, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || isPublicRoute) return;
    if (isMessagesRoute) {
      setUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/client-portal/messages', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data: { unreadCount: number } | null;
          error: { code: string; message: string } | null;
        };
        if (payload.data) {
          setUnreadCount(payload.data.unreadCount);
        }
      } catch {
        // keep nav stable if polling fails
      }
    };

    void loadUnreadCount();
    const timer = setInterval(() => {
      void loadUnreadCount();
    }, 10000);

    return () => clearInterval(timer);
  }, [isAuthenticated, isHydrated, isMessagesRoute, isPublicRoute]);

  const handleSignOut = async () => {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalUser');
    try {
      await fetch('/api/client-portal/auth/logout', { method: 'POST' });
    } catch {
      // Clear cookie client-side as fallback
      document.cookie = 'portalToken=; Path=/; Max-Age=0; SameSite=Lax';
    }
    window.location.href = '/client-portal';
  };

  if (isPublicRoute) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/client-portal/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };
  const activeSection = navLinks.find((link) => isActive(link.href))?.label ?? 'Client Portal';

  return (
    <div className="h-[calc(100vh-109px)] bg-chimera-black flex overflow-hidden">
      <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 border-r border-chimera-border bg-chimera-dark flex-col h-full">
        <div className="px-6 py-6 border-b border-chimera-border">
          <div className="font-display text-2xl tracking-tight">
            <span className="text-chimera-gold">Chimera</span> Portal
          </div>
          <div className="text-sm text-chimera-text-muted mt-2">Client Workspace</div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-hidden">
          {navLinks.map(({ href, label, icon: Icon, hasBadge }) => {
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
                {hasBadge && unreadCount > 0 && !isMessagesRoute && (
                  <span className="text-xs bg-chimera-gold text-black px-2 py-0.5 rounded-full font-semibold">
                    {unreadCount}
                  </span>
                )}
                {active && <ChevronRight className="w-4 h-4 text-chimera-text-muted" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-chimera-border">
          {userName && (
            <div className="text-sm text-chimera-text-muted mb-3 px-2">{userName}</div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base text-chimera-text-muted hover:text-white hover:bg-chimera-surface/50 transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="shrink-0 border-b border-chimera-border bg-chimera-dark/80 px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[3px] uppercase text-chimera-gold">Client Portal</div>
            <h1 className="font-display text-3xl lg:text-4xl tracking-tight text-white">{activeSection}</h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-base text-chimera-text-muted hover:text-white transition"
            title="Back to main site"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Main Site</span>
          </Link>
        </header>

        <div className="lg:hidden shrink-0 border-b border-chimera-border bg-chimera-dark px-3 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  isActive(link.href)
                    ? 'bg-chimera-gold text-black'
                    : 'bg-chimera-surface text-chimera-text-secondary hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <ToastProvider>
            {children}
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
