import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.execute(sql`
      SELECT table_name, column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sessions', 'allowed_users')
      ORDER BY table_name, ordinal_position
    `);
    
    return NextResponse.json({ 
      success: true, 
      schema: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
