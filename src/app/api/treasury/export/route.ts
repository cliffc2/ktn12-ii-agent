import { NextResponse } from "next/server";
import { exportCSV } from "@/lib/treasury/wallet";

export async function GET() {
  const csv = await exportCSV();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="treasury_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}