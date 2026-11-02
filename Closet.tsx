'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Item, Profile } from '@/lib/types';
import Look, { splitWear } from './Look';

const MESSAGES: Record<string, string> = {
  not_enough: '지폐가 모자라요.',
  locked: '아직 잠겨 있어요. 더 멀리 달려 보세요.',
  owned: '이미 갖고 있는 옷이에요.',
  not_owned: '아직 사지 않은 옷이에요.',
};

/** 감자 옷장: 최고 기록으로 열리고, 지폐로 사고, 입고 벗어요 */
export default function Closet({
  profile,
  items,
  onProfile,
  onClose,
}: {
  profile: Profile;
  items: Item[];
  onProfile: (p: Profile) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = async (id: string, path: string, body: unknown) => {
    setBusy(id);
    setError('');
    try {
      onProfile(await api<Profile>(path, body));
    } catch (err) {
      setError(MESSAGES[(err as ApiError).message] ?? '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel scroll">
      <h2>감자 옷장</h2>
      <Look hero {...splitWear(profile.wear)} label="지금 입은 옷" />
      <p className="closet-info">
        내 지폐 {profile.bills}장, 최고 기록 {profile.best}m
      </p>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="items">
        {items.map((it) => {
          const own = profile.owned.includes(it.id);
          const open = profile.best >= it.need;
          const on = profile.wear[it.slot] === it.id;
          const enough = profile.bills >= it.price;
          return (
            <div key={it.id} className={`item${open ? '' : ' locked'}${on ? ' worn' : ''}`}>
              <Look front={it.slot === 'back' ? [] : [it.id]} back={it.slot === 'back' ? [it.id] : []} />
              <div className="nm">{it.name}</div>
              {!open && <div className="st">최고 {it.need}m 달리면 열려요</div>}
              {open && !own && (
                <>
                  <div className="st">지폐 {it.price}장</div>
                  <button
                    disabled={!enough || busy !== null}
                    onClick={() => run(it.id, '/api/closet/buy', { itemId: it.id })}
                  >
                    {busy === it.id ? '사는 중' : enough ? '사기' : '지폐가 모자라요'}
                  </button>
                </>
              )}
              {open && own && (
                <>
                  <div className="st">{on ? '입는 중' : '갖고 있어요'}</div>
                  <button
                    disabled={busy !== null}
                    onClick={() => run(it.id, '/api/closet/wear', { slot: it.slot, itemId: on ? null : it.id })}
                  >
                    {on ? '벗기' : '입기'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <button className="sub" onClick={onClose}>
        닫기
      </button>
    </section>
  );
}
