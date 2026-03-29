"use client";

// ============================================================
// ArxMint — Merchant Login (Email Magic Link)
// /merchant-login — simple email-based login for merchants
// ============================================================

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

function MerchantLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Show error from redirect (e.g. invalid/expired token)
  useEffect(() => {
    if (errorParam === "invalid") {
      setErrorMessage(
        "That login link is invalid or has expired. Please request a new one."
      );
      setStatus("error");
    }
  }, [errorParam]);

  // Check if already logged in
  useEffect(() => {
    fetch("/api/merchant-auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace("/merchant-dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/merchant-auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send login link");
      }

      setStatus("sent");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setStatus("error");
    }
  }

  return (
    <div
      data-theme="merchant"
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#fafafa" }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#171717" }}
            >
              Arx<span style={{ color: "#F7931A" }}>Mint</span>
            </h1>
          </Link>
          <p className="mt-2 text-sm" style={{ color: "#888" }}>
            Merchant Dashboard
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl border p-8"
          style={{
            background: "#ffffff",
            borderColor: "#e5e5e5",
          }}
        >
          {status === "sent" ? (
            /* Success state */
            <div className="text-center py-4">
              <CheckCircle
                size={48}
                className="mx-auto mb-4"
                style={{ color: "#22c55e" }}
              />
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: "#171717" }}
              >
                Check your email
              </h2>
              <p className="text-sm mb-6" style={{ color: "#666" }}>
                We sent a login link to{" "}
                <strong style={{ color: "#171717" }}>
                  {email.trim().toLowerCase()}
                </strong>
                . Click the link to sign in.
              </p>
              <p className="text-xs" style={{ color: "#999" }}>
                The link expires in 15 minutes. Check your spam folder if
                you don&apos;t see it.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-6 text-sm font-medium hover:underline"
                style={{ color: "#F7931A" }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* Form state */
            <>
              <h2
                className="text-xl font-semibold mb-1"
                style={{ color: "#171717" }}
              >
                Sign in to your dashboard
              </h2>
              <p className="text-sm mb-6" style={{ color: "#888" }}>
                Enter the email you used to sign up on ArxMint.
              </p>

              {/* Error banner */}
              {status === "error" && errorMessage && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 mb-4 text-sm"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                  }}
                >
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="merchant-email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#333" }}
                >
                  Email address
                </label>
                <div className="relative mb-4">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#999" }}
                  />
                  <input
                    id="merchant-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg pl-10 pr-4 py-3 text-sm outline-none transition-colors"
                    style={{
                      background: "#fafafa",
                      border: "1px solid #e5e5e5",
                      color: "#171717",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "#F7931A")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "#e5e5e5")
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "#F7931A" }}
                >
                  {status === "sending" ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30"
                        style={{ borderTopColor: "#fff" }}
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Login Link
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm" style={{ color: "#888" }}>
            Have Nostr?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "#F7931A" }}
            >
              Login with Nostr instead
            </Link>
          </p>
          <p className="text-sm" style={{ color: "#888" }}>
            Not a merchant yet?{" "}
            <Link
              href="/merchants"
              className="font-medium hover:underline"
              style={{ color: "#F7931A" }}
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MerchantLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#fafafa" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300"
            style={{ borderTopColor: "#F7931A" }}
          />
        </div>
      }
    >
      <MerchantLoginContent />
    </Suspense>
  );
}
