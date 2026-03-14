"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@forsety/ui";
import { ArrowRight } from "lucide-react";

interface LaunchAppButtonProps {
  size?: "sm" | "lg" | "default";
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LaunchAppButton({
  size = "default",
  children,
  className,
  onClick,
}: LaunchAppButtonProps) {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const dashboardUrl = appDomain
    ? `https://${appDomain}/dashboard`
    : "/dashboard";

  return (
    <Button size={size} className={className} onClick={onClick} asChild>
      <Link href={dashboardUrl}>
        {children ?? (
          <>
            Launch App
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Link>
    </Button>
  );
}
