import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import type { ChatMessage, GameState } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  playerId: string;
  isSpectator: boolean;
  isEliminated: boolean;
  onSend: (text: string) => void;
  players: GameState['players'];
}

export default function ChatBox({ messages, playerId, isSpectator, isEliminated, onSend, players }: ChatBoxProps) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const canChat = !isSpectator && !isEliminated;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const getPlayerColor = (msgPlayerId: string) => {
    const player = players.find((p) => p.id === msgPlayerId);
    return player?.color ?? '#94a3b8';
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Message list */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl p-3 h-52 overflow-y-auto flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs text-center my-auto">{t('discussion.hint')}</p>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.playerId === playerId;
          const color = getPlayerColor(msg.playerId);
          return (
            <div key={i} className={`flex items-start gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              <span className="text-base leading-none mt-0.5 flex-shrink-0">{msg.avatar}</span>
              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color }}
                >
                  {isMine ? '' : msg.playerName}
                </span>
                <span
                  className={`text-sm px-3 py-1.5 rounded-2xl break-words ${
                    isMine
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-slate-700/80 text-slate-100 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {canChat ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 200))}
            onKeyDown={handleKeyDown}
            placeholder={t('discussion.placeholder')}
            className="flex-1 bg-slate-800/80 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-default"
          >
            {t('discussion.send')}
          </button>
        </div>
      ) : (
        <p className="text-center text-slate-500 text-xs">{t('discussion.spectating')}</p>
      )}
    </div>
  );
}
