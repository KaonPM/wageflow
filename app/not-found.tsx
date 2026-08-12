import Link from "next/link";

export default function NotFound() {
  return <main className="app-state-page"><section className="app-state-card"><img src="/wageflow-logo.png" alt="WageFlow" className="app-state-logo" /><h1>Page not found</h1><p>The page may have moved or the address may be incorrect.</p><div className="app-state-actions"><Link href="/">Go to home page</Link><Link href="/login">Log in</Link></div></section></main>;
}
