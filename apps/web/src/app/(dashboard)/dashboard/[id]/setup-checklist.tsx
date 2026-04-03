"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, Badge, Button } from "@forsety/ui";
import { CheckCircle2, Circle, X, Shield, Layers, FileCheck } from "lucide-react";

interface SetupChecklistProps {
  datasetId: string;
  hasPolicy: boolean;
  hasEvidence: boolean;
  onCreatePolicy: () => void;
  onGenerateEvidence: () => void;
}

export function SetupChecklist({
  datasetId,
  hasPolicy,
  hasEvidence,
  onCreatePolicy,
  onGenerateEvidence,
}: SetupChecklistProps) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `checklist-dismissed-${datasetId}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
    }
  }, [datasetId]);

  if (!isNew || dismissed) return null;

  const allDone = hasPolicy && hasEvidence;

  function handleDismiss() {
    localStorage.setItem(`checklist-dismissed-${datasetId}`, "true");
    setDismissed(true);
  }

  const steps = [
    {
      label: "License attached",
      done: true, // Always true after upload (license is required)
      icon: FileCheck,
      action: null,
    },
    {
      label: "Access policy created",
      done: hasPolicy,
      icon: Shield,
      action: hasPolicy ? null : onCreatePolicy,
      actionLabel: "Create Policy",
    },
    {
      label: "Evidence pack generated",
      done: hasEvidence,
      icon: Layers,
      action: hasEvidence ? null : onGenerateEvidence,
      actionLabel: "Generate Evidence",
    },
  ];

  return (
    <Alert className="mb-6 rounded-xl border-gold-200 bg-gradient-to-r from-gold-50/80 to-teal-50/40">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-gold-100 text-gold-700 text-[10px]">
              Setup
            </Badge>
            <AlertDescription className="text-sm font-semibold text-foreground">
              {allDone ? "All set! Your dataset is ready." : "Complete setup to get the most out of your dataset"}
            </AlertDescription>
          </div>
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-sm ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {step.label}
                </span>
                {step.action && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-gold-600 hover:text-gold-700"
                    onClick={step.action}
                  >
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Alert>
  );
}
