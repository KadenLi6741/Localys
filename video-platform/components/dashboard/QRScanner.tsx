'use client';

import { useState, useEffect, useRef } from 'react';

interface QRScannerProps {
  businessId: string;
  onScanResult: (result: any) => void;
  onClose: () => void;
}

export function QRScanner({ businessId, onScanResult, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let html5QrCode: any = null;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            setScanning(true);
            try {
              const res = await fetch('/api/scan-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken: decodedText, businessId }),
              });
              const data = await res.json();
              if (data.success) {
                await html5QrCode.stop();
                onScanResult(data);
              } else {
                setError(data.error || 'Invalid QR code');
                setScanning(false);
              }
            } catch {
              setError('Failed to verify QR code');
              setScanning(false);
            }
          },
          () => {}
        );
      } catch (err: any) {
        setError(err.message || 'Failed to start camera');
      }
    };

    initScanner();

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [businessId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Scan QR Code</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={containerRef} className="rounded-lg overflow-hidden mb-4">
          <div id="qr-reader" style={{ width: '100%' }} />
        </div>

        {scanning && <p className="text-green-400 text-sm text-center">Verifying...</p>}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
            {error}
            <button onClick={() => setError(null)} className="block mx-auto mt-2 text-xs text-red-300/60 hover:text-red-300">Dismiss</button>
          </div>
        )}

        <p className="text-white/30 text-xs text-center mt-3">Point camera at the customer&apos;s QR code</p>
      </div>
    </div>
  );
}
