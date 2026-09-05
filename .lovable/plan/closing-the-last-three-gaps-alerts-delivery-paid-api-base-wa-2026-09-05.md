# Closing the last three gaps: alerts delivery, paid API, Base wallet identity

Three things we advertise are not yet real. Here is what I found and what I propose to build.

## What the checks showed

- **Alerts deliver nothing.** People can subscribe and pick events, but there is no sending step of any kind — no email, no webhook, nothing. There are also zero subscriptions today, so nobody has been let down yet.
- **The paid API is both leaky and unusable.** A caller can hand us a self-written "I paid" note and we accept it without ever checking the chain, so the paid data is effectively free to anyone who reads our docs. At the same time a legitimate API key unlocks nothing on its own — every call without a payment note is refused. The dashboard also promises 100 free calls a day while the server enforces 10. No keys and no recorded calls exist yet.
- **The Base wallet is probably not a facilitator.** Public records for `0x1360…66fa` show it repeatedly sending small USDC amounts to the *same single* recipient. A real facilitator settles for many different payees. This points to an ordinary payer, not a settlement service — but I want to confirm it from our own indexed data before we decide.

## Plan

### 1. Alerts that actually arrive
Give each person a set of delivery destinations they manage themselves, rather than one fixed channel:
- **Email** — through our own sending domain, with a verification step so we only mail confirmed addresses.
- **Webhook** — a URL they register, signed so the receiver can prove the message came from us.
- **Slack** — an incoming webhook URL, posted as a formatted message.
- **Text message** — offered only once a sending number is connected; until then it is shown as not available rather than accepted and silently dropped.

Each destination is verified before it can receive anything, can be paused, and shows the time and result of its last delivery. A background job picks up new events, matches them to each subscriber's chosen event types and thresholds, sends, retries a few times on failure, and gives up cleanly. Users choose instant or a once-daily digest. Every send is recorded so the dashboard can show a real history, and a test-send button lets someone prove their setup works.

### 2. Paid API, end to end
- **Keys unlock access.** A valid key grants its daily quota with no payment note needed. Quotas become one number used everywhere — the dashboard, the pricing page, the docs and the server all read the same source, so the 100-versus-10 contradiction disappears.
- **Payments get verified.** A payment note is only honoured after we confirm the matching transfer on Base: right recipient, right amount, right asset, recent enough, and not already spent on an earlier call. Anything unproven is refused with the standard payment-required response.
- **Keys are minted on the server.** Today the browser creates the key and writes the row, which means a user can hand themselves any tier they like. Minting moves behind an authenticated server call that decides tier and quota.
- **Usage is recorded for every call** — key calls, paid calls, refusals and rate-limit hits alike — so the dashboard's usage panel and any future invoicing have real numbers.
- **Prove it live.** After publishing: mint a key, exhaust its quota, get the refusal; then make a real paid call and confirm the data comes back and the payment cannot be replayed.

### 3. Confirm the Base wallet
Query our own indexed Base transfers for that address: how many distinct recipients, over how long, and whether the transfers carry the authorisation signature a facilitator uses. Then:
- If it settles for many payees with facilitator-style calls, activate it in the registry and the Base lane moves from watching to scoring.
- If it is a single-payee payer, record it as such, leave it inactive, and note the finding so nobody revisits it. Either way the answer is written down, not guessed.

## Ground rules

- No new colours, fonts or layout.
- Nothing fake: any lane still missing a piece says so on the page instead of implying it works.
- Text messages and any other channel needing an outside account stay visibly unavailable until that account exists.

## Technical detail

- Delivery: new `alert_channels` (per-user, typed, verified, secret-bearing) and `alert_deliveries` (attempt log) tables with owner-scoped RLS and explicit grants; a cron-driven dispatcher route under `/api/public/` reading unprocessed `agent_events` against `alert_subscriptions`; HMAC-signed webhook payloads; email via the platform mail setup.
- Paid API: replace the stub in `verifyX402Payment` with a Base RPC receipt check plus a nonce/tx-hash uniqueness table to block replay; make `withX402Payment` treat a valid key as sufficient authorisation; collapse `TIER_LIMITS` in `src/lib/api-keys.ts` and `X402_CONFIG` limits into one shared constant; move minting out of the browser into an authenticated server function and tighten the `api_keys` insert policy.
- Base wallet: aggregate distinct `to` addresses and `transferWithAuthorization` presence for `0x1360…66fa` from indexed events before touching the `facilitators` row.
