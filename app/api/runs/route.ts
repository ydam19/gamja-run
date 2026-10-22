import { NextResponse } from 'next/server';
import { fail, fromDbError, getAuthed } from '@/lib/server-helpers';

/** 한 판이 끝났을 때 기록 저장 → 최신 프로필과 새로 열린 옷을 돌려줘요 */
export async function POST(request: Request) {
  const { supabase, user } = await getAuthed();
  if (!user) return fail(401, 'not_signed_in');

  const body = (await request.json().catch(() => ({}))) as { distance?: unknown; bills?: unknown };
  const distance = Number(body.distance);
  const bills = Number(body.bills);
  if (!Number.isInteger(distance) || !Number.isInteger(bills) || distance < 0 || bills < 0) {
    return fail(400, 'bad_run');
  }

  const { data, error } = await supabase.rpc('finish_run', { p_distance: distance, p_bills: bills });
  if (error) return fromDbError(error.message);
  return NextResponse.json(data);
}
