"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface WizardConfig {
  steps: WizardStep[];
  generateScript: (answers: Record<string, string>) => string;
}

const WIZARDS: Record<string, WizardConfig> = {
  escrow: {
    steps: [
      {
        id: "buyer",
        title: "Buyer Key",
        description: "Public key of the buyer",
      },
      {
        id: "seller",
        title: "Seller Key",
        description: "Public key of the seller",
      },
      {
        id: "arbiter",
        title: "Arbiter Key",
        description: "Public key of the arbiter (optional)",
      },
      {
        id: "timeout",
        title: "Timeout",
        description: "Timeout in blocks for refund",
      },
    ],
    generateScript: (answers) => {
      const buyer = answers.buyer || "00".repeat(33);
      const seller = answers.seller || "00".repeat(33);
      const arbiter = answers.arbiter || "00".repeat(20);
      const timeout = answers.timeout || "1440";
      return `OP_IF OP_2 ${buyer} ${seller} OP_2 OP_CHECKMULTISIG OP_ELSE ${timeout} OP_CHECKSEQUENCEVERIFY OP_DROP ${arbiter} OP_CHECKSIG OP_ENDIF`;
    },
  },
  timelock: {
    steps: [
      { id: "owner", title: "Owner Key", description: "Owner's public key" },
      {
        id: "recovery",
        title: "Recovery Key",
        description: "Emergency recovery key",
      },
      {
        id: "unlockHeight",
        title: "Unlock Block",
        description: "Block height to unlock",
      },
    ],
    generateScript: (answers) => {
      const owner = answers.owner || "00".repeat(33);
      const recovery = answers.recovery || "00".repeat(33);
      const height = answers.unlockHeight || "10080";
      return `OP_IF ${owner} OP_CHECKSIG OP_ELSE ${height} OP_CHECKLOCKTIMEVERIFY OP_DROP ${recovery} OP_CHECKSIG OP_ENDIF`;
    },
  },
  hashlock: {
    steps: [
      { id: "hash", title: "Hash", description: "SHA-256 hash (hex)" },
      { id: "sender", title: "Sender Key", description: "Sender's public key" },
      {
        id: "recipient",
        title: "Recipient Key",
        description: "Recipient's public key",
      },
      {
        id: "refundHeight",
        title: "Refund Height",
        description: "Block height for refund",
      },
    ],
    generateScript: (answers) => {
      const hash = answers.hash || "00".repeat(32);
      const sender = answers.sender || "00".repeat(33);
      const recipient = answers.recipient || "00".repeat(33);
      const height = answers.refundHeight || "1440";
      return `OP_HASH160 ${hash} OP_EQUALVERIFY OP_IF ${recipient} OP_CHECKSIG OP_ELSE ${height} OP_CHECKLOCKTIMEVERIFY OP_DROP ${sender} OP_CHECKSIG OP_ENDIF`;
    },
  },
  deadman: {
    steps: [
      { id: "owner", title: "Owner Key", description: "Owner's public key" },
      {
        id: "beneficiary",
        title: "Beneficiary Key",
        description: "Beneficiary's public key hash",
      },
      {
        id: "timeout",
        title: "Timeout Blocks",
        description: "Blocks of inactivity before claim",
      },
    ],
    generateScript: (answers) => {
      const owner = answers.owner || "00".repeat(33);
      const beneficiary = answers.beneficiary || "00".repeat(20);
      const timeout = answers.timeout || "10080";
      return `OP_IF ${owner} OP_CHECKSIG OP_ELSE ${timeout} OP_CHECKSEQUENCEVERIFY OP_DROP ${beneficiary} OP_EQUALVERIFY OP_CHECKSIG OP_ENDIF`;
    },
  },
  recurring: {
    steps: [
      { id: "payer", title: "Payer Key", description: "Payer's public key" },
      {
        id: "recipient",
        title: "Recipient Key",
        description: "Recipient's public key",
      },
    ],
    generateScript: (answers) => {
      const payer = answers.payer || "00".repeat(33);
      const recipient = answers.recipient || "00".repeat(33);
      return `OP_IF ${recipient} OP_CHECKSIG OP_ELSE ${payer} OP_CHECKSIG OP_ENDIF`;
    },
  },
};

const WIZARD_ICONS: Record<string, React.ElementType> = {
  escrow: Shield,
  timelock: Clock,
  hashlock: ArrowDownUp,
  deadman: RefreshCw,
  recurring: Users,
};

interface ContractWizardProps {
  onGenerate?: (script: string) => void;
}

export default function ContractWizard({ onGenerate }: ContractWizardProps) {
  const [wizardType, setWizardType] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const wizard = wizardType ? WIZARDS[wizardType] : null;

  const handleStart = (type: string) => {
    setWizardType(type);
    setCurrentStep(0);
    setAnswers({});
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setWizardType(null);
    }
  };

  const handleNext = () => {
    if (wizard && currentStep < wizard.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    if (wizard) {
      const script = wizard.generateScript(answers);
      onGenerate?.(script);
      setWizardType(null);
      setCurrentStep(0);
      setAnswers({});
    }
  };

  const updateAnswer = (key: string, value: string) => {
    setAnswers({ ...answers, [key]: value });
  };

  if (!wizardType) {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider px-2 mb-2">
          Wizards
        </div>
        {Object.entries(WIZARDS).map(([type, config]) => {
          const Icon = WIZARD_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => handleStart(type)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded hover:border-violet-400/30 hover:bg-[hsl(0_0%_5%)] transition-all"
            >
              <Icon className="w-3 h-3 text-violet-400" />
              <span className="text-[hsl(0_0%_60%)] capitalize">
                {config.steps[0].title.split(" ")[0]}...
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (!wizard) {
    return null;
  }

  const step = wizard.steps[currentStep];
  const isLastStep = currentStep === wizard.steps.length - 1;

  return (
    <div className="p-3 bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleBack}
          className="text-[hsl(0_0%_40%)] hover:text-[hsl(0_0%_60%)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase">
          Step {currentStep + 1} of {wizard.steps.length}
        </div>
        <div className="w-4" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-3"
        >
          <div>
            <div className="text-xs text-violet-400 font-medium">
              {step.title}
            </div>
            <div className="text-[9px] text-[hsl(0_0%_40%)]">
              {step.description}
            </div>
          </div>

          <Input
            value={answers[step.id] || ""}
            onChange={(e) => updateAnswer(step.id, e.target.value)}
            placeholder={`Enter ${step.title.toLowerCase()}...`}
            className="bg-[hsl(0_0%_2%)] border-[hsl(0_0%_10%)] text-xs h-8"
          />

          <div className="flex gap-2">
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-[10px] border-[hsl(0_0%_15%)]"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              size="sm"
              className="flex-1 h-7 text-[10px] bg-violet-400/10 border border-violet-400/50 text-violet-400"
            >
              {isLastStep ? "Generate" : "Next"}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
