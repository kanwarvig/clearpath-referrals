"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileSearch, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { LoadingState, StatusPill, patientName } from "./ui";

const stages = [
  { icon: FileSearch, title: "Review source", copy: "Inspect extracted values beside their exact packet evidence." },
  { icon: ClipboardCheck, title: "Resolve gates", copy: "Correct missing data and confirm identity before assignment." },
  { icon: Send, title: "Send safely", copy: "Simulate a failed response, then reconcile with one stable key." },
  { icon: CheckCircle2, title: "Close handoff", copy: "Record acknowledgement without implying clinical completion." },
];

export function OverviewScreen() {
  const { state, ready } = useWorkspace();
  if (!ready) return <LoadingState />;
  const next = state.referrals.find((referral) => referral.status !== "CLOSED") ?? state.referrals[0];
  const open = state.referrals.filter((referral) => referral.status !== "CLOSED").length;
  const needsAttention = state.referrals.filter((referral) => ["NEEDS_INFORMATION", "DELIVERY_INTERRUPTED"].includes(referral.status)).length;

  return <main id="main-content" className="page overview-page">
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow light">Referral operations, made traceable</p>
        <h1>Move a referral from messy intake to a confirmed handoff.</h1>
        <p>Clearpath is a synthetic workflow demonstration for administrative referral teams. It keeps source evidence, human review, FHIR R4 structure, and receiver recovery in one auditable path.</p>
        <div className="hero-actions">
          <Link href={`/referrals/${next.id}`} className="primary-link tactile">Review next referral <ArrowRight aria-hidden="true" /></Link>
          <Link href="/intake" className="quiet-link">View intake queue</Link>
        </div>
        <div className="boundary-callout"><ShieldCheck aria-hidden="true" /><span><strong>Safe demo boundary</strong> Synthetic records only. No EHR connection, diagnosis, urgency, or treatment decisions.</span></div>
      </div>
      <aside className="next-card" aria-label="Next referral">
        <div className="next-card-top"><span>Up next</span><StatusPill status={next.status} /></div>
        <p className="mono">{next.id}</p>
        <h2>{patientName(next)}</h2>
        <p>{next.packetName}</p>
        <div className="next-stats"><span><strong>{open}</strong> open</span><span><strong>{needsAttention}</strong> need attention</span></div>
        <Link href={`/referrals/${next.id}`} className="card-link">Open focused review <ArrowRight aria-hidden="true" /></Link>
      </aside>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><p className="eyebrow">Guided workflow</p><h2>One safe decision at a time</h2></div><p>The interface reveals detail when it becomes useful; the underlying state machine still blocks invalid transitions.</p></div>
      <div className="journey-grid">
        {stages.map(({ icon: Icon, title, copy }, index) => <article key={title} className="journey-step">
          <div><span className="step-number">0{index + 1}</span><Icon aria-hidden="true" /></div><h3>{title}</h3><p>{copy}</p>
        </article>)}
      </div>
    </section>

    <section className="recovery-banner">
      <div className="recovery-icon"><RefreshCw aria-hidden="true" /></div>
      <div><p className="eyebrow">Signature scenario</p><h2>See why “response lost” is not the same as “delivery failed.”</h2><p>The simulated receiver commits first. Clearpath reloads, reconciles the reserved idempotency key, and proves a duplicate was not sent.</p></div>
      <Link href="/handoffs" className="secondary-link tactile">Explore recovery <ArrowRight aria-hidden="true" /></Link>
    </section>
  </main>;
}
