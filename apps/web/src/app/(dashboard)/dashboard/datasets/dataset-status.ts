export type DatasetStatus = "active" | "warning" | "expired" | "no-policy";

/** Policy-level status (used in policies page). */
export type PolicyStatus = "active" | "expiring" | "expired";

export function computeDatasetStatus(
  latestPolicy?: { expiresAt: Date | string | null } | null
): DatasetStatus {
  if (!latestPolicy) return "no-policy";

  const expiresAt = latestPolicy.expiresAt;
  if (!expiresAt) return "active";

  const exp = new Date(expiresAt);
  const now = new Date();

  if (exp < now) return "expired";

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (exp.getTime() - now.getTime() < sevenDays) return "warning";

  return "active";
}

/** Compute policy-level status from expiresAt string. */
export function computePolicyStatus(expiresAt: string | null): PolicyStatus {
  if (!expiresAt) return "active";
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp < now) return "expired";
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (exp.getTime() - now.getTime() < sevenDays) return "expiring";
  return "active";
}

export const statusConfig: Record<
  DatasetStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; className: string }
> = {
  active: { label: "Active", variant: "default", className: "" },
  warning: { label: "Expiring Soon", variant: "secondary", className: "text-orange-600 border-orange-200 bg-orange-50" },
  expired: { label: "Expired", variant: "destructive", className: "" },
  "no-policy": { label: "No Policy", variant: "secondary", className: "" },
};

export const policyStatusConfig: Record<
  PolicyStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; className: string }
> = {
  active: { label: "Active", variant: "default", className: "" },
  expiring: { label: "Expiring Soon", variant: "secondary", className: "text-orange-600" },
  expired: { label: "Expired", variant: "destructive", className: "" },
};
