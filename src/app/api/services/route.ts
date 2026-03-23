import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

const IGRA_PATH = "/Users/ghostgear/igra-orchestra";

async function runCommand(
  cmd: string,
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: IGRA_PATH });
    return { success: true, output: stdout || stderr };
  } catch (e) {
    const err = e as Error;
    return { success: false, output: "", error: err.message };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service } = body;

    let result: { success: boolean; output: string; error?: string } = {
      success: false,
      output: "",
    };

    if (service === "igra-backend") {
      if (action === "start") {
        result = await runCommand(
          "set -a && source versions.env && set +a && docker compose --profile backend up -d",
        );
      } else if (action === "stop") {
        result = await runCommand("docker compose --profile backend down");
      }
    } else if (service === "igra-workers") {
      if (action === "start") {
        result = await runCommand(
          "set -a && source versions.env && set +a && docker compose --profile frontend-w2 up -d",
        );
      } else if (action === "stop") {
        result = await runCommand("docker compose --profile frontend-w2 down");
      }
    } else if (service === "kaspad") {
      if (action === "start") {
        result = await runCommand(
          "set -a && source versions.env && set +a && docker compose --profile kaspad up -d",
        );
      } else if (action === "stop") {
        result = await runCommand("docker compose --profile kaspad down");
      }
    } else if (service === "all") {
      if (action === "start") {
        result = await runCommand(
          "set -a && source versions.env && set +a && docker compose up -d",
        );
      } else if (action === "stop") {
        result = await runCommand("docker compose down");
      }
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${service} ${action}ed`,
        output: result.output,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const services = [
    { name: "kaspad", port: 16210 },
    { name: "igra-backend", port: 8545 },
    { name: "igra-workers", port: 8080 },
    { name: "agent", port: 3000 },
  ];

  const status = await Promise.all(
    services.map(async (svc) => {
      try {
        if (svc.name === "agent") {
          const resp = await fetch("http://localhost:3000/api/agent/status");
          const data = await resp.json();
          return { ...svc, status: data.running ? "running" : "stopped" };
        }

        const resp = await fetch(`http://localhost:${svc.port}`, {
          method: "HEAD",
        });
        return { ...svc, status: resp.ok ? "running" : "stopped" };
      } catch {
        return { ...svc, status: "stopped" };
      }
    }),
  );

  return NextResponse.json({ services: status });
}
