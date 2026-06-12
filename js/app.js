// 应用主入口

(function () {
  'use strict';

  // 初始化画布渲染器
  const canvas = document.getElementById('paint-canvas');
  const renderer = new CanvasRenderer(canvas);

  // 初始化各模块（后续PR逐步完善）
  const history = new ActionHistory();
  const parser = new CommandParser();
  const executor = new CommandExecutor();
  const feedback = new FeedbackSystem();
  const recognizer = new VoiceRecognizer();

  // 启动按钮
  const startOverlay = document.getElementById('start-overlay');
  const startBtn = document.getElementById('start-btn');

  startBtn.addEventListener('click', () => {
    startOverlay.classList.add('hidden');
    // 后续PR中启动语音识别
    console.log('VoicePaint 已启动');
  });

  // 更新光标指示器位置
  const cursorIndicator = document.getElementById('cursor-indicator');
  function updateCursorIndicator() {
    const rect = canvas.getBoundingClientRect();
    cursorIndicator.style.left = renderer.cursorX + 'px';
    cursorIndicator.style.top = renderer.cursorY + 'px';
    cursorIndicator.style.display = 'block';
  }

  // 初始绘制 - 在画布中心画一个提示文字
  const ctx = canvas.getContext('2d');
  function drawWelcome() {
    ctx.save();
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击"开始语音绘图"按钮启动', canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
  drawWelcome();

  // 暴露到全局供调试
  window.__voicePaint = {
    renderer, history, parser, executor, feedback, recognizer
  };
})();
