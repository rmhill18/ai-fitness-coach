import React from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';

const sections = [
  {
    title: 'Information We Collect',
    body: `We collect information you provide directly: your name, age, height, weight, fitness goals, dietary restrictions, email address, and password (stored securely as a hash). We also collect health and activity data you log manually, including meals, workouts, steps, sleep, heart rate variability, and daily check-ins. Photos you upload for meal or body analysis are processed by our AI and are not permanently stored on our servers.`,
  },
  {
    title: 'How We Use Your Information',
    body: `Your data is used exclusively to generate personalized fitness plans, nutritional recommendations, progress analysis, and weekly reports powered by Claude AI (Anthropic). We do not sell, rent, or share your personal data with third parties for marketing purposes.`,
  },
  {
    title: 'Data Storage and Security',
    body: `Your data is stored in a local SQLite database on the server running this application. Passwords are hashed using bcrypt and never stored in plain text. API communication is secured via JWT tokens. If you deploy this app to a cloud server, ensure you use HTTPS and set a strong JWT_SECRET in your environment variables.`,
  },
  {
    title: 'AI Processing',
    body: `Fitness plans, meal analyses, progress reports, and other AI-generated content are created using Anthropic's Claude API. When you upload a photo for meal or body analysis, the image is sent to Anthropic's servers for processing. Anthropic's privacy policy applies to this processing. We recommend not uploading photos that identify you personally if privacy is a concern.`,
  },
  {
    title: 'Push Notifications',
    body: `If you enable push notifications, your device token is stored on our server to deliver reminders for meals, workouts, and daily check-ins. You can revoke notification permissions at any time in your device settings. We only send fitness-related notifications and never use push notifications for marketing.`,
  },
  {
    title: 'Health Data',
    body: `Health metrics you log (sleep scores, heart rate, HRV, SpO2, steps) are stored locally and used only to provide personalized coaching insights. We do not transmit this data to any third parties. If you connect a wearable device in a future update, that integration will be governed by the respective device manufacturer's privacy policy.`,
  },
  {
    title: 'Data Deletion',
    body: `You can delete your account and all associated data at any time by contacting the app administrator or, if self-hosting, by deleting the database file (fitness_coach.db). We do not retain backups of deleted user data.`,
  },
  {
    title: 'Children\'s Privacy',
    body: `This app is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent and believe your child has provided us with personal data, please contact us.`,
  },
  {
    title: 'Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. Significant changes will be communicated via an in-app notification. Continued use of the app after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: 'Contact',
    body: `For privacy-related questions or data deletion requests, please contact the app administrator. If you are self-hosting this application, you are responsible for maintaining compliance with applicable privacy laws in your jurisdiction.`,
  },
];

export default function PrivacyPolicy() {
  const [open, setOpen] = React.useState<number | null>(null);
  const toggle = (i: number) => setOpen(prev => (prev === i ? null : i));

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
          <p className="text-xs text-gray-400">Last updated: April 2026</p>
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
        <p className="text-sm text-green-300 font-medium">Your privacy matters</p>
        <p className="text-xs text-gray-400 mt-1">
          AI Fitness Coach is designed with privacy in mind. Your health data stays on your own server and is never sold or shared.
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-semibold text-white">{s.title}</span>
              {open === i
                ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
            </button>
            {open === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-400 leading-relaxed">{s.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
