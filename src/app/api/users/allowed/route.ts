import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowedUsers } from "@/lib/schema";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "joetutera@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.select().from(allowedUsers).orderBy(allowedUsers.createdAt);
    
    return NextResponse.json({ 
      users,
      isAdmin: currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    });
  } catch (error) {
    console.error("Error fetching allowed users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const existing = await db.select().from(allowedUsers).where(eq(allowedUsers.email, normalizedEmail));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already in the approved list" }, { status: 409 });
    }

    const [newUser] = await db.insert(allowedUsers).values({
      email: normalizedEmail,
      addedBy: currentUser.email || "unknown",
    }).returning();

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Error adding allowed user:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Only the admin can delete users" }, { status: 403 });
    }

    const { email } = await request.json();
    
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Cannot remove the admin user" }, { status: 400 });
    }

    await db.delete(allowedUsers).where(eq(allowedUsers.email, normalizedEmail));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting allowed user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
