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
    console.log('[API/Submit] Received payload for:', data.participantName);

    const {
      participantName,
      testSectionId,
      mentalFatigue,
      focusLevel,
      physicalFatigue,
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

    // Ensure numeric types for Prisma 7 strictness
    const mF = Number(mentalFatigue) || 3;
    const fL = Number(focusLevel) || 3;
    const pF = Number(physicalFatigue) || 3;
    const w = Number(wpm) || 0;
    const eR = Number(errorRate) || 0;

    // Clean keystrokes: remove modifier keys, remove zero-dwell rows
    const rawKeystrokes = (keystrokes || []) as KeystrokeInput[];
    const cleanedKeystrokes = rawKeystrokes.filter(
      (ks) => ks && !EXCLUDED_KEYS.has(ks.key) && Number(ks.releaseTime) >= Number(ks.pressTime)
    );

    // Fatigue label: any high score (>=4) in the 3 metrics counts as fatigued
    const fatigueLabel = (mF >= 4 || fL >= 4 || pF >= 4) ? 1 : 0;

    // Upsert participant
    const participant = await prisma.participant.upsert({
      where: { name: participantName.trim() },
      update: {},
      create: { name: participantName.trim() },
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        participantId: participant.id,
        testSectionId: testSectionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mentalFatigue: mF,
        focusLevel: fL,
        physicalFatigue: pF,
        fatigueLabel,
        wpm: w,
        errorRate: eR,
        targetText: String(targetText || ""),
        typedText: String(typedText || ""),
        keystrokes: {
          create: cleanedKeystrokes.map((ks) => ({
            key: String(ks.key),
            pressTime: Number(ks.pressTime),
            releaseTime: Number(ks.releaseTime),
          })),
        },
      },
    });

    console.log('[API/Submit] Success! Session ID:', session.id);
    return NextResponse.json({ success: true, sessionId: session.id, participantId: participant.id });
  } catch (error: any) {
    console.error('[API/Submit] Error Details:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save session',
      details: error.message 
    }, { status: 500 });
  }
}
