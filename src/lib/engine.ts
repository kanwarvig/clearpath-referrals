import type { ActionResult, AuditEvent, FieldKey, Referral, ValidationResult, WorkspaceState } from "./contracts";
import { projectFhirR4 } from "./extractor";

function event(referral: Referral, actor: string, action: string, detail: string, now: string): AuditEvent {
  return { id: `${referral.id}-event-${referral.audit.length + 1}`, at: now, actor, action, detail };
}

function updateSelected(state: WorkspaceState, mutate: (referral: Referral) => Referral): WorkspaceState {
  return { ...state, referrals: state.referrals.map((r) => r.id === state.selectedReferralId ? mutate(r) : r) };
}

export function validateReferral(referral: Referral): ValidationResult {
  const missingFields = referral.fields.filter((f) => f.required && !f.value.trim()).map((f) => f.key);
  const errors: string[] = [];
  const sr = referral.serviceRequest;
  const task = referral.task;
  if (sr.resourceType !== "ServiceRequest") errors.push("ServiceRequest.resourceType must be ServiceRequest");
  if (sr.status !== "active" && sr.status !== "completed") errors.push("ServiceRequest.status is not supported");
  if (sr.intent !== "order") errors.push("ServiceRequest.intent must be order");
  if (!sr.subject.reference.startsWith("Patient/")) errors.push("ServiceRequest.subject must reference Patient");
  if (!sr.requester.reference.startsWith("Practitioner/")) errors.push("ServiceRequest.requester must reference Practitioner");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sr.authoredOn)) errors.push("ServiceRequest.authoredOn must be YYYY-MM-DD");
  if (task.resourceType !== "Task") errors.push("Task.resourceType must be Task");
  if (task.intent !== "order") errors.push("Task.intent must be order");
  if (task.basedOn[0]?.reference !== `ServiceRequest/${sr.id}`) errors.push("Task.basedOn must reference this ServiceRequest");
  if (referral.assignee && !task.owner?.reference.startsWith("PractitionerRole/")) errors.push("Task.owner must reference PractitionerRole when assigned");
  const identityIssue = referral.identityStatus === "AMBIGUOUS" ? "Synthetic identity match requires explicit staff confirmation" : null;
  return { isValid: missingFields.length === 0 && errors.length === 0 && !identityIssue, missingFields, fhirErrors: errors, identityIssue };
}

export function reviewExtraction(state: WorkspaceState, now: string): ActionResult {
  const selected = state.referrals.find((r) => r.id === state.selectedReferralId)!;
  if (selected.status !== "NEW") return { state, message: "Extraction review is only available for new intake." };
  const validation = validateReferral(selected);
  const nextStatus = validation.missingFields.length || validation.identityIssue ? "NEEDS_INFORMATION" : "READY_FOR_REVIEW";
  return {
    state: updateSelected(state, (r) => ({ ...r, status: nextStatus, fields: r.fields.map((f) => ({ ...f, reviewed: true })), updatedAt: now, audit: [...r.audit, event(r, state.actor, "EXTRACTION_REVIEWED", validation.missingFields.length ? `Missing required field: ${validation.missingFields.join(", ")}` : "All extracted fields reviewed.", now)] })),
    message: validation.missingFields.length ? "Review found missing information." : validation.identityIssue ? "Ambiguous identity requires staff confirmation." : "Extraction reviewed and ready for assignment.",
  };
}

export function correctField(state: WorkspaceState, key: FieldKey, value: string, now: string): ActionResult {
  const selected = state.referrals.find((r) => r.id === state.selectedReferralId)!;
  if (selected.status !== "NEEDS_INFORMATION") return { state, message: "Corrections require an open missing-information review." };
  return {
    state: updateSelected(state, (r) => {
      const label = r.fields.find((f) => f.key === key)?.label ?? key;
      const fields = r.fields.map((f) => f.key === key ? { ...f, value: value.trim(), reviewed: true, confidence: 1, source: { page: 2, line: 3, excerpt: `${label}: ${value.trim()} (staff-supplied)` } } : f);
      const fhir = projectFhirR4(r.id, fields, r.serviceRequest.authoredOn);
      return { ...r, fields, ...fhir, status: r.identityStatus === "AMBIGUOUS" ? "NEEDS_INFORMATION" : "READY_FOR_REVIEW", updatedAt: now, pages: r.pages.some((p) => p.page === 2) ? r.pages : [...r.pages, { page: 2, heading: "Supplement received", lines: ["CLEARPATH SYNTHETIC DEMO — STAFF-SUPPLIED INFORMATION", "Information received by secure simulated callback", `${label}: ${value.trim()}`] }], audit: [...r.audit, event(r, state.actor, "FIELD_CORRECTED", `${label} supplied from simulated follow-up; provenance recorded on page 2; FHIR projection regenerated.`, now)] };
    }),
    message: "Missing information added with staff provenance.",
  };
}

export function resolveIdentity(state: WorkspaceState, now: string): ActionResult {
  const selected = state.referrals.find((r) => r.id === state.selectedReferralId)!;
  if (selected.status !== "NEEDS_INFORMATION" || selected.identityStatus !== "AMBIGUOUS") return { state, message: "No ambiguous identity review is open." };
  const hasMissingFields = selected.fields.some((field) => field.required && !field.value.trim());
  return { state: updateSelected(state, (r) => ({ ...r, identityStatus: "CONFIRMED", status: hasMissingFields ? "NEEDS_INFORMATION" : "READY_FOR_REVIEW", updatedAt: now, audit: [...r.audit, event(r, state.actor, "IDENTITY_CONFIRMED", "Staff confirmed the synthetic patient match; no automatic match decision was made.", now)] })), message: hasMissingFields ? "Synthetic identity confirmed; missing fields still block assignment." : "Synthetic identity confirmed and ready for assignment." };
}

export function assignReferral(state: WorkspaceState, assignee: string, now: string): ActionResult {
  const selected = state.referrals.find((r) => r.id === state.selectedReferralId)!;
  if (selected.status !== "READY_FOR_REVIEW") return { state, message: "Referral must complete human review before assignment." };
  const validation = validateReferral(selected);
  if (!validation.isValid) return { state, message: "Resolve missing fields and FHIR validation errors before assignment." };
  return { state: updateSelected(state, (r) => ({ ...r, assignee, status: "READY_TO_SEND", updatedAt: now, task: { ...r.task, status: "accepted", owner: { reference: "PractitionerRole/referral-coordinator", display: assignee } }, audit: [...r.audit, event(r, state.actor, "STAFF_ASSIGNED", `${assignee} assigned; FHIR R4 ServiceRequest and Task validated.`, now)] })), message: "Assigned and ready for delivery." };
}

export function deliverReferral(state: WorkspaceState, mode: "INTERRUPT" | "DELIVER", now: string): ActionResult {
  const selected = state.referrals.find((r) => r.id === state.selectedReferralId)!;
  if (!selected.assignee) return { state, message: "Assign a staff owner before delivery." };
  if (!["READY_TO_SEND", "DELIVERY_INTERRUPTED", "AWAITING_ACKNOWLEDGEMENT"].includes(selected.status)) return { state, message: "Referral is not in a deliverable state." };
  const idempotencyKey = `delivery:${selected.id}:northstar-v1`;
  const alreadyDelivered = selected.deliveryAttempts.some((a) => a.idempotencyKey === idempotencyKey && a.outcome === "DELIVERED");
  const receiverRecord = state.receiverRecords.find((record) => record.idempotencyKey === idempotencyKey);
  if (alreadyDelivered) {
    return { state: updateSelected(state, (r) => ({ ...r, updatedAt: now, deliveryAttempts: [...r.deliveryAttempts, { id: `${r.id}-attempt-${r.deliveryAttempts.length + 1}`, at: now, idempotencyKey, outcome: "DUPLICATE_SUPPRESSED", receiverMessage: "No second payload sent; prior receipt retained." }], audit: [...r.audit, event(r, "Clearpath delivery worker", "DUPLICATE_SUPPRESSED", `Delivery key ${idempotencyKey} already completed; no payload was resent.`, now)] })), message: "Duplicate prevented — no second referral was sent." };
  }
  const interrupted = mode === "INTERRUPT";
  const recovered = !interrupted && Boolean(receiverRecord);
  const next = updateSelected(state, (r) => ({ ...r, status: interrupted ? "DELIVERY_INTERRUPTED" : "AWAITING_ACKNOWLEDGEMENT", updatedAt: now, task: { ...r.task, status: interrupted ? "accepted" : "in-progress" }, deliveryAttempts: [...r.deliveryAttempts, { id: `${r.id}-attempt-${r.deliveryAttempts.length + 1}`, at: now, idempotencyKey, outcome: interrupted ? "INTERRUPTED" : "DELIVERED", receiverMessage: interrupted ? "Receiver committed NORTHSTAR-2901; response was lost." : recovered ? "200 Reconciled · existing receipt NORTHSTAR-2901" : "202 Accepted · receipt NORTHSTAR-2901" }], audit: [...r.audit, event(r, "Clearpath delivery worker", interrupted ? "DELIVERY_RESPONSE_LOST" : recovered ? "DELIVERY_RECONCILED" : "DELIVERY_ACCEPTED", interrupted ? "Receiver accepted the payload, then the response was lost. Outcome remains unknown to the sender until reconciliation." : recovered ? "Receiver lookup found the existing idempotency key; local state recovered without a second receiver record." : "Simulated clinic accepted one referral payload.", now)] }));
  const receiverRecords = receiverRecord ? state.receiverRecords : [...state.receiverRecords, { idempotencyKey, referralId: selected.id, receiverRecordId: "NORTHSTAR-2901", acceptedAt: now, payloadFingerprint: `fhir-r4:${selected.serviceRequest.id}` }];
  return { state: { ...next, receiverRecords }, message: interrupted ? "Receiver response lost. Reload, then reconcile safely with the reserved key." : recovered ? "Existing receiver record reconciled; no second referral was created." : "Simulated clinic accepted the referral." };
}

export function acknowledgeReferral(state: WorkspaceState, now: string): ActionResult {
  const selected = state.referrals.find((r) => r.id === state.selectedReferralId)!;
  if (selected.status !== "AWAITING_ACKNOWLEDGEMENT") return { state, message: "A delivered referral is required before acknowledgement." };
  return { state: updateSelected(state, (r) => ({ ...r, status: "CLOSED", updatedAt: now, task: { ...r.task, status: "completed" }, audit: [...r.audit, event(r, "Northstar Clinic · simulated receiver", "ACKNOWLEDGED_AND_CLOSED", "Simulated acknowledgement received; administrative handoff closed. ServiceRequest remains active because care completion is outside scope.", now)] })), message: "Acknowledgement recorded and referral closed." };
}
