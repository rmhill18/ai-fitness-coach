import React, { useState, useRef } from 'react';
import { Camera, Scan, ChevronRight, AlertCircle, Heart, Dumbbell, Scale } from 'lucide-react';
import { analyzeBody } from '../api/client';
import type { BodyAnalysisResult, UserProfile } from '../types';

interface Props { user: UserProfile }

function CategoryBar({ label, value, max = 100, unit = '%', color = '#22c55e' }: {
  label: string; value: number; max?: number; unit?: string; color?: string
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-white">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill h-2.5" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MuscleLevel({ label, level }: { label: string; level: string }) {
  const levels = ['underdeveloped', 'developing', 'moderate', 'well-developed', 'highly developed'];
  const idx = levels.indexOf(level);
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'];
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="capitalize" style={{ color: colors[idx] || '#6b7280' }}>{level}</span>
      </div>
      <div className="flex gap-1">
        {levels.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full"
            style={{ backgroundColor: i <= idx ? (colors[idx] || '#6b7280') : '#1f2937' }}
          />
        ))}
      </div>
    </div>
  );
}

const priorityConfig = {
  high: 'bg-red-500/10 border-red-500/30 text-red-400',
  medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export default function BodyAnalysisPage({ user }: Props) {
  const [result, setResult] = useState<BodyAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);
    setError('');
    try {
      const data = await analyzeBody(user.id, file);
      setResult(data);
    } catch (err) {
      setError('Analysis failed. Please try with a clearer full-body photo.');
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const bmiColor = (bmi: number) =>
    bmi < 18.5 ? '#60a5fa' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Body Analysis</h1>
          <p className="text-sm text-gray-400">AI estimates BMI, body fat & muscle composition</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card bg-yellow-500/5 border-yellow-500/20 flex gap-3">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-200">
          This is an AI visual estimate for informational purposes. Results are not medically accurate.
          Consult a healthcare professional for clinical body composition assessment.
        </p>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="section-title">Take or Upload a Photo</h2>
        <p className="text-xs text-gray-400 mb-4">
          For best results: stand in good lighting, wear fitted clothing, and show your full body from the front.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { fileRef.current?.setAttribute('capture', 'user'); fileRef.current?.click(); }}
            disabled={analyzing}
            className="card-hover flex flex-col items-center gap-2 py-5 border-dashed border-2 border-gray-700 hover:border-primary-500"
          >
            <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary-400" />
            </div>
            <span className="text-sm font-semibold text-gray-300">Use Camera</span>
          </button>

          <button
            onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
            disabled={analyzing}
            className="card-hover flex flex-col items-center gap-2 py-5 border-dashed border-2 border-gray-700 hover:border-primary-500"
          >
            <div className="w-12 h-12 bg-gray-700 rounded-2xl flex items-center justify-center">
              <Scan className="w-6 h-6 text-gray-300" />
            </div>
            <span className="text-sm font-semibold text-gray-300">Upload Photo</span>
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Analyzing State */}
      {analyzing && previewUrl && (
        <div className="card flex items-center gap-4">
          <img src={previewUrl} className="w-20 h-28 rounded-xl object-cover flex-shrink-0" alt="Your photo" />
          <div className="space-y-2 flex-1">
            <p className="font-semibold text-white">Analyzing your photo…</p>
            <p className="text-xs text-gray-400">Estimating BMI, body fat %, muscle composition</p>
            <div className="flex gap-2 items-center">
              <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
              <span className="text-xs text-primary-400">AI processing</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card bg-red-500/10 border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <div className="space-y-4 fade-in">
          {/* BMI + Body Type */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${bmiColor(result.bmi)}20` }}>
                    <span className="text-lg font-black" style={{ color: bmiColor(result.bmi) }}>
                      {result.bmi.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">BMI</p>
                    <p className="font-bold text-white">{result.bmi_category}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{result.body_type}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <CategoryBar
                    label="Body Fat"
                    value={result.estimated_body_fat_pct}
                    max={50}
                    color={result.estimated_body_fat_pct > 30 ? '#ef4444' : result.estimated_body_fat_pct > 20 ? '#f59e0b' : '#22c55e'}
                  />
                  <CategoryBar label="Muscle Mass" value={result.estimated_muscle_mass_pct} max={60} color="#22c55e" />
                </div>
              </div>

              <div className="text-right text-sm">
                <div className="bg-gray-800 rounded-xl p-2 mb-2">
                  <p className="text-xs text-gray-400">Lean Mass</p>
                  <p className="font-bold text-white">{result.lean_mass_kg?.toFixed(1)}kg</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-2">
                  <p className="text-xs text-gray-400">Fat Mass</p>
                  <p className="font-bold text-white">{result.fat_mass_kg?.toFixed(1)}kg</p>
                </div>
              </div>
            </div>
          </div>

          {/* Muscle Development */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary-400" /> Muscle Development
            </h2>
            <div className="space-y-3">
              <MuscleLevel label="Upper Body" level={result.muscle_development.upper_body} />
              <MuscleLevel label="Core" level={result.muscle_development.core} />
              <MuscleLevel label="Lower Body" level={result.muscle_development.lower_body} />
              <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                <span className="text-xs text-gray-400">Overall Symmetry</span>
                <span className={`badge ${
                  result.muscle_development.overall_symmetry === 'excellent' ? 'bg-green-500/20 text-green-400'
                  : result.muscle_development.overall_symmetry === 'good' ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {result.muscle_development.overall_symmetry}
                </span>
              </div>
            </div>
          </div>

          {/* Health Indicators */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" /> Health Indicators
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                <span className="text-sm text-gray-300">Cardiovascular Risk</span>
                <span className={`badge ${
                  result.health_indicators.cardiovascular_risk?.startsWith('low') ? 'bg-green-500/20 text-green-400'
                  : result.health_indicators.cardiovascular_risk?.startsWith('moderate') ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
                }`}>
                  {result.health_indicators.cardiovascular_risk?.split(' ')[0]}
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                <span className="text-sm text-gray-300">Metabolic Health</span>
                <span className={`badge ${
                  result.health_indicators.metabolic_health_indicator?.includes('good') ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {result.health_indicators.metabolic_health_indicator?.split(' ')[1] || 'assess'}
                </span>
              </div>
            </div>
          </div>

          {/* Posture */}
          {result.posture_assessment && (
            <div className="card">
              <h2 className="section-title flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-400" /> Posture Assessment
              </h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Overall</span>
                <span className={`badge ${
                  result.posture_assessment.overall === 'excellent' ? 'bg-green-500/20 text-green-400'
                  : result.posture_assessment.overall === 'good' ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {result.posture_assessment.overall}
                </span>
              </div>
              {result.posture_assessment.notes?.map((note, i) => (
                <p key={i} className="text-xs text-gray-300 flex items-start gap-1.5 mb-1">
                  <ChevronRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />{note}
                </p>
              ))}
            </div>
          )}

          {/* Goal Alignment */}
          <div className="card bg-primary-500/10 border-primary-500/30">
            <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-1">Goal Alignment</p>
            <p className="text-sm text-primary-200">{result.goal_alignment}</p>
          </div>

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="card">
              <h2 className="section-title">Recommendations</h2>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className={`border rounded-xl p-3 ${priorityConfig[rec.priority as keyof typeof priorityConfig] || 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{rec.area}</span>
                      <span className="badge text-xs opacity-70 capitalize">{rec.priority}</span>
                    </div>
                    <p className="text-xs text-gray-200">{rec.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encouragement */}
          {result.encouragement && (
            <div className="card bg-primary-500/10 border-primary-500/30">
              <p className="text-sm text-primary-200 italic">"{result.encouragement}"</p>
            </div>
          )}

          {/* Fitness Potential */}
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fitness Potential</p>
            <p className="text-sm text-gray-300">{result.fitness_potential}</p>
          </div>

          <button
            onClick={() => { setResult(null); setPreviewUrl(null); }}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" /> Take Another Photo
          </button>
        </div>
      )}
    </div>
  );
}
