import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 이미지와 정적 파일에는 돌리지 않아요.
  matcher: ['/((?!_next/static|_next/image|images/|icon.png|apple-icon.png|favicon.ico).*)'],
};
