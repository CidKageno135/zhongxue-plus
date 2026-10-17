import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { strokes, width = 300, height = 300 } = await req.json();
    if (!Array.isArray(strokes) || strokes.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    const payload = {
      requests: [
        {
          writing_guide: {
            writing_area_width: width,
            writing_area_height: height,
          },
          ink: strokes,
        },
      ],
    };

    const res = await fetch('https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ candidates: [] });
    }

    const data = await res.json();
    const candidates: string[] = data?.[1]?.[0]?.[1] || [];
    return NextResponse.json({ candidates });
  } catch (error) {
    return NextResponse.json({
      candidates: [],
      error: error instanceof Error ? error.message : 'Recognition failed',
    });
  }
}
