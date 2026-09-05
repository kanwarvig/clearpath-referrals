"use client";

import Link from "next/link";
import { Activity, ArrowRight, Inbox, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { LoadingState, Metric, PageIntro } from "./ui";

export function HandoffsScreen() {
  const { state, ready } = useWorkspace();
  if (!ready) return <LoadingState />;
  const attempts = state.referrals.flatMap((referral) => referral.deliveryAttempts.map((attempt) => ({ ...attempt, referralId: referral.id })));
  const accepted = attempts.filter((attempt) => attempt.outcome === "DELIVERED").length;
  const interrupted = attempts.filter((attempt) => attempt.outcome === "INTERRUPTED").length;
  const suppressed = attempts.filter((attempt) => attempt.outcome === "DUPLICATE_SUPPRESSED").length;
  const recoveryCandidate = state.referrals.find((referral) => referral.status === "DELIVERY_INTERRUPTED");
  return <main id="main-content" className="page">
    <PageIntro eyebrow="Handoff reliability" title="Know what the receiver actually accepted" description="Every simulated delivery attempt uses one stable idempotency key, so an unknown outcome can be reconciled without creating a second referral." action={recoveryCandidate ? <Link href={`/referrals/${recoveryCandidate.id}`} className="primary-link tactile">Recover {recoveryCandidate.id}<ArrowRight aria-hidden="true" /></Link> : undefined} />
    <section className="metric-grid three">
      <Metric icon={<Send />} value={`${accepted}`} label="Accepted deliveries" detail="Unique receiver commits" />
      <Metric icon={<RefreshCw />} value={`${interrupted}`} label="Interrupted responses" detail="Outcome initially unknown" />
      <Metric icon={<ShieldCheck />} value={`${suppressed}`} label="Duplicates suppressed" detail="No second payload sent" />
    </section>
    <section className="recovery-explainer">
      <div className="explainer-copy"><p className="eyebrow light">Recovery pattern</p><h2>Commit, lose response, reconcile</h2><p>An interrupted response does not prove failure. The sender first queries the simulated receiver with the same key; an existing receipt restores local state safely.</p></div>
      <ol><li><span>1</span><div><strong>Reserve delivery key</strong><small>delivery:referral:receiver</small></div></li><li><span>2</span><div><strong>Receiver commits once</strong><small>Receipt is durable in browser state</small></div></li><li><span>3</span><div><strong>Reconcile before resend</strong><small>Existing receipt prevents duplication</small></div></li></ol>
    </section>
    <section className="ledger-surface">
      <div className="panel-title"><div><p className="eyebrow">Receiver activity</p><h2>Delivery ledger</h2></div><span className="count-badge">{attempts.length} attempts</span></div>
      {attempts.length ? <div className="ledger-table" role="table" aria-label="Receiver delivery activity"><div className="ledger-head" role="row"><span>Referral</span><span>Outcome</span><span>Idempotency key</span><span>Receiver evidence</span></div>{[...attempts].reverse().map((attempt) => <div className="ledger-row" role="row" key={attempt.id}><Link href={`/referrals/${attempt.referralId}`}>{attempt.referralId}</Link><span className={`outcome ${attempt.outcome.toLowerCase()}`}>{attempt.outcome.replaceAll("_", " ")}</span><code>{attempt.idempotencyKey}</code><span>{attempt.receiverMessage}</span></div>)}</div> : <div className="empty-state compact"><Inbox aria-hidden="true" /><h2>No delivery attempts yet</h2><p>Run the guided flow to create an interrupted attempt, reconcile it, and prove duplicate suppression.</p><Link href="/intake" className="secondary-link tactile">Choose a referral <ArrowRight aria-hidden="true" /></Link></div>}
    </section>
    <aside className="boundary-strip"><Activity aria-hidden="true" /><p><strong>Simulation boundary:</strong> receiver records and receipts are browser-persisted fixtures—not a live clinic, queue, or EHR endpoint.</p></aside>
  </main>;
}
