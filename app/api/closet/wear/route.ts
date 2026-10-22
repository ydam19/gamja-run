import { NextResponse } from 'next/server';
import { fail, fromDbError, getAuthed } from '@/lib/server-helpers';

const SLOTS = ['head', 'face', 'neck'];

/** 옷 입기 / 벗기 (itemId 가 null 이면 벗기) */
export async function POST(request: Request) {
  const { supabase, user } = await getAuthed();
  if (!user) return fail(401, 'not_signed_in');

  const body = (await request.json().catch(() => ({}))) as { slot?: unknown; itemId?: unknown };
  if (typeof body.slot !== 'string' || !SLOTS.includes(body.slot)) return fail(400, 'bad_slot');
  const itemId = typeof body.itemId === 'string' && body.itemId ? body.itemId : null;

  const { data, error } = await supabase.rpc('set_wear', { p_slot: body.slot, p_item: itemId });
  if (error) return fromDbError(error.message);
  return NextResponse.json(data);
}
