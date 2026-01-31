"use client";

import { useState, useEffect } from "react";

interface SystemStatus {
  timestamp: string;
  supabase: { configured: boolean; connected: boolean };
  tables: Record<string, { exists: boolean; count: number }>;
  environment: { hasSupabaseUrl: boolean; hasSupabaseKey: boolean; nodeEnv: string };
}

interface Stats {
  analyses: {
    total: number;
    withFeedback: number;
    successRate: number;
    byPlatform: Record<string, number>;
  };
  training: {
    total: number;
    bySource: Record<string, number>;
    byPlatform: Record<string, number>;
  };
  patterns: {
    total: number;
    topIssues: { type: string; count: number; successRate: number }[];
  };
}

export default function DebugPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [collectResult, setCollectResult] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch("/api/debug?action=status"),
        fetch("/api/debug?action=stats"),
      ]);
      setStatus(await statusRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error("Load error:", error);
    }
    setLoading(false);
  };

  const runCollect = async (source: string) => {
    setCollectResult("Collecting...");
    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, limit: 20 }),
      });
      const data = await res.json();
      setCollectResult(`${source}: ${data.collected} collected, ${data.saved} saved`);
      loadData(); // 새로고침
    } catch (error) {
      setCollectResult(`Error: ${error}`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="animate-pulse">Loading debug info...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Debug Dashboard</h1>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* System Status */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusCard
              title="Supabase"
              value={status?.supabase.connected ? "Connected" : "Disconnected"}
              ok={status?.supabase.connected}
            />
            <StatusCard
              title="Env Vars"
              value={status?.environment.hasSupabaseUrl && status?.environment.hasSupabaseKey ? "OK" : "Missing"}
              ok={status?.environment.hasSupabaseUrl && status?.environment.hasSupabaseKey}
            />
            <StatusCard
              title="Mode"
              value={status?.environment.nodeEnv || "unknown"}
              ok={true}
            />
            <StatusCard
              title="Last Check"
              value={status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : "-"}
              ok={true}
            />
          </div>
        </section>

        {/* Tables */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Database Tables</h2>
          <div className="grid grid-cols-3 gap-4">
            {status?.tables && Object.entries(status.tables).map(([name, info]) => (
              <div key={name} className="bg-gray-700 rounded p-4">
                <div className="text-gray-400 text-sm">{name}</div>
                <div className="text-2xl font-bold">{info.count}</div>
                <div className={`text-sm ${info.exists ? "text-green-400" : "text-red-400"}`}>
                  {info.exists ? "OK" : "Missing"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Analyses */}
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-semibold mb-2">Analyses</h3>
              <div className="space-y-1 text-sm">
                <div>Total: {stats?.analyses.total || 0}</div>
                <div>With Feedback: {stats?.analyses.withFeedback || 0}</div>
                <div>Success Rate: {stats?.analyses.successRate || 0}%</div>
              </div>
              {stats?.analyses.byPlatform && Object.keys(stats.analyses.byPlatform).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">By Platform:</div>
                  {Object.entries(stats.analyses.byPlatform).map(([p, c]) => (
                    <div key={p} className="text-xs">{p}: {c}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Training */}
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-semibold mb-2">Training Data</h3>
              <div className="text-sm">Total: {stats?.training.total || 0}</div>
              {stats?.training.bySource && Object.keys(stats.training.bySource).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">By Source:</div>
                  {Object.entries(stats.training.bySource).map(([s, c]) => (
                    <div key={s} className="text-xs">{s}: {c}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Patterns */}
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-semibold mb-2">Issue Patterns</h3>
              <div className="text-sm">Total: {stats?.patterns.total || 0}</div>
              {stats?.patterns.topIssues && stats.patterns.topIssues.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">Top Issues:</div>
                  {stats.patterns.topIssues.slice(0, 5).map((issue) => (
                    <div key={issue.type} className="text-xs">
                      {issue.type}: {issue.count} ({issue.successRate}%)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Manual Collection */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Manual Data Collection</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => runCollect("civitai")}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
            >
              Collect from Civitai
            </button>
            <button
              onClick={() => runCollect("reddit")}
              className="px-4 py-2 bg-orange-600 rounded hover:bg-orange-700"
            >
              Collect from Reddit
            </button>
            <button
              onClick={() => runCollect("lexica")}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            >
              Collect from Lexica
            </button>
          </div>
          {collectResult && (
            <div className="mt-4 p-3 bg-gray-700 rounded text-sm font-mono">
              {collectResult}
            </div>
          )}
        </section>

        {/* Links */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="flex gap-4 flex-wrap">
            <a href="/" className="text-blue-400 hover:underline">Home</a>
            <a href="https://vercel.com/dashboard" target="_blank" className="text-blue-400 hover:underline">Vercel Dashboard</a>
            <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-400 hover:underline">Supabase Dashboard</a>
            <a href="https://adsense.google.com" target="_blank" className="text-blue-400 hover:underline">AdSense</a>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ title, value, ok }: { title: string; value: string; ok?: boolean }) {
  return (
    <div className="bg-gray-700 rounded p-4">
      <div className="text-gray-400 text-sm">{title}</div>
      <div className={`text-lg font-semibold ${ok === false ? "text-red-400" : ok === true ? "text-green-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}
