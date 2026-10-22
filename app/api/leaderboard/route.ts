import { NextResponse } from 'next/server';
import { fail, fromDbError, getAuthed } from '@/lib/server-helpers';

export const dynamic = 'force-dynamic';

/** 랭킹 TOP 20 + 내 순위 */
export async function GET() {
  const { supabase, user } = await getAuthed();
  if (!user) return fail(401, 'not_signed_in');

  const { data, error } = await supabase.rpc('leaderboard');
  if (error) return fromDbError(error.message);
  return NextResponse.json(data);
}
