'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { ToastProvider } from '@/components/portal/ToastProvider';

const navLinks = [
  { href: '/client-portal/dashboard', label: 'Dashboard' },
  { href: '/client-portal/projects', label: 'Projects' },
  { href: '/client-portal/documents', label: 'Documents' },
  { href: '/client-portal/messages', label: 'Messages', hasBadge: true },
  { href: '/client-portal/invoices', label: 'Invoices' },
  { href: '/client-portal/settings', label: 'Settings' },
];

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('portalToken'));
  });
  const [userName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const user = localStorage.getItem('portalUser');
      if (user) {
        const parsed = JSON.parse(user) as { name?: string };
        return parsed.name ?? '';
      }
    } catch { /* ignore */ }
    return '';
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  const isPublicRoute = pathname === '/client-portal' || pathname === '/client-portal/register';

  // Close mobile menu on route change
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }

  useEffect(() => {
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/client-portal');
    }
  }, [isAuthenticated, isPublicRoute, router]);

  useEffect(() => {
    if (!isAuthenticated || isPublicRoute) return;

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
  }, [isAuthenticated, isPublicRoute]);

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

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/client-portal/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-chimera-black">
      <nav className="border-b border-chimera-border bg-chimera-dark sticky top-[109px] z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
          {/* Left: Back + Brand */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-chimera-text-muted hover:text-white transition"
              title="Back to main site"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Main Site</span>
            </Link>
            <div className="h-5 w-px bg-chimera-border hidden sm:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-display text-lg sm:text-xl tracking-tight text-chimera-gold">Chimera</span>
              <div className="font-display text-xl sm:text-2xl tracking-tight">Portal</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 transition ${
                  isActive(link.href)
                    ? 'text-chimera-gold'
                    : 'text-chimera-text-secondary hover:text-chimera-gold'
                }`}
              >
                {link.label}
                {link.hasBadge && unreadCount > 0 && (
                  <span className="ml-1 text-xs bg-chimera-gold text-black px-1.5 py-0.5 rounded-full font-semibold">
                    {unreadCount}
                  </span>
                )}
                {isActive(link.href) && (
                  <span className="absolute -bottom-[19px] left-0 right-0 h-px bg-chimera-gold" />
                )}
              </Link>
            ))}

            {userName && (
              <span className="text-chimera-text-muted text-xs border-l border-chimera-border pl-4 ml-2">
                {userName}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-chimera-text-muted hover:text-white transition text-xs"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-chimera-text-muted hover:text-white transition"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-chimera-border bg-chimera-dark">
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-1 bg-chimera-dark">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition ${
                    isActive(link.href)
                      ? 'bg-chimera-gold text-black'
                      : 'bg-chimera-dark text-chimera-text-secondary hover:bg-chimera-surface hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.hasBadge && unreadCount > 0 && (
                    <span className="text-xs bg-chimera-gold text-black px-2 py-0.5 rounded-full font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              ))}

              <div className="border-t border-chimera-border mt-3 pt-3 px-4">
                {userName && (
                  <div className="text-sm text-chimera-text-muted mb-3">{userName}</div>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-sm text-chimera-text-muted hover:text-white transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <ToastProvider>
        {children}
      </ToastProvider>
    </div>
  );
}
