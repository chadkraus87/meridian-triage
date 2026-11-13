/**
 * Short explanations for misses in the held-out run, written by hand after reading each
 * trace. The misses themselves are computed from the recorded run on the Results page;
 * this file only explains them. Keyed by ticket ID.
 */
export const MISS_NOTES: Record<string, string> = {
  "MT-2010":
    "The customer had already uploaded the rotated certificate as KB-003 says and still got SAML_SIGNATURE_INVALID. The model applied the guide's own defect test (setup followed, still fails), the same reasoning behind MT-2022's defect label, so the label is arguably the inconsistent one. It still escalated correctly as a third contact, but the reply also asked for an account ID and repro steps the configuration label doesn't require.",
  "MT-2014":
    "A question about changing the billing email. The model called it a how-to; the label says billing. The guide's two definitions overlap here. It resolved correctly with KB-019.",
  "MT-2025":
    "Occasional duplicate webhook deliveries, where the customer already deduplicates. The model read it as a question, not a broken feature. The decision was right (needs info), but it arrived there through the fallback rule, and the reply asked for nothing when the label expected all four details.",
  "MT-2026":
    "An invite still fails after a user was removed. The model suspected a setup cause (pending invites or SCIM re-adding users) and called it configuration, so it asked only for the error message. The label is a defect, which also needs the account ID and time.",
  "MT-2011":
    "SCIM user creation fails with a 500. The model rated it medium because the rest of the platform worked. It escalated anyway because every detail was present. If details had been missing, this severity slip would have cost an escalation.",
  "MT-2006":
    "All API calls returned 503 in one region. The model filed it under platform, the label under API. Both are defensible. It escalated correctly as an outage affecting multiple customers.",
};
