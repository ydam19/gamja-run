import { NextResponse } from 'next/server';
import { fail, fromDbError, getAuthed } from '@/lib/server-helpers';

/** 옷 사기 (가격·잠금 확인은 DB 함수가 해요) */
export async function POST(request: Request) {
  const { supabase, user } = await getAuthed();
  if (!user) return fail(401, 'not_signed_in');

  const body = (await request.json().catch(() => ({}))) as { itemId?: unknown };
  if (typeof body.itemId !== 'string' || !body.itemId) return fail(400, 'no_item');

  const { data, error } = await supabase.rpc('buy_item', { p_item: body.itemId });
  if (error) return fromDbError(error.message);
  return NextResponse.json(data);
}
