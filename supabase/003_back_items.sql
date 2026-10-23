-- =========================================================
-- 감자 달려 · 등 칸 옷 4종 추가 (풍선, 망토, 박쥐 날개, 천사 날개)
-- 게임 코드를 먼저 배포한 다음 실행하세요. 여러 번 실행해도 안전해요.
-- =========================================================

-- 1) 옷 칸에 '등(back)' 추가
alter table public.items drop constraint if exists items_slot_check;
alter table public.items add constraint items_slot_check
  check (slot in ('head','face','neck','back'));

-- 2) 옷 입기/벗기 함수가 등 칸도 받도록
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

-- 3) 옷 목록 (열리는 거리 순서로 다시 정렬)
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
