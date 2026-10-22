import { NextResponse } from 'next/server';
import { fail, fromDbError, getAuthed } from '@/lib/server-helpers';

export const dynamic = 'force-dynamic';

/** 내 정보 + 프로필 + 옷 목록 */
export async function GET() {
  const { supabase, user } = await getAuthed();
  if (!user) return fail(401, 'not_signed_in');

  const { data: profile, error } = await supabase.rpc('ensure_profile');
  if (error) return fromDbError(error.message);

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, name, slot, need, price, sort')
    .order('sort');
  if (itemsError) return fromDbError(itemsError.message);

  const meta = user.user_metadata ?? {};
  return NextResponse.json({
    user: { email: user.email ?? null, name: (meta.full_name ?? meta.name ?? null) as string | null },
    profile,
    items: items ?? [],
  });
}
