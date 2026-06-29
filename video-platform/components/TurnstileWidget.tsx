'use client';

/**
 * TurnstileWidget — wrapper around Cloudflare Turnstile (a CAPTCHA alternative).
 * Purpose: Renders Cloudflare's bot-protection challenge on auth/sensitive forms and hands the
 *   resulting token up to the parent, which sends it to the server for verification. Encapsulates
 *   loading the external script, mounting/unmounting the widget, and resetting it after a submit.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useRef } from 'react';
import Script from 'next/script';

// Cloudflare injects a global `turnstile` object via its script; declare its shape for TypeScript.
declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  resetKey?: number;
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
  resetKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Stores the id Cloudflare returns for the rendered widget so we can later reset/remove exactly
  // this instance — tracked in a ref (not state) because changing it must not trigger re-renders.
  const widgetIdRef = useRef<string | null>(null);

  // Logs a friendly hint for the most common misconfiguration (110200) before bubbling the error up.
  const handleTurnstileError = (errorCode?: string) => {
    if (errorCode === '110200') {
      console.error(
        '[Turnstile] Error 110200: invalid or domain-mismatched site key. Check NEXT_PUBLIC_TURNSTILE_SITE_KEY and allowed domains in Cloudflare.'
      );
    }
    onError?.(errorCode);
  };

  // Mounts the Turnstile challenge into our container. Guarded so it runs only once the script is
  // loaded, the container exists, and we haven't already rendered (prevents duplicate widgets).
  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
      return;
    }

    if (!siteKey) {
      console.error('[Turnstile] Missing site key. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY.');
      handleTurnstileError('missing-site-key');
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: onVerify,
      'expired-callback': onExpire ?? (() => {}),
      'error-callback': handleTurnstileError,
    });
  };

  // On unmount, tear down the widget so it doesn't leak DOM/listeners if the form is closed.
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  // Re-render the widget if the script is already present and the site key/theme changes.
  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
    }
  }, [siteKey, theme]);

  // Parent bumps `resetKey` after a submit to force a fresh challenge (tokens are single-use).
  useEffect(() => {
    if (!window.turnstile || !widgetIdRef.current) {
      return;
    }

    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}