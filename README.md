# 감자 달려 (Next.js + Supabase)

울면서 날아다니는 하찮은 감자의 달리기 게임이에요.
화면과 서버는 Next.js(App Router)로, 데이터와 구글 로그인은 Supabase로 만들었어요.

## 무엇이 저장되나요

| 저장되는 것 | 어디에 |
|---|---|
| 닉네임, 누적 지폐, 최고 기록, 플레이 횟수 | `profiles` 테이블 |
| 산 옷, 입은 옷 | `profiles.owned`, `profiles.wear` |
| 판마다 달린 거리와 주운 지폐 | `runs` 테이블 (플레이 통계용) |
| 옷 이름, 가격, 열리는 거리 | `items` 테이블 |

지폐 계산, 옷 가격과 잠금 확인은 모두 DB 함수에서 해요. 그래서 화면을 조작해도 공짜로 옷을 살 수 없어요.

## 처음 한 번만 하는 설정

### 1. Supabase에 테이블 만들기
Supabase 대시보드 → **SQL Editor** → `supabase/schema.sql` 내용을 통째로 붙여 넣고 **Run**.

### 2. 구글 로그인 켜기
1. [Google Cloud Console](https://console.cloud.google.com/) → API 및 서비스 → 사용자 인증 정보 → **OAuth 클라이언트 ID 만들기** (유형: 웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://hrpnrmvwtipfoyyfovzj.supabase.co/auth/v1/callback`
2. 만들어진 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사해요.
3. Supabase 대시보드 → **Authentication → Sign In / Providers → Google** 을 켜고 두 값을 붙여 넣어요.

### 3. 돌아올 주소 등록
Supabase 대시보드 → **Authentication → URL Configuration**
- Site URL: 배포한 주소 (예: `https://gamja-run.vercel.app`)
- Redirect URLs에 추가:
  - `http://localhost:3000/auth/callback`
  - `https://배포한주소/auth/callback`

### 4. 환경변수
`.env.example` 을 복사해서 `.env.local` 을 만들고 값을 채워요.

```
NEXT_PUBLIC_SUPABASE_URL=https://hrpnrmvwtipfoyyfovzj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase의 anon(또는 publishable) 키
```

`service_role`(또는 secret) 키는 필요 없어요. 절대 넣지 마세요.

## 실행

```bash
npm install
npm run dev
```
브라우저에서 http://localhost:3000 을 열어요.

## 배포

Next.js 서버 기능(API, 로그인 콜백)을 쓰기 때문에, 파일을 끌어다 놓는 Netlify Drop으로는 배포할 수 없어요.
가장 쉬운 방법은 **Vercel**이에요.

1. 이 폴더를 GitHub 저장소에 올려요.
2. vercel.com → Add New Project → 저장소 선택
3. Environment Variables 에 위의 두 값을 넣고 Deploy
4. 나온 주소를 3번(URL Configuration)에 등록해요.

## 폴더 구조

```
app/
  page.tsx                 게임 화면
  layout.tsx               글꼴, 다크 모드, 카톡 → 크롬 넘기기
  auth/callback/route.ts   구글 로그인 후 돌아오는 곳
  auth/signout/route.ts    로그아웃
  api/me                   내 정보 + 옷 목록
  api/nickname             닉네임 정하기
  api/runs                 한 판 끝 → 기록 저장
  api/closet/buy           옷 사기
  api/closet/wear          옷 입기/벗기
  api/leaderboard          랭킹
components/                화면 조각 (옷장, 랭킹, 닉네임, 토글 …)
lib/game/engine.js         손그림 캔버스 게임 엔진
lib/supabase/              Supabase 연결 (브라우저 / 서버 / 미들웨어)
public/images/             감자와 옷 그림
supabase/schema.sql        테이블, 보안 규칙, DB 함수
```

## 옷 추가하는 법
1. `items` 테이블에 한 줄 추가 (id, 이름, 칸 head/face/neck, 열리는 거리, 가격, 순서)
2. `public/images/outfit-{id}-calm.png`, `outfit-{id}-cry.png` 그림 두 장 추가
   (기본 감자 그림과 같은 크기 292×266, 배경 투명)

## 알아 두기
- 카카오톡 같은 앱 안 브라우저에서는 구글이 로그인을 막아요. 그래서 열리면 자동으로 크롬(아이폰은 기본 브라우저)으로 넘겨요.
- 랭킹에는 닉네임과 최고 기록만 공개돼요. 이메일은 공개되지 않아요.
