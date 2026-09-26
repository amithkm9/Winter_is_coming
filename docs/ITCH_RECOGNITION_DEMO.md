# itch.io recognition demo

The static game needs a separate HTTPS API for H5 recognition. A 404 on health and 403 on warmup from itch.io means an upload is calling the static host instead of the model service. Webcam permission alone does not establish this connection.

## Temporary laptop-backed demo

1. Run the root model service on port 8100 with its trusted model path configured in `backend/.env`.
2. Run `backend/.venv/bin/python -m uvicorn demo_gateway:app --app-dir backend --host 127.0.0.1 --port 8101`.
3. Run `ngrok http 127.0.0.1:8101 --inspect=false` and keep it running.
4. Put its current HTTPS URL in the ignored `.env.production.local`: `VITE_API_URL=https://YOUR-ENDPOINT.ngrok-free.app`.
5. Run `npm run package:itch` from the root and replace the itch.io HTML upload with the new ZIP. Rebuilding source or pushing GitHub does not replace an itch.io upload.

The gateway forwards only `/api/health`, `/api/recognition/warmup` and `/api/recognize` to the model service. It serves no model files, source files, hint API or voice API. Upstream validation/rate limits still apply. Its CORS defaults allow `https://html-classic.itch.zone`, `https://html.itch.zone` and localhost; set `DEMO_ALLOWED_ORIGINS` to include the exact embed origin if different. The fetch requests include ngrok's documented API header, preventing its HTML warning from replacing JSON. Microphone is not requested; camera images stay in the browser while landmark coordinates travel through the HTTPS tunnel.

Keep this laptop awake, connected to the internet, and all three processes running. Restarting ngrok can change its URL; rebuild and replace the ZIP if it does. This is a temporary demo connection, not permanent hosting. `.env.production.local` is not committed and is not needed for localhost development, which retains the Vite proxy.

## Verify

From the game embed's Network panel, warmup should target your HTTPS endpoint and return HTTP 200 with `ready: true`. Subsequent recognize requests should return JSON with sign/confidence. A rejected low-confidence prediction can legitimately return `sign: null`. The existing model's original label mapping and real-hand accuracy are still unverified; a successful network test does not prove linguistic correctness.

## Permanent deployment

Deploy the recognition service and trusted model to an always-on HTTPS host. Configure CORS for the actual embed origin, set `VITE_API_URL` to that host, rebuild, and upload the resulting ZIP. The static ZIP never contains Python or model weights.

References: [itch.io HTML5 hosting](https://itch.io/docs/creators/html5), [ngrok API warning header](https://ngrok.com/docs/pricing-limits/free-plan-limits#removing-the-interstitial-page).
