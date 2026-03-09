# ArxMint Legal Position Paper
## Bitcoin Lightning Payments: Regulatory and Legal Framework

**Version:** 1.0
**Date:** March 2026
**Author:** ArxMint (travis@arxmint.com)

> **Disclaimer:** This document is provided for informational purposes only and does not constitute legal or financial advice. Laws and regulations vary by jurisdiction and change frequently. Merchants, operators, and users should consult qualified legal counsel before making compliance decisions. ArxMint does not provide legal services.

---

## 1. What ArxMint Is — and Is Not

ArxMint is **payment infrastructure software**. It enables merchants to self-host a Bitcoin Lightning Network payment node and accept payments from customers directly — peer-to-peer, without any intermediary holding funds.

**ArxMint is:**
- Open-source software (MIT License) that merchants install and operate themselves
- A payment acceptance tool, analogous to a point-of-sale terminal
- Infrastructure for connecting to the Bitcoin Lightning Network

**ArxMint is not:**
- A money transmitter or payment processor
- A custodian or fiduciary of customer funds
- An exchange, wallet provider, or financial institution
- A data broker or payment network operator

The merchant owns and controls their own node. ArxMint software never holds, transmits, or custodies funds on anyone's behalf. This is a fundamental legal distinction from services like PayPal, Stripe, or Square.

---

## 2. Bitcoin Lightning Network: Legal Characterization

### 2.1 Bitcoin as Property

In the United States, the Internal Revenue Service (IRS) has classified Bitcoin and other virtual currencies as **property**, not currency (IRS Notice 2014-21, Revenue Ruling 2023-14). This means:

- Accepting Bitcoin as payment is analogous to accepting payment in goods or barter
- Merchants receiving Bitcoin recognize income at the fair market value in USD at the time of receipt
- Capital gains rules apply when Bitcoin received as payment is later sold at a different price

This property classification is widely adopted across major jurisdictions including the UK, EU member states, and most Commonwealth countries.

### 2.2 Lightning Network: Off-Chain Settlement

Bitcoin Lightning Network transactions are **off-chain** payment channels. Key characteristics:

- Payments route through a network of pre-funded channels
- Settlement is final and irreversible when complete (no chargebacks)
- The underlying Bitcoin blockchain provides final settlement security
- Lightning invoices are single-use — they cannot be double-spent

From a legal standpoint, Lightning payments are most analogous to **cash transactions**: final, immediate, and without intermediary custody.

### 2.3 Ecash (Cashu/Fedimint)

ArxMint optionally supports **ecash** via Cashu mints and Fedimint federations. Ecash is:

- A bearer instrument representing a claim on Bitcoin held by the mint
- Chaumian blinded ecash — the mint cannot link issuance to redemption
- Not a new currency — denominated in satoshis (fractions of Bitcoin)

Legal treatment of ecash varies by jurisdiction. In the US, ecash may be treated similarly to stored value or gift certificates depending on the specific structure. Operators of Cashu mints or Fedimint federations should consult local counsel regarding money transmission requirements.

---

## 3. Money Transmission: Merchant vs. Operator Analysis

### 3.1 Merchant Receiving Payment

A **merchant accepting Bitcoin as payment for goods or services** is generally not considered a money transmitter. This is consistent with:

- FinCEN Guidance FIN-2013-G001 (March 2013): "A user who obtains convertible virtual currency and uses it to purchase real or virtual goods or services is not an MSB"
- FATF Guidance on Virtual Assets (2019/2021): Payment acceptance by merchants falls outside VASP scope
- EU MiCA (Markets in Crypto-Assets Regulation): Merchant acceptance explicitly excluded from CASP licensing

The merchant is simply **receiving payment** — the same legal activity as receiving cash or a bank transfer.

### 3.2 Mint Operators

Operators of **Cashu mints** or **Fedimint federations** occupy a different legal position than merchants. A mint:
- Issues ecash tokens redeemable for Bitcoin
- Custodies Bitcoin on behalf of token holders
- May be characterized as a money services business, e-money issuer, or stored value issuer depending on jurisdiction

Mint operators should consult legal counsel in their jurisdiction. Small-scale community mints with limited float may fall under exemptions for small stored value instruments in some jurisdictions (e.g., US $10,000 transaction exemptions under BSA regulations, or EU e-money small institution exemptions).

### 3.3 ArxMint the Software Company

ArxMint publishes open-source software. ArxMint does not:
- Process payments between merchants and customers
- Hold funds at any point in the payment flow
- Operate infrastructure through which merchant funds pass

This positions ArxMint analogously to a **payment terminal manufacturer** or **open-source POS software developer** — not a payment processor or money transmitter.

---

## 4. Data Privacy: GDPR, CCPA, and Bitcoin

### 4.1 What ArxMint Collects

ArxMint is architected for **minimal data collection**. The payment flow by design does not require:

- Customer name or identity
- Email address (unless merchant optionally requests for receipts)
- Physical address (unless merchant collects for shipping)
- Credit card or bank account numbers
- Government ID or KYC information

Lightning invoices identify payments by a cryptographic payment hash. Cashu ecash is Chaumianly blinded — no linkage between issuance and redemption. Neither reveals customer identity by default.

### 4.2 GDPR Analysis (EU/EEA Merchants)

Under GDPR (Regulation (EU) 2016/679):

- **No personal data collected** = no GDPR processing obligations for the payment itself
- Optional shipping address collection: constitutes personal data processing under GDPR
- Merchants who collect personal data (email, shipping) must have a lawful basis (Article 6 GDPR) — typically "contract performance"
- Data minimization principle (Article 5(1)(c)) is satisfied by ArxMint's zero-KYC default design
- No data transfers to third countries by default (self-hosted infrastructure)

**GDPR Data Controller:** The merchant operating ArxMint is the data controller for any personal data they choose to collect. ArxMint the software company is not a data processor unless specifically contracted as one.

### 4.3 CCPA Analysis (California Merchants)

Under CCPA (California Consumer Privacy Act):

- Lightning payment hashes and on-chain transaction IDs are **pseudonymous identifiers** — they may qualify as "personal information" under CCPA's broad definition if linkable to a specific consumer
- ArxMint does not sell consumer personal information
- Merchants below the CCPA revenue thresholds ($25M annual revenue) are generally exempt
- Best practice: merchants should include Bitcoin payment information in their privacy policy

### 4.4 Best Practices

1. Disclose Bitcoin/Lightning payment acceptance in your privacy policy
2. Collect only the shipping/contact data you actually need
3. Store payment records in compliance with applicable retention requirements (typically 5–7 years for tax records)
4. Do not attempt to de-anonymize Lightning payment senders

---

## 5. Tax Treatment

### 5.1 Income Recognition (US)

When a US merchant accepts Bitcoin as payment:

1. **Recognize income** at the USD fair market value of Bitcoin received at the time of the transaction
2. **Record the transaction** with: date, amount in sats, USD equivalent at time of receipt, and description of goods/services
3. **Track cost basis** of Bitcoin held for future capital gains calculation
4. **Report on taxes** as ordinary business income (Form 1040 Schedule C for sole proprietors, corporate income statements for entities)

### 5.2 Record Keeping

ArxMint's dashboard provides a transaction history export. Merchants should:
- Export transaction records monthly
- Store records for at least 7 years
- Use a Bitcoin-aware accounting tool (CoinTracker, Koinly, or spreadsheet)

### 5.3 Non-US Jurisdictions

Tax treatment of Bitcoin business income varies. Most jurisdictions treat it as ordinary income at FMV at time of receipt. Notable exceptions and variations:

- **EU:** Generally income at FMV; VAT treatment varies by member state
- **UK:** HMRC treats as income at sterling FMV; CGT on subsequent disposal
- **Canada:** CRA treats Bitcoin as commodity; business income rules apply
- **El Salvador:** Bitcoin is legal tender; no capital gains tax on Bitcoin-to-Bitcoin transactions

Consult a qualified tax professional in your jurisdiction.

---

## 6. Jurisdictional Overview

| Jurisdiction | Merchant Acceptance | Mint Operation | KYC Required |
|-------------|--------------------|--------------|--------------------|
| United States | Legal, property treatment | Consult counsel (varies) | No for merchant receipt |
| European Union (MiCA) | Explicitly excluded from CASP | May require registration | No for merchant |
| United Kingdom | Legal, treated as commodity | FCA guidance evolving | No for merchant |
| Canada | Legal, income tax applies | FINTRAC rules may apply | No for merchant |
| Australia | Legal, GST exempt | AUSTRAC rules may apply | No for merchant |
| El Salvador | Legal tender | N/A (national currency) | No |

This table is for general orientation only. Seek qualified local counsel for your specific situation.

---

## 7. Summary

For **merchants accepting Bitcoin Lightning payments for goods and services**:

- ✅ Legal in major jurisdictions (US, EU, UK, Canada, Australia)
- ✅ No money transmitter license required for payment acceptance
- ✅ Minimal privacy obligations due to pseudonymous payment design
- ✅ Tax reporting required (ordinary income at FMV at receipt)
- ✅ No chargebacks, no fraud liability from payment processing
- ⚠️ Ecash mint operation may require additional legal analysis
- ⚠️ Always consult local qualified legal counsel for your specific situation

---

*This document is informational only and does not constitute legal or financial advice. Consult qualified legal counsel before making compliance decisions. Last updated March 2026.*
