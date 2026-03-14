"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@forsety/ui";

interface GuestStatCardProps {
  label: string;
  icon: LucideIcon;
  cardClass?: string;
  iconColor?: string;
}

export function GuestStatCard({
  label,
  icon: Icon,
  cardClass = "",
  iconColor = "text-gold-500",
}: GuestStatCardProps) {
  return (
    <Card
      className={`${cardClass} rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
    >
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="mt-2">
          <span className="animate-pulse bg-gradient-to-r from-gold-500 to-teal-500 bg-clip-text font-display text-2xl font-bold text-transparent">
            Growing...
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
