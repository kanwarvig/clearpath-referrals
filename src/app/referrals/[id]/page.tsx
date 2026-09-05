import type { Metadata } from "next";
import { ReferralScreen } from "@/components/referral-screen";

export const metadata: Metadata = { title: "Referral review" };
export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReferralScreen id={id} />;
}
