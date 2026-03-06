---
id: 155
title: "Add NFC browser detection with fallback UI in NumoNFCSetup"
priority: P3
severity: low
status: completed
source: feature_audit
file: components/merchant-onboard.tsx
line: 660
created: "2026-02-28T25:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Only touches components/merchant-onboard.tsx NumoNFCSetup component — independent of all other tasks"
---

# Add NFC browser detection with fallback UI in NumoNFCSetup

**Priority:** P3 (low)
**Source:** feature_audit
**Location:** components/merchant-onboard.tsx:660 (NumoNFCSetup component)

## Problem

The `NumoNFCSetup` component in `components/merchant-onboard.tsx` renders a full NFC card provisioning UI without checking if the Web NFC API is available in the current browser. The Web NFC API (`navigator.nfc`) is supported **only in Chrome on Android** — it does not work on:
- iOS (Safari or Chrome)
- Desktop browsers (Chrome, Firefox, Safari on Windows/macOS/Linux)
- Firefox on any platform

Without browser detection, the component silently renders the "Provision NFC Card" button on unsupported platforms. Users may click the button and receive no feedback that the operation cannot work. The existing TODO comment in the code (`// TODO: Real NFC provisioning requires Web NFC API (navigator.nfc.write)`) acknowledges this gap.

**Code with issue:**
```typescript
// components/merchant-onboard.tsx:660-724
export function NumoNFCSetup({ merchantId, merchantName, mintUrl, onSetup }) {
  const [defaultAmount, setDefaultAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "provisioning" | "done">("idle");

  // BUG: no check for typeof navigator !== 'undefined' && 'nfc' in navigator
  // The component renders for all browsers, including iOS and desktop

  const handleProvision = async () => {
    const config = generateNumoCardConfig(merchantId, merchantName, mintUrl, ...);
    // TODO: Real NFC provisioning requires Web NFC API (navigator.nfc.write)
    // currently queues card setup for manual fulfillment
    onSetup(config);
    setStatus("done");
  };

  // Renders "Provision NFC Card" button regardless of browser support
  ...
}
```

## How to Fix

Add NFC support detection and render an unsupported-browser fallback when the Web NFC API is unavailable:

```typescript
export function NumoNFCSetup({ merchantId, merchantName, mintUrl, onSetup }) {
  const [defaultAmount, setDefaultAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "provisioning" | "done">("idle");

  // Detect Web NFC API support (Chrome Android only)
  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;

  if (!nfcSupported) {
    return (
      <div className="sovereign-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
          <span className="text-sm font-bold text-sovereign-muted">
            Numo NFC Card Setup
          </span>
        </div>
        <p className="text-xs text-sovereign-muted">
          NFC provisioning requires Chrome on Android. Use the QR code above to accept payments on this device.
        </p>
      </div>
    );
  }

  // ... rest of component unchanged
```

**Notes on the detection:**
- Check for `"NDEFReader" in window` (the Web NFC API class) rather than `"nfc" in navigator` — NDEFReader is the correct global for Web NFC
- Wrap in `typeof window !== "undefined"` to avoid SSR errors (component is client-only but guard is good practice)
- The QR code for payments is already rendered by the parent component — just direct users to it in the fallback message

## Acceptance Criteria

- [ ] `NumoNFCSetup` detects Web NFC API availability using `"NDEFReader" in window`
- [ ] Unsupported browsers (iOS, desktop, Firefox) see a clear message: "NFC provisioning requires Chrome on Android. Use the QR code above to accept payments."
- [ ] Supported browsers (Chrome Android) see the existing provisioning UI unchanged
- [ ] No SSR errors (check `typeof window !== 'undefined'` before accessing `window`)
- [ ] `npm run build` passes with no errors
- [ ] No TypeScript errors

## Notes

_Generated from feature_audit finding: "Merchant NFC integration (cross-browser)" (low severity, low effort)._
_Do NOT attempt real navigator.nfc.write() integration — the TODO comment explains NFC provisioning still requires Numo hardware backend. This task is detection + fallback message only._
