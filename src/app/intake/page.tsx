import type { Metadata } from "next";
import { IntakeScreen } from "@/components/intake-screen";

export const metadata: Metadata = { title: "Intake" };
export default function IntakePage() { return <IntakeScreen />; }
