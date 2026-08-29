import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  checkPassword,
  signSession,
} from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const authPassword = process.env.AUTH_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!authPassword || !secret) {
    redirect("/login?error=config");
  }

  if (!checkPassword(password, authPassword)) {
    redirect("/login?error=invalid");
  }

  const token = await signSession(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const error =
    params.error === "invalid"
      ? "Wrong password."
      : params.error === "config"
        ? "Auth is not configured."
        : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 text-text">
      <h1 className="text-3xl font-semibold tracking-tight">MyLife</h1>
      <form action={loginAction} className="flex w-full max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Password
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="rounded border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent-muted hover:text-text"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
