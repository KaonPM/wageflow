"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const navigation = [
  { href: "/master", label: "Overview", icon: "grid" },
  { href: "/master/wageflow-requests", label: "Setup Requests", icon: "inbox", group: "Onboarding" },
  { href: "/master/businesses", label: "Businesses", icon: "building", group: "Client Admin" },
  { href: "/master/subscriptions", label: "Billing", icon: "card" },
  { href: "/master/users", label: "User Access", icon: "users", group: "Platform" },
];

const sections = [
  { prefix: "/master/wageflow-requests", title: "Setup Requests", description: "Client onboarding" },
  { prefix: "/master/businesses", title: "Businesses", description: "Client administration" },
  { prefix: "/master/subscriptions", title: "Billing", description: "Plans and subscriptions" },
  { prefix: "/master/users", title: "User Access", description: "Roles and account status" },
  { prefix: "/master", title: "Overview", description: "Platform administration" },
];

export function MasterShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentSection = sections.find((section) =>
    section.prefix === "/master" ? pathname === "/master" : pathname.startsWith(section.prefix)
  ) ?? sections[sections.length - 1];

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className={`master-shell ${collapsed ? "master-shell-collapsed" : ""}`}>
      {mobileOpen && <button className="master-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`master-sidebar ${mobileOpen ? "master-sidebar-open" : ""}`}>
        <div className="master-brand">
          <Image src="/wageflow-logo.png" alt="WageFlow" width={148} height={54} priority />
          <button className="master-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}><ChevronIcon /></button>
        </div>
        <div className="master-platform-label">Platform administration</div>
        <nav className="master-nav" aria-label="Master navigation">
          {navigation.map((item, index) => {
            const previousGroup = index === 0 ? undefined : navigation[index - 1].group;
            const active = item.href === "/master" ? pathname === item.href : pathname.startsWith(item.href);
            return <div key={item.href}>
              {item.group && item.group !== previousGroup && <div className="master-nav-group">{item.group}</div>}
              <Link href={item.href} className={`master-nav-link ${active ? "master-nav-active" : ""}`} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}>
                <NavIcon name={item.icon} /><span>{item.label}</span>
              </Link>
            </div>;
          })}
        </nav>
        <div className="master-privacy-note"><strong>Privacy boundary</strong><span>Platform administration does not expose employee payroll or confidential HR records.</span></div>
        <button className="master-logout" onClick={logout}><NavIcon name="logout" /><span>Log out</span></button>
      </aside>
      <div className="master-main">
        <header className="master-topbar">
          <div className="master-topbar-leading">
            <button className="master-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><MenuIcon /></button>
            <div className="master-page-context"><strong>{currentSection.title}</strong><span>{currentSection.description}</span></div>
          </div>
          <div className="master-topbar-actions">
            <span className="master-secure-label"><LockIcon /> Secure workspace</span>
            <Link href="/" className="master-site-link">Public site</Link>
          </div>
        </header>
        <div className="master-content">{children}</div>
      </div>
    </div>
  );
}

function ChevronIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>; }
function MenuIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>; }

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    inbox: <><path d="M4 5h16v14H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></>,
    building: <><path d="M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/></>,
  };
  return <svg className="master-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
