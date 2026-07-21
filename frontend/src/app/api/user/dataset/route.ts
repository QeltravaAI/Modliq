import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { API_URL } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('modliq_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { datasetId } = body;

    if (!datasetId) {
      return NextResponse.json({ error: 'datasetId is required' }, { status: 400 });
    }

    const res = await fetch(`${API_URL}/api/v1/workspace/${payload.userId}/dataset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ datasetId }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Backend failed to save dataset:', res.status, detail);
      return NextResponse.json(
        { error: 'Failed to save dataset', status: res.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, datasetId });
  } catch (error) {
    console.error('Error updating active dataset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('modliq_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch(`${API_URL}/api/v1/workspace/${payload.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
