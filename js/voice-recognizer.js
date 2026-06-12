// 语音识别模块

class VoiceRecognizer {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isPaused = false;
    this.onResult = null;       // 最终识别结果回调
    this.onInterimResult = null; // 中间识别结果回调
    this.onError = null;        // 错误回调
    this.onStatusChange = null; // 状态变化回调

    this._initRecognition();
  }

  /**
   * 初始化 Web Speech API
   */
  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('当前浏览器不支持 Web Speech API，请使用 Chrome 或 Edge');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;        // 持续识别
    this.recognition.interimResults = true;     // 返回中间结果
    this.recognition.lang = 'zh-CN';           // 中文识别
    this.recognition.maxAlternatives = 1;      // 只返回一个候选结果

    this.recognition.onresult = (event) => this._handleResult(event);
    this.recognition.onerror = (event) => this._handleError(event);
    this.recognition.onend = () => this._handleEnd();
    this.recognition.onstart = () => this._handleStart();
  }

  /**
   * 开始语音识别
   */
  start() {
    if (!this.recognition) {
      console.error('语音识别未初始化');
      if (this.onError) this.onError('not_supported');
      return;
    }

    if (this.isListening && !this.isPaused) return;

    try {
      if (this.isPaused) {
        // 从暂停恢复
        this.isPaused = false;
      }
      this.recognition.start();
    } catch (e) {
      // 可能已经在运行，先停止再启动
      console.warn('语音识别启动异常，尝试重启:', e.message);
      try {
        this.recognition.stop();
        setTimeout(() => {
          this.recognition.start();
        }, 100);
      } catch (e2) {
        console.error('语音识别重启失败:', e2.message);
      }
    }
  }

  /**
   * 停止语音识别
   */
  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {
      // 忽略停止时的错误
    }
    this.isListening = false;
    this.isPaused = false;
    if (this.onStatusChange) this.onStatusChange('stopped');
  }

  /**
   * 暂停语音识别（实际上是停止，但标记为暂停状态以便恢复）
   */
  pause() {
    this.isPaused = true;
    try {
      this.recognition.stop();
    } catch (e) {
      // 忽略
    }
    if (this.onStatusChange) this.onStatusChange('paused');
  }

  /**
   * 处理识别结果
   */
  _handleResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript.trim();

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // 中间结果回调
    if (interimTranscript && this.onInterimResult) {
      this.onInterimResult(interimTranscript);
    }

    // 最终结果回调
    if (finalTranscript && this.onResult) {
      this.onResult(finalTranscript);
    }
  }

  /**
   * 处理错误
   */
  _handleError(event) {
    console.warn('语音识别错误:', event.error);

    // no-speech 和 aborted 是常见错误，不需要特殊处理
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }

    // network 错误时尝试重启
    if (event.error === 'network') {
      console.warn('网络错误，将在2秒后重试...');
      setTimeout(() => {
        if (this.isListening && !this.isPaused) {
          try {
            this.recognition.start();
          } catch (e) {
            // 忽略
          }
        }
      }, 2000);
      return;
    }

    // not-allowed 错误表示权限被拒绝
    if (event.error === 'not-allowed') {
      this.isListening = false;
      if (this.onStatusChange) this.onStatusChange('error');
      if (this.onError) this.onError('not_allowed');
      return;
    }

    if (this.onError) this.onError(event.error);
  }

  /**
   * 处理识别结束（自动重启机制）
   */
  _handleEnd() {
    // 如果仍在监听状态且未暂停，自动重启
    if (this.isListening && !this.isPaused) {
      try {
        this.recognition.start();
      } catch (e) {
        // 如果重启失败，延迟重试
        setTimeout(() => {
          if (this.isListening && !this.isPaused) {
            try {
              this.recognition.start();
            } catch (e2) {
              console.error('语音识别自动重启失败:', e2.message);
            }
          }
        }, 300);
      }
    }
  }

  /**
   * 处理识别开始
   */
  _handleStart() {
    this.isListening = true;
    if (this.onStatusChange) this.onStatusChange('listening');
  }

  /**
   * 检查浏览器是否支持语音识别
   */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}
