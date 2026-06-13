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
  const ruleParser = new CommandParser();  // 规则引擎（回退）
  const llmParser = new LLMParser();       // DeepSeek 大模型（优先）
  llmParser.setFallback(ruleParser);        // 大模型失败时回退到规则引擎

  // 语音识别器
  const baiduRecognizer = new BaiduRecognizer();  // 百度语音（优先）
  const xfyunRecognizer = new XfyunRecognizer();  // 讯飞语音（备选）
  const browserRecognizer = new VoiceRecognizer(); // 浏览器原生（备选）

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
    // 海龟模式激活时，光标跟随海龟位置
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
    // 海龟模式激活时显示"画笔"模式
    if (renderer.turtle.visible) {
      currentMode.textContent = '画笔';
    } else {
      currentMode.textContent = style.fill ? '填充' : '描边';
    }
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
  async function handleCommand(text) {
    showSpeechText(text);

    // 优先使用大模型解析，失败回退规则引擎
    const command = await llmParser.parse(text);
    if (!command) {
      console.log('未能解析指令:', text);
      if (inputMode === 'text') textCommandInput.value = '';
      return;
    }

    console.log('解析结果:', command.intent, command.params, '(来源:', command.source || 'rule', ')');

    // 执行指令
    await executor.execute(command);

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

  // 百度识别器回调
  setupRecognizerCallbacks(baiduRecognizer);
  baiduRecognizer.onError = (error) => {
    if (error === 'not_allowed') {
      switchToTextMode('麦克风权限被拒绝，已切换到文字模式');
    } else if (error === 'start_failed') {
      switchToTextMode('语音识别启动失败，已切换到文字模式');
    }
  };

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
      switchToTextMode('浏览器不支持语音识别，已切换到文字模式');
    } else if (error === 'network') {
      browserNetworkErrors++;
      if (browserNetworkErrors >= 2) {
        switchToTextMode('语音识别网络不可用，已切换到文字模式');
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

    inputMode = 'voice';
    activeRecognizer = xfyunRecognizer;
    updateCursorIndicator();
    updateStatusBar();
    xfyunRecognizer.start();
  });

  xfyunCancelBtn.addEventListener('click', () => {
    xfyunSettings.classList.add('hidden');
    startOverlay.classList.add('hidden');
    switchToTextMode('未配置讯飞密钥，已切换到文字模式');
  });

  // ===== 启动按钮 - 语音模式 =====
  startVoiceBtn.addEventListener('click', () => {
    inputMode = 'voice';
    startOverlay.classList.add('hidden');
    updateCursorIndicator();
    updateStatusBar();

    // 优先使用百度语音识别（通过后端代理，密钥安全）
    activeRecognizer = baiduRecognizer;
    baiduRecognizer.start();
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
    renderer, history, ruleParser, llmParser, executor, feedback,
    baiduRecognizer, xfyunRecognizer, browserRecognizer,
    updateCursorIndicator, updateStatusBar, showSpeechText, handleCommand,
    switchToTextMode
  };
})();
