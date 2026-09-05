import type { ReactNode } from "react";
import type { Referral, ReferralStatus } from "@/lib/contracts";

export const statusLabels: Record<ReferralStatus, string> = {
  NEW: "New intake",
  NEEDS_INFORMATION: "Needs information",
  READY_FOR_REVIEW: "Ready for assignment",
  READY_TO_SEND: "Ready to send",
  DELIVERY_INTERRUPTED: "Recovery needed",
  AWAITING_ACKNOWLEDGEMENT: "Awaiting acknowledgement",
  CLOSED: "Closed",
};

export const statusTone: Record<ReferralStatus, string> = {
  NEW: "neutral", NEEDS_INFORMATION: "amber", READY_FOR_REVIEW: "blue",
  READY_TO_SEND: "teal", DELIVERY_INTERRUPTED: "coral",
  AWAITING_ACKNOWLEDGEMENT: "violet", CLOSED: "green",
};

export function patientName(referral: Referral) {
  return referral.fields.find((field) => field.key === "patientName")?.value || "Unnamed referral";
}

export function StatusPill({ status }: { status: ReferralStatus }) {
  return <span className={`status-pill ${statusTone[status]}`}><span aria-hidden="true" />{statusLabels[status]}</span>;
}

export function Metric({ icon, value, label, detail }: { icon: ReactNode; value: string; label: string; detail?: string }) {
  return <div className="metric"><span className="metric-icon">{icon}</span><strong>{value}</strong><span>{label}</span>{detail ? <small>{detail}</small> : null}</div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function LoadingState() {
  return <main id="main-content" className="page"><div className="loading-state" role="status"><span className="pulse-line wide" /><span className="pulse-line" /><span className="pulse-grid"><i /><i /><i /></span><span className="sr-only">Loading synthetic workspace</span></div></main>;
}
