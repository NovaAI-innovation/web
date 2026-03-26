'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /admin is now a redirect stub.
 * The unified login page is at /login.
 */
export default function AdminLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
