import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SEGMENT_SIZE = 50; // keystrokes per segment
const PAUSE_THRESHOLD_MS = 500; // flight time > 500ms = pause

interface KeystrokeRow {
  key: string;
  pressTime: number;
  releaseTime: number;
}

interface SegmentFeatures {
  participant: string;
  session: string;
  segment: number;
  totalSegments: number;
  keystrokeCount: number;
  meanDwell: number;
  meanFlight: number;
  meanDD: number;
  speed: number;         // keys per second
  pauseRate: number;     // fraction of inter-key intervals > 500ms
  dwellStd: number;
  flightStd: number;
  label: number;         // fatigueLabel from session
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function processSegment(
  ks: KeystrokeRow[],
  segIdx: number,
  totalSegs: number,
  participantName: string,
  sessionId: string,
  fatigueLabel: number
): SegmentFeatures {
  const dwells: number[] = [];
  const flights: number[] = [];
  const dds: number[] = [];
  let pauses = 0;

  for (let i = 0; i < ks.length; i++) {
    const dwell = ks[i].releaseTime - ks[i].pressTime;
    if (dwell > 0) dwells.push(dwell);

    if (i < ks.length - 1) {
      const flight = ks[i + 1].pressTime - ks[i].releaseTime;
      const dd = ks[i + 1].pressTime - ks[i].pressTime;
      flights.push(flight);
      dds.push(dd);
      if (flight > PAUSE_THRESHOLD_MS) pauses++;
    }
  }

  const timeSpanMs = ks[ks.length - 1].releaseTime - ks[0].pressTime;
  const speed = timeSpanMs > 0 ? (ks.length / timeSpanMs) * 1000 : 0; // keys/sec

  const meanDwell = dwells.length > 0 ? dwells.reduce((a, b) => a + b, 0) / dwells.length : 0;
  const meanFlight = flights.length > 0 ? flights.reduce((a, b) => a + b, 0) / flights.length : 0;
  const meanDD = dds.length > 0 ? dds.reduce((a, b) => a + b, 0) / dds.length : 0;
  const pauseRate = flights.length > 0 ? pauses / flights.length : 0;

  return {
    participant: participantName,
    session: sessionId,
    segment: segIdx + 1,
    totalSegments: totalSegs,
    keystrokeCount: ks.length,
    meanDwell: +meanDwell.toFixed(3),
    meanFlight: +meanFlight.toFixed(3),
    meanDD: +meanDD.toFixed(3),
    speed: +speed.toFixed(4),
    pauseRate: +pauseRate.toFixed(4),
    dwellStd: +std(dwells).toFixed(3),
    flightStd: +std(flights).toFixed(3),
    label: fatigueLabel,
  };
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const sessions = await prisma.session.findMany({
      include: {
        participant: true,
        keystrokes: { orderBy: { pressTime: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const allRows: SegmentFeatures[] = [];

    for (const session of sessions) {
      const ks = session.keystrokes as (KeystrokeRow & { participantId?: string; testSectionId?: string })[];
      if (ks.length < SEGMENT_SIZE) continue; // skip sessions too short to segment

      const segments: KeystrokeRow[][] = [];
      for (let start = 0; start + SEGMENT_SIZE <= ks.length; start += SEGMENT_SIZE) {
        segments.push(ks.slice(start, start + SEGMENT_SIZE));
      }

      // Optionally include a smaller trailing segment if >= half segment size
      const remainder = ks.slice(segments.length * SEGMENT_SIZE);
      if (remainder.length >= SEGMENT_SIZE / 2) {
        segments.push(remainder);
      }

      segments.forEach((seg, i) => {
        allRows.push(
          processSegment(
            seg,
            i,
            segments.length,
            session.participant.name,
            session.testSectionId || session.id,
            session.fatigueLabel
          )
        );
      });
    }

    if (allRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No sessions with enough keystrokes to segment.' }, { status: 404 });
    }

    // Serialize as CSV
    const headers = [
      'Participant', 'Session', 'Segment', 'MeanDwell', 'MeanFlight', 
      'Speed', 'PauseRate', 'DwellStd', 'FlightStd', 'Label'
    ];

    const csvRows = [
      headers.join(','),
      ...allRows.map(r => [
        `"${r.participant}"`,
        `"${r.session}"`,
        r.segment,
        r.meanDwell,
        r.meanFlight,
        r.speed,
        r.pauseRate,
        r.dwellStd,
        r.flightStd,
        r.label,
      ].join(','))
    ].join('\n');

    return new Response(csvRows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="fatigue_ml_dataset.csv"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
  }
}
