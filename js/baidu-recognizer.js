// 百度语音识别前端模块
// 点击按钮开始录音 → 点击按钮停止录音 → 发送音频到后端代理 → 获取识别文字

class BaiduRecognizer {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isListening = false;
    this.isRecording = false;

    // 回调
    this.onResult = null;
    this.onInterimResult = null;
    this.onStatusChange = null;
    this.onError = null;

    // 录音缓冲
    this.audioChunks = [];
  }

  /**
   * 初始化麦克风（启动时调用一次）
   */
  async init() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.processor = source.context.createScriptProcessor(4096, 1, 1);
      this.audioChunks = [];

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const pcmData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          const s = Math.max(-1, Math.min(1, pcmData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.audioChunks.push(int16Data);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isListening = true;
      return true;
    } catch (e) {
      console.error('百度语音识别初始化失败:', e);
      this._cleanup();
      if (e.name === 'NotAllowedError') {
        if (this.onError) this.onError('not_allowed');
      } else {
        if (this.onError) this.onError('start_failed');
      }
      return false;
    }
  }

  /**
   * 开始录音（点击录音按钮时调用）
   */
  startRecording() {
    if (!this.isListening) return;
    this.audioChunks = [];
    this.isRecording = true;
    if (this.onStatusChange) this.onStatusChange('listening');
  }

  /**
   * 停止录音并发送识别（点击停止按钮时调用）
   */
  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.onStatusChange) this.onStatusChange('stopped');
    // 发送录音数据
    this._sendAudio();
  }

  /**
   * 发送音频到后端代理
   */
  async _sendAudio() {
    if (this.audioChunks.length === 0) {
      return;
    }

    // 合并音频数据
    let totalLength = 0;
    for (const chunk of this.audioChunks) {
      totalLength += chunk.length;
    }
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // 清空缓冲
    this.audioChunks = [];

    // 转为 base64
    const audioBytes = new Uint8Array(merged.buffer);
    const base64Audio = this._arrayBufferToBase64(audioBytes);

    // 发送到后端代理
    try {
      const response = await fetch('/api/baidu/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          len: merged.buffer.byteLength,
          format: 'pcm',
          rate: 16000,
          channel: 1
        })
      });

      const result = await response.json();

      if (result.success && result.text) {
        const text = result.text.trim();
        if (text) {
          if (this.onResult) this.onResult(text);
        }
      } else if (!result.success) {
        if (result.err_no === 3301) {
          // 静音段，忽略
        } else {
          console.warn('百度ASR识别失败:', result.error, 'err_no:', result.err_no);
        }
      }
    } catch (e) {
      console.error('发送音频到后端失败:', e);
    }
  }

  /**
   * ArrayBuffer 转 Base64
   */
  _arrayBufferToBase64(buffer) {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * 停止语音识别（完全关闭）
   */
  stop() {
    this.isListening = false;
    this.isRecording = false;
    this._cleanup();
    if (this.onStatusChange) this.onStatusChange('stopped');
  }

  /**
   * 清理资源
   */
  _cleanup() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) { }
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.audioChunks = [];
  }
}
