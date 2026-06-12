// 应用主入口

(function () {
  'use strict';

  // DOM 元素引用
  const canvas = document.getElementById('paint-canvas');
  const startOverlay = document.getElementById('start-overlay');
  const startBtn = document.getElementById('start-btn');
  const cursorIndicator = document.getElementById('cursor-indicator');
  const voiceStatus = document.getElementById('voice-status');
  const speechOverlay = document.getElementById('speech-overlay');
  const speechText = document.getElementById('speech-text');

  // 状态栏元素
  const currentColor = document.getElementById('current-color');
  const colorText = document.getElementById('color-text');
  const currentLinewidth = document.getElementById('current-linewidth');
  const currentMode = document.getElementById('current-mode');
  const currentPosition = document.getElementById('current-position');

  // 初始化画布渲染器
  const renderer = new CanvasRenderer(canvas);

  // 初始化各模块（后续PR逐步完善）
  const history = new ActionHistory();
  const parser = new CommandParser();
  const executor = new CommandExecutor();
  const feedback = new FeedbackSystem();
  const recognizer = new VoiceRecognizer();

  // ===== 光标指示器更新 =====
  function updateCursorIndicator() {
    cursorIndicator.style.left = renderer.cursorX + 'px';
    cursorIndicator.style.top = renderer.cursorY + 'px';
    cursorIndicator.style.display = 'block';
  }

  // ===== 状态栏更新 =====
  function updateStatusBar() {
    const style = renderer.currentStyle;
    currentColor.style.backgroundColor = style.strokeColor;
    colorText.textContent = style.strokeColor;
    currentLinewidth.textContent = style.lineWidth;
    currentMode.textContent = style.fill ? '填充' : '描边';
    currentPosition.textContent = `${Math.round(renderer.cursorX)}, ${Math.round(renderer.cursorY)}`;
  }

  // ===== 语音识别状态更新 =====
  function updateVoiceStatus(state, text) {
    voiceStatus.className = 'status-indicator ' + state;
    voiceStatus.querySelector('.status-text').textContent = text;
  }

  // ===== 语音识别结果显示 =====
  let speechHideTimer = null;
  function showSpeechText(text) {
    speechText.textContent = text;
    speechOverlay.classList.remove('hidden');
    clearTimeout(speechHideTimer);
    speechHideTimer = setTimeout(() => {
      speechOverlay.classList.add('hidden');
    }, 3000);
  }

  // ===== 启动按钮 =====
  startBtn.addEventListener('click', () => {
    startOverlay.classList.add('hidden');
    updateCursorIndicator();
    updateStatusBar();
    updateVoiceStatus('listening', '监听中');
    // 后续PR中启动语音识别
    console.log('VoicePaint 已启动');
  });

  // ===== 初始绘制 =====
  renderer.redraw();

  // ===== 暴露到全局供调试 =====
  window.__voicePaint = {
    renderer, history, parser, executor, feedback, recognizer,
    updateCursorIndicator, updateStatusBar, showSpeechText
  };
})();
