"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseConfigured, getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (supabaseConfigured) {
        const sb = getSupabase();
        const { error } = await sb!.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + "/" },
        });
        setMsg(error ? error.message : "Check your email for the link.");
      } else {
        const res = await fetch("/api/dev-login", { method: "POST" });
        if (!res.ok) throw new Error("Could not sign in.");
        router.push("/");
        router.refresh();
      }
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
          Marginalia
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
        <div className="steps">
          <button type="submit" disabled={busy}>
            Send link
          </button>
        </div>
      </form>
      <div id="wmsg" role="status" aria-live="polite" style={{ opacity: msg ? 1 : 0 }}>
        {msg}
      </div>
    </main>
  );
}
