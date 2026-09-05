# Getting the attester wallet ready for the Operator Badge (Tier 2, step 5)

The badge stamps our verdicts onto Base via EAS (Ethereum Attestation Service). To do that, SPX402 needs its own small wallet that signs those stamps. This is a "hot" server key — it will only ever hold a few dollars of ETH for gas, never customer funds.

## Your steps (about 5 minutes)

### 1. Create the wallet
Easiest: in MetaMask (or Coinbase Wallet), create a **new account** and name it something obvious like "SPX402 Attester".

- Do NOT reuse your personal wallet — this key lives on the server.
- You will never need to sign anything manually with it; the server does it.

### 2. Copy its public address
Click the account, copy the `0x…` address. This is public — safe to paste in chat.

### 3. Export its private key
MetaMask: account menu → Account details → Show private key. This is a **secret** — do not paste it in chat. I'll give you a secure secret-entry prompt for it.

### 4. Fund it with a little ETH on Base
Send ~$5–10 of ETH **on the Base network** to the new address. From Coinbase: withdraw ETH and choose "Base" as the network. Each attestation stamp costs a fraction of a cent, so $5 lasts for thousands of badges.

### 5. Tell me when done
Paste the public `0x…` address here. For the private key, I'll open the secure secret vault entry (it never appears in chat or code).

## What I'll do once I have it
- Store the key as a server secret, register our EAS schema on Base, and start stamping attestations whenever an operator verifies or an agent earns a grade.
- Build the paid badge subscription ($49–$199/mo) with the "payment funds monitoring, never the grade" rule baked into checkout copy and terms.
- Add the low-balance watchdog (your watch-item #1): the health sweep checks the attester's ETH and fires an operator alert before it can run dry.
