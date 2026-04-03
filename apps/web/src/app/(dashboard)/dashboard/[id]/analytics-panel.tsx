"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Badge,
  Skeleton,
} from "@forsety/ui";
import { Sparkline } from "../../components/sparkline";
import { fetchDatasetAnalytics, type DatasetAnalytics } from "../actions/analytics-actions";

interface AnalyticsPanelProps {
  datasetId: string;
}

export function AnalyticsPanel({ datasetId }: AnalyticsPanelProps) {
  const [data, setData] = useState<DatasetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatasetAnalytics(datasetId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [datasetId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-xl">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalAccess = data.dailyAccess.reduce((sum, d) => sum + d.count, 0);
  const sparkData = data.dailyAccess.map((d) => d.count);
  const opTotal = Object.values(data.opBreakdown).reduce((sum, n) => sum + n, 0) || 1;

  return (
    <div className="space-y-6">
      {/* 30-day Access Sparkline */}
      <Card className="rounded-xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                30-Day Access
              </p>
              <p className="font-display text-2xl font-bold text-foreground">{totalAccess}</p>
            </div>
            <Sparkline data={sparkData} width={120} height={32} color="#d4af37" />
          </div>
        </CardContent>
      </Card>

      {/* Operation Type Breakdown */}
      <Card className="rounded-xl">
        <CardContent className="pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Operation Breakdown
          </p>
          <div className="space-y-2">
            {Object.entries(data.opBreakdown).map(([op, count]) => {
              const pct = Math.round((count / opTotal) * 100);
              return (
                <div key={op} className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono text-[10px] uppercase w-20 justify-center">
                    {op}
                  </Badge>
                  <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-400 to-teal-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Accessors */}
      {data.topAccessors.length > 0 && (
        <Card className="rounded-xl">
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Top Accessors
            </p>
            <div className="space-y-2">
              {data.topAccessors.map((a, i) => (
                <div key={a.address} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[10px] font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                    {a.address.slice(0, 12)}...{a.address.slice(-6)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {a.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
