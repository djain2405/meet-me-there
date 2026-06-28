"use client";

import { useState, useTransition } from "react";
import type { Group, Signup } from "@/lib/types";
import {
  assignSignupAction,
  createGroupAction,
  updateGroupAction,
  updateSignupStatusAction,
} from "@/app/admin/actions";

type Props = {
  eventId: string;
  signups: Signup[];
  groups: Group[];
  meetingPoint: string;
};

export function GroupMatcher({
  eventId,
  signups,
  groups,
  meetingPoint,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [newGroupName, setNewGroupName] = useState(`Group ${groups.length + 1}`);

  const unassigned = signups.filter((s) => !s.groupId);

  function handleAssign(signupId: string, groupId: string) {
    startTransition(() => assignSignupAction(signupId, groupId));
  }

  function handleUnassign(signupId: string) {
    startTransition(() => assignSignupAction(signupId, null));
  }

  function handleCreateGroup() {
    startTransition(async () => {
      await createGroupAction(eventId, {
        name: newGroupName,
        meetingTime: "",
        meetingLocation: meetingPoint,
        arrivalInstructions: "",
      });
      setNewGroupName(`Group ${groups.length + 2}`);
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Groups</h2>
          <div className="flex items-center gap-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={pending}
              className="rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white"
            >
              Add group
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              members={signups.filter((s) => s.groupId === group.id)}
              pending={pending}
              onUnassign={handleUnassign}
              onAssign={handleAssign}
              unassigned={unassigned}
            />
          ))}
          {groups.length === 0 ? (
            <p className="text-sm text-stone-500">
              No groups yet. Create one to start matching attendees.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Unassigned ({unassigned.length})
        </h2>
        {unassigned.length === 0 ? (
          <p className="text-sm text-stone-500">Everyone is in a group.</p>
        ) : (
          <ul className="space-y-2">
            {unassigned.map((signup) => (
              <li
                key={signup.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3"
              >
                <SignupSummary signup={signup} />
                <select
                  className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) handleAssign(signup.id, e.target.value);
                  }}
                  disabled={pending}
                >
                  <option value="" disabled>
                    Assign to…
                  </option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SignupSummary({ signup }: { signup: Signup }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{signup.firstName}</p>
      <p className="text-stone-500">
        {signup.arrivalTime} · {signup.attendanceCertainty} ·{" "}
        {signup.comfortPreferences.join(", ") || "no prefs"}
        {signup.willingConnector ? " · connector" : ""}
      </p>
    </div>
  );
}

function GroupCard({
  group,
  members,
  pending,
  onUnassign,
  onAssign,
  unassigned,
}: {
  group: Group;
  members: Signup[];
  pending: boolean;
  onUnassign: (id: string) => void;
  onAssign: (signupId: string, groupId: string) => void;
  unassigned: Signup[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{group.name}</h3>
        <span className="text-xs text-stone-500">{members.length} members</span>
      </div>

      {editing ? (
        <GroupEditForm
          group={group}
          members={members}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <dl className="mb-3 space-y-1 text-sm text-stone-600">
            <div>
              <dt className="inline font-medium">Meet: </dt>
              <dd className="inline">{group.meetingTime || "Not set"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Where: </dt>
              <dd className="inline">{group.meetingLocation || "Not set"}</dd>
            </div>
          </dl>
          <ul className="mb-3 space-y-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-white px-2 py-1 text-sm"
              >
                <span>
                  {m.firstName}
                  {group.connectorSignupId === m.id ? " (connector)" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onUnassign(m.id)}
                  disabled={pending}
                  className="text-xs text-stone-500 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-teal-dark underline"
            >
              Edit details
            </button>
            {unassigned.length > 0 ? (
              <select
                className="rounded border border-stone-300 px-2 py-0.5 text-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) onAssign(e.target.value, group.id);
                }}
                disabled={pending}
              >
                <option value="" disabled>
                  Add member…
                </option>
                {unassigned.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function GroupEditForm({
  group,
  members,
  onDone,
}: {
  group: Group;
  members: Signup[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateGroupAction(group.id, {
        name: String(formData.get("name")),
        meetingTime: String(formData.get("meetingTime")),
        meetingLocation: String(formData.get("meetingLocation")),
        arrivalInstructions: String(formData.get("arrivalInstructions")),
        chatLink: String(formData.get("chatLink") || ""),
        connectorSignupId: String(formData.get("connectorSignupId") || "") || undefined,
      });
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2 text-sm">
      <input
        name="name"
        defaultValue={group.name}
        className="w-full rounded border border-stone-300 px-2 py-1"
      />
      <input
        name="meetingTime"
        defaultValue={group.meetingTime}
        placeholder="Meeting time"
        className="w-full rounded border border-stone-300 px-2 py-1"
      />
      <input
        name="meetingLocation"
        defaultValue={group.meetingLocation}
        placeholder="Meeting location"
        className="w-full rounded border border-stone-300 px-2 py-1"
      />
      <textarea
        name="arrivalInstructions"
        defaultValue={group.arrivalInstructions}
        placeholder="Arrival instructions"
        rows={2}
        className="w-full rounded border border-stone-300 px-2 py-1"
      />
      <input
        name="chatLink"
        defaultValue={group.chatLink ?? ""}
        placeholder="Group chat link"
        className="w-full rounded border border-stone-300 px-2 py-1"
      />
      <select
        name="connectorSignupId"
        defaultValue={group.connectorSignupId ?? ""}
        className="w-full rounded border border-stone-300 px-2 py-1"
      >
        <option value="">No connector</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName}
          </option>
        ))}
      </select>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-teal px-2 py-1 text-white"
        >
          Save
        </button>
        <button type="button" onClick={onDone} className="text-stone-500">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SignupStatusSelect({
  signupId,
  status,
}: {
  signupId: string;
  status: Signup["status"];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        startTransition(() =>
          updateSignupStatusAction(signupId, e.target.value as Signup["status"]),
        );
      }}
      className="rounded border border-stone-300 px-2 py-1 text-xs"
    >
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="declined">Declined</option>
      <option value="attended">Attended</option>
      <option value="no-show">No show</option>
    </select>
  );
}
