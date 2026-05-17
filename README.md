<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/06e9df27-ed3f-40cb-b0a6-772a8e43956b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Known Issues and Follow-up

| Date | Item | Status | Notes |
| --- | --- | --- | --- |
| 2026-05-17 | OpenAI token-per-minute limit exceeded during PDF analysis | Fixed | OpenAI requests are capped with an 18k-character prompt guard and `max_output_tokens: 4000`; report text sent by `FundamentalAgent` is also limited to 18k characters. |
| 2026-05-17 | OpenAI context window exceeded during PDF analysis | Fixed | OpenAI now uses the extracted/truncated report text only and does not attach the full base64 PDF, avoiding duplicate context usage. |
| 2026-05-17 | OpenAI JSON schema type mismatch (`STRING` vs `string`) | Fixed | `src/agents/LLMProvider.ts` now recursively normalizes Gemini schema type strings before sending schemas to OpenAI. |
| 2026-05-17 | Review OpenAI-first compute usage | Follow-up | Recheck whether PDF analysis and parallel agent orchestration consume too many OpenAI tokens/requests after more test runs. |
