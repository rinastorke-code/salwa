import { NextResponse } from 'next/server';
import { destroyCenterSession } from '@/lib/center-session';

export async function POST() {
  await destroyCenterSession();
  return NextResponse.json({ success: true });
}
