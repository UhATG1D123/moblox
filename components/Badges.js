export default function Badges({ badges = [], size = 20 }) {
  const has = (b) => Array.isArray(badges) && badges.includes(b);
  if (!has('official_admin') && !has('verified')) return null;
  return (
    <span className="badges">
      {has('official_admin') && (
        <svg className="badge-ic" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Official Admin">
          <title>Official Admin: part of the Moblox team</title>
          <path d="M12 2.5l8 3v6.2c0 4.6-3.2 8.3-8 9.8-4.8-1.5-8-5.2-8-9.8V5.5z" fill="#1b1d20" />
          <path d="M8.2 12.2l2.6 2.6 5-5.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {has('verified') && (
        <svg className="badge-ic" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified">
          <title>Verified: confirmed by the Moblox team</title>
          <circle cx="12" cy="12" r="10" fill="#335fff" />
          <path d="M7.5 12.4l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
