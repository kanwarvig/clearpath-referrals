import { z } from "zod";

export const referralStatuses = [
  "NEW",
  "NEEDS_INFORMATION",
  "READY_FOR_REVIEW",
  "READY_TO_SEND",
  "DELIVERY_INTERRUPTED",
  "AWAITING_ACKNOWLEDGEMENT",
  "CLOSED",
] as const;

export type ReferralStatus = (typeof referralStatuses)[number];
export type FieldKey =
  | "patientName"
  | "dateOfBirth"
  | "healthNumber"
  | "referringClinician"
  | "reasonForReferral"
  | "callbackNumber";

export interface SourceLocation {
  page: number;
  line: number;
  excerpt: string;
}

export interface ExtractedField {
  key: FieldKey;
  label: string;
  value: string;
  confidence: number;
  source: SourceLocation | null;
  required: boolean;
  reviewed: boolean;
}

export interface PacketPage {
  page: number;
  heading: string;
  lines: string[];
}

export interface ServiceRequestR4 {
  resourceType: "ServiceRequest";
  id: string;
  status: "active" | "completed";
  intent: "order";
  code: { text: string };
  subject: { reference: string; display: string };
  requester: { reference: string; display: string };
  authoredOn: string;
}

export interface TaskR4 {
  resourceType: "Task";
  id: string;
  status: "requested" | "accepted" | "in-progress" | "completed";
  intent: "order";
  basedOn: Array<{ reference: string }>;
  for: { reference: string; display: string };
  owner?: { reference: string; display: string };
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface DeliveryAttempt {
  id: string;
  at: string;
  idempotencyKey: string;
  outcome: "INTERRUPTED" | "DELIVERED" | "DUPLICATE_SUPPRESSED";
  receiverMessage: string;
}

export interface Referral {
  id: string;
  packetName: string;
  scenario: "INCOMPLETE" | "COMPLETE" | "AMBIGUOUS_IDENTITY";
  identityStatus: "CONFIRMED" | "AMBIGUOUS";
  status: ReferralStatus;
  fields: ExtractedField[];
  pages: PacketPage[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  serviceRequest: ServiceRequestR4;
  task: TaskR4;
  deliveryAttempts: DeliveryAttempt[];
  audit: AuditEvent[];
  benchmarkStartedAt: string;
}

export interface SimulatedReceiverRecord {
  idempotencyKey: string;
  referralId: string;
  receiverRecordId: string;
  acceptedAt: string;
  payloadFingerprint: string;
}

export interface WorkspaceState {
  version: 1;
  referrals: Referral[];
  selectedReferralId: string;
  actor: string;
  receiverRecords: SimulatedReceiverRecord[];
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: FieldKey[];
  fhirErrors: string[];
  identityIssue: string | null;
}

export interface ActionResult {
  state: WorkspaceState;
  message: string;
}

const sourceSchema = z.object({
  page: z.number().int().positive(),
  line: z.number().int().positive(),
  excerpt: z.string(),
});

const fieldSchema = z.object({
  key: z.enum(["patientName", "dateOfBirth", "healthNumber", "referringClinician", "reasonForReferral", "callbackNumber"]),
  label: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  source: sourceSchema.nullable(),
  required: z.boolean(),
  reviewed: z.boolean(),
});

const auditSchema = z.object({ id: z.string(), at: z.string(), actor: z.string(), action: z.string(), detail: z.string() });
const deliverySchema = z.object({
  id: z.string(), at: z.string(), idempotencyKey: z.string(),
  outcome: z.enum(["INTERRUPTED", "DELIVERED", "DUPLICATE_SUPPRESSED"]), receiverMessage: z.string(),
});

export const workspaceSchema: z.ZodType<WorkspaceState> = z.object({
  version: z.literal(1),
  selectedReferralId: z.string(),
  actor: z.string(),
  receiverRecords: z.array(z.object({ idempotencyKey: z.string(), referralId: z.string(), receiverRecordId: z.string(), acceptedAt: z.string(), payloadFingerprint: z.string() })),
  referrals: z.array(z.object({
    id: z.string(), packetName: z.string(), scenario: z.enum(["INCOMPLETE", "COMPLETE", "AMBIGUOUS_IDENTITY"]), identityStatus: z.enum(["CONFIRMED", "AMBIGUOUS"]),
    status: z.enum(referralStatuses), fields: z.array(fieldSchema),
    pages: z.array(z.object({ page: z.number(), heading: z.string(), lines: z.array(z.string()) })),
    assignee: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
    serviceRequest: z.object({
      resourceType: z.literal("ServiceRequest"), id: z.string(), status: z.enum(["active", "completed"]), intent: z.literal("order"),
      code: z.object({ text: z.string() }), subject: z.object({ reference: z.string(), display: z.string() }),
      requester: z.object({ reference: z.string(), display: z.string() }), authoredOn: z.string(),
    }),
    task: z.object({
      resourceType: z.literal("Task"), id: z.string(), status: z.enum(["requested", "accepted", "in-progress", "completed"]),
      intent: z.literal("order"), basedOn: z.array(z.object({ reference: z.string() })),
      for: z.object({ reference: z.string(), display: z.string() }),
      owner: z.object({ reference: z.string(), display: z.string() }).optional(),
    }),
    deliveryAttempts: z.array(deliverySchema), audit: z.array(auditSchema), benchmarkStartedAt: z.string(),
  })),
}).superRefine((state, context) => {
  if (!state.referrals.some((referral) => referral.id === state.selectedReferralId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedReferralId"], message: "selectedReferralId must reference an existing referral" });
  }
  for (const record of state.receiverRecords) {
    if (!state.referrals.some((referral) => referral.id === record.referralId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["receiverRecords"], message: "receiver record must reference an existing referral" });
  }
});
