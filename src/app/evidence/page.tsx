import type { Metadata } from "next";
import { EvidenceScreen } from "@/components/evidence-screen";

export const metadata: Metadata = { title: "Evidence" };
export default function EvidencePage() { return <EvidenceScreen />; }
