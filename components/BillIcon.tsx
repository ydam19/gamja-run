/** 손그림 지폐 아이콘 */
export default function BillIcon({ size = 34 }: { size?: number }) {
  return (
    <svg className="bill" viewBox="0 0 46 30" width={size} height={Math.round(size * 0.65)} aria-hidden="true">
      <path d="M4 5 L41 2 L43 25 L6 28 Z" fill="#fff" stroke="#000" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M13 9 L13 21" stroke="#000" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="22" cy="15" rx="4" ry="6" fill="none" stroke="#000" strokeWidth="2.2" />
      <ellipse cx="32" cy="14.5" rx="4" ry="6" fill="none" stroke="#000" strokeWidth="2.2" />
    </svg>
  );
}
