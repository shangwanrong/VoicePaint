// VoicePaint 后端代理服务器
// 保护 API 密钥不在前端暴露

const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 3000;

// ===== API 密钥（仅存储在服务端） =====
const BAIDU_API_KEY = 'REDACTED_BAIDU_API_KEY';
const BAIDU_SECRET_KEY = 'REDACTED_BAIDU_SECRET_KEY';
const DEEPSEEK_API_KEY = 'REDACTED_DEEPSEEK_API_KEY';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

// ===== 百度 Access Token 缓存 =====
let baiduToken = '';
let baiduTokenExpire = 0;
let tokenRequestPromise = null;

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// ===== 获取百度 Access Token =====
async function getBaiduToken() {
  // 缓存有效，提前60秒过期
  if (baiduToken && Date.now() < baiduTokenExpire - 60000) {
    return baiduToken;
  }

  // 并发保护：同一时间只发一次请求
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  tokenRequestPromise = new Promise((resolve, reject) => {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            baiduToken = result.access_token;
            baiduTokenExpire = Date.now() + (result.expires_in || 2592000) * 1000;
            resolve(baiduToken);
          } else {
            reject(new Error('获取百度Token失败: ' + data));
          }
        } catch (e) {
          reject(e);
        } finally {
          tokenRequestPromise = null;
        }
      });
    }).on('error', (e) => {
      tokenRequestPromise = null;
      reject(e);
    });
  });

  return tokenRequestPromise;
}

// ===== 代理：百度语音识别 =====
app.post('/api/baidu/asr', async (req, res) => {
  try {
    const token = await getBaiduToken();
    const { audio, len, format, rate, channel } = req.body;

    if (!audio) {
      return res.json({ success: false, error: '缺少音频数据' });
    }

    const postData = JSON.stringify({
      format: format || 'pcm',
      rate: rate || 16000,
      channel: channel || 1,
      cuid: 'voicepaint-web-client',  // 必填：客户端唯一标识
      len: len,  // 原始音频字节长度，非base64长度
      speech: audio,
      token: token
    });

    const options = {
      hostname: 'vop.baidu.com',
      path: '/server_api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const asrReq = https.request(options, (asrRes) => {
      let data = '';
      asrRes.on('data', chunk => data += chunk);
      asrRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.err_no === 0 && result.result) {
            // 兼容数组/字符串两种返回格式
            const text = Array.isArray(result.result) ? result.result[0] : result.result;
            res.json({ success: true, text: text });
          } else {
            console.error('百度ASR错误:', result.err_no, result.err_msg);
            res.json({ success: false, error: result.err_msg, err_no: result.err_no });
          }
        } catch (e) {
          res.json({ success: false, error: '解析百度响应失败' });
        }
      });
    });

    asrReq.on('error', (e) => {
      console.error('百度ASR请求失败:', e.message);
      res.json({ success: false, error: e.message });
    });

    asrReq.write(postData);
    asrReq.end();

  } catch (e) {
    console.error('百度ASR代理错误:', e.message);
    res.json({ success: false, error: e.message });
  }
});

// ===== 代理：DeepSeek 大模型意图识别 =====
app.post('/api/deepseek/chat', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.json({ success: false, error: '缺少文本' });
    }

    const systemPrompt = `你是一个语音绘图工具的意图识别助手。请分析用户的语音指令，输出JSON格式的意图和参数。

可用意图和参数：
- draw_shape: 绘制图形。params: { shape: "circle"|"rect"|"line"|"triangle"|"ellipse"|"star"|"arrow"|"text", color: "#RRGGBB"或null, size: 数字或null, width: 数字或null, height: 数字或null, position: "中间"|"左上"|"右上"|"左下"|"右下"|"左边"|"右边"|"上面"|"下面"或null, direction: "up"|"down"|"left"|"right"或null, fill: true|false或null, count: 数字或null, text: "文字内容"或null, points: 数字或null }
- draw_preset: 预设模板。params: { preset: "tree"|"house"|"sun"|"flower"|"smiley"|"heart", position: 位置或null, color: 颜色或null }
- set_color: 设置颜色。params: { color: "#RRGGBB" }
- set_linewidth: 设置线宽。params: { value: 数字 } 或 { delta: 正负数字 }
- set_fill: 设置填充模式。params: { fill: true|false }
- set_opacity: 设置透明度。params: { value: 0到1 }
- set_dash: 设置虚线。params: { lineDash: [10,5]或[3,3]或[] }
- move_to: 移动位置。params: { position: 位置关键词 } 或 { direction: "up"|"down"|"left"|"right", distance: 数字 }
- undo: 撤销。params: {}
- redo: 重做。params: {}
- clear: 清空画布。params: {}
- delete_last: 删除上一个图形。params: {}
- save: 保存图片。params: {}
- set_background: 设置背景色。params: { color: "#RRGGBB" }
- help: 帮助。params: {}
- cancel: 取消。params: {}

颜色映射：红→#FF0000, 蓝→#0000FF, 绿→#00FF00, 黄→#FFFF00, 黑→#000000, 白→#FFFFFF, 橙→#FFA500, 紫→#800080, 粉→#FFC0CB, 灰→#808080, 棕→#8B4513, 青→#00FFFF, 金色→#FFD700, 银色→#C0C0C0

只输出JSON，不要输出其他内容。如果无法识别意图，输出 {"intent":"unknown","params":{}}`;

    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
      max_tokens: 256
    });

    const apiUrl = new URL(DEEPSEEK_BASE_URL + '/chat/completions');

    const options = {
      hostname: apiUrl.hostname,
      path: apiUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const llmReq = https.request(options, (llmRes) => {
      let data = '';
      llmRes.on('data', chunk => data += chunk);
      llmRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.choices && result.choices[0]) {
            let content = result.choices[0].message.content.trim();
            // 提取JSON部分（可能被markdown代码块包裹）
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const command = JSON.parse(jsonMatch[0]);
              res.json({ success: true, command: command });
            } else {
              res.json({ success: false, error: '大模型返回格式异常', raw: content });
            }
          } else {
            res.json({ success: false, error: '大模型返回异常', raw: data });
          }
        } catch (e) {
          console.error('解析DeepSeek响应失败:', e.message);
          res.json({ success: false, error: '解析大模型响应失败' });
        }
      });
    });

    llmReq.on('error', (e) => {
      console.error('DeepSeek请求失败:', e.message);
      res.json({ success: false, error: e.message });
    });

    llmReq.write(postData);
    llmReq.end();

  } catch (e) {
    console.error('DeepSeek代理错误:', e.message);
    res.json({ success: false, error: e.message });
  }
});

// ===== 启动服务器 =====
app.listen(PORT, () => {
  console.log(`VoicePaint 服务器已启动: http://localhost:${PORT}`);
  console.log('API密钥安全存储在服务端，不会暴露到前端');
});
