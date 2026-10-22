import { NextResponse } from 'next/server';
import { fail, fromDbError, getAuthed } from '@/lib/server-helpers';

/** 닉네임 정하기 / 바꾸기 */
export async function POST(request: Request) {
  const { supabase, user } = await getAuthed();
  if (!user) return fail(401, 'not_signed_in');

  const body = (await request.json().catch(() => ({}))) as { nickname?: unknown };
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  if ([...nickname].length < 1 || [...nickname].length > 12) return fail(400, 'bad_nickname');

  const { data, error } = await supabase.rpc('set_nickname', { p_nick: nickname });
  if (error) return fromDbError(error.message);
  return NextResponse.json(data);
}
