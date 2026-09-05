"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, FlaskConical, House, Network, RotateCcw, Route, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useWorkspace } from "./workspace-provider";

const navigation = [
  { href: "/", label: "Overview", icon: House },
  { href: "/intake", label: "Intake", icon: ClipboardList },
  { href: "/handoffs", label: "Handoffs", icon: Route },
  { href: "/evidence", label: "Evidence", icon: FlaskConical },
  { href: "/system", label: "System", icon: Network },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { reset, storageNotice } = useWorkspace();

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="scope-ribbon" role="note">
      <span><Sparkles aria-hidden="true" /> Synthetic records only</span>
      <span>Administrative workflow · no clinical decisions</span>
      <span>Browser-persisted demo</span>
    </div>
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Clearpath home">
        <span className="brand-symbol" aria-hidden="true"><Activity /></span>
        <span><strong>Clearpath</strong><small>Referral operations</small></span>
      </Link>
      <nav aria-label="Primary navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/intake" && pathname.startsWith("/referrals/"));
          return <Link href={href} key={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </Link>;
        })}
      </nav>
      <button className="reset-button tactile" onClick={reset}><RotateCcw aria-hidden="true" /> Reset demo</button>
    </header>
    {storageNotice ? <div className="storage-notice" role="status">{storageNotice}</div> : null}
    {children}
    <footer><span>Clearpath Referrals · portfolio demonstration</span><span>Not a hospital integration or compliance certification</span></footer>
  </div>;
}
