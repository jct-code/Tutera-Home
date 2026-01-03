import { NextResponse } from "next/server";
import { getCurrentUserSimple } from "@/lib/auth-simple";

export async function GET() {
  try {
    const user = await getCurrentUserSimple();
    
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
