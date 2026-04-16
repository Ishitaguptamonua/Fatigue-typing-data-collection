import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface KeystrokeInput {
  key: string;
  pressTime: number;
  releaseTime: number;
}

// Keys to exclude from ML processing
const EXCLUDED_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete',
  'Escape', 'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
]);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      participantName,
      mentalFatigue,
      focusLevel,
      targetText,
      typedText,
      keystrokes,
      wpm,
      errorRate,
    } = data;

    if (!participantName?.trim()) {
      return NextResponse.json({ success: false, error: 'Participant name is required' }, { status: 400 });
    }

    const prisma = getPrisma();

    // Clean keystrokes: remove modifier keys, remove zero-dwell rows
    const cleanedKeystrokes: KeystrokeInput[] = (keystrokes as KeystrokeInput[]).filter(
      (ks) => !EXCLUDED_KEYS.has(ks.key) && ks.releaseTime > ks.pressTime
    );

    // Fatigue label: high mental fatigue OR high difficulty concentrating = fatigued
    const fatigueLabel = (mentalFatigue >= 4 || focusLevel >= 4) ? 1 : 0;

    // Upsert participant (find or create by name)
    const participant = await prisma.participant.upsert({
      where: { name: participantName.trim() },
      update: {},
      create: { name: participantName.trim() },
    });

    // Create session linked to participant
    const session = await prisma.session.create({
      data: {
        participantId: participant.id,
        mentalFatigue,
        focusLevel,
        fatigueLabel,
        wpm,
        errorRate,
        targetText,
        typedText,
        keystrokes: {
          create: cleanedKeystrokes.map((ks) => ({
            key: ks.key,
            pressTime: ks.pressTime,
            releaseTime: ks.releaseTime,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id, participantId: participant.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
  }
}
