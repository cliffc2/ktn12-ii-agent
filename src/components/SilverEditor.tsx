"use client";

import { Button } from "@/components/ui/button";
import {
  type CompileResult,
  checkBIP62Compliance,
  compileScript,
  validateScript,
} from "@/lib/silver-script";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Save,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface SilverEditorProps {
  initialCode?: string;
  onChange?: (code: string) => void;
  onCompile?: (result: CompileResult) => void;
}

export default function SilverEditor({
  initialCode = "",
  onChange,
  onCompile,
}: SilverEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [code, setCode] = useState(
    initialCode ||
      `// SilverScript - Write your contract here
// Example: Pay to Public Key Hash
OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG
`,
  );
  const [result, setResult] = useState<CompileResult | null>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [bip62Check, setBip62Check] = useState<{
    compliant: boolean;
    issues: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || "";
      setCode(newCode);
      onChange?.(newCode);
    },
    [onChange],
  );

  const handleCompile = useCallback(() => {
    setLoading(true);
    setResult(null);
    setValidation(null);
    setBip62Check(null);

    try {
      const compileResult = compileScript(code);
      setResult(compileResult);

      if (compileResult.success && compileResult.scriptHex) {
        const validationResult = validateScript(compileResult.scriptHex);
        setValidation(validationResult);

        const bip62 = checkBIP62Compliance(compileResult.scriptHex);
        setBip62Check(bip62);
      }

      onCompile?.(compileResult);
    } catch (e) {
      setResult({ success: false, error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [code, onCompile]);

  const handleReset = useCallback(() => {
    setCode(`// SilverScript - Write your contract here
// Example: Pay to Public Key Hash
OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG
`);
    setResult(null);
    setValidation(null);
    setBip62Check(null);
    editorRef.current?.setValue(code);
  }, [code]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(0_0%_8%)] border-b border-[hsl(0_0%_15%)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider">
            Editor
          </span>
          {result?.success && (
            <CheckCircle className="w-3 h-3 text-emerald-400" />
          )}
          {result?.error && <XCircle className="w-3 h-3 text-red-400" />}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-6 text-[10px] border-[hsl(0_0%_15%)] hover:border-[hsl(0_0%_25%)]"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
          <Button
            onClick={handleCompile}
            disabled={loading}
            className="h-6 text-[10px] bg-violet-400/10 border border-violet-400/50 text-violet-400 hover:bg-violet-400/20"
          >
            <Play className="w-3 h-3 mr-1" />{" "}
            {loading ? "Compiling..." : "Compile"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 12,
            fontFamily: "JetBrains Mono, Monaco, monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            tabSize: 2,
            renderWhitespace: "selection",
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {(result || validation || bip62Check) && (
        <div className="border-t border-[hsl(0_0%_15%)] bg-[hsl(0_0%_8%)] p-3 max-h-48 overflow-y-auto">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
            Compilation Results
          </div>

          {result?.error && (
            <div className="text-[10px] text-red-400 mb-2">
              Error: {result.error}
            </div>
          )}

          {result?.success && (
            <div className="space-y-2">
              {result.address && (
                <div className="text-[10px]">
                  <span className="text-[hsl(0_0%_40%)]">Address: </span>
                  <span className="text-emerald-400 font-mono">
                    {result.address}
                  </span>
                </div>
              )}
              {result.scriptHex && (
                <div className="text-[10px]">
                  <span className="text-[hsl(0_0%_40%)]">Script: </span>
                  <span className="text-cyan-400 font-mono break-all">
                    {result.scriptHex.substring(0, 80)}...
                  </span>
                </div>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <div className="text-[10px] text-amber-400">
                  Warnings: {result.warnings.join(", ")}
                </div>
              )}
            </div>
          )}

          {validation && (
            <div className="mt-2 pt-2 border-t border-[hsl(0_0%_15%)]">
              <div className="flex items-center gap-1.5 mb-1">
                {validation.valid ? (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
                <span className="text-[10px] text-[hsl(0_0%_50%)]">
                  Script Validation: {validation.valid ? "Valid" : "Invalid"}
                </span>
              </div>
              {validation.errors.length > 0 && (
                <div className="text-[10px] text-red-400">
                  {validation.errors.map((e, i) => (
                    <div key={i}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {bip62Check && (
            <div className="mt-2 pt-2 border-t border-[hsl(0_0%_15%)]">
              <div className="flex items-center gap-1.5 mb-1">
                {bip62Check.compliant ? (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                )}
                <span className="text-[10px] text-[hsl(0_0%_50%)]">
                  BIP-62 Compliance:{" "}
                  {bip62Check.compliant ? "Compliant" : "Issues Found"}
                </span>
              </div>
              {bip62Check.issues.length > 0 && (
                <div className="text-[10px] text-amber-400">
                  {bip62Check.issues.map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
