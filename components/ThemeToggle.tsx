'use client';

import { useEffect, useState } from 'react';

/** 오른쪽 위 다크 모드 토글 */
export default function ThemeToggle({ onChange }: { onChange: () => void }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const read = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setDark(t === 'dark' || (t !== 'light' && mq.matches));
      onChange();
    };
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, [onChange]);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('gamja-theme', next);
    } catch {}
    setDark(!dark);
    onChange();
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  return (
    <button className="toggle" role="switch" aria-checked={dark} aria-label="다크 모드" onClick={toggle}>
      <span className="lbl">다크</span>
      <span className="track">
        <span className="knob" />
      </span>
    </button>
  );
}
