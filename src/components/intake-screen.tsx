"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, Inbox, Search, ShieldCheck } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { LoadingState, PageIntro, StatusPill, patientName } from "./ui";

export function IntakeScreen() {
  const { state, ready, selectReferral } = useWorkspace();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  if (!ready) return <LoadingState />;
  const visible = state.referrals.filter((referral) => !deferredQuery || [referral.id, patientName(referral), referral.packetName].some((value) => value.toLowerCase().includes(deferredQuery)));

  return <main id="main-content" className="page">
    <PageIntro eyebrow="Intake queue" title="Referral work, triaged clearly" description="Synthetic packets are ordered for administrative review. Open a referral to see its next permitted action and supporting evidence." />
    <section className="queue-surface">
      <div className="table-toolbar">
        <div><h2>Today&apos;s intake</h2><span>{state.referrals.filter((referral) => referral.status !== "CLOSED").length} open referrals</span></div>
        <label className="search-box"><Search aria-hidden="true" /><span className="sr-only">Search referrals</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, person, or packet" /></label>
      </div>
      {visible.length ? <div className="queue-table" role="table" aria-label="Synthetic referral queue">
        <div className="queue-table-head" role="row"><span>Referral</span><span>Packet</span><span>Status</span><span>Owner</span><span aria-hidden="true" /></div>
        {visible.map((referral) => {
          const missing = referral.fields.filter((field) => field.required && !field.value).length;
          return <Link href={`/referrals/${referral.id}`} onClick={() => selectReferral(referral.id)} className="queue-row tactile" key={referral.id}>
            <span className="patient-cell"><span className="mono">{referral.id}</span><strong>{patientName(referral)}</strong><small>{missing ? <><CircleAlert aria-hidden="true" />{missing} missing field</> : <><ShieldCheck aria-hidden="true" />Required fields present</>}</small></span>
            <span className="packet-cell">{referral.packetName}<small>{referral.pages.length} source page{referral.pages.length === 1 ? "" : "s"}</small></span>
            <span><StatusPill status={referral.status} /></span>
            <span className="owner-cell">{referral.assignee ?? "Unassigned"}</span>
            <span className="row-arrow"><ArrowRight aria-hidden="true" /></span>
          </Link>;
        })}
      </div> : <div className="empty-state"><Inbox aria-hidden="true" /><h2>No referrals match</h2><p>Try a different ID, patient name, or packet name.</p><button onClick={() => setQuery("")}>Clear search</button></div>}
    </section>
    <aside className="local-note"><ShieldCheck aria-hidden="true" /><div><strong>Validated local state</strong><p>This queue is stored only in this browser. Persisted data is schema-checked before it is restored.</p></div></aside>
  </main>;
}
