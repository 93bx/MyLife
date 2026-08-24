"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/apiClient";

type ProfileForm = {
  fullName: string;
  summary: string;
  workStart: string;
  workEnd: string;
  timezone: string;
  salarySar: string;
  rentShareYearlySar: string;
  billsShareMinSar: string;
  billsShareMaxSar: string;
  iqamaYearlySar: string;
  cashBufferSar: string;
  geoSequence: string;
  nightsDefaultOn: boolean;
  smsFirstDefault: boolean;
  weekend: string;
  github: string;
  noticeDays: number;
  allowTrainOnFreeNonMoney: boolean;
  payoutMethods: string;
};

const empty: ProfileForm = {
  fullName: "",
  summary: "",
  workStart: "09:30",
  workEnd: "17:30",
  timezone: "Asia/Riyadh",
  salarySar: "",
  rentShareYearlySar: "",
  billsShareMinSar: "",
  billsShareMaxSar: "",
  iqamaYearlySar: "",
  cashBufferSar: "",
  geoSequence: "remote_abroad,other_gcc,west",
  nightsDefaultOn: true,
  smsFirstDefault: true,
  weekend: "fri-sat",
  github: "",
  noticeDays: 30,
  allowTrainOnFreeNonMoney: false,
  payoutMethods: "[]",
};

function str(v: string | null | undefined) {
  return v ?? "";
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiJson<{ profile: Record<string, unknown> }>(
      "/api/profile",
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const p = res.data.profile;
    setForm({
      fullName: String(p.fullName ?? ""),
      summary: String(p.summary ?? ""),
      workStart: String(p.workStart ?? "09:30"),
      workEnd: String(p.workEnd ?? "17:30"),
      timezone: String(p.timezone ?? "Asia/Riyadh"),
      salarySar: str(p.salarySar as string | null),
      rentShareYearlySar: str(p.rentShareYearlySar as string | null),
      billsShareMinSar: str(p.billsShareMinSar as string | null),
      billsShareMaxSar: str(p.billsShareMaxSar as string | null),
      iqamaYearlySar: str(p.iqamaYearlySar as string | null),
      cashBufferSar: str(p.cashBufferSar as string | null),
      geoSequence: String(p.geoSequence ?? ""),
      nightsDefaultOn: Boolean(p.nightsDefaultOn),
      smsFirstDefault: Boolean(p.smsFirstDefault),
      weekend: String(p.weekend ?? "fri-sat"),
      github: str(p.github as string | null),
      noticeDays: Number(p.noticeDays ?? 30),
      allowTrainOnFreeNonMoney: Boolean(p.allowTrainOnFreeNonMoney),
      payoutMethods: String(p.payoutMethods ?? "[]"),
    });
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    const payload = {
      ...form,
      salarySar: form.salarySar || null,
      rentShareYearlySar: form.rentShareYearlySar || null,
      billsShareMinSar: form.billsShareMinSar || null,
      billsShareMaxSar: form.billsShareMaxSar || null,
      iqamaYearlySar: form.iqamaYearlySar || null,
      cashBufferSar: form.cashBufferSar || null,
      github: form.github || null,
      noticeDays: Number(form.noticeDays),
    };
    const res = await apiJson("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setSaved(true);
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-neutral-600">
          Person facts — salary, buffer, hours, geo, payouts.
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">Saved.</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["fullName", "Full name"],
            ["summary", "Summary"],
            ["workStart", "Work start"],
            ["workEnd", "Work end"],
            ["timezone", "Timezone"],
            ["salarySar", "Salary SAR"],
            ["rentShareYearlySar", "Rent share yearly SAR"],
            ["billsShareMinSar", "Bills share min SAR"],
            ["billsShareMaxSar", "Bills share max SAR"],
            ["iqamaYearlySar", "Iqama yearly SAR"],
            ["cashBufferSar", "Cash buffer SAR"],
            ["geoSequence", "Geo sequence"],
            ["weekend", "Weekend"],
            ["github", "GitHub"],
            ["payoutMethods", "Payout methods (JSON)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            {label}
            {key === "summary" || key === "payoutMethods" ? (
              <textarea
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                rows={key === "summary" ? 4 : 2}
                className="rounded border border-neutral-400 bg-white px-3 py-2"
              />
            ) : (
              <input
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                className="rounded border border-neutral-400 bg-white px-3 py-2"
              />
            )}
          </label>
        ))}

        <label className="flex flex-col gap-1 text-sm">
          Notice days
          <input
            type="number"
            value={form.noticeDays}
            onChange={(e) => setField("noticeDays", Number(e.target.value))}
            className="rounded border border-neutral-400 bg-white px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.nightsDefaultOn}
            onChange={(e) => setField("nightsDefaultOn", e.target.checked)}
          />
          Nights default on
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.smsFirstDefault}
            onChange={(e) => setField("smsFirstDefault", e.target.checked)}
          />
          SMS-first default
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.allowTrainOnFreeNonMoney}
            onChange={(e) =>
              setField("allowTrainOnFreeNonMoney", e.target.checked)
            }
          />
          Allow train-on-free providers for non-money chat
        </label>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>
    </main>
  );
}
