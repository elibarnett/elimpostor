import { useState } from 'react';
import { AVATARS } from '../constants';
import { useLanguage } from '../hooks/useLanguage';
import type { PlayerProfile } from '../hooks/usePlayerProfile';
import Button from './Button';
import Input from './Input';

interface ProfileModalProps {
  profile: PlayerProfile;
  onSave: (updates: Partial<PlayerProfile>) => void;
  onClose: () => void;
}

export default function ProfileModal({ profile, onSave, onClose }: ProfileModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(profile.displayName);
  const [avatar, setAvatar] = useState(profile.avatar);

  const handleSave = () => {
    onSave({ displayName: name.trim(), avatar: avatar || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-5">
        <h3 className="text-xl font-bold text-white text-center">{t('profile.title')}</h3>

        <Input
          value={name}
          onChange={setName}
          placeholder={t('profile.namePlaceholder')}
          maxLength={20}
          autoFocus
        />

        <div>
          <p className="text-slate-400 text-xs text-center mb-3 uppercase tracking-wide">
            {t('profile.avatar')}
          </p>
          <div className="grid grid-cols-5 gap-2 max-w-[280px] mx-auto">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                  avatar === a
                    ? 'bg-violet-600 scale-110 ring-2 ring-violet-400'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={handleSave}>{t('profile.save')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('profile.cancel')}</Button>
        </div>
      </div>
    </div>
  );
}
