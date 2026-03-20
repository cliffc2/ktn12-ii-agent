import { NextResponse } from "next/server";
import { getDeadmanStatus } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getDeadmanStatus());
}