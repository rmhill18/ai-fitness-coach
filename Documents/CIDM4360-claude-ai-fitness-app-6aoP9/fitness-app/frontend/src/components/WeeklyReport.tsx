import React, { useState } from 'react';
import {
  BarChart2, ThumbsUp, ThumbsDown, ChevronLeft,
  ChevronRight, Star, Sparkles, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { getWeeklyReport } from '../api/client';
import type { WeeklyReport, UserProfile } from '../types';

interface Props { user: UserProfile }

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 progress-bar">
        <div className="progress-fill" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colorMap: Record<string, string> = {
    'A+': 'text-green-400 bg-green-500/20', 'A': 'text-green-400 bg-green-500/20',
    'B+': 'text-blue-400 bg-blue-500/20', 'B': 'text-blue-400 bg-blue-500/20',
    'C+': 'text-yellow-400 bg-yellow-500/20', 'C': 'text-yellow-400 bg-yellow-500/20',
    'D': 'text-orange-400 bg-orange-500/20', 'F': 'text-red-400 bg-red-500/20',
  };
  const cls = colorMap[grade] || 'text-gray-400 bg-gray-500/20';
  return (
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl ${cls}`}>
      {grade}
    </div>
  );
}

export default function WeeklyReportPage({ user }: Props) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [generated, setGenerated] = useState(false);

  const load = async (offset: number) => {
    setLoading(true);
    try {
      const r = await getWeeklyReport(user.id, offset);
      setReport(r);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const navigate = (dir: number) => {
    const newOffset = weekOffset + dir;
    setWeekOffset(newOffset);
    load(newOffset);
  };

  if (!generated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 flex flex-col items-center gap-6 fade-in">
        <div className="w-20 h-20 bg-primary-500/20 rounded-3xl flex items-center justify-center">
          <BarChart2 className="w-10 h-10 text-primary-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Weekly Report</h2>
          <p className="text-gray-400 text-sm max-w-xs">
            Get your AI-powered weekly fitness review — what worked, what didn't, and how to improve
          </p>
        </div>
        <button onClick={() => load(0)} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Generating…</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate This Week's Report</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(1)} className="btn-secondary py-2 px-3">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-white">
            {weekOffset === 0 ? 'This Week' : `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago`}
          </p>
          {report && (
            <p className="text-xs text-gray-400">
              {report.week_start} → {report.week_end}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          disabled={weekOffset <= 0}
          className="btn-secondary py-2 px-3 disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
        </div>
      )}

      {report && !loading && (
        <>
          {/* Header Card */}
          <div className="card">
            <div className="flex items-start gap-4">
              <GradeBadge grade={report.overall_grade} />
              <div className="flex-1">
                <p className="font-bold text-white text-base leading-snug">{report.headline}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${report.weekly_score}%`,
                        backgroundColor: report.weekly_score >= 70 ? '#22c55e' : report.weekly_score >= 50 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-300">{report.weekly_score}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" /> Category Scores
            </h2>
            <div className="space-y-2.5">
              <ScoreBar label="Consistency" score={report.stats_summary.consistency_score} />
              <ScoreBar label="Nutrition" score={report.stats_summary.nutrition_score} />
              <ScoreBar label="Activity" score={report.stats_summary.activity_score} />
              <ScoreBar label="Recovery" score={report.stats_summary.recovery_score} />
            </div>
          </div>

          {/* What Worked */}
          {report.what_worked?.length > 0 && (
            <div className="card">
              <h2 className="section-title flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-400" /> What Worked
              </h2>
              <div className="space-y-3">
                {report.what_worked.map((item, i) => (
                  <div key={i} className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                    <p className="font-semibold text-sm text-green-300 mb-1">{item.title}</p>
                    <p className="text-xs text-gray-300 mb-1">{item.detail}</p>
                    <p className="text-xs text-green-400">✓ Keep doing: {item.keep_doing}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What Didn't Work */}
          {report.what_didnt_work?.length > 0 && (
            <div className="card">
              <h2 className="section-title flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-400" /> What Didn't Work
              </h2>
              <div className="space-y-3">
                {report.what_didnt_work.map((item, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <p className="font-semibold text-sm text-red-300 mb-1">{item.title}</p>
                    <p className="text-xs text-gray-300 mb-1">{item.detail}</p>
                    <p className="text-xs text-gray-400 mb-2">Impact: {item.impact}</p>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                      <p className="text-xs text-blue-300">→ Fix: {item.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Week Plan */}
          {report.adjusted_plan && (
            <div className="card">
              <h2 className="section-title">Next Week's Plan</h2>
              <div className="space-y-3">
                {report.adjusted_plan.increase?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 flex items-center gap-1 mb-1.5">
                      <ArrowUp className="w-3 h-3" /> Do More Of
                    </p>
                    {report.adjusted_plan.increase.map((item, i) => (
                      <p key={i} className="text-xs text-gray-300 flex items-center gap-1.5 mb-1">
                        <span className="text-green-400">+</span>{item}
                      </p>
                    ))}
                  </div>
                )}
                {report.adjusted_plan.decrease?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-1.5">
                      <ArrowDown className="w-3 h-3" /> Do Less Of
                    </p>
                    {report.adjusted_plan.decrease.map((item, i) => (
                      <p key={i} className="text-xs text-gray-300 flex items-center gap-1.5 mb-1">
                        <span className="text-red-400">−</span>{item}
                      </p>
                    ))}
                  </div>
                )}
                {report.adjusted_plan.maintain?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-400 flex items-center gap-1 mb-1.5">
                      <Minus className="w-3 h-3" /> Keep Doing
                    </p>
                    {report.adjusted_plan.maintain.map((item, i) => (
                      <p key={i} className="text-xs text-gray-300 flex items-center gap-1.5 mb-1">
                        <span className="text-blue-400">→</span>{item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Focus Areas */}
          {report.next_week_focus?.length > 0 && (
            <div className="card">
              <h2 className="section-title">Next Week's Focus</h2>
              <div className="space-y-2">
                {report.next_week_focus.map((focus, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                    <div className="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-300">{focus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivational Message */}
          {report.motivational_message && (
            <div className="card bg-primary-500/10 border-primary-500/30">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary-200 italic leading-relaxed">
                  "{report.motivational_message}"
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
