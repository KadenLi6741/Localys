'use client';

import { QRCodeSVG } from 'qrcode.react';

interface OrderQRCodeProps {
  orderId: string;
  token: string;
  size?: number;
}

export function OrderQRCode({ orderId, token, size = 200 }: OrderQRCodeProps) {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz');

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
      <p className="text-[var(--text-muted)] text-xs font-mono">
        #{orderId.substring(0, 8)}
      </p>
    </div>
  );
}
