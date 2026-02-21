import { useState } from 'react';
import { AVATARS } from '../constants';
import { useLanguage } from '../hooks/useLanguage';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { usePlayerStats } from '../hooks/usePlayerStats';
import type { AppScreen } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';

interface ProfileScreenProps {
  setScreen: (screen: AppScreen) => void;
}

function formatRelativeTime(dateString: string | null, language: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMemberSince(dateString: string, language: string): string {
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  return new Date(dateString).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function winRateColor(rate: number): string {
  if (rate >= 0.6) return 'text-emerald-400';
  if (rate >= 0.4) return 'text-yellow-400';
  return 'text-slate-400';
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function ProfileScreen({ setScreen }: ProfileScreenProps) {
  const { t, language } = useLanguage();
  const { profile, updateProfile } = usePlayerProfile();
  const { stats, history, totalHistory, loading, error, loadingMore, loadMoreHistory, retry } =
    usePlayerStats();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const startEdit = () => {
    setEditName(profile.displayName);
    setEditAvatar(profile.avatar);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    updateProfile({ displayName: editName.trim() || undefined, avatar: editAvatar || undefined });
    setEditing(false);
  };

  const displayName = profile.displayName || t('profile.anonymous');

  return (
    <div className="min-h-dvh flex flex-col animate-fade-in pb-8">
      {/* Back button */}
      <button
        onClick={() => setScreen('home')}
        className="absolute top-4 left-4 z-10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Back"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Header */}
      <div className="pt-16 px-6 pb-4 text-center">
        {editing ? (
          <div className="space-y-4">
            {/* Avatar picker */}
            <div className="grid grid-cols-5 gap-2 max-w-[280px] mx-auto mb-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setEditAvatar(a)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                    editAvatar === a
                      ? 'bg-violet-600 scale-110 ring-2 ring-violet-400'
                      : 'bg-slate-800/60 hover:bg-slate-700'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <Input
              value={editName}
              onChange={setEditName}
              placeholder={t('profile.namePlaceholder')}
              maxLength={30}
              autoFocus
            />
            <div className="flex gap-3 max-w-sm mx-auto">
              <button
                onClick={cancelEdit}
                className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer font-medium"
              >
                {t('profile.cancel')}
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer font-medium"
              >
                {t('profile.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center text-5xl mb-1">
              {profile.avatar || '👤'}
            </div>
            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
            {stats && (
              <p className="text-slate-500 text-xs">
                {t('profile.memberSince', { date: formatMemberSince(stats.memberSince, language) })}
              </p>
            )}
            <button
              onClick={startEdit}
              className="mt-1 px-4 py-1.5 rounded-full border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('profile.editProfile')}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 space-y-4">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={t('profile.error.unavailable')} retryLabel={t('profile.error.retry')} onRetry={retry} />
        ) : stats ? (
          <>
            {/* Overview stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t('profile.stats.gamesPlayed')} value={String(stats.gamesPlayed)} />
              <StatCard
                label={t('profile.stats.winRate')}
                value={
                  stats.gamesPlayed === 0
                    ? '—'
                    : pct(
                        (stats.asImpostor.won + stats.asPlayer.won) /
                          (stats.asImpostor.played + stats.asPlayer.played || 1)
                      )
                }
                valueClass={
                  stats.gamesPlayed === 0
                    ? 'text-slate-400'
                    : winRateColor(
                        (stats.asImpostor.won + stats.asPlayer.won) /
                          (stats.asImpostor.played + stats.asPlayer.played || 1)
                      )
                }
              />
              <StatCard
                label={t('profile.stats.streak')}
                value={
                  stats.currentStreak
                    ? `${stats.currentStreak.count} ${t(
                        stats.currentStreak.type === 'win'
                          ? 'profile.stats.winStreak'
                          : 'profile.stats.lossStreak'
                      )}`
                    : '—'
                }
                valueClass={
                  stats.currentStreak?.type === 'win'
                    ? 'text-emerald-400'
                    : stats.currentStreak?.type === 'loss'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }
                small
              />
              <StatCard label={t('profile.stats.cluesGiven')} value={String(stats.totalCluesGiven)} />
            </div>

            {/* Role breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {/* As Player */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                  {t('profile.stats.asPlayer')}
                </p>
                <RoleRow label={t('profile.stats.played')} value={String(stats.asPlayer.played)} />
                <RoleRow
                  label={t('profile.stats.won')}
                  value={stats.asPlayer.played === 0 ? '—' : pct(stats.asPlayer.winRate)}
                  valueClass={stats.asPlayer.played === 0 ? '' : winRateColor(stats.asPlayer.winRate)}
                />
                <RoleRow
                  label={t('profile.stats.voteAccuracy')}
                  value={stats.asPlayer.played === 0 ? '—' : pct(stats.asPlayer.voteAccuracy)}
                />
                <RoleRow
                  label={t('profile.stats.timesEliminated')}
                  value={String(stats.asPlayer.timesEliminated)}
                />
              </div>

              {/* As Impostor */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                  {t('profile.stats.asImpostor')}
                </p>
                <RoleRow label={t('profile.stats.played')} value={String(stats.asImpostor.played)} />
                <RoleRow
                  label={t('profile.stats.won')}
                  value={stats.asImpostor.played === 0 ? '—' : pct(stats.asImpostor.winRate)}
                  valueClass={
                    stats.asImpostor.played === 0 ? '' : winRateColor(stats.asImpostor.winRate)
                  }
                />
              </div>
            </div>

            {/* Game History */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
                {t('profile.history.title')}
              </p>
              {history.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">
                  {t('profile.history.empty')}
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((g) => (
                    <HistoryRow key={g.gameId} game={g} language={language} t={t} />
                  ))}
                  {history.length < totalHistory && (
                    <Button variant="secondary" onClick={loadMoreHistory} disabled={loadingMore}>
                      {loadingMore ? '...' : t('profile.history.loadMore')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  valueClass = 'text-white',
  small = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
      <span className={`font-bold ${small ? 'text-base' : 'text-2xl'} ${valueClass}`}>{value}</span>
      <span className="text-slate-400 text-xs text-center">{label}</span>
    </div>
  );
}

function RoleRow({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function HistoryRow({
  game,
  language,
  t,
}: {
  game: import('../hooks/usePlayerStats').GameHistoryEntry;
  language: string;
  t: (key: import('../translations').TranslationKey, vars?: Record<string, string | number>) => string;
}) {
  const roleLabel = game.wasImpostor
    ? t('profile.history.impostor')
    : t('profile.history.player');
  const outcomeLabel = game.won ? t('profile.history.won') : t('profile.history.lost');
  const outcomeColor = game.won ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm rounded-xl px-3 py-2.5">
      {/* Role badge */}
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          game.wasImpostor
            ? 'bg-rose-500/20 text-rose-300'
            : 'bg-violet-500/20 text-violet-300'
        }`}
      >
        {roleLabel}
      </span>

      {/* Secret word */}
      <span className="text-slate-300 text-sm flex-1 truncate">
        {game.secretWord ?? '?'}
      </span>

      {/* Players count */}
      <span className="text-slate-500 text-xs shrink-0">{game.playerCount}p</span>

      {/* Outcome */}
      <span className={`text-xs font-semibold shrink-0 ${outcomeColor}`}>{outcomeLabel}</span>

      {/* Time */}
      <span className="text-slate-500 text-xs shrink-0 hidden sm:block">
        {formatRelativeTime(game.endedAt, language)}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-2xl h-20" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-2xl h-32" />
        <div className="bg-slate-800/50 rounded-2xl h-32" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl h-11" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-slate-400 text-sm text-center">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {retryLabel}
      </button>
    </div>
  );
}
