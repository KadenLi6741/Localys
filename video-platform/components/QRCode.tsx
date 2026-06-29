'use client';

/**
 * OrderQRCode — renders a scannable QR code that a business uses to verify a customer's order.
 * Purpose: Encodes a one-time verification URL (order id + secret token) into a QR image. When a
 *   merchant scans it, they're taken to the verify page that marks the order as fulfilled. This is
 *   the in-person pickup/redemption mechanism for Localy orders.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { QRCodeSVG } from 'qrcode.react';

interface OrderQRCodeProps {
  orderId: string;
  token: string;
  size?: number;
}

// Builds the verification deep-link and draws it as a QR code for the given order.
export function OrderQRCode({ orderId, token, size = 200 }: OrderQRCodeProps) {
  // Prefer the live origin in the browser so scanned links point at the same host the user is on;
  // fall back to a configured/base production URL during server render where `window` is undefined.
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz');

  // The token acts as a shared secret so only someone holding this QR can mark the order verified.
  const verifyUrl = `${baseUrl}/orders/verify?id=${orderId}&token=${token}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-3 rounded-lg">
        <QRCodeSVG
          value={verifyUrl}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      <p className="text-white/40 text-xs font-mono">
        #{orderId.substring(0, 8)}
      </p>
    </div>
  );
}
