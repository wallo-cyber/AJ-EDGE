import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/google/agent-runner';

export async function POST(req: Request) {
  try {
    const { role, task, context } = await req.json();

    if (!role || !task) {
      return NextResponse.json(
        { error: 'Role and task are required.' },
        { status: 400 }
      );
    }

    const result = await runAgent({ role, task, context });

    return NextResponse.json({ success: true, response: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to execute agent task.' },
      { status: 500 }
    );
  }
}