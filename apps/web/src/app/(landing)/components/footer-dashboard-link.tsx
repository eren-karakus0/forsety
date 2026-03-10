"use client";

import { LaunchAppButton } from "./launch-app-button";

export function FooterDashboardLink() {
  return (
    <LaunchAppButton
      className="h-auto bg-transparent p-0 text-sm font-normal text-navy-400 shadow-none transition-colors hover:bg-transparent hover:text-gold-500"
    >
      Dashboard
    </LaunchAppButton>
  );
}
