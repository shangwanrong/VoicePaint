// 应用主入口

(function () {
  'use strict';

  // DOM 元素引用
  const canvas = document.getElementById('paint-canvas');
  const startOverlay = document.getElementById('start-overlay');
  const startVoiceBtn = document.getElementById('start-voice-btn');
  const startTextBtn = document.getElementById('start-text-btn');
  const cursorIndicator = document.getElementById('cursor-indicator');
  const voiceStatus = document.getElementById('voice-status');
  const speechOverlay = document.getElementById('speech-overlay');
  const speechText = document.getElementById('speech-text');
  const textInputBar = document.getElementById('text-input-bar');
  const textCommandInput = document.getElementById('text-command-input');
  const textCommandSend = document.getElementById('text-command-send');

  // 讯飞配置面板
  const xfyunSettings = document.getElementById('xfyun-settings');
  const xfyunAppId = document.getElementById('xfyun-appid');
  const xfyunApiKey = document.getElementById('xfyun-apikey');
  const xfyunApiSecret = document.getElementById('xfyun-apisecret');
  const xfyunSaveBtn = document.getElementById('xfyun-save-btn');
  const xfyunCancelBtn = document.getElementById('xfyun-cancel-btn');

  // 状态栏元素
  const currentColor = document.getElementById('current-color');
  const colorText = document.getElementById('color-text');
  const currentLinewidth = document.getElementById('current-linewidth');
  const currentMode = document.getElementById('current-mode');
  const currentPosition = document.getElementById('current-position');

  // 输入模式：voice / text
  let inputMode = 'text';

  // 初始化画布渲染器
  const renderer = new CanvasRenderer(canvas);

  // 初始化各模块
  const history = new ActionHistory();
  const feedback = new FeedbackSystem();
  const executor = new CommandExecutor(renderer, history, feedback);
  const parser = new CommandParser();

  // 语音识别器：优先讯飞，回退浏览器原生
  const xfyunRecognizer = new XfyunRecognizer();
  const browserRecognizer = new VoiceRecognizer();

  // 当前使用的识别器
  let activeRecognizer = null;

  // 初始化反馈系统的DOM引用
  feedback.init({
    statusBar: {
      colorPreview: currentColor,
      colorText: colorText,
      lineWidth: currentLinewidth,
      mode: currentMode,
      position: currentPosition
    },
    cursorIndicator: cursorIndicator
  });

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

  // ===== 处理指令文本（语音或文字输入共用） =====
  function handleCommand(text) {
    showSpeechText(text);

    const command = parser.parse(text);
    if (!command) {
      console.log('未能解析指令:', text);
      if (inputMode === 'text') textCommandInput.value = '';
      return;
    }

    // 执行指令
    executor.execute(command);

    // 更新UI
    updateCursorIndicator();
    updateStatusBar();

    if (inputMode === 'text') textCommandInput.value = '';
  }

  // ===== 设置识别器回调 =====
  function setupRecognizerCallbacks(recognizer) {
    recognizer.onResult = (text) => handleCommand(text);
    recognizer.onInterimResult = (text) => {
      speechText.textContent = text + '...';
      speechOverlay.classList.remove('hidden');
    };
    recognizer.onStatusChange = (status) => {
      switch (status) {
        case 'listening': updateVoiceStatus('listening', '监听中'); break;
        case 'paused': updateVoiceStatus('', '已暂停'); break;
        case 'stopped': updateVoiceStatus('', '已停止'); break;
        case 'error': updateVoiceStatus('error', '错误'); break;
      }
    };
  }

  // 讯飞识别器回调
  setupRecognizerCallbacks(xfyunRecognizer);
  xfyunRecognizer.onError = (error) => {
    if (error === 'not_configured') {
      showXfyunSettings();
    } else if (error === 'not_allowed') {
      switchToTextMode('麦克风权限被拒绝，已切换到文字模式');
    } else if (error === 'illegal_access') {
      showXfyunSettings();
      alert('讯飞API密钥无效，请检查配置');
    } else if (error === 'network') {
      switchToTextMode('语音识别网络不可用，已切换到文字模式');
    }
  };

  // 浏览器原生识别器回调
  setupRecognizerCallbacks(browserRecognizer);
  let browserNetworkErrors = 0;
  browserRecognizer.onError = (error) => {
    if (error === 'not_supported' || error === 'not_allowed') {
      // 回退到讯飞
      if (xfyunRecognizer.isConfigured()) {
        activeRecognizer = xfyunRecognizer;
        xfyunRecognizer.start();
      } else {
        showXfyunSettings();
      }
    } else if (error === 'network') {
      browserNetworkErrors++;
      if (browserNetworkErrors >= 2) {
        if (xfyunRecognizer.isConfigured()) {
          browserRecognizer.stop();
          activeRecognizer = xfyunRecognizer;
          xfyunRecognizer.start();
        } else {
          switchToTextMode('语音识别网络不可用，已切换到文字模式');
        }
      }
    }
  };

  // ===== 切换到文字模式 =====
  function switchToTextMode(reason) {
    inputMode = 'text';
    if (activeRecognizer) {
      activeRecognizer.stop();
    }
    textInputBar.classList.remove('hidden');
    updateVoiceStatus('', '文字模式');
    if (reason) showSpeechText(reason);
    textCommandInput.focus();
  }

  // ===== 显示讯飞配置面板 =====
  function showXfyunSettings() {
    xfyunSettings.classList.remove('hidden');
    // 填充已保存的值
    xfyunAppId.value = xfyunRecognizer.appId;
    xfyunApiKey.value = xfyunRecognizer.apiKey;
    xfyunApiSecret.value = xfyunRecognizer.apiSecret;
  }

  // ===== 讯飞配置保存 =====
  xfyunSaveBtn.addEventListener('click', () => {
    const appId = xfyunAppId.value.trim();
    const apiKey = xfyunApiKey.value.trim();
    const apiSecret = xfyunApiSecret.value.trim();

    if (!appId || !apiKey || !apiSecret) {
      alert('请填写所有字段');
      return;
    }

    xfyunRecognizer.saveConfig(appId, apiKey, apiSecret);
    xfyunSettings.classList.add('hidden');
    startOverlay.classList.add('hidden');

    // 启动讯飞识别
    inputMode = 'voice';
    activeRecognizer = xfyunRecognizer;
    updateCursorIndicator();
    updateStatusBar();
    xfyunRecognizer.start();
  });

  xfyunCancelBtn.addEventListener('click', () => {
    xfyunSettings.classList.add('hidden');
    // 回退到文字模式
    startOverlay.classList.add('hidden');
    switchToTextMode('未配置讯飞密钥，已切换到文字模式');
  });

  // ===== 启动按钮 - 语音模式 =====
  startVoiceBtn.addEventListener('click', () => {
    inputMode = 'voice';
    startOverlay.classList.add('hidden');
    updateCursorIndicator();
    updateStatusBar();

    // 优先使用讯飞
    if (xfyunRecognizer.isConfigured()) {
      activeRecognizer = xfyunRecognizer;
      xfyunRecognizer.start();
    } else {
      // 显示讯飞配置面板
      showXfyunSettings();
    }
  });

  // ===== 启动按钮 - 文字模式 =====
  startTextBtn.addEventListener('click', () => {
    inputMode = 'text';
    startOverlay.classList.add('hidden');
    textInputBar.classList.remove('hidden');
    updateCursorIndicator();
    updateStatusBar();
    updateVoiceStatus('', '文字模式');
    textCommandInput.focus();
  });

  // ===== 文字输入事件 =====
  textCommandSend.addEventListener('click', () => {
    const text = textCommandInput.value.trim();
    if (text) handleCommand(text);
  });

  textCommandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = textCommandInput.value.trim();
      if (text) handleCommand(text);
    }
  });

  // ===== 初始绘制 =====
  renderer.redraw();

  // ===== 暴露到全局供调试 =====
  window.__voicePaint = {
    renderer, history, parser, executor, feedback,
    xfyunRecognizer, browserRecognizer,
    updateCursorIndicator, updateStatusBar, showSpeechText, handleCommand,
    switchToTextMode
  };
})();
