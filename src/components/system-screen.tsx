import { ArrowRight, Database, FileText, Fingerprint, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { PageIntro } from "./ui";

const boundaries = {
  inside: ["Typed TypeScript domain contracts", "Runtime validation for browser-persisted state", "FHIR R4 ServiceRequest and Task projections", "Deterministic transition and delivery logic", "Attributable local audit history"],
  outside: ["Real patient health information", "Clinical diagnosis, urgency, or treatment", "Live EHR or hospital connectivity", "Authentication and production access control", "Compliance or interoperability certification"],
};

export function SystemScreen() {
  return <main id="main-content" className="page">
    <PageIntro eyebrow="System boundaries" title="A real workflow engine inside a deliberately synthetic shell" description="Clearpath demonstrates integrity and failure recovery without secrets, external services, or claims beyond the evidence." />
    <section className="architecture-map" aria-label="Clearpath data flow"><div><span><FileText aria-hidden="true" /></span><strong>Synthetic packet</strong><small>Authored text fixture</small></div><ArrowRight aria-hidden="true" /><div><span><Fingerprint aria-hidden="true" /></span><strong>Deterministic extractor</strong><small>Values + provenance</small></div><ArrowRight aria-hidden="true" /><div><span><ShieldCheck aria-hidden="true" /></span><strong>Human review gates</strong><small>Correction + R4 validation</small></div><ArrowRight aria-hidden="true" /><div><span><Send aria-hidden="true" /></span><strong>Simulated receiver</strong><small>Idempotent handoff</small></div></section>
    <section className="boundary-grid"><article><div className="boundary-heading"><Database aria-hidden="true" /><div><p className="eyebrow">Inside the demonstration</p><h2>Implemented and testable</h2></div></div><ul>{boundaries.inside.map((item) => <li key={item}><ShieldCheck aria-hidden="true" />{item}</li>)}</ul></article><article className="outside"><div className="boundary-heading"><LockKeyhole aria-hidden="true" /><div><p className="eyebrow">Outside the boundary</p><h2>Not claimed or connected</h2></div></div><ul>{boundaries.outside.map((item) => <li key={item}><span aria-hidden="true">—</span>{item}</li>)}</ul></article></section>
    <section className="integrity-principle"><div><p className="eyebrow light">Integrity principle</p><h2>The UI cannot set workflow status directly.</h2></div><p>Every action calls a typed domain command. The engine checks the current state, validates required evidence, projects FHIR resources, and records an attributable event before a transition is accepted.</p></section>
  </main>;
}
