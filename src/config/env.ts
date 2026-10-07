/**
 * Environment configuration.
 *
 * ⚠ THIS FILE HOLDS NO SECRETS AND MUST NOT GROW ANY. It is tracked in git, unlike the reference
 * app's equivalent (which is ignored there because it carries a live Maps key). Anything secret
 * belongs in `.env`, which `.gitignore` excludes.
 *
 * Android emulator → host is `10.0.2.2`, never `localhost`: on a device or emulator `localhost` is
 * the handheld itself.
 */

declare const __DEV__: boolean;

export const ENV = {
  /**
   * The app is ONLINE-ONLY (plan decision O3). Every read and every write goes to this host; there
   * is no cache and no outbox, so an unreachable host is a visible, retryable failure rather than
   * a queue.
   *
   * ── DEV: a locally hosted syniq-server on port 3000 ─────────────────────────────────────────
   *
   * `localhost` works on the DEVICE only because of an adb reverse tunnel:
   *
   *     adb reverse tcp:3000 tcp:3000
   *
   * which makes the handheld's own :3000 resolve to the development machine's :3000. Without it,
   * `localhost` is the handheld itself and every call fails with a connection refusal.
   *
   * ⚠ THE TUNNEL DOES NOT SURVIVE A REPLUG. `adb reverse` is bound to the current adb connection,
   * so unplugging the cable, a device reboot, or an `adb kill-server` silently drops it — and the
   * symptom is an app that was working a minute ago now failing every request. Re-run the command.
   *
   * Alternatives, if the tunnel is not wanted:
   *   • Android emulator → host:  http://10.0.2.2:3000
   *   • Handheld on the same wifi: http://<dev-machine-LAN-ip>:3000
   *
   * Cleartext HTTP is permitted in DEBUG builds only — RN's gradle plugin sets the
   * `usesCleartextTraffic` manifest placeholder to true for debug and false for release. A release
   * build therefore cannot talk to an http:// host at all, which is the correct behaviour and the
   * reason production is pinned to https below.
   */
  API_BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://api.syniqerp.com',

  /**
   * 30 s. Long for an API call, but a van on a mobile network is genuinely slow, and a
   * premature abort on an invoice POST is worse than a wait — the server may already have
   * committed it. `Idempotency-Key` covers the retry; the timeout only decides how long we wait
   * before offering one.
   */
  API_TIMEOUT: 30_000,

  APP_LINK: 'https://play.google.com/store/apps/details?id=com.syniq.vansales',
} as const;
