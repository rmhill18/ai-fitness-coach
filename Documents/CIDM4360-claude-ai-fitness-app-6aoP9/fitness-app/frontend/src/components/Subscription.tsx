import React from 'react';
import {
  Check, Sparkles, Zap, Crown, X, MessageCircle,
  Camera, TrendingUp, BarChart2, Scan, Dumbbell
} from 'lucide-react';

interface Props {
  currentPlan: 'free' | 'pro' | 'elite';
  onClose: () => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    icon: Sparkles,
    color: 'text-gray-400',
    border: 'border-gray-700',
    badge: null,
    features: [
      '3 AI daily plans per week',
      'Basic meal & workout logging',
      '5 AI coach messages per day',
      'Step tracking',
      'Basic progress view',
    ],
    missing: [
      'Unlimited AI plans',
      'Meal photo analysis',
      'Weekly AI report',
      'Body composition analysis',
      'Unlimited AI coach chat',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    icon: Zap,
    color: 'text-primary-400',
    border: 'border-primary-500',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Unlimited AI daily plans',
      'Meal photo AI analysis',
      'AI progress analysis',
      'Weekly AI reports',
      '50 AI coach messages/day',
      'Adaptive workout engine',
    ],
    missing: [
      'Body composition analysis',
      'Unlimited AI coach chat',
    ],
    cta: 'Start 7-Day Free Trial',
    ctaDisabled: false,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$19.99',
    period: '/month',
    icon: Crown,
    color: 'text-yellow-400',
    border: 'border-yellow-500/50',
    badge: 'Best Results',
    features: [
      'Everything in Pro',
      'Unlimited AI coach chat',
      'Body composition analysis',
      'Body photo history tracking',
      'Priority AI response speed',
      'Export your data (PDF)',
      'Early access to new features',
    ],
    missing: [],
    cta: 'Start 7-Day Free Trial',
    ctaDisabled: false,
  },
];

const FEATURE_ROWS = [
  { label: 'AI daily plans', free: '3/week', pro: 'Unlimited', elite: 'Unlimited', icon: Sparkles },
  { label: 'AI coach chat', free: '5/day', pro: '50/day', elite: 'Unlimited', icon: MessageCircle },
  { label: 'Meal photo analysis', free: false, pro: true, elite: true, icon: Camera },
  { label: 'Progress analysis', free: false, pro: true, elite: true, icon: TrendingUp },
  { label: 'Weekly AI report', free: false, pro: true, elite: true, icon: BarChart2 },
  { label: 'Body analysis', free: false, pro: false, elite: true, icon: Scan },
  { label: 'Adaptive workouts', free: false, pro: true, elite: true, icon: Dumbbell },
];

export default function Subscription({ currentPlan, onClose }: Props) {
  const handleSubscribe = (planId: string) => {
    // Placeholder — wire up Stripe here
    alert(`Stripe integration coming soon! Plan: ${planId}\n\nTo add payments: integrate stripe.com/docs/checkout`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Upgrade Your Coach</h1>
          <p className="text-gray-400 text-sm mt-1">Unlock the full power of AI-driven fitness</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Plan Cards */}
      <div className="space-y-4 mb-8">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`card border-2 ${plan.border} ${isCurrent ? 'opacity-70' : ''} relative overflow-hidden`}
            >
              {plan.badge && (
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <div>
                  <h2 className="font-bold text-white">{plan.name}</h2>
                  <p className="text-sm">
                    <span className={`font-black text-lg ${plan.color}`}>{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 opacity-40">
                    <X className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-500">{f}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={plan.ctaDisabled || isCurrent}
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isCurrent
                    ? 'bg-gray-800 text-gray-500 cursor-default'
                    : plan.id === 'elite'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white'
                    : plan.ctaDisabled
                    ? 'bg-gray-800 text-gray-500 cursor-default'
                    : 'btn-primary'
                }`}
              >
                {isCurrent ? '✓ Current Plan' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="card">
        <h3 className="font-bold text-white mb-4">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium pb-2 w-1/2">Feature</th>
                <th className="text-center text-gray-400 font-medium pb-2">Free</th>
                <th className="text-center text-primary-400 font-medium pb-2">Pro</th>
                <th className="text-center text-yellow-400 font-medium pb-2">Elite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {FEATURE_ROWS.map((row, i) => {
                const Icon = row.icon;
                return (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-300 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      {row.label}
                    </td>
                    {(['free', 'pro', 'elite'] as const).map(tier => (
                      <td key={tier} className="py-2.5 text-center">
                        {typeof row[tier] === 'boolean' ? (
                          row[tier]
                            ? <Check className="w-4 h-4 text-green-400 mx-auto" />
                            : <X className="w-4 h-4 text-gray-600 mx-auto" />
                        ) : (
                          <span className={`text-xs font-medium ${
                            tier === 'elite' ? 'text-yellow-400' :
                            tier === 'pro' ? 'text-primary-400' : 'text-gray-400'
                          }`}>{row[tier] as string}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-500 mt-4">
        Cancel anytime · Secure payment via Stripe · 7-day free trial on paid plans
      </p>
    </div>
  );
}
