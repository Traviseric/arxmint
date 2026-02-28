---
id: 129
title: "Add loading state for Cashu/LN mint connection in wallet panel"
priority: P2
severity: high
status: completed
source: ux_audit
file: components/wallet-panel.tsx
line: 200
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: wallet_panel
group_reason: "Same file as tasks 122, 127, 132"
---

# Add loading state for Cashu/LN mint connection in wallet panel

**Priority:** P2 (high)
**Source:** ux_audit
**Location:** components/wallet-panel.tsx:200

## Problem

When the wallet panel first loads and connects to Cashu/Lightning mints, there is no visible loading spinner or status message for the initial connection attempt. Users cannot tell if the wallet is working, connecting, or stuck. While there is a "Reconnecting..." message for reconnect flows, the initial connect attempt may not surface clear feedback.

## How to Fix

Track an `isConnecting` state and render a descriptive loading indicator during initial connection:

```tsx
const [isConnecting, setIsConnecting] = useState(false);
const [connectStatus, setConnectStatus] = useState<string>("");

// In the connect function:
setIsConnecting(true);
setConnectStatus("Connecting to Cashu mint...");
try {
  await getCashuClient().connect(mintUrl);
  setConnectStatus("Connected");
} catch (err: unknown) {
  setConnectStatus("Connection failed");
} finally {
  setIsConnecting(false);
}
```

Render loading state:
```tsx
{isConnecting && (
  <div className="flex items-center gap-2 text-sm text-sovereign-muted py-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{connectStatus}</span>
  </div>
)}
```

Use `Loader2` from `lucide-react` for the spinner (consistent with project).

## Acceptance Criteria

- [ ] Initial Cashu mint connection shows a loading spinner with descriptive text
- [ ] Loading state clears when connection succeeds or fails
- [ ] Failed connection shows an appropriate error message
- [ ] Reconnect flows retain existing "Reconnecting..." feedback
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: high, category: feedback)._
