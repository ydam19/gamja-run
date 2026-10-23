'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGame, type Game, type RunEnd } from '@/lib/game/engine';
import { api, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { Item, Profile } from '@/lib/types';
import Look, { FLAP, outfitSrc, splitWear } from './Look';
import BillIcon from './BillIcon';
import ThemeToggle from './ThemeToggle';
import Closet from './Closet';
import Ranking from './Ranking';
import NicknameForm from './NicknameForm';
import InAppNotice from './InAppNotice';

type Me = { user: { email: string | null; name: string | null }; profile: Profile; items: Item[] };
type RunSaved = { profile: Profile; unlocked: string[] };
type Screen = 'title' | 'play' | 'over';
type Panel = null | 'closet' | 'ranking' | 'nickname';

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const billsRef = useRef<HTMLSpanElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [auth, setAuth] = useState<'loading' | 'out' | 'in'>('loading');
  const [user, setUser] = useState<Me['user'] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [screen, setScreen] = useState<Screen>('title');
  const [showOver, setShowOver] = useState(false);
  const [overTitle, setOverTitle] = useState('');
  const [overLines, setOverLines] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState('');

  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  /* ---------- 판이 끝났을 때: 서버에 기록 저장 ---------- */
  const onEnd = useRef<(r: RunEnd) => void>(() => {});
  onEnd.current = async ({ distance, bills, message }) => {
    setOverTitle(message);
    setOverLines([`${distance}m 달렸어요.`, '기록을 저장하는 중이에요.']);
    setScreen('over');
    window.setTimeout(() => setShowOver(true), 750);
    try {
      const saved = await api<RunSaved>('/api/runs', { distance, bills });
      setProfile(saved.profile);
      const names = saved.unlocked.map((id) => itemsRef.current.find((i) => i.id === id)?.name ?? id);
      setOverLines([
        `${distance}m 달렸어요.`,
        `누적 지폐 : ${saved.profile.bills}장`,
        ...(names.length ? [`새 옷이 열렸어요: ${names.join(', ')}`] : []),
      ]);
    } catch (err) {
      const signedOut = (err as ApiError).status === 401;
      setOverLines([
        `${distance}m 달렸어요.`,
        signedOut ? '로그인이 풀려서 기록을 저장하지 못했어요.' : '기록을 저장하지 못했어요. 인터넷 연결을 확인해 주세요.',
      ]);
      if (signedOut) setAuth('out');
    }
  };

  /* ---------- 게임 엔진 ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, {
      images: { calm: '/images/gamja-calm.png', cry: '/images/gamja-cry.png' },
      hud: { dist: distRef.current, bills: billsRef.current },
      onEnd: (r) => onEnd.current(r),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const refreshTheme = useCallback(() => gameRef.current?.refreshTheme(), []);

  /* ---------- 입은 옷을 게임에도 ---------- */
  const worn = useMemo(() => splitWear(profile?.wear), [profile?.wear]);
  useEffect(() => {
    const layer = (id: string, where: 'front' | 'back') => ({
      calm: outfitSrc(id, 'calm'),
      cry: outfitSrc(id, 'cry'),
      layer: where,
      flap: FLAP[id] ?? 0,
    });
    gameRef.current?.setOutfit([
      ...worn.back.map((id) => layer(id, 'back')),
      ...worn.front.map((id) => layer(id, 'front')),
    ]);
  }, [worn]);

  /* ---------- 내 정보 불러오기 ---------- */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('login') === 'failed') {
      setNotice('로그인하지 못했어요. 다시 시도해 주세요.');
    }
    api<Me>('/api/me')
      .then((d) => {
        setUser(d.user);
        setProfile(d.profile);
        setItems(d.items);
        setAuth('in');
        if (!d.profile.nickname) setPanel('nickname');
      })
      .catch((err: ApiError) => {
        setAuth('out');
        if (err.status !== 401) setNotice('정보를 불러오지 못했어요. 새로고침해 주세요.');
      });
  }, []);

  /* ---------- 시작 ---------- */
  const canPlay = auth === 'in' && !!profile?.nickname;
  const start = useCallback(() => {
    if (!canPlay) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setPanel(null);
    setShowOver(false);
    setScreen('play');
    gameRef.current?.start();
  }, [canPlay]);

  // 시작/끝 화면에서 스페이스바로 바로 시작
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
      if (screen === 'play' || panel || (screen === 'over' && !showOver)) return;
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, button')) return;
      e.preventDefault();
      start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, panel, showOver, start]);

  /* ---------- 구글 로그인 ---------- */
  const login = async () => {
    setNotice('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setNotice('로그인을 시작하지 못했어요. 다시 시도해 주세요.');
  };

  const menu = (
    <div className="btnrow">
      <button className="sub" onClick={() => setPanel('closet')}>
        옷장
      </button>
      <button className="sub" onClick={() => setPanel('ranking')}>
        랭킹
      </button>
    </div>
  );

  return (
    <>
      <canvas ref={canvasRef} />
      <ThemeToggle onChange={refreshTheme} />

      <div className="hud">
        <div>
          <span ref={distRef} className="dist">
            0m
          </span>
          <span className="money">
            <BillIcon size={38} />
            <span ref={billsRef}>0</span>장
          </span>
        </div>
        <span className="best">{profile?.best ? `최고 ${profile.best}m` : ''}</span>
      </div>

      {auth === 'loading' && (
        <section className="panel">
          <Look hero label="감자" />
          <p>감자를 깨우는 중이에요.</p>
        </section>
      )}

      {auth === 'out' && (
        <section className="panel">
          <Look hero label="감자" />
          <h1>감자 달려</h1>
          <p>구글 계정으로 로그인하면 모은 지폐와 옷, 최고 기록이 저장돼요.</p>
          {notice && <div className="error" role="alert">{notice}</div>}
          <button onClick={login}>구글로 로그인</button>
          <div className="note">닉네임과 최고 기록만 랭킹에 공개돼요.</div>
        </section>
      )}

      {auth === 'in' && profile && screen === 'title' && (
        <section className="panel">
          <Look hero {...worn} label="감자" />
          <h1>감자 달려</h1>
          <p>
            화면을 누르면 점프해요.
            <br />
            공중에서 꾹 누르고 있으면 고리에 줄을 걸고, 손을 떼면 날아가요.
            <br />
            가는 길에 떨어진 지폐도 모아 보세요.
          </p>
          <div className="total">
            <BillIcon />
            <span>
              지금까지 모은 지폐 <b>{profile.bills}</b>장
            </span>
          </div>
          <div className="btnrow">
            <button onClick={start} disabled={!canPlay}>
              시작하기
            </button>
          </div>
          {menu}
          <div className="account">
            <span>{profile.nickname ?? '닉네임 없음'}</span>
            <button className="plain" onClick={() => setPanel('nickname')}>
              닉네임 바꾸기
            </button>
            <form action="/auth/signout" method="post">
              <button className="plain" type="submit">
                로그아웃
              </button>
            </form>
          </div>
        </section>
      )}

      {auth === 'in' && profile && screen === 'over' && showOver && (
        <section className="panel">
          <Look hero pose="cry" {...worn} label="우는 감자" />
          <h2>{overTitle}</h2>
          <p className="lines">{overLines.join('\n')}</p>
          <div className="btnrow">
            <button onClick={start}>다시 하기</button>
          </div>
          {menu}
        </section>
      )}

      {panel === 'closet' && profile && (
        <Closet profile={profile} items={items} onProfile={setProfile} onClose={() => setPanel(null)} />
      )}
      {panel === 'ranking' && <Ranking onClose={() => setPanel(null)} />}
      {panel === 'nickname' && profile && (
        <NicknameForm
          initial={profile.nickname ?? (user?.name ?? '').slice(0, 12)}
          required={!profile.nickname}
          onDone={(p) => {
            setProfile(p);
            setPanel(null);
          }}
          onCancel={() => setPanel(null)}
        />
      )}

      <InAppNotice />
    </>
  );
}
