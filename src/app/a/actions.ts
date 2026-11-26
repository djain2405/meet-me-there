"use server";

import { redirect } from "next/navigation";
import { recordAttendanceReply } from "@/lib/store";

export async function replyAttendanceAction(
  token: string,
  reply: "coming" | "declined",
) {
  await recordAttendanceReply(token, reply);
  redirect(`/a/${token}?saved=1`);
}
