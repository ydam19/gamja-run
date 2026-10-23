import type { Profile, Slot } from '@/lib/types';

/** 감자 앞에 그리는 칸(그리는 순서: 목도리 → 얼굴 → 머리) */
export const FRONT_SLOTS: Slot[] = ['neck', 'face', 'head'];
/** 감자 뒤에 그리는 칸 */
export const BACK_SLOTS: Slot[] = ['back'];

/** 공중에서 파닥이는 정도(0이면 안 움직여요) */
export const FLAP: Record<string, number> = { angelwings: 0.22, batwings: 0.2, cape: 0.07 };

export interface Worn {
  front: string[];
  back: string[];
}

export function splitWear(wear: Profile['wear'] | undefined): Worn {
  if (!wear) return { front: [], back: [] };
  const pick = (slots: Slot[]) => slots.map((s) => wear[s]).filter((id): id is string => !!id);
  return { front: pick(FRONT_SLOTS), back: pick(BACK_SLOTS) };
}

export const outfitSrc = (id: string, pose: 'calm' | 'cry') => `/images/outfit-${id}-${pose}.png`;

/** 옷 입은 감자: 등 옷 → 기본 감자 → 앞 옷 순서로 겹쳐요 */
export default function Look({
  pose = 'calm',
  front = [],
  back = [],
  hero = false,
  label,
}: {
  pose?: 'calm' | 'cry';
  front?: string[];
  back?: string[];
  hero?: boolean;
  label?: string;
}) {
  return (
    <div className={hero ? 'look hero' : 'look'} role={label ? 'img' : undefined} aria-label={label}>
      {back.map((id) => (
        <img key={`b-${id}`} src={outfitSrc(id, pose)} alt="" />
      ))}
      <img src={`/images/gamja-${pose}.png`} alt="" />
      {front.map((id) => (
        <img key={`f-${id}`} src={outfitSrc(id, pose)} alt="" />
      ))}
    </div>
  );
}
