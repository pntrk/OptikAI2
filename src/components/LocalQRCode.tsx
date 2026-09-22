import React, { useMemo } from 'react';

interface LocalQRCodeProps {
  data: string;
  size: number;
}

export function LocalQRCode({ data, size }: LocalQRCodeProps) {
  const src = useMemo(() => {
    if (typeof window !== 'undefined' && window.QRious && data) {
      try {
        const qr = new window.QRious({
          value: data,
          size: size,
          background: 'white',
          foreground: 'black',
          level: 'M'
        });
        return qr.toDataURL();
      } catch (e) {
        console.warn("QR code error:", e);
      }
    }
    return "";
  }, [data, size]);

  if (!src) {
    return <div style={{ width: size, height: size, backgroundColor: 'transparent' }} />;
  }

  return (
    <img
      src={src}
      alt="QR"
      style={{ mixBlendMode: 'multiply', width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}
