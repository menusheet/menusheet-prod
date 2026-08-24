'use client';

import { useEffect, useState } from 'react';
import { publicMenuUrl } from '@/lib/siteUrl';
import { Modal } from '@/components/admin/ui';
import { IconCheck, IconCopy } from '@/components/icons';

interface Props {
  restaurantId: string;
  restaurantName: string;
  open: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ restaurantId, restaurantName, open, onClose }: Props) {
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = publicMenuUrl(restaurantId);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPngUrl(null);
    setSvgText(null);
    setError(null);
    (async () => {
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(url, {
          width: 1024,
          margin: 2,
          color: { dark: '#14532D', light: '#FFFFFF' },
        });
        const svg = await QRCode.toString(url, {
          type: 'svg',
          width: 512,
          margin: 2,
          color: { dark: '#14532D', light: '#FFFFFF' },
        });
        if (!cancelled) {
          setPngUrl(dataUrl);
          setSvgText(svg);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to generate QR code.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const downloadSvg = () => {
    if (!svgText) return;
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    triggerDownload(href, `menusheet-qr-${restaurantId}.svg`);
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  };

  return (
    <Modal open={open} onClose={onClose} title={`QR code — ${restaurantName}`}>
      <div className="flex flex-col items-center">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : pngUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pngUrl}
            alt={`QR code for ${restaurantName}`}
            className="h-56 w-56 rounded-2xl border border-gray-100"
          />
        ) : (
          <div className="grid h-56 w-56 animate-pulse place-items-center rounded-2xl bg-canvas text-xs text-gray-400">
            Generating…
          </div>
        )}
        <p className="mt-3 break-all rounded-lg bg-canvas px-3 py-1.5 text-center font-mono text-[11px] text-gray-500">
          {url}
        </p>

        <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
          <a
            href={pngUrl || undefined}
            download={`menusheet-qr-${restaurantId}.png`}
            aria-disabled={!pngUrl}
            className={`inline-flex items-center justify-center gap-2 rounded-full bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-800 ${
              !pngUrl ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            Download PNG
          </a>
          <button
            onClick={downloadSvg}
            disabled={!svgText}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
          >
            Download SVG
          </button>
        </div>
        <button
          onClick={copyUrl}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          {copied ? (
            <>
              <IconCheck className="h-4 w-4 text-forest-600" /> Copied!
            </>
          ) : (
            <>
              <IconCopy className="h-4 w-4" /> Copy public URL
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
          Print tip: keep the QR at least 3×3&nbsp;cm with a quiet zone, on a matte surface to avoid glare.
        </p>
      </div>
    </Modal>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
