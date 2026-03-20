'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const isLoginRoute = pathname === '/client-portal';

  useEffect(() => {
    if (!isAuthenticated && !isLoginRoute) {
      router.push('/client-portal');
    }
  }, [isAuthenticated, isLoginRoute, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoginRoute) return;

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
  }, [isAuthenticated, isLoginRoute]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-chimera-black">
      <nav className="border-b border-chimera-border bg-chimera-dark">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl tracking-tight text-chimera-gold">Chimera</span>
            <div className="font-display text-2xl tracking-tight">Client Portal</div>
          </div>
          
          <div className="flex items-center gap-8 text-sm">
            <a href="/client-portal/dashboard" className="hover:text-chimera-gold transition">Dashboard</a>
            <a href="/client-portal/projects" className="hover:text-chimera-gold transition">Projects</a>
            <a href="/client-portal/documents" className="hover:text-chimera-gold transition">Documents</a>
            <a href="/client-portal/messages" className="hover:text-chimera-gold transition">
              Messages {unreadCount > 0 ? <span className="ml-1 text-chimera-gold">({unreadCount})</span> : null}
            </a>
            
            <button 
              onClick={() => {
                localStorage.removeItem('portalToken');
                document.cookie = 'portalToken=; Path=/; Max-Age=0; SameSite=Lax';
                window.location.href = '/client-portal';
              }}
              className="text-chimera-text-muted hover:text-white transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      
      {children}
    </div>
  );
}
