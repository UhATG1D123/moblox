export default function MoBux({ n }) {
  return (
    <span className="mobux">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M12 8l4 2.3v4.4L12 17l-4-2.3v-4.4z" fill="currentColor" />
      </svg>
      {Number(n).toLocaleString('en-US')}
    </span>
  );
}
