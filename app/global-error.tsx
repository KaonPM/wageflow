"use client";

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <html><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", background: "#f4f8fb" }}><section style={{ maxWidth: 520, padding: 32, borderRadius: 20, background: "white", textAlign: "center", boxShadow: "0 18px 50px rgba(15,23,42,.12)" }}><h1>WageFlow needs to reload</h1><p>We hit an unexpected problem. Your saved information is unchanged.</p><button type="button" onClick={() => unstable_retry()} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#0f766e", color: "white", fontWeight: 800 }}>Reload application</button></section></main></body></html>;
}
