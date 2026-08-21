"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { NotificationControl } from "@/components/NotificationControl";

const links = [
  { href: "/master", label: "Overview" },
  { href: "/master/wageflow-requests", label: "Requests" },
  { href: "/master/businesses", label: "Businesses" },
  { href: "/master/subscriptions", label: "Billing" },
  { href: "/master/users", label: "Users" },
  { href: "/master/audit", label: "Audit" },
];

export function MasterPortalBar() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="master-portal-bar">
      <Link href="/master" className="master-portal-brand" aria-label="WageFlow master overview">
        <span>WageFlow</span>
        <small>Master portal</small>
      </Link>
      <nav className="master-portal-nav" aria-label="Master portal navigation">
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <div className="master-portal-actions">
        <NotificationControl />
        <button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out..." : "Log out"}</button>
      </div>
    </header>
  );
}
