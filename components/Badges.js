export default function Badges({ badges = [], size = 20 }) {
  const has = (b) => Array.isArray(badges) && badges.includes(b);
  if (!has('official_admin') && !has('verified')) return null;
  return (
    <span className="badges">
      {has('official_admin') && (
        <svg className="badge-ic" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Official Admin">
          <title>Official Admin: part of the Moblox team</title>
          <path d="M12 1.5 22.5 12 12 22.5 1.5 12Z M12 7.5 7.5 12 12 16.5 16.5 12Z" fill="#fff" fillRule="evenodd" />
        </svg>
      )}
      {has('verified') && (
        <svg className="badge-ic" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified">
          <title>Verified: confirmed by the Moblox team</title>
          <path d="M4 4H20V20H4Z M8 8H16V16H8Z" fill="#fff" fillRule="evenodd" />
        </svg>
      )}
    </span>
  );
}
