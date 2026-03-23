"use client";

import { Button } from "@/components/ui/button";
import { CONTRACT_TEMPLATES, type ContractTemplate } from "@/lib/silver-script";
import {
  ArrowDownUp,
  ChevronRight,
  Clock,
  FileCode2,
  FolderOpen,
  Lock,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";

interface ContractTemplatesProps {
  onSelect?: (template: ContractTemplate) => void;
}

const CATEGORIES = [
  {
    id: "basic",
    name: "Basic",
    icon: FileCode2,
    templates: ["p2pkh", "p2pk"],
  },
  {
    id: "multisig",
    name: "Multisig",
    icon: Users,
    templates: ["multisig-2-3", "multisig-2-2"],
  },
  {
    id: "escrow",
    name: "Escrow",
    icon: Shield,
    templates: ["escrow-2-3"],
  },
  {
    id: "timelock",
    name: "Time-Locked",
    icon: Clock,
    templates: ["timelock-vault", "hashlock-swap"],
  },
  {
    id: "utility",
    name: "Utility",
    icon: RefreshCw,
    templates: ["deadman-switch", "recurring-payment", "covenant"],
  },
];

export default function ContractTemplates({
  onSelect,
}: ContractTemplatesProps) {
  const [expanded, setExpanded] = useState<string | null>("basic");

  const getTemplate = (id: string) =>
    CONTRACT_TEMPLATES.find((t) => t.id === id);

  const handleSelect = (template: ContractTemplate) => {
    onSelect?.(template);
  };

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider px-2 mb-2">
        Templates
      </div>

      {CATEGORIES.map((category) => {
        const Icon = category.icon;
        const isExpanded = expanded === category.id;

        return (
          <div key={category.id}>
            <button
              onClick={() => setExpanded(isExpanded ? null : category.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-[hsl(0_0%_60%)] hover:text-[hsl(0_0%_80%)] hover:bg-[hsl(0_0%_8%)] rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3 h-3" />
                <span>{category.name}</span>
              </div>
              <ChevronRight
                className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>

            {isExpanded && (
              <div className="ml-4 space-y-1 mt-1">
                {category.templates.map((templateId) => {
                  const template = getTemplate(templateId);
                  if (!template) return null;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="w-full text-left px-2 py-1.5 text-[9px] bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded hover:border-violet-400/30 hover:bg-[hsl(0_0%_5%)] transition-all"
                    >
                      <div className="text-violet-400 font-medium">
                        {template.name}
                      </div>
                      <div className="text-[hsl(0_0%_35%)] mt-0.5 line-clamp-1">
                        {template.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function getAllTemplates(): ContractTemplate[] {
  return CONTRACT_TEMPLATES;
}

export function getTemplateById(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id);
}
