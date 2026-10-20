"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Could not sign in.");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "var(--pad)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          display: "grid",
          gap: "18px",
          width: "min(100%, 560px)",
          justifyItems: "start",
        }}
      >
        <h1 style={{ font: "400 40px/1 var(--disp)", margin: 0 }}>
          Yomikaa
        </h1>
        <label className="lbl" htmlFor="email">
          Sign in
        </label>
        <input
          className="megain"
          id="email"
          type="email"
          placeholder="your email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="megain"
          id="password"
          type="password"
          placeholder="your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="steps">
          <button type="submit" disabled={busy}>
            Sign in
          </button>
        </div>
      </form>
      <div id="wmsg" role="status" aria-live="polite" style={{ opacity: msg ? 1 : 0 }}>
        {msg}
      </div>
    </main>
  );
}
