"use client";

import { Download, FlaskConical } from 'lucide-react';
import { useState } from 'react';

interface Session {
  id: string;
  participantId: string;
  createdAt: Date | string;
  mentalFatigue: number;
  focusLevel: number;
  fatigueLabel: number;
  wpm: number;
  errorRate: number;
  targetText: string;
  typedText: string;
  participant?: { name: string };
}

export default function ExportButton({ data }: { data: Session[] }) {
  const [mlExporting, setMlExporting] = useState(false);

  const downloadRawCsv = () => {
    const header = "SessionId,Participant,Date,MentalFatigue,FocusLevel,FatigueLabel,WPM,Accuracy,TargetText,TypedText\n";
    const csvContent = data.map(s => {
      const date = new Date(s.createdAt).toISOString();
      const accuracy = (100 - s.errorRate).toFixed(2);
      const name = s.participant?.name ?? s.participantId;
      return `"${s.id}","${name}","${date}",${s.mentalFatigue},${s.focusLevel},${s.fatigueLabel},${s.wpm.toFixed(2)},${accuracy}%,"${s.targetText.replace(/"/g, '""')}","${s.typedText.replace(/"/g, '""')}"`;
    }).join("\n");

    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatigue_sessions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadMlDataset = async () => {
    setMlExporting(true);
    try {
      const res = await fetch('/api/ml-export');
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'ML export failed');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatigue_ml_dataset_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('ML export failed. Check console for details.');
    } finally {
      setMlExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        id="export-raw-btn"
        onClick={downloadRawCsv}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all border border-white/10"
      >
        <Download className="w-4 h-4" />
        Sessions CSV
      </button>
      <button
        id="export-ml-btn"
        onClick={downloadMlDataset}
        disabled={mlExporting}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
      >
        <FlaskConical className="w-4 h-4" />
        {mlExporting ? 'Processing...' : 'ML Dataset CSV'}
      </button>
    </div>
  );
}
