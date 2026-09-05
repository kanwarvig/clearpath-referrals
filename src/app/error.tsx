"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="page"><div className="not-found-panel"><CircleAlert aria-hidden="true" /><p className="eyebrow">Workspace error</p><h1>Clearpath could not load this view.</h1><p>Your browser-persisted demo data has not been deleted. Try rendering the route again.</p><button className="primary-link tactile" onClick={reset}>Try again <RefreshCw aria-hidden="true" /></button></div></main>;
}
