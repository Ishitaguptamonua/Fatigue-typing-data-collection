"use client";

import { Download } from 'lucide-react';

export default function ExportButton({ data }: { data: any[] }) {
  const downloadCsv = () => {
    const header = "SessionId,Date,MentalFatigue,FocusLevel,FatigueLabel,WPM,Accuracy,TargetText,TypedText\n";
    const csvContent = data.map(s => {
      const date = new Date(s.createdAt).toISOString();
      const accuracy = (100 - s.errorRate).toFixed(2);
      return `"${s.id}","${date}",${s.mentalFatigue},${s.focusLevel},${s.fatigueLabel},${s.wpm.toFixed(2)},${accuracy}%,"${s.targetText.replace(/"/g, '""')}","${s.typedText.replace(/"/g, '""')}"`;
    }).join("\n");

    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatigue_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <button 
      onClick={downloadCsv}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
    >
      <Download className="w-4 h-4" />
      Export to CSV
    </button>
  );
}
