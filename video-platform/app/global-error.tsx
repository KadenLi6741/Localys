'use client';

/**
 * global-error.tsx — top-level error boundary for failures in the root layout itself.
 * Purpose: Catches errors that escape the normal error.tsx boundary (i.e. in the root layout), rendering
 *   its own minimal <html>/<body> fallback with a retry. Last line of defence against a fully blank app.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#fff' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '6rem',
              height: '6rem',
              borderRadius: '50%',
              border: '4px solid #f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2rem',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#000', margin: '0 0 0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', maxWidth: '24rem', margin: '0 0 2rem' }}>
            A critical error occurred. Please try again or refresh the page.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: '#f97316',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/home"
              style={{
                background: '#000',
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
