-- =========================================================
-- 감자 달려 · Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전하게 만들었어요.
-- =========================================================

-- 1) 프로필: 로그인한 사람마다 한 줄
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  bills       integer not null default 0 check (bills >= 0),   -- 누적 지폐
  best        integer not null default 0 check (best >= 0),    -- 최고 기록(m)
  plays       integer not null default 0,                      -- 플레이 횟수
  owned       text[]  not null default '{}',                   -- 산 옷
  wear        jsonb   not null default '{}'::jsonb,            -- 입은 옷 {"head":"hat","face":"glasses"}
  last_run_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_nickname_len check (nickname is null or char_length(nickname) between 1 and 12)
);
create unique index if not exists profiles_nickname_key on public.profiles (lower(nickname));

-- 2) 옷 목록: 가격과 열리는 거리는 여기서만 정해요(게임에서 바꿀 수 없게)
create table if not exists public.items (
  id    text primary key,
  name  text not null,
  slot  text not null check (slot in ('head','face','neck','back')),
  need  integer not null,   -- 열리는 최고 기록(m)
  price integer not null,   -- 지폐
  sort  integer not null default 0
);
insert into public.items (id, name, slot, need, price, sort) values
  ('bandaid',    '반창고',          'face',  30,  10,  1),
  ('ribbon',     '리본',            'head',  50,  20,  2),
  ('balloon',    '풍선',            'back',  80,  30,  3),
  ('hat',        '밀짚모자',        'head', 100,  40,  4),
  ('partyhat',   '꼬깔모자',        'head', 120,  50,  5),
  ('glasses',    '동그란 안경',     'face', 150,  60,  6),
  ('sunglasses', '선글라스',        'face', 180,  70,  7),
  ('scarf',      '줄무늬 목도리',   'neck', 200,  90,  8),
  ('cape',       '망토',            'back', 220,  80,  9),
  ('bowtie',     '나비넥타이',      'neck', 250, 100, 10),
  ('crown',      '왕관',            'head', 300, 150, 11),
  ('beanie',     '털모자',          'head', 350, 130, 12),
  ('catears',    '고양이 귀 머리띠', 'head', 400, 180, 13),
  ('batwings',   '박쥐 날개',       'back', 450, 220, 14),
  ('angelwings', '천사 날개',       'back', 500, 250, 15)
on conflict (id) do update
  set name = excluded.name, slot = excluded.slot, need = excluded.need,
      price = excluded.price, sort = excluded.sort;

-- 3) 판 기록: 한 판이 끝날 때마다 한 줄 (플레이 통계용)
create table if not exists public.runs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  distance   integer not null,
  bills      integer not null,
  created_at timestamptz not null default now()
);
create index if not exists runs_user_idx on public.runs (user_id, created_at desc);

-- 4) 보안(RLS): 읽기만 허용하고, 쓰기는 아래 함수로만
alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.runs     enable row level security;

drop policy if exists "내 프로필 보기" on public.profiles;
create policy "내 프로필 보기" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "옷 목록 보기" on public.items;
create policy "옷 목록 보기" on public.items
  for select to anon, authenticated using (true);

drop policy if exists "내 기록 보기" on public.runs;
create policy "내 기록 보기" on public.runs
  for select to authenticated using (auth.uid() = user_id);

-- 5) 처음 로그인하면 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) 내 프로필 가져오기(없으면 만들기)
create or replace function public.ensure_profile()
returns public.profiles language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  select * into r from public.profiles where id = auth.uid();
  return r;
end; $$;

-- 7) 닉네임 정하기
create or replace function public.set_nickname(p_nick text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v text := btrim(coalesce(p_nick, ''));
  r public.profiles;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if char_length(v) < 1 or char_length(v) > 12 then raise exception 'bad_nickname'; end if;
  begin
    update public.profiles set nickname = v, updated_at = now()
     where id = auth.uid() returning * into r;
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
  return r;
end; $$;

-- 8) 한 판 끝: 지폐 더하기, 최고 기록, 플레이 횟수, 새로 열린 옷
create or replace function public.finish_run(p_distance integer, p_bills integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  old_best integer;
  last_at  timestamptz;
  r        public.profiles;
  unlocked text[];
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_distance is null or p_distance < 0 or p_distance > 50000 then raise exception 'bad_run'; end if;
  if p_bills is null or p_bills < 0 or p_bills > p_distance + 30 then raise exception 'bad_run'; end if;

  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  select best, last_run_at into old_best, last_at from public.profiles where id = auth.uid() for update;
  if last_at is not null and last_at > now() - interval '1 second' then raise exception 'too_fast'; end if;

  update public.profiles
     set bills = bills + p_bills,
         best = greatest(best, p_distance),
         plays = plays + 1,
         last_run_at = now(),
         updated_at = now()
   where id = auth.uid()
   returning * into r;

  insert into public.runs (user_id, distance, bills) values (auth.uid(), p_distance, p_bills);

  select coalesce(array_agg(id order by sort), '{}') into unlocked
    from public.items where need > old_best and need <= r.best;

  return jsonb_build_object('profile', to_jsonb(r), 'unlocked', to_jsonb(unlocked));
end; $$;

-- 9) 옷 사기 (사면 바로 입혀요)
create or replace function public.buy_item(p_item text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  it public.items;
  r  public.profiles;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into it from public.items where id = p_item;
  if not found then raise exception 'no_item'; end if;
  select * into r from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'no_profile'; end if;
  if r.best < it.need then raise exception 'locked'; end if;
  if p_item = any(r.owned) then raise exception 'owned'; end if;
  if r.bills < it.price then raise exception 'not_enough'; end if;

  update public.profiles
     set bills = bills - it.price,
         owned = array_append(owned, p_item),
         wear = wear || jsonb_build_object(it.slot, p_item),
         updated_at = now()
   where id = auth.uid()
   returning * into r;
  return r;
end; $$;

-- 10) 옷 입기/벗기 (p_item 이 null 이면 그 칸을 벗어요)
create or replace function public.set_wear(p_slot text, p_item text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  it public.items;
  r  public.profiles;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_slot not in ('head','face','neck','back') then raise exception 'bad_slot'; end if;

  if p_item is null then
    update public.profiles set wear = wear - p_slot, updated_at = now()
     where id = auth.uid() returning * into r;
  else
    select * into it from public.items where id = p_item;
    if not found or it.slot <> p_slot then raise exception 'bad_slot'; end if;
    select * into r from public.profiles where id = auth.uid();
    if not (p_item = any(r.owned)) then raise exception 'not_owned'; end if;
    update public.profiles set wear = wear || jsonb_build_object(p_slot, p_item), updated_at = now()
     where id = auth.uid() returning * into r;
  end if;
  return r;
end; $$;

-- 11) 랭킹: 닉네임과 최고 기록만 공개
create or replace function public.leaderboard()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(t order by t.rank, t.nickname)
        from (
          select rank() over (order by best desc) as rank, nickname, best
            from public.profiles
           where nickname is not null and best > 0
           order by best desc, updated_at asc
           limit 20
        ) t
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object(
        'nickname', p.nickname,
        'best', p.best,
        'rank', case when p.best > 0 and p.nickname is not null
                     then (select count(*) + 1 from public.profiles q
                            where q.nickname is not null and q.best > p.best)
                     else null end)
        from public.profiles p where p.id = auth.uid()
    )
  );
$$;

-- 12) 함수 실행 권한: 로그인한 사람만
revoke all on function public.handle_new_user()                   from public, anon, authenticated;
revoke all on function public.ensure_profile()                    from public, anon;
revoke all on function public.set_nickname(text)                  from public, anon;
revoke all on function public.finish_run(integer, integer)        from public, anon;
revoke all on function public.buy_item(text)                      from public, anon;
revoke all on function public.set_wear(text, text)                from public, anon;
revoke all on function public.leaderboard()                       from public, anon;
grant execute on function public.ensure_profile()                 to authenticated;
grant execute on function public.set_nickname(text)               to authenticated;
grant execute on function public.finish_run(integer, integer)     to authenticated;
grant execute on function public.buy_item(text)                   to authenticated;
grant execute on function public.set_wear(text, text)             to authenticated;
grant execute on function public.leaderboard()                    to authenticated;
