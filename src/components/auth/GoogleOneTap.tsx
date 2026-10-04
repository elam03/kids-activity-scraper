'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import type { SessionUser } from '@/lib/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, any>) => void;
          prompt: (notification?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, any>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  user: SessionUser | null;
  onAuthSuccess: (user: SessionUser) => void;
  clientId?: string;
}

export default function GoogleOneTap({
  user,
  onAuthSuccess,
  clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
}: GoogleOneTapProps) {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (user || !clientId || isInitialized.current) {
      return;
    }

    function initOneTap() {
      if (!window.google?.accounts?.id || isInitialized.current || user) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;

            try {
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              });

              if (res.ok) {
                const data = await res.json();
                if (data.user) {
                  onAuthSuccess(data.user);
                }
              }
            } catch (err) {
              console.error('Google One Tap auth failed', err);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt();
        isInitialized.current = true;
      } catch (err) {
        console.error('Failed to initialize Google One Tap', err);
      }
    }

    if (window.google?.accounts?.id) {
      initOneTap();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initOneTap();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [user, clientId, onAuthSuccess]);

  if (user || !clientId) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
    />
  );
}
