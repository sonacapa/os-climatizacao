'use client';
import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

// Lê QR Code pela câmera. Usa o leitor nativo do navegador quando existe e o jsQR nos demais.
export default function QrScanner({ onResult }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    const canvas = document.createElement('canvas');

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        const detector = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
        const jsQR = detector ? null : (await import('jsqr')).default;

        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2 && video.videoWidth) {
              let text = '';
              if (detector) {
                const codes = await detector.detect(video);
                text = codes[0]?.rawValue || '';
              } else {
                const scale = Math.min(1, 640 / video.videoWidth);
                canvas.width = Math.round(video.videoWidth * scale);
                canvas.height = Math.round(video.videoHeight * scale);
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                text = jsQR(img.data, img.width, img.height)?.data || '';
              }
              if (text) {
                stopped = true;
                stream.getTracks().forEach((t) => t.stop());
                if (navigator.vibrate) navigator.vibrate(60);
                cb.current(text);
                return;
              }
            }
          } catch {}
          timer = setTimeout(tick, 180);
        };
        tick();
      } catch (e) {
        setError(e?.name === 'NotAllowedError' ? 'Permita o uso da câmera no navegador para ler o QR Code.' : 'Não foi possível abrir a câmera neste aparelho.');
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="aspect-square rounded-2xl bg-slate-900 text-slate-300 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm">
        <CameraOff className="w-8 h-8" /> {error}
      </div>
    );
  }
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
      <div className="absolute inset-[14%] border-2 border-white/90 rounded-2xl pointer-events-none shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
    </div>
  );
}
