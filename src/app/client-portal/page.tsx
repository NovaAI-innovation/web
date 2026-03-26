'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /client-portal is now a redirect stub.
 * The unified login page is at /login.
 */
export default function ClientPortalLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
