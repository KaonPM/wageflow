"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error("WageFlow page error", error.digest || error.message); }, [error]);
  return (
    <main className="app-state-page" role="alert">
      <section className="app-state-card">
        <img src="/wageflow-logo.png" alt="WageFlow" className="app-state-logo" />
        <h1>We couldn&apos;t load this page</h1>
        <p>Your information has not been changed. Please try again, or return to the dashboard.</p>
        <div className="app-state-actions">
          <button type="button" onClick={() => unstable_retry()}>Try again</button>
          <a href="/login">Return to login</a>
        </div>
      </section>
    </main>
  );
}
