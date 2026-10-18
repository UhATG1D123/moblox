export default function Home() {
  return (
    <>
      <h1>Welcome to Moblox</h1>
      <p>Independent project. Not affiliated with Roblox. Coins are demo-only and have no real-world value.</p>
      <h2>Recommended For You</h2>
      <div className="grid">
        {['Sample Game 1', 'Sample Game 2', 'Sample Game 3', 'Sample Game 4'].map((g) => (
          <div className="card" key={g}><div className="thumb">image</div><b>{g}</b></div>
        ))}
      </div>
    </>
  );
}
