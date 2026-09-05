import type { Metadata } from "next";
import { HandoffsScreen } from "@/components/handoffs-screen";

export const metadata: Metadata = { title: "Handoffs" };
export default function HandoffsPage() { return <HandoffsScreen />; }
