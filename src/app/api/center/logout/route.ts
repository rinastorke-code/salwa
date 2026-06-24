import { NextResponse } from 'next/server';
import { clearCenterSession } from '@/lib/center-session';
export const runtime = 'nodejs';
export async function POST() { clearCenterSession(); return NextResponse.json({ ok: true }); }
