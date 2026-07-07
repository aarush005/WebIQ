import { useNavigate } from "react-router-dom";

export default function UpgradeModal({ onClose }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          You've used all your audits!
        </h2>
        <p className="text-gray-500 mb-6 leading-relaxed">
          You've reached your monthly audit limit.
          Upgrade to get more audits and unlock all features.
        </p>

        <div className="bg-violet-50 rounded-xl p-4 mb-6 text-left space-y-2">
          {[
            "✅ 20 audits/month (Starter)",
            "✅ Unlimited audits (Pro)",
            "✅ Competitor tracking",
            "✅ Priority support",
          ].map(f => (
            <p key={f} className="text-sm text-violet-800">{f}</p>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Maybe Later
          </button>
          <button
            onClick={() => { navigate("/pricing"); onClose(); }}
            className="flex-1 bg-violet-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
          >
            Upgrade Now →
          </button>
        </div>
      </div>
    </div>
  );
}
