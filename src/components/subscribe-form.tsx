"use client";

import { useState } from "react";

export function SubscribeForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [email, setEmail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-6 text-sm text-umber">
        Check your inbox — one click and the museum opens.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex justify-center gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-56 border border-hairline bg-transparent px-3 py-2 text-sm outline-none placeholder:text-stone focus:border-ink"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="bg-ink px-5 py-2 text-xs uppercase tracking-[0.12em] text-parchment disabled:opacity-50"
      >
        {status === "sending" ? "…" : "Subscribe"}
      </button>
      {status === "error" && (
        <p className="self-center text-xs text-stone">Try again?</p>
      )}
    </form>
  );
}
