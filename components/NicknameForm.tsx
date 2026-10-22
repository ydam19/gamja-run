'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Profile } from '@/lib/types';

const MESSAGES: Record<string, string> = {
  nickname_taken: '이미 누가 쓰고 있는 닉네임이에요. 다른 이름을 적어 주세요.',
  bad_nickname: '닉네임은 1~12자로 적어 주세요.',
};

/** 닉네임 정하기 (처음 로그인하면 꼭 거쳐요) */
export default function NicknameForm({
  initial,
  required,
  onDone,
  onCancel,
}: {
  initial: string;
  required: boolean;
  onDone: (p: Profile) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nick = value.trim();
    if ([...nick].length < 1 || [...nick].length > 12) return setError(MESSAGES.bad_nickname);
    setBusy(true);
    setError('');
    try {
      onDone(await api<Profile>('/api/nickname', { nickname: nick }));
    } catch (err) {
      setError(MESSAGES[(err as ApiError).message] ?? '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel solid" style={{ zIndex: 20 }}>
      <h2>닉네임을 정해 주세요</h2>
      <p>랭킹에 이 이름이 보여요. 실명 말고 별명을 추천해요.</p>
      <form onSubmit={submit} className="btnrow" style={{ flexDirection: 'column' }}>
        <input
          className="nick-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={12}
          placeholder="감자왕"
          aria-label="닉네임"
          autoFocus
        />
        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? '저장하는 중' : '이 이름으로 하기'}
        </button>
      </form>
      {!required && (
        <button className="plain" onClick={onCancel}>
          닫기
        </button>
      )}
    </section>
  );
}
