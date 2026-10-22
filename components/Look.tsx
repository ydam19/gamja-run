import type { Profile, Slot } from '@/lib/types';

/** 그리는 순서: 목도리 → 안경 → 머리 */
export const SLOTS: Slot[] = ['neck', 'face', 'head'];

export function wornIds(wear: Profile['wear'] | undefined): string[] {
  if (!wear) return [];
  return SLOTS.map((s) => wear[s]).filter((id): id is string => !!id);
}

export const outfitSrc = (id: string, pose: 'calm' | 'cry') => `/images/outfit-${id}-${pose}.png`;

/** 옷 입은 감자: 기본 감자 그림 위에 옷 그림을 겹쳐요 */
export default function Look({
  pose = 'calm',
  ids = [],
  hero = false,
  label,
}: {
  pose?: 'calm' | 'cry';
  ids?: string[];
  hero?: boolean;
  label?: string;
}) {
  return (
    <div className={hero ? 'look hero' : 'look'} role={label ? 'img' : undefined} aria-label={label}>
      <img src={`/images/gamja-${pose}.png`} alt="" />
      {ids.map((id) => (
        <img key={id} src={outfitSrc(id, pose)} alt="" />
      ))}
    </div>
  );
}
