// DeepSeek 大模型意图识别模块
// 将语音识别文本发送到后端代理，由 DeepSeek 大模型解析意图

class LLMParser {
  constructor() {
    this.enabled = true;  // 是否使用大模型，关闭则回退到规则引擎
    this.fallbackParser = null; // 回退解析器（CommandParser实例）
  }

  /**
   * 设置回退解析器
   */
  setFallback(parser) {
    this.fallbackParser = parser;
  }

  /**
   * 解析文本为指令
   * @param {string} text - 语音识别文本
   * @returns {object|null} 指令对象
   */
  async parse(text) {
    if (!text || !text.trim()) return null;

    if (!this.enabled) {
      // 回退到规则引擎
      return this.fallbackParser ? this.fallbackParser.parse(text) : null;
    }

    try {
      const response = await fetch('/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });

      const result = await response.json();

      if (result.success && result.command) {
        const command = result.command;
        // 验证指令格式
        if (command.intent && command.intent !== 'unknown') {
          command.raw = text;
          command.source = 'llm';
          return command;
        }
      }

      // 大模型返回 unknown 或格式异常，回退到规则引擎
      console.log('大模型未识别意图，回退到规则引擎:', text);
      return this.fallbackParser ? this.fallbackParser.parse(text) : null;

    } catch (e) {
      console.error('DeepSeek请求失败，回退到规则引擎:', e.message);
      return this.fallbackParser ? this.fallbackParser.parse(text) : null;
    }
  }
}
