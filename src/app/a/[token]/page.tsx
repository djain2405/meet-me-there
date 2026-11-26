import { notFound } from "next/navigation";
import { replyAttendanceAction } from "@/app/a/actions";
import { BrandHeader } from "@/components/BrandHeader";
import { formatEventDate } from "@/lib/format";
import { getEventById, getSignupByAttendanceToken } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function AttendancePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { saved } = await searchParams;
  const signup = await getSignupByAttendanceToken(token);
  if (!signup) notFound();
  const event = await getEventById(signup.eventId);
  if (!event) notFound();

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge="Your signup" />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-3xl font-bold text-ink">Hey {signup.firstName}</h1>
        <p className="mt-3 text-lg text-muted">
          {event.name}
          <br />
          {formatEventDate(event.date, event.startTime)}
        </p>
        <p className="mt-4 text-sm text-muted">
          Opening this page does not change your answer. Choose one below.
        </p>
        {saved ? (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink">
            {signup.attendanceReply === "coming"
              ? "You're marked as coming. Your admin status is unchanged."
              : signup.attendanceReply === "declined"
                ? "You can't make it. You are out of the active crew, and the earlier assignment is kept."
                : "Saved."}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          <form action={replyAttendanceAction.bind(null, token, "coming")}>
            <button type="submit" className="btn-primary w-full py-3">
              I'm coming
            </button>
          </form>
          <form action={replyAttendanceAction.bind(null, token, "declined")}>
            <button
              type="submit"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-semibold text-ink"
            >
              I can't make it
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
