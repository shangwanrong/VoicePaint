// 应用主入口

(function () {
  'use strict';

  // DOM 元素引用
  const canvas = document.getElementById('paint-canvas');
  const startOverlay = document.getElementById('start-overlay');
  const startVoiceBtn = document.getElementById('start-voice-btn');
  const cursorIndicator = document.getElementById('cursor-indicator');
  const voiceStatus = document.getElementById('voice-status');
  const speechOverlay = document.getElementById('speech-overlay');
  const speechText = document.getElementById('speech-text');
  const recordBtn = document.getElementById('record-btn');
  const micIcon = document.getElementById('mic-icon');
  const stopIcon = document.getElementById('stop-icon');

  // 状态栏元素
  const currentColor = document.getElementById('current-color');
  const colorText = document.getElementById('color-text');
  const currentLinewidth = document.getElementById('current-linewidth');
  const currentMode = document.getElementById('current-mode');
  const currentPosition = document.getElementById('current-position');

  // 是否正在录音
  let isRecording = false;

  // 初始化画布渲染器
  const renderer = new CanvasRenderer(canvas);

  // 初始化各模块
  const history = new ActionHistory();
  const feedback = new FeedbackSystem();
  const executor = new CommandExecutor(renderer, history, feedback);
  const ruleParser = new CommandParser();
  const llmParser = new LLMParser();
  llmParser.setFallback(ruleParser);

  // 百度语音识别器
  const baiduRecognizer = new BaiduRecognizer();

  // ===== 光标指示器更新 =====
  function updateCursorIndicator() {
    if (renderer.turtle.visible) {
      cursorIndicator.style.left = renderer.turtle.x + 'px';
      cursorIndicator.style.top = renderer.turtle.y + 'px';
    } else {
      cursorIndicator.style.left = renderer.cursorX + 'px';
      cursorIndicator.style.top = renderer.cursorY + 'px';
    }
    cursorIndicator.style.display = 'block';
  }

  // ===== 状态栏更新 =====
  function updateStatusBar() {
    const style = renderer.currentStyle;
    currentColor.style.backgroundColor = style.strokeColor;
    colorText.textContent = style.strokeColor;
    currentLinewidth.textContent = style.lineWidth;
    if (renderer.turtle.visible) {
      currentMode.textContent = renderer.turtle.penDown ? '画笔-落笔' : '画笔-抬笔';
    } else {
      currentMode.textContent = style.fill ? '填充' : '描边';
    }
    if (renderer.turtle.visible) {
      currentPosition.textContent = `${Math.round(renderer.turtle.x)}, ${Math.round(renderer.turtle.y)}`;
    } else {
      currentPosition.textContent = `${Math.round(renderer.cursorX)}, ${Math.round(renderer.cursorY)}`;
    }
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

  // ===== 处理指令文本 =====
  async function handleCommand(text) {
    showSpeechText(text);

    const command = await llmParser.parse(text);
    if (!command) {
      console.log('未能解析指令:', text);
      return;
    }

    console.log('解析结果:', command.intent, command.params, '(来源:', command.source || 'rule', ')');

    await executor.execute(command);

    updateCursorIndicator();
    updateStatusBar();
  }

  // ===== 设置识别器回调 =====
  baiduRecognizer.onResult = (text) => handleCommand(text);
  baiduRecognizer.onInterimResult = (text) => {
    speechText.textContent = text + '...';
    speechOverlay.classList.remove('hidden');
  };
  baiduRecognizer.onStatusChange = (status) => {
    switch (status) {
      case 'listening': updateVoiceStatus('listening', '录音中'); break;
      case 'stopped': updateVoiceStatus('', '就绪'); break;
      case 'error': updateVoiceStatus('error', '错误'); break;
    }
  };
  baiduRecognizer.onError = (error) => {
    if (error === 'not_allowed') {
      alert('麦克风权限被拒绝，请允许麦克风访问后刷新页面');
    } else if (error === 'start_failed') {
      alert('语音识别启动失败，请刷新页面重试');
    }
  };

  // ===== 录音按钮点击 =====
  recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
      // 开始录音
      if (!baiduRecognizer.isListening) {
        const ok = await baiduRecognizer.init();
        if (!ok) return;
      }
      baiduRecognizer.startRecording();
      isRecording = true;
      recordBtn.classList.add('recording');
      micIcon.style.display = 'none';
      stopIcon.style.display = 'block';
    } else {
      // 停止录音
      baiduRecognizer.stopRecording();
      isRecording = false;
      recordBtn.classList.remove('recording');
      micIcon.style.display = 'block';
      stopIcon.style.display = 'none';
    }
  });

  // ===== 启动按钮 =====
  startVoiceBtn.addEventListener('click', () => {
    startOverlay.classList.add('hidden');
    updateCursorIndicator();
    updateStatusBar();
    updateVoiceStatus('', '就绪');
  });

  // ===== 初始绘制 =====
  renderer.redraw();

  // ===== 暴露到全局供调试 =====
  window.__voicePaint = {
    renderer, history, ruleParser, llmParser, executor, feedback,
    baiduRecognizer, updateCursorIndicator, updateStatusBar, showSpeechText, handleCommand
  };
})();
