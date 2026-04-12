import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface KeystrokeInput {
  key: string;
  pressTime: number;
  releaseTime: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mentalFatigue, focusLevel, targetText, typedText, keystrokes, wpm, errorRate } = data;
    const prisma = getPrisma();

    // Strict Cognitive Fatigue Label Logic
    // Ignoring physical fatigue explicitly as requested.
    const fatigueLabel = (mentalFatigue <= 2 && focusLevel <= 2) ? 0 : 1;

    const session = await prisma.session.create({
      data: {
        mentalFatigue,
        focusLevel,
        fatigueLabel,
        wpm,
        errorRate,
        targetText,
        typedText,
        keystrokes: {
          create: keystrokes.map((ks: KeystrokeInput) => ({
            key: ks.key,
            pressTime: ks.pressTime,
            releaseTime: ks.releaseTime,
          }))
        }
      }
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
  }
}
