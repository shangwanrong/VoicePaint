// 讯飞语音听写 WebAPI 客户端
// 文档: https://www.xfyun.cn/doc/Iasr/voicedictation/API.html

class XfyunRecognizer {
  constructor() {
    this.appId = '';
    this.apiKey = '';
    this.apiSecret = '';
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isListening = false;
    this.onResult = null;
    this.onInterimResult = null;
    this.onStatusChange = null;
    this.onError = null;

    // 音频缓冲
    this.audioBuffer = [];
    this.sendInterval = null;

    // 从 localStorage 读取配置
    this.loadConfig();
  }

  /**
   * 检查是否已配置
   */
  isConfigured() {
    return !!(this.appId && this.apiKey && this.apiSecret);
  }

  /**
   * 保存配置到 localStorage
   */
  saveConfig(appId, apiKey, apiSecret) {
    this.appId = appId;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    localStorage.setItem('xfyun_appId', appId);
    localStorage.setItem('xfyun_apiKey', apiKey);
    localStorage.setItem('xfyun_apiSecret', apiSecret);
  }

  /**
   * 从 localStorage 加载配置
   */
  loadConfig() {
    this.appId = localStorage.getItem('xfyun_appId') || '';
    this.apiKey = localStorage.getItem('xfyun_apiKey') || '';
    this.apiSecret = localStorage.getItem('xfyun_apiSecret') || '';
  }

  /**
   * 生成鉴权 URL
   */
  async _generateAuthUrl() {
    const url = 'wss://iat-api.xfyun.cn/v2/iat';
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const now = new Date();
    const date = now.toUTCString();

    // 生成签名原文
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    // HMAC-SHA256 签名
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureOrigin));
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // 构建 authorization
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
  }

  /**
   * 开始语音识别
   */
  async start() {
    if (!this.isConfigured()) {
      if (this.onError) this.onError('not_configured');
      return;
    }

    if (this.isListening) return;

    try {
      // 1. 获取麦克风
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 2. 创建 AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 3. 使用 ScriptProcessorNode 捕获原始 PCM
      this.processor = source.context.createScriptProcessor(4096, 1, 1);
      this.audioBuffer = [];

      this.processor.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const pcmData = e.inputBuffer.getChannelData(0);
        // Float32 → Int16
        const int16Data = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          const s = Math.max(-1, Math.min(1, pcmData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.audioBuffer.push(int16Data);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // 4. 连接 WebSocket
      const authUrl = await this._generateAuthUrl();
      this.ws = new WebSocket(authUrl);

      this.ws.onopen = () => {
        console.log('讯飞 WebSocket 已连接');
        this.isListening = true;
        if (this.onStatusChange) this.onStatusChange('listening');

        // 发送首帧（status=0）
        this._sendFirstFrame();

        // 定时发送后续帧
        this.sendInterval = setInterval(() => {
          this._sendAudioFrame(1);
        }, 200);
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event);
      };

      this.ws.onerror = (event) => {
        console.error('讯飞 WebSocket 错误:', event);
        this._cleanup();
        if (this.onError) this.onError('network');
      };

      this.ws.onclose = (event) => {
        console.log('讯飞 WebSocket 关闭:', event.code, event.reason);
        if (this.isListening) {
          // 非主动关闭，尝试重启
          this._cleanup();
          setTimeout(() => {
            if (this.isListening) {
              this.start();
            }
          }, 1000);
        }
      };

    } catch (e) {
      console.error('讯飞语音识别启动失败:', e);
      this._cleanup();
      if (e.name === 'NotAllowedError') {
        if (this.onError) this.onError('not_allowed');
      } else {
        if (this.onError) this.onError('start_failed');
      }
    }
  }

  /**
   * 发送首帧（包含业务参数）
   */
  _sendFirstFrame() {
    const frame = this._getAudioFromBuffer();
    const message = {
      common: { app_id: this.appId },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        vad_eos: 3000,
        dwa: 'wpgs',
        pd: 'punc'
      },
      data: {
        status: 0,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: frame ? this._arrayBufferToBase64(frame.buffer) : ''
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 发送音频帧
   */
  _sendAudioFrame(status) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const frame = this._getAudioFromBuffer();
    const message = {
      data: {
        status: status,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: frame ? this._arrayBufferToBase64(frame.buffer) : ''
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 从缓冲区获取并清空音频数据
   */
  _getAudioFromBuffer() {
    if (this.audioBuffer.length === 0) return null;

    // 合并所有缓冲区
    let totalLength = 0;
    for (const buf of this.audioBuffer) {
      totalLength += buf.length;
    }
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const buf of this.audioBuffer) {
      result.set(buf, offset);
      offset += buf.length;
    }
    this.audioBuffer = [];
    return result;
  }

  /**
   * ArrayBuffer 转 Base64
   */
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 处理讯飞返回的消息
   */
  _handleMessage(event) {
    try {
      const response = JSON.parse(event.data);
      if (response.code !== 0) {
        console.error('讯飞识别错误:', response.code, response.message);
        if (response.code === 10105) {
          if (this.onError) this.onError('illegal_access');
        } else if (response.code === 10106) {
          if (this.onError) this.onError('invalid_parameter');
        } else if (response.code === 10700) {
          if (this.onError) this.onError('engine_error');
        }
        return;
      }

      const data = response.data;
      if (!data || !data.result) return;

      const result = data.result;
      const isEnd = data.isEnd || result.ls || false;

      // 解析识别文本
      let text = '';
      if (result.ws) {
        for (const word of result.ws) {
          for (const cw of word.cw) {
            text += cw.w;
          }
        }
      }

      if (!text) return;

      if (isEnd) {
        // 最终结果
        if (this.onResult) this.onResult(text);
        // 自动重新开始下一轮识别
        this._restartRecognition();
      } else {
        // 中间结果
        if (this.onInterimResult) this.onInterimResult(text);
      }
    } catch (e) {
      console.error('解析讯飞消息失败:', e);
    }
  }

  /**
   * 一轮识别结束后自动重启
   */
  _restartRecognition() {
    if (!this.isListening) return;
    // 关闭当前 WebSocket
    if (this.ws) {
      try { this.ws.close(); } catch (e) { }
    }
    clearInterval(this.sendInterval);
    this.audioBuffer = [];

    // 重新连接
    setTimeout(async () => {
      if (!this.isListening) return;
      try {
        const authUrl = await this._generateAuthUrl();
        this.ws = new WebSocket(authUrl);

        this.ws.onopen = () => {
          this._sendFirstFrame();
          this.sendInterval = setInterval(() => {
            this._sendAudioFrame(1);
          }, 200);
        };

        this.ws.onmessage = (event) => this._handleMessage(event);
        this.ws.onerror = () => {
          this._cleanup();
          if (this.onError) this.onError('network');
        };
        this.ws.onclose = () => {
          if (this.isListening) {
            this._cleanup();
            setTimeout(() => this.start(), 1000);
          }
        };
      } catch (e) {
        console.error('重启讯飞识别失败:', e);
        this._cleanup();
      }
    }, 300);
  }

  /**
   * 停止语音识别
   */
  stop() {
    this.isListening = false;

    // 发送结束帧
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendAudioFrame(2);
      setTimeout(() => {
        try { this.ws.close(); } catch (e) { }
      }, 200);
    }

    this._cleanup();
    if (this.onStatusChange) this.onStatusChange('stopped');
  }

  /**
   * 暂停（停止但不改变状态标记）
   */
  pause() {
    this.isListening = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendAudioFrame(2);
      try { this.ws.close(); } catch (e) { }
    }
    this._cleanup();
    if (this.onStatusChange) this.onStatusChange('paused');
  }

  /**
   * 清理资源
   */
  _cleanup() {
    clearInterval(this.sendInterval);
    this.sendInterval = null;

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

    this.audioBuffer = [];
  }
}
