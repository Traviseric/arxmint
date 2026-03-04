"use client";

// ============================================================
// ArxMint — Merchant Signup Form
// Public signup for businesses joining the ArxMint payment
// network. No auth required — pre-launch merchant acquisition.
// ============================================================

import { useState } from "react";
import {
  Store,
  MapPin,
  Mail,
  Globe,
  User,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Loader2,
  ImageIcon,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "food-drink", label: "Food & Drink" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health & Wellness" },
  { value: "entertainment", label: "Entertainment" },
  { value: "technology", label: "Technology" },
  { value: "other", label: "Other" },
];

interface MerchantSignupFormProps {
  onSuccess?: () => void;
}

export function MerchantSignupForm({ onSuccess }: MerchantSignupFormProps) {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!businessName.trim()) errors.businessName = "Business name is required";
    if (!contactName.trim()) errors.contactName = "Your name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "A valid email is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/pledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          location: location.trim() || undefined,
          category: category || undefined,
          website: website.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Try again.");
        return;
      }

      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-bg-elevated border border-accent/30 rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <h3 className="text-2xl font-semibold text-text-primary mb-3">
          You&apos;re In.
        </h3>
        <p className="text-text-secondary max-w-md mx-auto">
          <span className="text-text-primary font-medium">{businessName}</span> is
          on the list. We&apos;ll reach out when the Fort Collins network is ready
          for onboarding.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Business Name */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
          <Store className="w-4 h-4 text-accent" />
          Business Name <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            setFieldErrors((p) => ({ ...p, businessName: "" }));
          }}
          placeholder="e.g. The Ice Cream Parlor by Glacier"
          className="sovereign-input w-full"
          maxLength={100}
        />
        {fieldErrors.businessName && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors.businessName}</p>
        )}
      </div>

      {/* Contact Name */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
          <User className="w-4 h-4 text-text-muted" />
          Your Name <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => {
            setContactName(e.target.value);
            setFieldErrors((p) => ({ ...p, contactName: "" }));
          }}
          placeholder="e.g. Tony Karnes"
          className="sovereign-input w-full"
          maxLength={100}
        />
        {fieldErrors.contactName && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors.contactName}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
          <Mail className="w-4 h-4 text-text-muted" />
          Email <span className="text-accent">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((p) => ({ ...p, email: "" }));
          }}
          placeholder="you@business.com"
          className="sovereign-input w-full"
        />
        {fieldErrors.email && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
        )}
        <p className="text-xs text-text-muted mt-1">
          Private — never displayed publicly.
        </p>
      </div>

      {/* Location + Category row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
            <MapPin className="w-4 h-4 text-text-muted" />
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Fort Collins, CO"
            className="sovereign-input w-full"
            maxLength={200}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sovereign-input w-full"
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
          <Globe className="w-4 h-4 text-text-muted" />
          Website
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yoursite.com"
          className="sovereign-input w-full"
        />
      </div>

      {/* Logo URL */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
          <ImageIcon className="w-4 h-4 text-text-muted" />
          Logo URL
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://yoursite.com/logo.png"
          className="sovereign-input w-full"
        />
        <p className="text-xs text-text-muted mt-1">
          Link to your logo image. Displayed on the merchant directory.
        </p>
      </div>

      {/* Reason */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
          <MessageSquare className="w-4 h-4 text-text-muted" />
          Why do you want to accept Bitcoin?
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us why you're excited to join the network..."
          className="sovereign-input w-full resize-none"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-text-muted mt-1">
          {reason.length}/500 — displayed on the merchant directory.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="antigravity-btn w-full !py-3 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            Join the Network
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
