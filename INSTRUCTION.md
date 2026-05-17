# FinAgent V2 Instructions

## Changelog

| Date | What changed | Why |
| --- | --- | --- |
| 2026-05-17 | Added OpenAI prompt and output caps and reduced FundamentalAgent report text length for OpenAI-first PDF analysis. | Keeps requests under the current OpenAI tokens-per-minute limit while preserving the same agent call signatures. |
| 2026-05-17 | Stopped attaching full PDF base64 data to OpenAI requests and documented the context-window issue in `README.md`. | Prevents OpenAI-first analysis from exceeding context limits by relying on extracted/truncated report text instead of duplicating the PDF payload. |
| 2026-05-17 | Documented the fixed OpenAI schema string mismatch and added a follow-up note to review OpenAI-first compute usage in `README.md`. | Keeps the known issue history and compute-cost review task visible for future checks. |
| 2026-05-17 | Fixed OpenAI JSON schema conversion to recursively normalize Gemini schema type strings such as `STRING` to JSON Schema lowercase types. | Prevents OpenAI `response_format` validation errors during OpenAI-first analysis runs. |
| 2026-05-17 | Set the shared LLM provider to prefer OpenAI `gpt-4o`, injected `OPENAI_API_KEY` into the Vite runtime config, and repaired the local OpenAI env line format. | Allows the app to run analyses with OpenAI first while preserving Gemini as the backup provider. |
| 2026-05-17 | Added OpenAI `gpt-4o` fallback in `src/agents/LLMProvider.ts` when Gemini is missing, rate-limited, or has authentication/permission failures. | Keeps the existing agent function signatures working while allowing analyses to continue when Gemini is unavailable. |
