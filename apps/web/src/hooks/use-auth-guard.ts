"use client";

import { useAuthContext, type AuthContextValue } from "@/lib/auth-context";

export function useAuthGuard(): AuthContextValue {
  return useAuthContext();
}
