"use client";

import { useCallback, useEffect, useState } from "react";

import { buttonStyles } from "@/lib/button-styles";

type Member = {
  id: string;
  userId: string;
  email: string | null;
  status: string;
  roleSlug: string | null;
  roleName: string | null;
  createdAt: string;
};

type ApiEnvelope<T> = { ok: true } & T | { ok: false; error: { code: string; message: string } };

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

function statusTone(status: string) {
  if (status === "active") return "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]";
  if (status === "invited") return "bg-[#FFF6ED] text-[#B54708] border-[#FEC84B]";
  return "bg-[#F2F4F7] text-[#475467] border-[#E4E7EC]";
}

export function AdminUsersClient({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const data = (await response.json()) as ApiEnvelope<{ members: Member[] }>;
    if (!response.ok || !data.ok) {
      setError(!data.ok ? data.error.message : "Could not load organization members.");
      return;
    }
    setMembers(data.members);
  }, []);

  useEffect(() => {
    // Same fetch-on-mount pattern used elsewhere in this codebase (e.g.
    // meta-library-client.tsx) — an async load into local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMembers();
  }, [loadMembers]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setInviteBusy(true);
    setInviteMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, roleSlug: inviteRole }),
      });
      const data = (await response.json()) as ApiEnvelope<{ invitedEmail: string }>;
      if (!response.ok || !data.ok) {
        setInviteMessage(!data.ok ? data.error.message : "Could not send the invite.");
        return;
      }
      setInviteMessage(`Invite sent to ${data.invitedEmail}.`);
      setInviteEmail("");
      await loadMembers();
    } finally {
      setInviteBusy(false);
    }
  }

  async function changeRole(userId: string, roleSlug: string) {
    setBusyUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleSlug }),
      });
      if (response.ok) {
        await loadMembers();
      }
    } finally {
      setBusyUserId(null);
    }
  }

  async function deactivate(userId: string) {
    setBusyUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (response.ok) {
        await loadMembers();
      }
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.9rem] border border-[#E4E7EC] bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-semibold text-foreground">Invite a teammate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          They&apos;ll get an email with a link to set their own password.
        </p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={invite}>
          <label className="flex-1 min-w-[220px] space-y-2">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm text-foreground outline-none transition focus:border-brand-red"
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@company.com"
              required
              type="email"
              value={inviteEmail}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Role</span>
            <select
              className={buttonStyles.select}
              onChange={(event) => setInviteRole(event.target.value)}
              value={inviteRole}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className={buttonStyles.primary} disabled={inviteBusy} type="submit">
            {inviteBusy ? "Sending…" : "Send invite"}
          </button>
        </form>
        {inviteMessage ? <p className="mt-3 text-sm text-muted-foreground">{inviteMessage}</p> : null}
      </section>

      <section className="rounded-[1.9rem] border border-[#E4E7EC] bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-semibold text-foreground">Organization members</h2>
        {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
        {!members && !error ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> : null}
        {members && members.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No members yet.</p>
        ) : null}
        {members && members.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4E7EC] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr className="border-b border-[#F2F4F7]" key={member.id}>
                    <td className="py-3 pr-4 text-foreground">
                      {member.email ?? member.userId}
                      {member.userId === currentUserId ? (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        className={buttonStyles.select}
                        disabled={busyUserId === member.userId}
                        onChange={(event) => void changeRole(member.userId, event.target.value)}
                        value={member.roleSlug ?? ""}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(member.status)}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {member.status !== "inactive" && member.userId !== currentUserId ? (
                        <button
                          className="text-sm font-medium text-brand-red disabled:opacity-50"
                          disabled={busyUserId === member.userId}
                          onClick={() => void deactivate(member.userId)}
                          type="button"
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
