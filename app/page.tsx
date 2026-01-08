"use client";

export default function HomePage() {
  function handleConnectZoho() {
    // open in a new tab
    window.open("/api/zoho/auth", "_blank");
  }

  return (
    <>
      <header className="header">
        <h1>Zoho OAuth Secure App</h1>
        <nav>
          <a href="/">Home</a>
          <a href="/productlist">Proceed to Share Product to Clients</a>
        </nav>
      </header>

      <main className="container">
        <section className="hero">
          <h2>Welcome to Product Sharing Portal</h2>
          <p>
            This application securely integrates with Zoho using OAuth 2.0 in
            Next.js 13. Once connected, you can share products to the client and get it's response back.
          </p>
          <button onClick={handleConnectZoho}>Connect to Zoho</button>
        </section>
      </main>
    </>
  );
}
