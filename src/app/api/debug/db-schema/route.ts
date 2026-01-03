import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    
    const columnsResult = await pool.query(`
      SELECT table_name, column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
    
    await pool.end();
    
    return NextResponse.json({ 
      success: true, 
      tables: tablesResult.rows,
      columns: columnsResult.rows,
      dbUrl: process.env.DATABASE_URL ? "configured" : "missing",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await pool.end();
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      dbUrl: process.env.DATABASE_URL ? "configured" : "missing"
    }, { status: 500 });
  }
}
