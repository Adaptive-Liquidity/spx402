# SPX402 roadmap

- [x] Base lane live: Alchemy URL replaced; scanner catching up every 15 min
- [x] Base lane scoring: 0x136008978ad053942dcdbe759a0903f5d84966fa confirmed as a facilitator (8,989 EIP-3009 relays, 51 distinct payers), fixture E1 captured, registry row `base-relay-1360` active
- [x] Alerts delivery: `alert_channels` + `alert_deliveries`, HMAC webhooks and Slack live, test-send verification, 5-min dispatcher (`spx-alert-dispatch`)
- [x] Paid API: one quota table everywhere (100 / 10k / 100k), keys unlock access and are metered, keyless x402 payments verified on Base with replay protection, server-side key minting
- [x] `X402_PAY_TO_ADDRESS` set (0x702d89c9899b4e2d1768651d978e7a07cdf96e92) — keyless pay-per-call live
- [x] Base App ID meta tag (`base:app_id`) in root head — ready for Base Dev registration
- [ ] Email alerts: connect sending domain (adaptiveliquidity.com, from Contact@adaptiveliquidity.com) via the email setup dialog; DNS verification, then channels activate
- [ ] SMS alerts: number on file (+1 602-300-0179) — needs an SMS sending provider wired before the channel can activate
- [ ] Prober: funded wallet + PROBER_ENABLED=true (user decision — real money)
