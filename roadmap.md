# SPX402 roadmap

- [x] Base lane live: Alchemy URL replaced; scanner catching up every 15 min
- [x] Base lane scoring: 0x136008978ad053942dcdbe759a0903f5d84966fa confirmed as a facilitator (8,989 EIP-3009 relays, 51 distinct payers), fixture E1 captured, registry row `base-relay-1360` active
- [x] Alerts delivery: `alert_channels` + `alert_deliveries`, HMAC webhooks and Slack live, test-send verification, 5-min dispatcher (`spx-alert-dispatch`)
- [x] Paid API: one quota table everywhere (100 / 10k / 100k), keys unlock access and are metered, keyless x402 payments verified on Base with replay protection, server-side key minting
- [ ] Set `X402_PAY_TO_ADDRESS` (Base USDC receiving wallet) to switch keyless pay-per-call from "not enabled" to live
- [ ] Email + SMS alert channels: need a verified sending domain and a sending number
- [ ] Prober: funded wallet + PROBER_ENABLED=true (user decision — real money)
