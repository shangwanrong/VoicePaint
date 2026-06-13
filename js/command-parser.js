// 指令解析引擎

class CommandParser {
  constructor() {
    // 意图关键词词典
    this.intentKeywords = {
      draw_shape: ['画', '绘制', '创建', '添加', '来个', '整一个', '搞个', '弄个', '写', '写上', '写个'],
      set_color: ['颜色', '换成', '改成', '设为', '颜色改'],
      set_linewidth: ['线宽', '粗细', '粗一点', '细一点', '线粗', '加粗', '变细'],
      set_fill: ['填充', '填色', '实心', '描边', '空心'],
      set_opacity: ['透明度', '半透明', '不透明'],
      set_dash: ['虚线', '实线', '点线'],
      move_to: ['移到', '移动到', '去', '到'],
      draw_direction: ['向上画', '向下画', '向左画', '向右画', '往上画', '往下画', '往左画', '往右画'],
      undo: ['撤销', '回退', '取消上一步', '撤回'],
      redo: ['重做', '恢复'],
      clear: ['清空', '清除', '全部删除', '擦掉全部', '全部擦掉'],
      delete_last: ['删除', '删掉', '去掉', '删'],
      save: ['保存', '下载', '存'],
      set_background: ['背景'],
      help: ['帮助', '命令', '怎么用', '有哪些指令', '能做什么'],
      cancel: ['取消', '算了', '不要了'],
      pause: ['暂停', '停止识别'],
      resume: ['继续', '恢复识别'],
      draw_preset: ['树', '房子', '太阳', '花', '人脸', '笑脸', '心', '爱心', '猫', '小猫', '猫咪', '狗', '小狗', '狗狗', '鱼', '小鱼', '蝴蝶', '鸟', '小鸟', '兔子', '小兔', '兔', '熊', '小熊', '熊猫', '企鹅', '青蛙', '蛙'],
      draw_svg: ['龙', '马', '牛', '羊', '猪', '鸡', '蛇', '鼠', '虎', '猴', '汽车', '飞机', '船', '火箭', '山', '河', '云', '彩虹', '月亮', '钟表', '雨伞', '气球', '雪花'],
      turtle_start: ['开始画', '画笔模式', '开始绘制', '落笔模式'],
      turtle_stop: ['停止画', '结束画', '退出画笔', '停止绘制'],
      turtle_forward: ['向前', '前进', '往前'],
      turtle_backward: ['向后', '后退', '往后'],
      turtle_turn_left: ['左转', '向左转', '转弯左'],
      turtle_turn_right: ['右转', '向右转', '转弯右'],
      turtle_pen_up: ['抬笔', '提笔', '停笔', '台笔', '台比', '太笔'],
      turtle_pen_down: ['落笔', '下笔', '开始画线'],
      turtle_arc: ['弧线', '画弧', '圆弧']
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

    // 语气词列表（需要过滤）- 注意只过滤真正无意义的语气词
    this.fillerWords = ['请', '嗯', '啊', '呃', '哦', '呀', '啦', '哎', '嘛', '呢', '哈'];
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

    if (!cleaned) return null;

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
    // 合并多余空格（但保留空格，因为数字和中文之间可能有空格）
    result = result.replace(/\s+/g, ' ').trim();
    return result;
  }

  /**
   * 识别意图
   */
  _identifyIntent(text) {
    // 先检查是否包含预设模板关键词
    const presetKeywords = this.intentKeywords.draw_preset;
    for (const keyword of presetKeywords) {
      if (text.includes(keyword)) {
        // 如果同时包含"画"或类似动词，确认是预设模板
        const drawVerbs = ['画', '绘制', '创建', '添加', '来个', '整一个', '搞个', '弄个'];
        for (const verb of drawVerbs) {
          if (text.includes(verb)) {
            return 'draw_preset';
          }
        }
        // 即使没有动词，如果只有预设词也当作预设
        if (text.replace(/\s/g, '').length <= keyword.length + 5) {
          return 'draw_preset';
        }
      }
    }

    // 优先匹配高优先级意图
    const priorityOrder = [
      'undo', 'redo', 'clear', 'save', 'help', 'cancel', 'pause', 'resume',
      'set_fill', 'set_dash', 'set_opacity', 'set_linewidth',
      'turtle_start', 'turtle_stop', 'turtle_forward', 'turtle_backward',
      'turtle_turn_left', 'turtle_turn_right', 'turtle_pen_up', 'turtle_pen_down', 'turtle_arc',
      'draw_direction', 'move_to', 'set_background', 'delete_last',
      'set_color', 'draw_svg', 'draw_shape'
    ];

    for (const intent of priorityOrder) {
      const keywords = this.intentKeywords[intent];
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          // 特殊处理：避免 "画一个红色的圆" 被误判为 set_color
          if (intent === 'set_color' && this._containsShapeKeyword(text)) {
            continue;
          }
          // 特殊处理：避免 "画一个圆" 中的"圆"被 delete_last 中的"删"误匹配
          // （不会，因为"画"在 draw_shape 中优先级更高）
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
      case 'draw_preset':
        return this._extractPresetParams(text);
      case 'draw_svg':
        return { description: text };
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
      case 'turtle_start':
      case 'turtle_stop':
      case 'turtle_pen_up':
      case 'turtle_pen_down':
        return {};
      case 'turtle_forward':
        return this._extractTurtleForwardParams(text);
      case 'turtle_backward':
        return this._extractTurtleBackwardParams(text);
      case 'turtle_turn_left':
        return this._extractTurtleTurnLeftParams(text);
      case 'turtle_turn_right':
        return this._extractTurtleTurnRightParams(text);
      case 'turtle_arc':
        return this._extractTurtleArcParams(text);
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
    params.size = this._extractSizeNumber(text);
    params.width = this._extractPrefixedNumber(text, ['宽']);
    params.height = this._extractPrefixedNumber(text, ['高']);

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
      '原': '圆',
      '举行': '矩形',
      '山脚行': '三角形',
      '新型': '星形',
      '简形': '矩形',
      '原形': '圆形',
      '画原': '画圆',
      '画个原': '画个圆',
      '画一个原': '画一个圆'
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
    const batchKeywords = {
      '两个': 2, '三个': 3, '四个': 4, '五个': 5,
      '两': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };
    for (const [keyword, count] of Object.entries(batchKeywords)) {
      if (text.includes(keyword + '个') || text.includes(keyword)) {
        // 确保"两"不是"两个"的一部分时才匹配
        if (keyword.length === 1 && text.includes(keyword + '个')) {
          return count;
        }
        if (keyword.length > 1) {
          return count;
        }
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
    // 精确匹配
    for (const [shape, keywords] of Object.entries(this.shapeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return shape;
        }
      }
    }
    // 模糊匹配：对每个关键词检查是否和文本的子串编辑距离很近
    for (const [shape, keywords] of Object.entries(this.shapeKeywords)) {
      for (const keyword of keywords) {
        // 在文本中滑动窗口查找相似子串
        if (keyword.length >= 2 && text.length >= keyword.length) {
          for (let i = 0; i <= text.length - keyword.length; i++) {
            const substr = text.substring(i, i + keyword.length);
            const dist = levenshteinDistance(substr, keyword);
            if (dist <= 1) {
              return shape;
            }
          }
        }
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
   * 提取尺寸数字（更智能的数字提取）
   */
  _extractSizeNumber(text) {
    // 先尝试带前缀的数字
    const prefixed = this._extractPrefixedNumber(text, ['半径', '大小', '尺寸', '边长']);
    if (prefixed) return prefixed;

    // 尝试提取独立的数字（不在"角"后面，不在"个"后面）
    const matches = text.match(/\d+/g);
    if (matches) {
      for (const m of matches) {
        const idx = text.indexOf(m);
        // 跳过"角"后面的数字（如"5角星"）
        if (idx > 0 && text[idx - 1] === '角') continue;
        // 跳过"个"前面的数字（如"3个圆"）
        if (idx + m.length < text.length && text[idx + m.length] === '个') continue;
        return parseInt(m);
      }
    }
    return null;
  }

  /**
   * 提取带前缀的数字
   */
  _extractPrefixedNumber(text, prefixes) {
    for (const prefix of prefixes) {
      const match = text.match(new RegExp(prefix + '\\s*(\\d+)'));
      if (match) return parseInt(match[1]);
    }
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
    const num = this._extractPrefixedNumber(text, ['线宽', '粗细', '线粗']);
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
    const num = this._extractPrefixedNumber(text, ['透明度']);
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
    const coordMatch = text.match(/坐标?\s*(\d+)\s*[,，]\s*(\d+)/);
    if (coordMatch) {
      return { x: parseInt(coordMatch[1]), y: parseInt(coordMatch[2]) };
    }
    // 相对移动
    const direction = this._extractDirection(text);
    const distance = this._extractPrefixedNumber(text, ['移动', '走', '移']) ||
                     this._extractSizeNumber(text);
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
    const distance = this._extractPrefixedNumber(text, ['画', '走', '移']) ||
                     this._extractSizeNumber(text);
    return { direction, distance: distance || 100 };
  }

  /**
   * 提取背景色参数
   */
  _extractBackgroundParams(text) {
    const color = this._extractColor(text);
    return { color: color || '#ffffff' };
  }

  /**
   * 提取预设模板参数
   */
  _extractPresetParams(text) {
    const presetMap = {
      '树': 'tree', '房子': 'house', '太阳': 'sun',
      '花': 'flower', '人脸': 'face', '笑脸': 'smiley',
      '心': 'heart', '爱心': 'heart',
      '猫': 'cat', '小猫': 'cat', '猫咪': 'cat',
      '狗': 'dog', '小狗': 'dog', '狗狗': 'dog',
      '鱼': 'fish', '小鱼': 'fish',
      '蝴蝶': 'butterfly',
      '鸟': 'bird', '小鸟': 'bird',
      '兔子': 'rabbit', '小兔': 'rabbit', '兔': 'rabbit',
      '熊': 'bear', '小熊': 'bear',
      '熊猫': 'panda',
      '企鹅': 'penguin',
      '青蛙': 'frog', '蛙': 'frog'
    };
    let preset = null;
    for (const [keyword, name] of Object.entries(presetMap)) {
      if (text.includes(keyword)) {
        preset = name;
        break;
      }
    }
    const position = this._extractPosition(text);
    const color = this._extractColor(text);
    return { preset: preset || 'tree', position, color };
  }

  // ===== 海龟画图参数提取方法 =====

  /**
   * 提取海龟前进参数
   */
  _extractTurtleForwardParams(text) {
    const distance = this._extractPrefixedNumber(text, ['前进', '向前', '往前', '走', '移动']) ||
                     this._extractSizeNumber(text) || 50;
    return { distance };
  }

  /**
   * 提取海龟后退参数
   */
  _extractTurtleBackwardParams(text) {
    const distance = this._extractPrefixedNumber(text, ['后退', '向后', '往后', '退', '移动']) ||
                     this._extractSizeNumber(text) || 50;
    return { distance };
  }

  /**
   * 提取海龟左转参数
   */
  _extractTurtleTurnLeftParams(text) {
    const degrees = this._extractPrefixedNumber(text, ['左转', '转']) ||
                    this._extractSizeNumber(text) || 90;
    return { degrees };
  }

  /**
   * 提取海龟右转参数
   */
  _extractTurtleTurnRightParams(text) {
    const degrees = this._extractPrefixedNumber(text, ['右转', '转']) ||
                    this._extractSizeNumber(text) || 90;
    return { degrees };
  }

  /**
   * 提取海龟弧线参数
   */
  _extractTurtleArcParams(text) {
    const radius = this._extractPrefixedNumber(text, ['半径', '弧线', '画弧', '圆弧']) ||
                   this._extractSizeNumber(text) || 50;
    const angle = this._extractPrefixedNumber(text, ['角度', '度']) || 90;
    return { radius, angle };
  }
}
