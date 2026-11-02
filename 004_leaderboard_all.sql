-- 랭킹: 기록이 있는 모든 사용자 보이기 (TOP 20 제한 없애기)
create or replace function public.leaderboard()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('rank', t.rank, 'nickname', t.nickname, 'best', t.best) order by t.rank, t.updated_at)
        from (
          select rank() over (order by best desc) as rank, nickname, best, updated_at
            from public.profiles
           where nickname is not null and best > 0
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
