import React, { useState } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle, Target,
  Zap, ChevronRight, RefreshCw
} from 'lucide-react';
import { analyzeProgress } from '../api/client';
import type { ProgressAnalysis, UserProfile } from '../types';

interface Props { user: UserProfile }

const severityConfig = {
  high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🔴' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: '🟡' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: '🔵' },
};

function ScoreGauge({ score }: { score: number }) {
  const angle = (score / 10) * 180 - 90;
  const color = score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 120 60" className="w-32 h-16">
          {/* Background arc */}
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#1f2937" strokeWidth="8" />
          {/* Colored arc */}
          <path
            d="M 10 55 A 50 50 0 0 1 110 55"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(score / 10) * 157} 157`}
          />
          {/* Needle */}
          <line
            x1="60" y1="55"
            x2={60 + 35 * Math.cos(((angle - 90) * Math.PI) / 180)}
            y2={55 + 35 * Math.sin(((angle - 90) * Math.PI) / 180)}
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="60" cy="55" r="3" fill={color} />
        </svg>
      </div>
      <p className="text-2xl font-black" style={{ color }}>{score}/10</p>
    </div>
  );
}

export default function ProgressAnalysisPage({ user }: Props) {
  const [analysis, setAnalysis] = useState<ProgressAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const result = await analyzeProgress(user.id);
      setAnalysis(result);
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 flex flex-col items-center gap-6 fade-in">
        <div className="w-20 h-20 bg-primary-500/20 rounded-3xl flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-primary-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Progress Check</h2>
          <p className="text-gray-400 text-sm max-w-xs">
            AI analyzes your last 7 days of data to identify exactly why you are or aren't making progress
          </p>
        </div>
        <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" /> Analyzing…</>
          ) : (
            <><Zap className="w-4 h-4" /> Analyze My Progress</>
          )}
        </button>

        <div className="w-full card text-center py-4">
          <p className="text-sm text-gray-400">This will examine:</p>
          <div className="mt-2 space-y-1 text-xs text-gray-300">
            {['Calorie & macro adherence', 'Workout consistency', 'Step count vs target', 'Sleep & recovery patterns', 'Nutritional gaps'].map(item => (
              <p key={item} className="flex items-center justify-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary-400" /> {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Progress Analysis</h1>
        <button onClick={run} disabled={loading} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'spin' : ''}`} />
          Re-analyze
        </button>
      </div>

      {/* Score Gauge */}
      <div className="card flex flex-col items-center gap-2">
        <p className="text-sm font-semibold text-gray-400">Overall Adherence Score</p>
        <ScoreGauge score={analysis.progress_score} />
        <p className="text-sm text-gray-300 text-center max-w-sm">{analysis.overall_assessment}</p>
      </div>

      {/* Top Priority */}
      <div className="card bg-primary-500/10 border-primary-500/30">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-1">Top Priority This Week</p>
            <p className="text-sm text-primary-200">{analysis.top_priority}</p>
          </div>
        </div>
      </div>

      {/* Issues */}
      {analysis.issues?.length > 0 && (
        <div className="space-y-2">
          <h2 className="section-title flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" /> Issues Identified
          </h2>
          {analysis.issues.map((issue, i) => {
            const config = severityConfig[issue.severity] || severityConfig.low;
            return (
              <div key={i} className={`card ${config.bg} border ${config.border}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span>{config.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${config.text} uppercase tracking-wide`}>
                        {issue.category}
                      </span>
                      <span className={`badge ${config.bg} ${config.text} border ${config.border}`}>
                        {issue.severity} priority
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">{issue.issue}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2">{issue.data_evidence}</p>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                  <p className="text-xs text-green-300"><strong>Fix: </strong>{issue.fix}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wins */}
      {analysis.wins?.length > 0 && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" /> What You're Doing Well
          </h2>
          <div className="space-y-2">
            {analysis.wins.map((win, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-400 mt-0.5">✓</span>
                {win}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjusted Recommendations */}
      {analysis.adjusted_recommendation && (
        <div className="card">
          <h2 className="section-title">Adjusted Targets</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Daily Calories', value: `${analysis.adjusted_recommendation.calories} kcal`, color: 'text-orange-400' },
              { label: 'Daily Protein', value: `${analysis.adjusted_recommendation.protein_g}g`, color: 'text-green-400' },
              { label: 'Workouts/Week', value: `${analysis.adjusted_recommendation.workouts_per_week}x`, color: 'text-blue-400' },
              { label: 'Steps/Day', value: analysis.adjusted_recommendation.steps_per_day.toLocaleString(), color: 'text-purple-400' },
            ].map(r => (
              <div key={r.label} className="bg-gray-800 rounded-xl p-3">
                <p className={`text-base font-bold ${r.color}`}>{r.value}</p>
                <p className="text-xs text-gray-400">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
