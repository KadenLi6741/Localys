'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

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
  const widgetIdRef = useRef<string | null>(null);

  const handleTurnstileError = (errorCode?: string) => {
    if (errorCode === '110200') {
      console.error(
        '[Turnstile] Error 110200: invalid or domain-mismatched site key. Check NEXT_PUBLIC_TURNSTILE_SITE_KEY and allowed domains in Cloudflare.'
      );
    }
    onError?.(errorCode);
  };

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

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
    }
  }, [siteKey, theme]);

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