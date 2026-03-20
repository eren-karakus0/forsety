import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@forsety/ui";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  cardClass?: string;
  iconBgClass?: string;
  iconColor?: string;
  valueColor?: string;
  extra?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  cardClass = "",
  iconBgClass = "bg-muted/50",
  iconColor = "text-muted-foreground",
  valueColor = "text-foreground",
  extra,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={`${cardClass} rounded-xl transition-all duration-300 hover:shadow-md${onClick ? " cursor-pointer hover:bg-muted/30" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBgClass}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        <p className={`mt-2 font-display text-2xl font-bold ${valueColor}`}>
          {value}
        </p>
        {extra}
      </CardContent>
    </Card>
  );
}

/**
 * Compact variant used in pages where stat cards use flex layout with icon on the left.
 */
export function StatCardCompact({
  label,
  value,
  icon: Icon,
  cardClass = "",
  iconBgClass = "bg-muted/50",
  iconColor = "text-muted-foreground",
  valueColor = "text-foreground",
  onClick,
}: Omit<StatCardProps, "extra">) {
  return (
    <Card
      className={`${cardClass} rounded-xl${onClick ? " cursor-pointer transition-colors hover:bg-muted/30" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBgClass}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={`font-display text-lg font-bold ${valueColor}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
