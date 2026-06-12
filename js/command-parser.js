// 指令解析引擎

class CommandParser {
  constructor() {
    // 意图关键词词典
    this.intentKeywords = {
      draw_shape: ['画', '绘制', '创建', '添加', '来个', '整一个', '写', '写上', '写个'],
      set_color: ['颜色', '换成', '改成', '设为', '颜色改'],
      set_linewidth: ['线宽', '粗细', '粗一点', '细一点', '线粗', '加粗', '变细'],
      set_fill: ['填充', '填色', '实心', '描边', '空心'],
      set_opacity: ['透明度', '半透明', '不透明'],
      set_dash: ['虚线', '实线', '点线'],
      move_to: ['移到', '移动', '去', '到'],
      draw_direction: ['向上', '向下', '向左', '向右', '往上', '往下', '往左', '往右'],
      undo: ['撤销', '回退', '取消上一步', '撤回'],
      redo: ['重做', '恢复'],
      clear: ['清空', '清除', '全部删除', '擦掉全部', '全部擦掉'],
      delete_last: ['删除', '删掉', '去掉', '删'],
      save: ['保存', '下载', '存'],
      set_background: ['背景'],
      help: ['帮助', '命令', '怎么用', '有哪些指令', '能做什么'],
      cancel: ['取消', '算了', '不要了'],
      pause: ['暂停', '停止识别'],
      resume: ['继续', '恢复识别']
    };

    // 图形类型关键词
    this.shapeKeywords = {
      circle: ['圆', '圆形', '圆圈', '圆的'],
      rect: ['矩形', '长方形', '方形', '方的', '方块', '正方形'],
      line: ['线', '线条', '直线', '线段'],
      triangle: ['三角形', '三角', '三角的'],
      ellipse: ['椭圆', '椭圆形'],
      star: ['星', '星星', '五角星', '星形'],
      arrow: ['箭头', '箭'],
      text: ['文字', '字', '文本']
    };

    // 方向关键词
    this.directionKeywords = {
      '向上': 'up', '往上': 'up', '上面': 'up', '上方': 'up',
      '向下': 'down', '往下': 'down', '下面': 'down', '下方': 'down',
      '向左': 'left', '往左': 'left', '左边': 'left', '左方': 'left',
      '向右': 'right', '往右': 'right', '右边': 'right', '右方': 'right'
    };

    // 语气词列表（需要过滤）
    this.fillerWords = ['请', '那个', '嗯', '啊', '呃', '就是', '然后', '的话', '一下', '嘛', '吧', '呢', '哈', '哦', '呀', '啦', '哎'];

    // 批量绘制关键词
    this.batchKeywords = {
      '两个': 2, '三个': 3, '四个': 4, '五个': 5,
      '两': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };

    // 同义词扩展映射
    this.synonymMap = {
      '画': ['画', '绘制', '创建', '添加', '来个', '整一个', '搞个', '弄个'],
      '圆': ['圆', '圆形', '圆圈', '圆的', '原'],  // "原"是"圆"的常见识别错误
      '矩形': ['矩形', '长方形', '方形', '方的', '方块', '正方形', '举行'],  // "举行"是"矩形"的常见识别错误
      '线': ['线', '线条', '直线', '线段'],
      '三角形': ['三角形', '三角', '三角的', '山脚行'],  // 常见识别错误
      '星': ['星', '星星', '五角星', '星形', '新型'],  // "新型"是"星形"的常见识别错误
      '红色': ['红色', '红的', '红'],
      '蓝色': ['蓝色', '蓝的', '蓝'],
      '绿色': ['绿色', '绿的', '绿'],
      '撤销': ['撤销', '回退', '撤回', '退回', '撤消'],
      '删除': ['删除', '删掉', '去掉', '删', '删了']
    };
  }

  /**
   * 解析语音文本为指令对象
   * @param {string} text - 语音识别文本
   * @returns {object|null} 指令对象
   */
  parse(text) {
    if (!text || !text.trim()) return null;

    // 预处理：去除语气词和多余空格
    let cleaned = this._preprocess(text);
    console.log('指令解析输入:', text, '→ 清洗后:', cleaned);

    // 识别意图
    const intent = this._identifyIntent(cleaned);
    if (!intent) {
      console.log('未识别到意图:', cleaned);
      return null;
    }

    // 根据意图提取参数
    const params = this._extractParams(intent, cleaned);

    return {
      intent,
      params,
      raw: text,
      cleaned
    };
  }

  /**
   * 预处理：去除语气词、标点、多余空格
   */
  _preprocess(text) {
    let result = text.trim();
    // 去除标点
    result = result.replace(/[，。！？、；：""''（）\.,!?;:()]/g, '');
    // 去除语气词
    for (const word of this.fillerWords) {
      result = result.replace(new RegExp(word, 'g'), '');
    }
    // 去除多余空格
    result = result.replace(/\s+/g, '').trim();
    return result;
  }

  /**
   * 识别意图
   */
  _identifyIntent(text) {
    // 优先匹配高优先级意图
    const priorityOrder = [
      'undo', 'redo', 'clear', 'save', 'help', 'cancel', 'pause', 'resume',
      'set_fill', 'set_dash', 'set_opacity', 'set_linewidth',
      'draw_direction', 'move_to', 'set_background', 'delete_last',
      'set_color', 'draw_shape'
    ];

    for (const intent of priorityOrder) {
      const keywords = this.intentKeywords[intent];
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          // 特殊处理：避免 "画一个红色的圆" 被误判为 set_color
          if (intent === 'set_color' && this._containsShapeKeyword(text)) {
            continue;
          }
          return intent;
        }
      }
    }

    // 尝试模糊匹配
    return this._fuzzyIdentifyIntent(text);
  }

  /**
   * 模糊意图识别
   */
  _fuzzyIdentifyIntent(text) {
    // 检查是否包含颜色词（可能是设置颜色）
    for (const colorName of Object.keys(COLOR_MAP)) {
      if (text.includes(colorName)) {
        if (this._containsShapeKeyword(text)) {
          return 'draw_shape';
        }
        return 'set_color';
      }
    }

    // 检查是否包含位置词（可能是移动）
    for (const posName of Object.keys(POSITION_MAP)) {
      if (text.includes(posName)) {
        return 'move_to';
      }
    }

    return null;
  }

  /**
   * 检查文本是否包含图形关键词
   */
  _containsShapeKeyword(text) {
    for (const keywords of Object.values(this.shapeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) return true;
      }
    }
    return false;
  }

  /**
   * 根据意图提取参数
   */
  _extractParams(intent, text) {
    switch (intent) {
      case 'draw_shape':
        return this._extractDrawShapeParams(text);
      case 'set_color':
        return this._extractColorParams(text);
      case 'set_linewidth':
        return this._extractLinewidthParams(text);
      case 'set_fill':
        return this._extractFillParams(text);
      case 'set_opacity':
        return this._extractOpacityParams(text);
      case 'set_dash':
        return this._extractDashParams(text);
      case 'move_to':
        return this._extractMoveParams(text);
      case 'draw_direction':
        return this._extractDirectionParams(text);
      case 'set_background':
        return this._extractBackgroundParams(text);
      case 'delete_last':
        return {};
      case 'undo':
      case 'redo':
      case 'clear':
      case 'save':
      case 'help':
      case 'cancel':
      case 'pause':
      case 'resume':
        return {};
      default:
        return {};
    }
  }

  /**
   * 提取绘图参数
   */
  _extractDrawShapeParams(text) {
    const params = {};

    // 同义词纠错
    text = this._correctSynonyms(text);

    // 识别图形类型
    params.shape = this._identifyShape(text);

    // 识别颜色
    params.color = this._extractColor(text);

    // 识别尺寸
    params.size = this._extractNumber(text, ['半径', '大小', '尺寸', '长', '宽', '边长']);
    params.width = this._extractNumber(text, ['宽']);
    params.height = this._extractNumber(text, ['高']);

    // 识别位置
    params.position = this._extractPosition(text);

    // 识别方向（用于线段和箭头）
    params.direction = this._extractDirection(text);

    // 识别填充模式
    params.fill = this._hasFillKeyword(text);

    // 识别批量数量
    params.count = this._extractBatchCount(text);

    // 识别文字内容
    if (params.shape === 'text') {
      params.text = this._extractTextContent(text);
    }

    // 识别星形角数
    if (params.shape === 'star') {
      const pointsMatch = text.match(/(\d+)角/);
      params.points = pointsMatch ? parseInt(pointsMatch[1]) : 5;
    }

    return params;
  }

  /**
   * 同义词纠错：将常见识别错误替换为正确词汇
   */
  _correctSynonyms(text) {
    let corrected = text;
    const corrections = {
      '原': '圆',       // "画一个原" → "画一个圆"
      '举行': '矩形',    // "画一个举行" → "画一个矩形"
      '山脚行': '三角形', // 常见识别错误
      '新型': '星形',    // 常见识别错误
      '简形': '矩形',    // 常见识别错误
      '原形': '圆形',    // 常见识别错误
      '画圆': '画圆',    // 保持不变
      '画原': '画圆'     // 纠错
    };
    for (const [wrong, right] of Object.entries(corrections)) {
      if (corrected.includes(wrong)) {
        corrected = corrected.replace(wrong, right);
      }
    }
    return corrected;
  }

  /**
   * 提取批量数量
   */
  _extractBatchCount(text) {
    for (const [keyword, count] of Object.entries(this.batchKeywords)) {
      if (text.includes(keyword)) {
        return count;
      }
    }
    // 尝试数字提取
    const numMatch = text.match(/(\d+)个/);
    if (numMatch) return parseInt(numMatch[1]);
    return 1;
  }

  /**
   * 识别图形类型
   */
  _identifyShape(text) {
    for (const [shape, keywords] of Object.entries(this.shapeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return shape;
        }
      }
    }
    // 模糊匹配
    for (const [shape, keywords] of Object.entries(this.shapeKeywords)) {
      for (const keyword of keywords) {
        const match = fuzzyMatch(text, [keyword], 1);
        if (match) return shape;
      }
    }
    return 'circle'; // 默认画圆
  }

  /**
   * 提取颜色
   */
  _extractColor(text) {
    // 优先匹配长颜色名
    const colorNames = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
    for (const colorName of colorNames) {
      if (text.includes(colorName)) {
        return COLOR_MAP[colorName];
      }
    }
    return null;
  }

  /**
   * 提取数字参数
   */
  _extractNumber(text, prefixes) {
    for (const prefix of prefixes) {
      const match = text.match(new RegExp(prefix + '(\\d+)'));
      if (match) return parseInt(match[1]);
    }
    // 尝试直接提取数字（前面没有"角"的）
    const numMatch = text.match(/(?<![角])(\d+)/);
    if (numMatch) return parseInt(numMatch[1]);
    return null;
  }

  /**
   * 提取位置
   */
  _extractPosition(text) {
    const posNames = Object.keys(POSITION_MAP).sort((a, b) => b.length - a.length);
    for (const posName of posNames) {
      if (text.includes(posName)) {
        return posName;
      }
    }
    return null;
  }

  /**
   * 提取方向
   */
  _extractDirection(text) {
    for (const [keyword, dir] of Object.entries(this.directionKeywords)) {
      if (text.includes(keyword)) {
        return dir;
      }
    }
    return null;
  }

  /**
   * 检查是否包含填充关键词
   */
  _hasFillKeyword(text) {
    const fillWords = ['填充', '填色', '实心'];
    const strokeWords = ['描边', '空心'];
    for (const w of fillWords) {
      if (text.includes(w)) return true;
    }
    for (const w of strokeWords) {
      if (text.includes(w)) return false;
    }
    return null; // 未指定
  }

  /**
   * 提取文字内容
   */
  _extractTextContent(text) {
    // 匹配 "写上xxx" "写xxx" "文字xxx" 等模式
    const patterns = [
      /写上(.+)/,
      /写个?(.+)/,
      /写(.+)/,
      /文字(.+)/
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // 清除可能混入的其他指令词
        let content = match[1];
        for (const word of ['红色', '蓝色', '绿色', '黄色', '黑色', '白色', '橙色', '紫色', '粉色']) {
          content = content.replace(word, '');
        }
        if (content.trim()) return content.trim();
      }
    }
    return '文字';
  }

  /**
   * 提取颜色设置参数
   */
  _extractColorParams(text) {
    return { color: this._extractColor(text) };
  }

  /**
   * 提取线宽参数
   */
  _extractLinewidthParams(text) {
    if (text.includes('粗一点') || text.includes('加粗')) {
      return { delta: 2 };
    }
    if (text.includes('细一点') || text.includes('变细')) {
      return { delta: -2 };
    }
    const num = this._extractNumber(text, ['线宽', '粗细', '线粗']);
    if (num) return { value: num };
    return { delta: 1 };
  }

  /**
   * 提取填充参数
   */
  _extractFillParams(text) {
    if (text.includes('描边') || text.includes('空心')) {
      return { fill: false };
    }
    return { fill: true };
  }

  /**
   * 提取透明度参数
   */
  _extractOpacityParams(text) {
    if (text.includes('半透明')) {
      return { value: 0.5 };
    }
    if (text.includes('不透明')) {
      return { value: 1 };
    }
    const num = this._extractNumber(text, ['透明度']);
    if (num) return { value: num / 100 };
    return { value: 0.5 };
  }

  /**
   * 提取虚线参数
   */
  _extractDashParams(text) {
    if (text.includes('虚线')) {
      return { lineDash: [10, 5] };
    }
    if (text.includes('点线')) {
      return { lineDash: [3, 3] };
    }
    return { lineDash: [] }; // 实线
  }

  /**
   * 提取移动参数
   */
  _extractMoveParams(text) {
    const position = this._extractPosition(text);
    if (position) {
      return { position };
    }
    // 尝试提取坐标
    const coordMatch = text.match(/坐标?(\d+)[,，](\d+)/);
    if (coordMatch) {
      return { x: parseInt(coordMatch[1]), y: parseInt(coordMatch[2]) };
    }
    // 相对移动
    const direction = this._extractDirection(text);
    const distance = this._extractNumber(text, ['移动', '走', '移']);
    if (direction) {
      return { direction, distance: distance || 50 };
    }
    return {};
  }

  /**
   * 提取方向绘图参数
   */
  _extractDirectionParams(text) {
    const direction = this._extractDirection(text);
    const distance = this._extractNumber(text, ['画', '走', '移']);
    return { direction, distance: distance || 100 };
  }

  /**
   * 提取背景色参数
   */
  _extractBackgroundParams(text) {
    const color = this._extractColor(text);
    return { color: color || '#ffffff' };
  }
}
