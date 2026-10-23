-- =========================================================
-- 감자 달려 · 새 옷 6종 추가 (2026-10-22)
-- Supabase SQL Editor 에 붙여 넣고 Run 하세요. 여러 번 실행해도 안전해요.
-- 옷장 순서(sort)는 열리는 거리 순으로 다시 맞춰요.
-- =========================================================
insert into public.items (id, name, slot, need, price, sort) values
  ('bandaid',    '반창고',          'face',  30,  10,  1),
  ('ribbon',     '리본',            'head',  50,  20,  2),
  ('hat',        '밀짚모자',        'head', 100,  40,  3),
  ('partyhat',   '꼬깔모자',        'head', 120,  50,  4),
  ('glasses',    '동그란 안경',     'face', 150,  60,  5),
  ('sunglasses', '선글라스',        'face', 180,  70,  6),
  ('scarf',      '줄무늬 목도리',   'neck', 200,  90,  7),
  ('bowtie',     '나비넥타이',      'neck', 250, 100,  8),
  ('crown',      '왕관',            'head', 300, 150,  9),
  ('beanie',     '털모자',          'head', 350, 130, 10),
  ('catears',    '고양이 귀 머리띠', 'head', 400, 180, 11)
on conflict (id) do update
  set name = excluded.name, slot = excluded.slot, need = excluded.need,
      price = excluded.price, sort = excluded.sort;
