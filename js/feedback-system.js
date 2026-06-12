// 反馈系统模块 - 语音播报 + 视觉状态更新

class FeedbackSystem {
  constructor() {
    this.synth = window.speechSynthesis;
    this.speaking = false;
    this.speechQueue = [];
    this.enabled = true; // 语音播报开关

    // DOM 元素引用（在 init 中设置）
    this.statusBarElements = null;
    this.cursorIndicator = null;
  }

  /**
   * 初始化DOM引用
   */
  init(elements) {
    this.statusBarElements = elements.statusBar;
    this.cursorIndicator = elements.cursorIndicator;
  }

  /**
   * 语音播报
   */
  speak(text) {
    if (!this.enabled || !this.synth) return;

    // 取消当前播报，立即播放新内容
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.2;  // 稍快语速
    utterance.volume = 0.8; // 稍低音量，不干扰用户
    utterance.pitch = 1.0;

    utterance.onstart = () => { this.speaking = true; };
    utterance.onend = () => { this.speaking = false; };
    utterance.onerror = () => { this.speaking = false; };

    this.synth.speak(utterance);
  }

  /**
   * 更新状态栏显示
   */
  updateStatusBar(renderer) {
    if (!this.statusBarElements) return;

    const style = renderer.currentStyle;
    const { colorPreview, colorText, lineWidth, mode, position } = this.statusBarElements;

    if (colorPreview) colorPreview.style.backgroundColor = style.strokeColor;
    if (colorText) colorText.textContent = style.strokeColor;
    if (lineWidth) lineWidth.textContent = style.lineWidth;
    if (mode) mode.textContent = style.fill ? '填充' : '描边';
    if (position) position.textContent = `${Math.round(renderer.cursorX)}, ${Math.round(renderer.cursorY)}`;
  }

  /**
   * 更新光标指示器位置
   */
  updateCursorIndicator(renderer) {
    if (!this.cursorIndicator) return;
    this.cursorIndicator.style.left = renderer.cursorX + 'px';
    this.cursorIndicator.style.top = renderer.cursorY + 'px';
    this.cursorIndicator.style.display = 'block';
  }

  /**
   * 启用/禁用语音播报
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.synth.cancel();
    }
  }
}
