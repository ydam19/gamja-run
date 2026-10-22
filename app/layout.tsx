import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '감자 달려',
  description: '울면서 날아다니는 하찮은 감자의 달리기 게임',
  appleWebApp: { capable: true, title: '감자 달려', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

/* 저장된 화면 모드를 그리기 전에 먼저 적용(깜빡임 방지) */
const themeInit = `(function(){try{var t=localStorage.getItem('gamja-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

/* 카카오톡 등 앱 안 브라우저에서 열리면 크롬(아이폰은 기본 브라우저)으로 넘기기.
   구글은 앱 안 브라우저에서 로그인을 막기 때문에 꼭 필요해요. */
const inAppRedirect = `(function(){
  var ua=navigator.userAgent||'', url=location.href;
  var isAndroid=/Android/i.test(ua), isIOS=/iPhone|iPad|iPod/i.test(ua);
  var inApp=/KAKAOTALK|NAVER\\(inapp|Instagram|FBAN|FBAV|Line\\/|DaumApps|everytimeApp/i.test(ua) || (isAndroid && /; wv\\)/.test(ua));
  window.__inApp=inApp;
  var framed=false; try{ framed = window.self!==window.top; }catch(e){ framed=true; }
  if(framed){ window.__inApp=false; return; }
  if(!inApp || !/^https?:/.test(url)) return;
  function chromeAndroid(){ location.href='intent://'+url.replace(/^https?:\\/\\//,'')+'#Intent;scheme='+(url.indexOf('https')===0?'https':'http')+';package=com.android.chrome;end'; }
  window.__openChrome=function(){
    if(isAndroid) chromeAndroid();
    else if(isIOS) location.href=url.replace(/^https:\\/\\//,'googlechromes://').replace(/^http:\\/\\//,'googlechrome://');
  };
  if(/Line\\//i.test(ua) && !/openExternalBrowser=1/.test(url)){ location.replace(url+(url.indexOf('?')<0?'?':'&')+'openExternalBrowser=1'); return; }
  if(isAndroid) chromeAndroid();
  else if(/KAKAOTALK/i.test(ua)) location.replace('kakaotalk://web/openExternal?url='+encodeURIComponent(url));
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: inAppRedirect }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
