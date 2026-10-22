'use client';

import { useEffect, useState } from 'react';

/** 카카오톡 같은 앱 안에서 열렸을 때: 구글 로그인이 막히니 크롬/사파리로 안내 */
export default function InAppNotice() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!window.__inApp) return;
    const id = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(id);
  }, []);

  if (!show) return null;

  const copy = async () => {
    const url = location.href.replace(/[?&]openExternalBrowser=1/, '');
    try {
      await navigator.clipboard.writeText(url);
      setCopied('복사했어요. 크롬이나 사파리 주소창에 붙여 넣어 주세요.');
    } catch {
      setCopied(url);
    }
  };

  return (
    <section className="panel inapp">
      <h2>크롬에서 열어 주세요</h2>
      <p>카카오톡 안에서는 구글 로그인이 막혀 있어요.</p>
      <div className="col">
        <button onClick={() => window.__openChrome?.()}>크롬으로 열기</button>
        <button className="sub" onClick={copy}>
          {copied ?? '링크 복사하기'}
        </button>
      </div>
      <p className="note">
        안 넘어가면 직접 열 수 있어요.
        <br />
        안드로이드: 오른쪽 아래 더보기 → 다른 브라우저로 열기
        <br />
        아이폰: 오른쪽 아래 공유 버튼 → Safari 또는 Chrome
      </p>
      <button className="plain" onClick={() => setShow(false)}>
        그냥 여기서 볼게요
      </button>
    </section>
  );
}
