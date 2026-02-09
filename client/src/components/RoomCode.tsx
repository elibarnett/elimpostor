import { useState, useCallback } from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface RoomCodeProps {
  code: string;
}

export default function RoomCode({ code }: RoomCodeProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const share = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'El Impostor',
          text: `Join my game! Code: ${code}`,
          url: window.location.origin,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyCode();
    }
  }, [code, copyCode]);

  return (
    <div className="text-center">
      <div
        onClick={copyCode}
        className="inline-block border-2 border-dashed border-slate-600 rounded-2xl px-8 py-4 cursor-pointer hover:border-violet-500 transition-colors active:scale-[0.97]"
      >
        <div className="font-mono text-4xl font-bold tracking-[0.3em] text-white">
          {code}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          {copied ? t('lobby.copied') : t('lobby.tapToCopy')}
        </div>
      </div>
      {typeof navigator.share === 'function' && (
        <button
          onClick={share}
          className="mt-3 text-violet-400 text-sm font-medium flex items-center gap-1 mx-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {t('lobby.share')}
        </button>
      )}
    </div>
  );
}
