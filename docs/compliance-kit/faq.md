# Compliance FAQ — Merchant Procurement

**Frequently asked questions from merchant legal, IT, and finance teams.**

> This FAQ is for informational purposes only and does not constitute legal or financial advice. Answers reflect general principles as of early 2026. Laws vary by jurisdiction and change frequently. Consult qualified legal counsel for your specific situation.

---

## Legal & Regulatory

**Q1: Is accepting Bitcoin legal?**

Yes, in the vast majority of jurisdictions. Bitcoin is legal to accept as payment in the United States, European Union, United Kingdom, Canada, Australia, Japan, and most other developed economies. In the US, the IRS treats Bitcoin as property (IRS Notice 2014-21). Accepting it as payment is treated similarly to barter — legal and subject to standard income tax rules.

A small number of jurisdictions have restrictions or bans (e.g., China, some Central Asian countries). Verify local law with qualified counsel.

---

**Q2: Do we need a money transmitter license (MTL) to accept Bitcoin?**

No. A **merchant accepting Bitcoin as payment for goods or services** is not a money transmitter under US FinCEN guidance (FIN-2013-G001). The same principle applies in most other jurisdictions — EU MiCA explicitly excludes merchant payment acceptance from CASP (crypto-asset service provider) licensing requirements.

Money transmitter/MSB rules apply to businesses that **transmit funds between third parties** (exchanges, remittance services, custodial wallets). Accepting payment from a customer for a product you sell is not money transmission.

---

**Q3: Does accepting Bitcoin require registering with any financial regulator?**

Generally no, for standard merchant payment acceptance. In the US, you do not need to register with FinCEN, SEC, CFTC, or any other financial regulator solely because you accept Bitcoin payments.

If your business also operates a Cashu mint or Fedimint federation (holds Bitcoin on behalf of customers), that is a different legal question — consult counsel.

---

**Q4: What happens if a transaction is disputed?**

Bitcoin Lightning payments are **final and irreversible**. There are no chargebacks. Once a Lightning payment settles (typically within 3 seconds), the funds cannot be recalled by the customer, their bank, or any intermediary.

This is a significant operational difference from card payments:
- **For merchants:** Eliminates chargeback fraud and chargeback fees
- **For dispute resolution:** Handle as you would a cash refund — at your discretion (store credit, manual refund in cash/card, or no refund per your policy)
- **Consumer protection:** Customers should verify merchant legitimacy before paying, same as with cash

---

**Q5: Is there any anti-money laundering (AML) obligation on our business?**

Standard **merchant AML/KYC requirements do not change** by accepting Bitcoin. If your business is not a money services business (MSB) before accepting Bitcoin, it remains not an MSB afterward.

If your business is in a regulated AML sector (banking, financial services, law, real estate in some jurisdictions), consult your compliance team — those sector-specific AML rules may have crypto-specific guidance.

ArxMint does not perform AML/KYC on customers because no PII is collected in the payment flow.

---

**Q6: What are our obligations under GDPR (EU)?**

Minimal, by design. ArxMint's default payment flow collects **no personal data** from customers — only cryptographic payment hashes, which are pseudonymous identifiers.

If you optionally collect email addresses or shipping information through the checkout, those are personal data under GDPR. You will need:
- A lawful basis (typically "contract performance" — Article 6(1)(b))
- A privacy policy informing customers of the data you collect
- Data retention limits appropriate to your purpose

ArxMint the software company is not your data processor — you self-host the software and own the data collected.

---

**Q7: Do we need to update our privacy policy?**

Yes, as a best practice. We recommend adding a section to your privacy policy disclosing that:
- You accept Bitcoin Lightning payments
- Payments are pseudonymous (no PII collected in the payment itself)
- If you collect email/shipping, describe that data collection and your retention policy

This is good hygiene regardless of legal requirement.

---

## Financial & Tax

**Q8: How do we account for Bitcoin receipts on our books?**

In the US: recognize income at the **USD fair market value of Bitcoin received at the time of the transaction** (IRS Revenue Ruling 2023-14). Record: date, amount in satoshis, USD equivalent at time of receipt, and description of what was sold.

If you later convert Bitcoin to USD at a different price, the difference is a capital gain or loss on the Bitcoin you held as a capital asset.

Most accounting software (QuickBooks, Xero) has plugins for Bitcoin income tracking. Tools like Koinly or CoinTracker can automate the cost basis calculations.

---

**Q9: What is our liability if the Lightning node goes down during a payment?**

If your node is offline, customers will receive an error when attempting to pay. The invoice won't be presentable. This is analogous to your card terminal going offline — the customer cannot pay until the system is restored.

Best practice: provide a cash or card backup payment option. Monitor node uptime via the Grafana dashboard included in ArxMint.

There is no financial liability to customers for a node being offline — no funds are held in escrow during an unpaid invoice.

---

**Q10: Are there any insurance products available for Bitcoin merchants?**

Bitcoin custody insurance exists for large custodians. For self-hosted merchant nodes with typical payment volumes, standard business insurance (general liability, business interruption) applies to business operations. Losses from Lightning node failures or security incidents may be covered under cyber liability insurance depending on your policy.

Check with your business insurance provider — coverage for digital assets is evolving rapidly.

---

## Technical & Security

**Q11: Is customer financial data stored on ArxMint servers?**

**No customer financial data** passes through ArxMint's servers. ArxMint is self-hosted software — your node is on your own server. The only thing ArxMint (the company) provides is the open-source software and optional cloud services (Supabase database for your own data).

No card numbers, bank accounts, or personally identifiable payment information is ever stored. Lightning payment hashes (pseudonymous) are stored locally on your server only.

---

**Q12: Has ArxMint undergone a security audit?**

A formal external penetration test is planned in Roadmap Phase 6.1 with budget allocated. The codebase is open source (github.com/Traviseric/arxmint) and available for public review.

Current security measures include:
- CI pipeline with dependency vulnerability scanning (`npm audit`)
- HMAC-SHA256 session tokens with timing-safe comparison
- Webhook HMAC signature verification
- Secrets generated with cryptographically secure random generators
- No hardcoded credentials in the codebase

Contact travis@arxmint.com to request the current security assessment or to arrange a technical review call.

---

**Q13: What encryption is used?**

- **TLS 1.3** for all external connections (enforced by Caddy reverse proxy)
- **AES-256-GCM** for client-side ecash proof storage (browser vault)
- **PBKDF2-SHA256** (600,000 iterations, OWASP recommended) for client-side key derivation
- **HMAC-SHA256** for session tokens and webhook signatures
- **AES-256** for LND wallet encryption at rest

See the [Security Overview](./security-overview.md) for full cryptographic standards.

---

**Q14: What happens to our funds if ArxMint (the company) shuts down?**

Nothing changes. Your funds are on your self-hosted Lightning node, in your custody, under your control. ArxMint is open-source software — it continues to function without any connection to ArxMint the company.

This is a core design principle: **the merchant data plane is fully independent of the ArxMint control plane**. You own your keys. You own your funds. No escrow, no counterparty risk.

---

**Q15: Can Bitcoin payments be traced back to individual customers?**

Lightning payments are **pseudonymous** by design. A payment hash identifies a specific transaction but does not inherently reveal the sender's identity. Without additional information (IP address logs, graph analysis of the Lightning Network), sender identity cannot be reliably determined from the payment record alone.

Ecash (Cashu/Fedimint) payments offer stronger privacy — the mint cannot link specific token issuance to specific redemptions (Chaumian blinding). This makes even off-chain payment graph analysis infeasible.

ArxMint does not collect IP addresses of payment senders or perform any customer identification.

---

**Q16: Is ArxMint SOC 2 certified?**

Not currently. SOC 2 certification is planned for the enterprise phase (after the external security audit). For enterprise procurement that requires SOC 2, contact travis@arxmint.com to discuss timelines and to share current security documentation.

---

**Q17: What is the disaster recovery plan?**

See [docs/DR_DRILL.md](../DR_DRILL.md) and [docs/RESTORE.md](../RESTORE.md) for detailed recovery procedures.

Summary:
- **RTO:** 2–4 hours for full stack recovery from backup
- **RPO:** 24 hours (daily automated backup cadence)
- **LND SCB (Static Channel Backup):** Daily automated export — allows channel force-close and fund recovery if the node is lost entirely
- **On-chain recovery:** 24-word wallet seed (held by merchant) allows full on-chain fund recovery from any LND installation

---

## Operational

**Q18: How do we handle refunds?**

Bitcoin Lightning payments are final — there is no built-in refund mechanism (same as cash). Handle refunds through your existing refund policy:
- Cash refund
- Store credit
- Refund via a separate Lightning payment (you initiate a new payment to the customer's wallet)

Best practice: update your refund policy to specify how Bitcoin purchases are handled. Most merchants offer store credit for Lightning-paid purchases.

---

**Q19: What support is available?**

- **Email:** travis@arxmint.com (response within 48 hours)
- **GitHub issues:** github.com/Traviseric/arxmint/issues (public bug reports)
- **Compliance review call:** Email to schedule a technical/compliance review call with the team
- **Documentation:** docs.arxmint.com (developer documentation)

Enterprise support SLAs are available — contact us to discuss.

---

**Q20: How do we get started?**

1. **Apply** at [arxmint.com/merchants](https://arxmint.com/merchants) — takes 5 minutes
2. **Approval** — typically within 48 business hours
3. **Go live** — your hosted checkout page is active immediately upon approval, no technical setup required
4. **Optional self-hosting** — deploy your own node with the [quickstart guide](../quickstart.md) for full sovereignty

Have more questions? Email [travis@arxmint.com](mailto:travis@arxmint.com) or request a compliance review call.
