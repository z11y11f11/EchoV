# FinAgent V2 Instructions

## Build Rules

- The Express server must always be bundled as ESM, not CJS, because `server.ts` uses `import.meta.url` for `createRequire`. Keep build output as `dist/server.mjs`.

## Changelog

| Date | What changed | Why |
| --- | --- | --- |
| 2026-05-27 | Added EchoV data standards, base output validation with audit logging, ESGAgent, StakeholderAgent, Scheduler, AuditAgent/CostAgent placeholders, and Orchestrator integration for ESG/stakeholder outputs. Dashboard now renders structured ESG and stakeholder/management sections. | Establishes shared data contracts, exposes new analysis-layer agents in the report UI, and prepares refresh/audit/cost-control hooks for future expansion. |
| 2026-05-19 | Fixed ESG section missing from dashboard across all three modes. AnalysisDashboard: added ESG render block (Sprout icon, E/S/G pillar badges, full text) between Insights and Peer Comparison, guarded by `data.esgSummary` with skeleton while loading. ModeA: added `'esg'` to options array (was missing — FundamentalAgent never requested ESG). ModeB already had `'esg'`. ModeC: `'esg'` was already in LLMProvider dialogue enum. | esgSummary data was produced by FundamentalAgent but never rendered anywhere in the dashboard UI. |
| 2026-05-19 | Added Featherless as optional LLM provider in LLMProvider.ts. Uses OpenAI-compatible client with `baseURL: https://api.featherless.ai/v1`. Provider priority: (1) Featherless if `FEATHERLESS_API_KEY` set, (2) OpenAI default, (3) Gemini. Model configurable via `FEATHERLESS_MODEL` env var (default: `mistralai/Mistral-7B-Instruct-v0.3`). `conductDialogueStep` / `planOrchestratorToolCalls` always use OpenAI (require function calling). Featherless failures fall through to OpenAI/Gemini. Fixed metric units/baselines: FundamentalAgent now instructs LLM to use `<number><B\|M> <ISO_CODE>` format (e.g. `457.3B CNY`); QuantAgent enforces same for financials and `x`/`%` suffixes for ratios/percentages. No breaking changes. | Featherless enables cost-effective inference via open-source finance models. Consistent metric formatting eliminates "457,286 Million RMB" vs "457.29B" inconsistency across modes. |
| 2026-05-19 | Streaming partial dashboard: AnalysisDashboard now accepts `data: Partial<AnalysisResult>` + `isLoading?: boolean`. Added null-safe defaults for all fields and per-section skeleton pulse loaders (metrics grid, summary text, highlights/risks, competitors). ModeC updated to use same `partialData`/`mergePartial`/`handleEvent` streaming pattern as ModeA/B — dashboard appears as soon as first `partialData.company` arrives, with `isLoading={phase === 'analyzing'}` passed through. Header shows an "Agents running…" badge while loading. Export PDF disabled while agents are still streaming. | Dashboard fills section by section as each agent completes instead of waiting for one combined result. All three modes (A/B/C) now stream identically. |

| Date | What changed | Why |
| --- | --- | --- |
| 2026-05-19 | Major restructure: replaced single-flow UI with three independent analysis modes. Mode A (Market Analysis): ticker-only input, QuantAgent + PeerAgent + CIOAgent. Mode B (Report Analysis): PDF + ticker in parallel via new Orchestrator.runParallelAnalysis(), then CIOAgent cross-analysis. Mode C (AI Dialogue): LLM-driven chat via conductDialogueStep() with function calling, Orchestrator introduces itself, asks 2-4 clarifying questions, confirms plan, then dispatches agents. App.tsx completely restructured with three-tab layout, each tab fully independent. | Makes each input type (ticker / PDF / chatbox) a dedicated mode with no cross-contamination. Chatbox is now a true Orchestrator dialogue, not a passive filter. |
| 2026-05-19 | Tagged v2.3. Merged feature/chatbox-orchestrator and claude/optimistic-faraday-4c6381 into main. Build confirmed passing. Pushed main and v2.3 tag to origin for Vultr deploy. | Milan AI Week Hackathon release. |
| 2026-05-19 | Added true reflection loop to Orchestrator: after all agents run, detectGaps() checks each requested topic against returned content; gaps trigger CIOAgent.synthesizeFromKnowledge() which fills them using LLM training knowledge with an AI-synthesis disclaimer. Added synthesize_knowledge as a first-class planner tool so the LLM can schedule knowledge synthesis proactively. | Enables the Orchestrator to truly synthesize across agent capabilities instead of silently returning empty sections when documents lack the requested data. |
| 2026-05-19 | Bug 1: Added ticker validation in App.tsx to reject inputs containing spaces or >20 chars, directing users to the Orchestrator chatbox instead. Bug 2: Rewrote PeerAgent prompt to extract company name, sector, and geography before selecting peers; added sector-specific guidance (e.g. Chinese consumer electronics → Samsung/Apple/Lenovo, not telecom carriers). Bug 3: QuantAgent now instructs LLM to extract 15 named valuation metrics; ValuationModels shows Forward PE, PEG, ROE, Revenue Growth, EBITDA Margin; DCF calculator exposes Terminal Growth Rate as a user input; Valuation section opens by default. | Fixes chatbox/ticker confusion, irrelevant peer selection, and simplified valuation output vs V1. |
| 2026-05-18 | Added natural-language orchestration input, OpenAI function-calling tool planning, real-time agent return summaries, and checkbox fallback preservation. | Makes Orchestrator choose Fundamental, Quant, Peer, and CIO agents from user intent instead of only hardcoded input-type branching. |
| 2026-05-18 | Removed the mixed static/dynamic `services/ai` import pattern and raised the Vite chunk warning limit for the current bundle size. | Keeps `npm run build` warning-free while preserving the production ESM server output. |
| 2026-05-18 | Changed production server build output from CJS `dist/server.cjs` to ESM `dist/server.mjs` and updated the start script. | Prevents `createRequire(import.meta.url)` from breaking in production bundles. |
| 2026-05-17 | Added OpenAI prompt and output caps and reduced FundamentalAgent report text length for OpenAI-first PDF analysis. | Keeps requests under the current OpenAI tokens-per-minute limit while preserving the same agent call signatures. |
| 2026-05-17 | Stopped attaching full PDF base64 data to OpenAI requests and documented the context-window issue in `README.md`. | Prevents OpenAI-first analysis from exceeding context limits by relying on extracted/truncated report text instead of duplicating the PDF payload. |
| 2026-05-17 | Documented the fixed OpenAI schema string mismatch and added a follow-up note to review OpenAI-first compute usage in `README.md`. | Keeps the known issue history and compute-cost review task visible for future checks. |
| 2026-05-17 | Fixed OpenAI JSON schema conversion to recursively normalize Gemini schema type strings such as `STRING` to JSON Schema lowercase types. | Prevents OpenAI `response_format` validation errors during OpenAI-first analysis runs. |
| 2026-05-17 | Set the shared LLM provider to prefer OpenAI `gpt-4o`, injected `OPENAI_API_KEY` into the Vite runtime config, and repaired the local OpenAI env line format. | Allows the app to run analyses with OpenAI first while preserving Gemini as the backup provider. |
| 2026-05-17 | Added OpenAI `gpt-4o` fallback in `src/agents/LLMProvider.ts` when Gemini is missing, rate-limited, or has authentication/permission failures. | Keeps the existing agent function signatures working while allowing analyses to continue when Gemini is unavailable. |

---

## Agent 开发规范（扩展版）

### 架构分层

系统分为四层：

第一层 抓取层（Fetch）
- 只负责获取数据，不做分析
- 每个抓取 agent 对应一个数据源
- 输出：原始结构化数据 + as_of + data_source

第二层 分析层（Analysis）
- 只负责分析，不抓取数据
- 数据来自抓取层或直接数据源（如 Yahoo Finance）
- 包括：FundamentalAgent、QuantAgent、PeerAgent、ESGAgent、StakeholderAgent

第三层 合成层（Synthesis）
- 汇总所有分析层输出，生成最终结论
- 目前只有 CIOAgent

第四层 协调层（Orchestration）
- Orchestrator 负责协调所有 agent
- 根据用户选择的需求决定启动哪些 agent
- 并行调度，收集输出，检测 gap，交由合成层
- 未来会根据准确度、成本等综合权衡动态选择 agent 组合

### 数据规范
- 生成输出前遵循 DATA_STANDARDS.md
- 生成输出后调用 validateAgentOutput() 校验
- 校验不通过打 console.warn，不阻断流程

### 新增 agent 步骤
1. 确认层级（抓取 / 分析 / 合成）
2. 在 src/agents/ 下新建文件
3. 在 src/types.ts 中追加 Input/Output interface
4. 实现 AgentEvent 流式输出，与现有 agent 保持一致
5. 在 Orchestrator 的并行调度中注册
6. 在本文件末尾补充该 agent 的一句话职责说明

### 刷新频率规范
agent 输出中的 refresh_interval 字段使用以下标准值：
- 市场数据（股价/交易量）："每10分钟（交易时段内）"
- 新闻/事件："每天整点"
- 公告/披露："每天 06:00"
- 招聘数量："每周一 09:00"
- 监管变化："每周一 09:00"
- ESG 评级："每季度首个工作日 09:00"

### 内部控制 agent 预留接口（MVP 不实现，仅占位）
- AuditAgent：审计数据质量，检测 agent 输出的一致性和合理性
- CostAgent：追踪 API 调用成本，估算 token 消耗和费用
