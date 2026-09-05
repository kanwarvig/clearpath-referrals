"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, ClipboardCheck,
  FileCode2, FileText, Fingerprint, History, Link2, RefreshCw, Send, ShieldCheck, UserRoundCheck,
} from "lucide-react";
import type { ExtractedField, FieldKey, Referral } from "@/lib/contracts";
import { acknowledgeReferral, assignReferral, correctField, deliverReferral, resolveIdentity, reviewExtraction, validateReferral } from "@/lib/engine";
import { useWorkspace, type DomainAction } from "./workspace-provider";
import { LoadingState, StatusPill, patientName } from "./ui";

type ReviewLayer = "extraction" | "source" | "fhir" | "handoff" | "audit";
const layers: Array<{ id: ReviewLayer; label: string; icon: typeof FileText }> = [
  { id: "extraction", label: "Review fields", icon: ClipboardCheck },
  { id: "source", label: "View source", icon: FileText },
  { id: "fhir", label: "Inspect FHIR", icon: FileCode2 },
  { id: "handoff", label: "Track handoff", icon: Send },
  { id: "audit", label: "Read audit", icon: History },
];

const steps = ["Review extraction", "Resolve information", "Assign owner", "Send referral", "Record acknowledgement"];

function currentStep(referral: Referral) {
  if (referral.status === "NEW") return 0;
  if (referral.status === "NEEDS_INFORMATION") return 1;
  if (referral.status === "READY_FOR_REVIEW") return 2;
  if (["READY_TO_SEND", "DELIVERY_INTERRUPTED"].includes(referral.status)) return 3;
  if (referral.status === "AWAITING_ACKNOWLEDGEMENT") return 4;
  return 5;
}

function StepProgress({ referral }: { referral: Referral }) {
  const active = currentStep(referral);
  return <ol className="step-progress" aria-label="Referral progress">
    {steps.map((step, index) => <li key={step} className={index < active ? "complete" : index === active ? "active" : ""} aria-current={index === active ? "step" : undefined}>
      <span>{index < active ? <Check aria-hidden="true" /> : index + 1}</span><small>{step}</small>
    </li>)}
  </ol>;
}

function NextAction({ referral, run, message, setLayer }: { referral: Referral; run: (action: DomainAction) => void; message: string; setLayer: (layer: ReviewLayer) => void }) {
  const validation = validateReferral(referral);
  let title = "Review the extracted fields";
  let copy = "Compare each value with its source evidence, then record the human review.";
  let control = <button className="action-button tactile" onClick={() => run(reviewExtraction)}>Review extraction <ArrowRight aria-hidden="true" /></button>;

  if (referral.status === "NEEDS_INFORMATION" && referral.identityStatus === "AMBIGUOUS") {
    title = "Confirm the synthetic identity";
    copy = "A low-confidence match cannot advance without explicit staff confirmation.";
    control = <button className="action-button tactile" onClick={() => run(resolveIdentity)}>Confirm synthetic identity <Fingerprint aria-hidden="true" /></button>;
  } else if (referral.status === "NEEDS_INFORMATION") {
    title = "Add the missing information";
    copy = "The callback number is required. Supply the simulated follow-up value in Review fields.";
    control = <button className="action-button tactile" onClick={() => setLayer("extraction")}>Go to missing field <ChevronRight aria-hidden="true" /></button>;
  } else if (referral.status === "READY_FOR_REVIEW") {
    title = "Assign a referral owner";
    copy = "Required fields and FHIR structure now pass. Assign accountability before delivery.";
    control = <button className="action-button tactile" disabled={!validation.isValid} onClick={() => run((state, now) => assignReferral(state, "Alex Morgan", now))}>Assign to me <UserRoundCheck aria-hidden="true" /></button>;
  } else if (referral.status === "READY_TO_SEND") {
    title = "Test the recovery path";
    copy = "Send to the simulated clinic and intentionally lose the response after receiver commit.";
    control = <button className="action-button coral tactile" onClick={() => run((state, now) => deliverReferral(state, "INTERRUPT", now))}>Send with outage simulation <Send aria-hidden="true" /></button>;
  } else if (referral.status === "DELIVERY_INTERRUPTED") {
    title = "Reconcile the unknown outcome";
    copy = "The receiver may already have the payload. Look up the reserved key before retrying.";
    control = <button className="action-button tactile" onClick={() => run((state, now) => deliverReferral(state, "DELIVER", now))}>Retry safely <RefreshCw aria-hidden="true" /></button>;
  } else if (referral.status === "AWAITING_ACKNOWLEDGEMENT") {
    title = "Record receiver acknowledgement";
    copy = "The receiving record exists once. You can prove duplicate prevention, then close the administrative handoff.";
    control = <div className="action-pair"><button className="action-secondary tactile" onClick={() => run((state, now) => deliverReferral(state, "DELIVER", now))}>Prove duplicate prevention</button><button className="action-button tactile" onClick={() => run(acknowledgeReferral)}>Simulate acknowledgement <Check aria-hidden="true" /></button></div>;
  } else if (referral.status === "CLOSED") {
    title = "Administrative handoff closed";
    copy = "The simulated clinic acknowledged one referral. Clinical care completion remains outside this demo.";
    control = <Link className="action-button tactile" href="/handoffs">View handoff ledger <ArrowRight aria-hidden="true" /></Link>;
  }

  return <section className="next-action" aria-labelledby="next-action-title">
    <div className="action-marker"><span aria-hidden="true" /></div>
    <div><p className="eyebrow light">Next safe action</p><h2 id="next-action-title">{title}</h2><p aria-live="polite">{message || copy}</p></div>
    {control}
  </section>;
}

function FieldRow({ field, active, onSelect, onCorrect }: { field: ExtractedField; active: boolean; onSelect: () => void; onCorrect: (key: FieldKey, value: string) => void }) {
  const [draft, setDraft] = useState(field.value);
  const missing = field.required && !field.value;
  return <div className={`field-row ${active ? "active" : ""} ${missing ? "missing" : ""}`}>
    <button className="field-select" onClick={onSelect} aria-label={`Show source for ${field.label}`}>
      <span><small>{field.label}{field.required ? " · required" : ""}</small><strong>{field.value || "Not found in packet"}</strong></span>
      <span className={`confidence ${missing ? "missing" : field.confidence < .8 ? "low" : "high"}`}>{missing ? <><CircleAlert aria-hidden="true" /> Missing</> : `${Math.round(field.confidence * 100)}%`}</span>
    </button>
    {missing ? <form onSubmit={(event) => { event.preventDefault(); if (draft.trim()) onCorrect(field.key, draft); }}>
      <label><span className="sr-only">Enter {field.label}</span><input aria-label={`Enter ${field.label}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Enter simulated callback number" /></label>
      <button className="tactile" type="submit">Add information</button>
    </form> : null}
  </div>;
}

function SourceInspector({ field }: { field: ExtractedField }) {
  return <aside className="source-inspector">
    <div className="inspector-label"><Fingerprint aria-hidden="true" /><span>Source evidence</span></div>
    <h3>{field.label}</h3>
    {field.source ? <><blockquote>“{field.source.excerpt}”</blockquote><p><Link2 aria-hidden="true" /> Page {field.source.page}, line {field.source.line}</p></> : <div className="inspector-empty"><CircleAlert aria-hidden="true" /><p>No packet source found. Staff-supplied information records new provenance.</p></div>}
    <div className="integrity-note"><ShieldCheck aria-hidden="true" /><p>The value, confidence, and location come from the deterministic extractor. Human changes are added to audit history.</p></div>
  </aside>;
}

function ExtractionLayer({ referral, fieldKey, setFieldKey, correct }: { referral: Referral; fieldKey: FieldKey; setFieldKey: (key: FieldKey) => void; correct: (key: FieldKey, value: string) => void }) {
  const selected = referral.fields.find((field) => field.key === fieldKey) ?? referral.fields[0];
  return <div className="review-split"><section className="field-panel"><div className="panel-title"><div><p className="eyebrow">Deterministic extraction</p><h2>Review {referral.fields.length} fields</h2></div><span className="review-badge">Human review required</span></div><div>{referral.fields.map((field) => <FieldRow key={field.key} field={field} active={selected.key === field.key} onSelect={() => setFieldKey(field.key)} onCorrect={correct} />)}</div></section><SourceInspector field={selected} /></div>;
}

function SourceLayer({ referral, fieldKey }: { referral: Referral; fieldKey: FieldKey }) {
  const selected = referral.fields.find((field) => field.key === fieldKey) ?? referral.fields[0];
  return <section className="source-layer"><div className="panel-title"><div><p className="eyebrow">Source packet</p><h2>{referral.packetName}</h2></div><span className="file-badge"><FileText aria-hidden="true" /> TXT · {referral.pages.length} page{referral.pages.length === 1 ? "" : "s"}</span></div><div className="paper-stack">{referral.pages.map((page) => <article className="packet-paper" key={page.page}><header><span>Page {page.page}</span><span>Synthetic</span></header><h3>{page.heading}</h3>{page.lines.map((line, index) => <p key={`${page.page}-${index}`} className={selected.source?.page === page.page && selected.source.line === index + 1 ? "highlight" : ""}>{line || "\u00a0"}{selected.source?.page === page.page && selected.source.line === index + 1 ? <mark>Selected source</mark> : null}</p>)}</article>)}</div></section>;
}

function FhirLayer({ referral }: { referral: Referral }) {
  const validation = validateReferral(referral);
  const issues = validation.missingFields.length + validation.fhirErrors.length + (validation.identityIssue ? 1 : 0);
  return <section className="fhir-layer"><div className={`validation-hero ${validation.isValid ? "valid" : "warning"}`}><span>{validation.isValid ? <ShieldCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span><div><p className="eyebrow">Interoperability check</p><h2>{validation.isValid ? "FHIR R4 structure passes" : `${issues} issue${issues === 1 ? "" : "s"} to resolve`}</h2><p>ServiceRequest + Task · pinned to R4 (4.0.1)</p></div></div>{!validation.isValid ? <div className="issue-list">{validation.identityIssue ? <p><CircleAlert aria-hidden="true" />{validation.identityIssue}</p> : null}{validation.missingFields.map((key) => <p key={key}><CircleAlert aria-hidden="true" />Required field missing: {key}</p>)}{validation.fhirErrors.map((error) => <p key={error}><CircleAlert aria-hidden="true" />{error}</p>)}</div> : null}<div className="resource-grid"><div><span>Resource</span><strong>ServiceRequest/{referral.serviceRequest.id}</strong><small>Status · {referral.serviceRequest.status}</small></div><div><span>Workflow resource</span><strong>Task/{referral.task.id}</strong><small>Status · {referral.task.status}</small></div></div><details className="json-details"><summary>Inspect generated FHIR JSON <ChevronRight aria-hidden="true" /></summary><pre>{JSON.stringify({ serviceRequest: referral.serviceRequest, task: referral.task }, null, 2)}</pre></details></section>;
}

function HandoffLayer({ referral }: { referral: Referral }) {
  return <section className="handoff-layer"><div className="panel-title"><div><p className="eyebrow">Delivery attempts</p><h2>Receiver trail</h2></div><span className="count-badge">{referral.deliveryAttempts.length} attempts</span></div>{referral.deliveryAttempts.length ? <div className="attempt-list">{[...referral.deliveryAttempts].reverse().map((attempt) => <article key={attempt.id}><div><span className={`outcome ${attempt.outcome.toLowerCase()}`}>{attempt.outcome.replaceAll("_", " ")}</span><time>{new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(attempt.at))}</time></div><p>{attempt.receiverMessage}</p><code>{attempt.idempotencyKey}</code></article>)}</div> : <div className="empty-inline"><Send aria-hidden="true" /><h3>No delivery attempts yet</h3><p>Complete review and assignment to unlock the simulated receiver handoff.</p></div>}</section>;
}

function AuditLayer({ referral }: { referral: Referral }) {
  return <section className="audit-layer"><div className="panel-title"><div><p className="eyebrow">Attributable history</p><h2>{referral.audit.length} recorded event{referral.audit.length === 1 ? "" : "s"}</h2></div><History aria-hidden="true" /></div><ol>{[...referral.audit].reverse().map((event) => <li key={event.id}><span className="audit-dot" /><div><header><strong>{event.action.replaceAll("_", " ").toLowerCase()}</strong><time>{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.at))}</time></header><p>{event.detail}</p><small>{event.actor}</small></div></li>)}</ol></section>;
}

export function ReferralScreen({ id }: { id: string }) {
  const { state, ready, actionMessage, runForReferral, selectReferral } = useWorkspace();
  const [layer, setLayer] = useState<ReviewLayer>("extraction");
  const [fieldKey, setFieldKey] = useState<FieldKey>("patientName");
  if (!ready) return <LoadingState />;
  const referral = state.referrals.find((item) => item.id === id);
  if (!referral) return <main id="main-content" className="page"><div className="not-found-panel"><CircleAlert aria-hidden="true" /><p className="eyebrow">Referral not found</p><h1>This synthetic referral does not exist.</h1><p>Return to intake to choose one of the available fixtures.</p><Link href="/intake" className="primary-link tactile">Open intake queue <ArrowRight aria-hidden="true" /></Link></div></main>;

  const run = (action: DomainAction) => { selectReferral(id); runForReferral(id, action); };
  return <main id="main-content" className="page referral-page">
    <Link href="/intake" className="back-link"><ArrowLeft aria-hidden="true" /> Back to intake</Link>
    <header className="referral-title"><div><div className="title-kicker"><span className="mono">{referral.id}</span><StatusPill status={referral.status} /></div><h1>{patientName(referral)}</h1><p>Administrative specialist referral from Lakeshore Family Practice</p></div><div className="owner-summary"><span>Accountable owner</span><strong>{referral.assignee ?? "Unassigned"}</strong></div></header>
    <StepProgress referral={referral} />
    <NextAction referral={referral} run={run} message={actionMessage} setLayer={setLayer} />
    <div className="layer-layout">
      <nav className="layer-nav" aria-label="Referral details">
        {layers.map(({ id: layerId, label, icon: Icon }) => <button key={layerId} className={layer === layerId ? "active" : ""} aria-current={layer === layerId ? "page" : undefined} onClick={() => setLayer(layerId)}><Icon aria-hidden="true" /><span>{label}</span><ChevronRight aria-hidden="true" /></button>)}
      </nav>
      <div className="layer-content">
        {layer === "extraction" ? <ExtractionLayer referral={referral} fieldKey={fieldKey} setFieldKey={setFieldKey} correct={(key, value) => run((workspace, now) => correctField(workspace, key, value, now))} /> : null}
        {layer === "source" ? <SourceLayer referral={referral} fieldKey={fieldKey} /> : null}
        {layer === "fhir" ? <FhirLayer referral={referral} /> : null}
        {layer === "handoff" ? <HandoffLayer referral={referral} /> : null}
        {layer === "audit" ? <AuditLayer referral={referral} /> : null}
      </div>
    </div>
  </main>;
}
