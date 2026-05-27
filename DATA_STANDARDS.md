# EchoV 数据规范

## 货币规范
优先级：
1. 该证券所在交易所的交易货币（例如港交所上市 → HKD，纽交所上市 → USD）
2. 公司所在国的财务披露货币（例如中国公司未在境外上市 → CNY）

跨货币对比必须注明汇率基准日期。

## 数值格式
- 金额：<数字><B|M> <ISO货币代码>，例如 12.4B USD、457.3B CNY、89.2M HKD
- 百分比：保留一位小数 + % 符号，必须带正负号，例如 +23.4%、-4.1%
- 倍数：数字 + x，例如 18.2x
- 增长率：+12.3% 或 -4.1%，必须带符号

## 时间格式
- 日期：YYYY-MM-DD
- 报告期：FY2024 / Q3 2024 / TTM / LTM
- 每份 agent 输出必须包含 as_of 字段（ISO 8601 格式）

## 语言规范
- 同一份输出必须统一使用一种语言，禁止中英文混杂输出。
- 中文和英文版本之间的字段含义、指标口径、单位、时间范围和结论必须保持一致。
- 中英文转换必须使用统一、明确的术语映射；同一概念在全文中不得出现多个译法。
- 专有名词、公司名称、证券代码、交易所名称和 ISO 货币代码应保持官方写法。

## 空值规范
- 数据缺失：null（禁止用 0、"N/A"、"—" 代替）
- 数据不适用："not_applicable"
- 数据待更新："pending"
- 无公开数据："no_public_data"（用于 StakeholderAgent 的上下游/peers）

## 每份 agent 输出必须包含的基础字段
- as_of: string          // 数据截止时间，ISO 8601
- data_source: string    // 数据来源，例如 "yahoo_finance" / "pdf_extract" / "llm_synthesis"
- confidence: 'high' | 'medium' | 'low'
- refresh_interval: string  // 例如 "每周一 09:00"
