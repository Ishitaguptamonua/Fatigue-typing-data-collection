import { PrismaClient } from '@prisma/client';
import { Database, Activity, Hash, Clock, MousePointer2, Lock } from 'lucide-react';
import ExportButton from './ExportButton';

// Force dynamic rendering since we want to always see real-time data
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function AdminDashboard({ searchParams }: { searchParams: { pass?: string } }) {
  const password = await searchParams; // Next.js 15+ searchParams is an awaitable
  const accessGranted = (password as any).pass === "87654321";

  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-3xl text-center">
          <Lock className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2 font-sans underline decoration-indigo-500/50">Registry Locked</h1>
          <p className="text-slate-400 mb-8 text-sm">Please provide the administrative key to access the research data.</p>
          <form className="space-y-4">
            <input 
              name="pass" 
              type="password" 
              placeholder="Enter Access Key..." 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors">
              Request Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100 
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans p-8 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/10 pb-6 gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
              <Database className="text-indigo-400" />
              Dataset Registry
            </h1>
            <p className="text-slate-400 mt-2">Internal viewing strictly for fatigue markers.</p>
          </div>
          <div className="flex flex-col items-end gap-3 font-mono">
            <div className="flex items-center gap-4">
               <ExportButton data={sessions} />
               <div className="text-right">
                <div className="text-3xl font-mono text-indigo-400">{sessions.length} / 60</div>
                <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Sessions Counted</div>
               </div>
            </div>
          </div>
        </header>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 text-xs uppercase tracking-widest text-slate-400 border-b border-white/10">
                  <th className="p-4 font-semibold"><Hash className="w-4 h-4 inline mr-1" /> ID</th>
                  <th className="p-4 font-semibold"><Clock className="w-4 h-4 inline mr-1" /> Time</th>
                  <th className="p-4 font-semibold">WPM</th>
                  <th className="p-4 font-semibold">Accuracy</th>
                  <th className="p-4 font-semibold text-center"><Activity className="w-4 h-4 inline mr-1" /> Label (Target)</th>
                  <th className="p-4 text-center font-semibold"><MousePointer2 className="w-4 h-4 inline mr-1" /> Mental / Focus</th>
                </tr>
              </thead>
              <tbody className="text-sm font-mono divide-y divide-white/5">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 font-sans">
                      No sessions have been recorded yet. Take the test!
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-slate-500">...{session.id.slice(-6)}</td>
                      <td className="p-4 text-slate-300">{new Date(session.createdAt).toLocaleString()}</td>
                      <td className="p-4 text-emerald-400">{Math.round(session.wpm)}</td>
                      <td className="p-4 text-indigo-400">
                        {Math.max(0, 100 - session.errorRate).toFixed(1)}%
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                          session.fatigueLabel === 1 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {session.fatigueLabel === 1 ? '1 - FATIGUED' : '0 - RESTED'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        M{session.mentalFatigue} / F{session.focusLevel}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
