import { useState } from "react";

const ROLES = [
  { id: "cleaner", label: "清掃スタッフ", description: "清掃担当・完了報告" },
  { id: "front",   label: "フロント",    description: "チェックアウト登録" },
  { id: "leader",  label: "リーダー",    description: "全体管理・検査確認" },
];

// Cleaning staff preset names (from Excel master)
const CLEANER_NAMES = [
  "三浦", "佐々木", "北川", "福田", "高橋", "結城",
  "小松", "貞廣", "戸田", "守山", "鹿又",
];

function RoleSelectScreen({ currentRole, onSelect, onCancel }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-slate-500 text-sm">役割を変更する</p>
        </div>
        <div className="flex flex-col gap-3 mb-6">
          {ROLES.map((role) => {
            const isSelected = currentRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => onSelect(role.id)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? "bg-slate-800 border-slate-800"
                    : "bg-white border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className={`block text-base font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                  {role.label}
                </span>
                <span className={`block text-sm mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {role.description}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold active:bg-slate-200"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("cleaner");
  const [name, setName] = useState("");
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  if (showRoleSelect) {
    return (
      <RoleSelectScreen
        currentRole={selectedRole}
        onSelect={(role) => { setSelectedRole(role); setShowRoleSelect(false); }}
        onCancel={() => setShowRoleSelect(false)}
      />
    );
  }

  const isCleaner = selectedRole === "cleaner";
  const currentRole = ROLES.find(r => r.id === selectedRole);
  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onLogin({ role: selectedRole, name: name.trim() });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-slate-900 text-2xl font-bold tracking-wide">
            ホテルパコジュニア 北見
          </h1>
          <p className="text-slate-500 text-sm mt-1">清掃管理システム</p>
        </div>

        {/* Name Selection */}
        <div className="mb-8">
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">
            あなたの名前
          </p>

          {/* Preset chips — cleaner only */}
          {isCleaner && (
            <div className="flex flex-wrap gap-2 mb-3">
              {CLEANER_NAMES.map((presetName) => {
                const isSelected = name === presetName;
                return (
                  <button
                    key={presetName}
                    onClick={() => setName(presetName)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? "bg-slate-800 border-slate-800 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {presetName}
                  </button>
                );
              })}
            </div>
          )}

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isCleaner ? "または直接入力" : "名前を入力"}
            className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-xl text-base font-bold tracking-wide transition-all duration-150 active:scale-95 ${
            canSubmit
              ? "bg-slate-800 text-white hover:bg-slate-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          入室する
        </button>

        {/* Role change — secondary action */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowRoleSelect(true)}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            役割: <span className="font-medium">{currentRole?.label}</span>
            <span className="ml-1 underline">変更</span>
          </button>
        </div>
      </div>
    </div>
  );
}
