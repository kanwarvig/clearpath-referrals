"use client";

import { CheckCircle2, Clock3, FileCheck2, ShieldCheck, TestTube2, UserRoundCheck } from "lucide-react";
import { BENCHMARK_RESULT } from "@/lib/benchmark";
import { useWorkspace } from "./workspace-provider";
import { LoadingState, Metric, PageIntro } from "./ui";

export function EvidenceScreen() {
  const { state, ready } = useWorkspace();
  if (!ready) return <LoadingState />;
  const completed = state.referrals.filter((referral) => referral.status === "CLOSED").length;
  return <main id="main-content" className="page">
    <PageIntro eyebrow="Reproducible evidence" title="Measured claims, bounded honestly" description="These results come from deterministic synthetic fixtures. They are not hospital outcomes, a clinical validation, or evidence of production scale." />
    <section className="metric-grid four">
      <Metric icon={<FileCheck2 />} value={`${(BENCHMARK_RESULT.extractionAccuracy * 100).toFixed(1)}%`} label="Extraction accuracy" detail={`${BENCHMARK_RESULT.correctFields}/${BENCHMARK_RESULT.fields} exact field matches`} />
      <Metric icon={<UserRoundCheck />} value={`${(BENCHMARK_RESULT.correctionRate * 100).toFixed(1)}%`} label="Correction rate" detail={`${BENCHMARK_RESULT.correctionsRequired} fields need staff correction`} />
      <Metric icon={<ShieldCheck />} value={`${BENCHMARK_RESULT.duplicateDeliveryErrors}`} label="Duplicate errors" detail={`${BENCHMARK_RESULT.retryScenarios} recovery scenarios`} />
      <Metric icon={<Clock3 />} value={`${completed}/${state.referrals.length}`} label="Demo referrals closed" detail="Current browser workspace" />
    </section>
    <section className="evidence-layout">
      <article className="method-card"><div className="card-icon"><TestTube2 aria-hidden="true" /></div><p className="eyebrow">Method</p><h2>Synthetic conformance suite v1</h2><ul><li><CheckCircle2 aria-hidden="true" /><span><strong>{BENCHMARK_RESULT.packets} generated parser cases</strong><small>Six required fields per packet</small></span></li><li><CheckCircle2 aria-hidden="true" /><span><strong>Exact normalized-value comparison</strong><small>No model grading or manual score entry</small></span></li><li><CheckCircle2 aria-hidden="true" /><span><strong>{BENCHMARK_RESULT.retryScenarios} receiver recovery scenarios</strong><small>Accepted payload plus lost response</small></span></li><li><CheckCircle2 aria-hidden="true" /><span><strong>Reproducible locally</strong><small><code>npm run benchmark</code></small></span></li></ul></article>
      <article className="interpretation-card"><p className="eyebrow light">Interpretation</p><h2>What the benchmark does—and does not—show</h2><p>It exercises deterministic parsing, source coordinates, guarded workflow transitions, FHIR-shaped projection, and safe retry behavior.</p><div className="claim-grid"><div><strong>Supported</strong><span>Fixture correctness</span><span>Source traceability</span><span>Duplicate suppression</span></div><div><strong>Not established</strong><span>Real-world accuracy</span><span>Clinical safety</span><span>Privacy compliance</span><span>Interoperability certification</span></div></div></article>
    </section>
  </main>;
}
