'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Leaderboard } from '@/lib/types';

/** 랭킹: 닉네임과 최고 기록 TOP 20 */
export default function Ranking({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<Leaderboard>('/api/leaderboard').then(setData).catch(() => setError(true));
  }, []);

  const me = data?.me;
  return (
    <section className="panel scroll">
      <h2>랭킹</h2>
      {error && <p>랭킹을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>}
      {!data && !error && <p>불러오는 중이에요.</p>}
      {data && (
        <>
          <p className="myrank">
            {me?.rank ? `내 순위 ${me.rank}위, 최고 ${me.best}m` : '아직 내 기록이 없어요. 한 판 달려 보세요!'}
          </p>
          {data.top.length === 0 ? (
            <p>아직 아무도 기록이 없어요. 첫 번째 주인공이 되어 보세요.</p>
          ) : (
            <ol className="rank">
              {data.top.map((r) => (
                <li key={`${r.rank}-${r.nickname}`} className={me?.nickname === r.nickname ? 'me' : undefined}>
                  <span className="n">{r.rank}위</span>
                  <span className="name">{r.nickname}</span>
                  <span>{r.best}m</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      <button className="sub" onClick={onClose}>
        닫기
      </button>
    </section>
  );
}
