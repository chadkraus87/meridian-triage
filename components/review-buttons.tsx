"use client";

import { useState } from "react";

type Review = "pending" | "approved" | "rejected";

/** Local state only. Nothing is sent anywhere, and the choice resets when you leave the page. */
export function ReviewButtons({ escalate }: { escalate: boolean }) {
  const [review, setReview] = useState<Review>("pending");
  const what = escalate ? "reply and escalation" : "reply";
  const status =
    review === "approved"
      ? `Approved. In a real deployment the ${what} would now go out.`
      : review === "rejected"
        ? `Rejected. The ${what} would go back to a support engineer to rewrite.`
        : `Waiting for a person to approve the ${what}.`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setReview("approved")}
        aria-pressed={review === "approved"}
        className="min-h-10 rounded-md border border-ok/50 bg-ok-dim px-4 text-sm font-medium text-ok transition-colors hover:bg-ok/20 aria-pressed:bg-ok aria-pressed:text-void"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => setReview("rejected")}
        aria-pressed={review === "rejected"}
        className="min-h-10 rounded-md border border-crit/50 bg-crit-dim px-4 text-sm font-medium text-crit transition-colors hover:bg-crit/20 aria-pressed:bg-crit aria-pressed:text-void"
      >
        Reject
      </button>
      {review !== "pending" && (
        <button type="button" onClick={() => setReview("pending")} className="min-h-10 px-2 text-sm text-ink-3 underline underline-offset-2 hover:text-ink">
          Undo
        </button>
      )}
      <p role="status" className="w-full text-sm text-ink-2">
        {status} <span className="text-ink-4">This demo only changes what you see here. Nothing is sent.</span>
      </p>
    </div>
  );
}
