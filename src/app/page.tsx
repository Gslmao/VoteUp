import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: "420px", width: "100%", background: "white", padding: "32px", border: "1px solid var(--border)", borderRadius: "4px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div className="brand-mark" style={{ margin: "0 auto 16px" }} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 style={{ fontSize: "20px", color: "var(--navy-dark)", margin: "0 0 8px" }}>
          Voter Portal
        </h1>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
          Voter-facing services will be updated here. To access the administration portal, proceed below.
        </p>
        <Link href="/admin" className="btn btn-primary" style={{ width: "100%" }}>
          Go to Admin Portal →
        </Link>
      </div>
    </main>
  );
}
