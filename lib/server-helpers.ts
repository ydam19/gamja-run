import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export function fail(status: number, code: string) {
  return NextResponse.json({ error: code }, { status });
}

const KNOWN = [
  'not_signed_in',
  'bad_nickname',
  'nickname_taken',
  'bad_run',
  'too_fast',
  'no_item',
  'no_profile',
  'locked',
  'owned',
  'not_enough',
  'bad_slot',
  'not_owned',
] as const;

/** DB 함수에서 올라온 오류를 화면이 알아듣는 코드로 바꿔요. */
export function fromDbError(message: string | undefined) {
  const code = KNOWN.find((k) => message?.includes(k));
  if (!code) {
    console.error('[supabase]', message);
    return fail(500, 'server_error');
  }
  if (code === 'not_signed_in') return fail(401, code);
  if (code === 'nickname_taken') return fail(409, code);
  return fail(400, code);
}
