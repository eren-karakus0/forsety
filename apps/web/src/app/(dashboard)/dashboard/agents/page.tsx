"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAgents } from "../actions";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@forsety/ui";
import { Users, ArrowRight } from "lucide-react";

interface AgentRow {
  id: string;
  name: string;
  ownerAddress: string;
  permissions: string[];
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then((a) => setAgents(a as AgentRow[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-800">
            Agents
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Registered AI agents with RecallVault access
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-navy-200/60">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
              Total Agents
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-navy-800">
              {agents.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-navy-200/60">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
              Active
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-600">
              {agents.filter((a) => a.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gold-300/60 bg-gradient-to-br from-gold-50/80 to-white">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
              Inactive
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-navy-800">
              {agents.filter((a) => !a.isActive).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-navy-200/60">
        <Table>
          <TableHeader>
            <TableRow className="border-navy-100 bg-navy-50/50 hover:bg-navy-50/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Name
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Owner
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Permissions
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Last Seen
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-navy-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                      <Users className="h-5 w-5 text-navy-400" />
                    </div>
                    <p className="text-sm font-medium text-navy-600">
                      No agents registered
                    </p>
                    <p className="text-xs text-navy-400">
                      Register agents via the API to get started
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id} className="group">
                  <TableCell>
                    <Link href={`/dashboard/agents/${agent.id}`}>
                      <span className="text-sm font-medium text-navy-800 transition-colors group-hover:text-gold-600">
                        {agent.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-navy-400">
                        {agent.id.slice(0, 8)}...
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-navy-600">
                      {agent.ownerAddress.slice(0, 10)}...
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.permissions.slice(0, 3).map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {p}
                        </Badge>
                      ))}
                      {agent.permissions.length > 3 && (
                        <span className="text-[10px] text-navy-400">
                          +{agent.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={agent.isActive ? "default" : "destructive"}
                    >
                      {agent.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-navy-500">
                    {agent.lastSeenAt
                      ? new Date(agent.lastSeenAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/agents/${agent.id}`}>
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
