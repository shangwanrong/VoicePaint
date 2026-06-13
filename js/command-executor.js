// 指令执行器模块

class CommandExecutor {
  constructor(renderer, history, feedback) {
    this.renderer = renderer;
    this.history = history;
    this.feedback = feedback;
    this.lastCommand = null; // 上一次执行的指令，用于"重复"
  }

  /**
   * 执行指令
   * @param {object} command - 指令对象 { intent, params, raw }
   * @returns {Promise<boolean>} 是否执行成功
   */
  async execute(command) {
    if (!command || !command.intent) {
      if (this.feedback) this.feedback.speak('未识别到指令');
      return false;
    }

    console.log('执行指令:', command.intent, command.params);
    this.lastCommand = command;

    switch (command.intent) {
      case 'draw_shape':
        return this._executeDrawShape(command.params);
      case 'draw_preset':
        return this._executeDrawPreset(command.params);
      case 'draw_svg':
        return await this._executeDrawSVG(command.params);
      case 'set_color':
        return this._executeSetColor(command.params);
      case 'set_linewidth':
        return this._executeSetLinewidth(command.params);
      case 'set_fill':
        return this._executeSetFill(command.params);
      case 'set_opacity':
        return this._executeSetOpacity(command.params);
      case 'set_dash':
        return this._executeSetDash(command.params);
      case 'move_to':
        return this._executeMoveTo(command.params);
      case 'draw_direction':
        return this._executeDrawDirection(command.params);
      case 'undo':
        return this._executeUndo();
      case 'redo':
        return this._executeRedo();
      case 'clear':
        return this._executeClear();
      case 'delete_last':
        return this._executeDeleteLast();
      case 'save':
        return this._executeSave();
      case 'set_background':
        return this._executeSetBackground(command.params);
      case 'help':
        return this._executeHelp();
      case 'cancel':
        return true; // 取消当前操作，不做任何事
      case 'pause':
        return this._executePause();
      case 'resume':
        return this._executeResume();
      case 'turtle_start':
        return this._executeTurtleStart(command.params);
      case 'turtle_stop':
        return this._executeTurtleStop(command.params);
      case 'turtle_forward':
        return this._executeTurtleForward(command.params);
      case 'turtle_backward':
        return this._executeTurtleBackward(command.params);
      case 'turtle_turn_left':
        return this._executeTurtleTurnLeft(command.params);
      case 'turtle_turn_right':
        return this._executeTurtleTurnRight(command.params);
      case 'turtle_pen_up':
        return this._executeTurtlePenUp(command.params);
      case 'turtle_pen_down':
        return this._executeTurtlePenDown(command.params);
      case 'turtle_arc':
        return this._executeTurtleArc(command.params);
      default:
        if (this.feedback) this.feedback.speak('未知指令');
        return false;
    }
  }

  /**
   * 执行绘图指令
   */
  _executeDrawShape(params) {
    // LLM可能返回不同的图形名称，统一映射
    const shapeAliases = {
      'square': 'rect', 'rectangle': 'rect', '长方形': 'rect', '正方形': 'rect',
      '圆形': 'circle', '圆圈': 'circle',
      '三角形': 'triangle',
      '线段': 'line', '直线': 'line',
      '椭圆': 'ellipse',
      '星形': 'star', '五角星': 'star',
      '箭头': 'arrow',
      '文字': 'text'
    };
    let shape = params.shape || 'circle';
    shape = shapeAliases[shape] || shape;
    const count = params.count || 1;

    // 如果指定了位置，先移动光标
    if (params.position) {
      this.renderer.moveCursorToPosition(params.position);
    }

    // 如果指定了颜色，临时更新样式
    if (params.color) {
      this.renderer.updateStyle('strokeColor', params.color);
      this.renderer.updateStyle('fillColor', params.color);
    }

    // 如果指定了填充模式，临时更新
    if (params.fill !== null && params.fill !== undefined) {
      this.renderer.updateStyle('fill', params.fill);
    }

    // 批量绘制
    const shapeNames = {
      circle: '圆', rect: '矩形', line: '线段', triangle: '三角形',
      ellipse: '椭圆', star: '星形', arrow: '箭头', text: '文字'
    };
    const name = shapeNames[shape] || '图形';

    for (let i = 0; i < count; i++) {
      // 根据图形类型创建图形
      let shapeObj = null;
      switch (shape) {
        case 'circle':
          shapeObj = this.renderer.createCircleAtCursor(params.size || 50);
          break;
        case 'rect':
          shapeObj = this.renderer.createRectAtCursor(
            params.width || params.size || 100,
            params.height || params.size || 80
          );
          break;
        case 'line':
          shapeObj = this.renderer.createLineAtCursor(
            params.size || 100,
            params.direction || 'right'
          );
          break;
        case 'triangle':
          shapeObj = this.renderer.createTriangleAtCursor(params.size || 80);
          break;
        case 'ellipse':
          shapeObj = this.renderer.createEllipseAtCursor(
            params.width || 60,
            params.height || 40
          );
          break;
        case 'star':
          shapeObj = this.renderer.createStarAtCursor(params.size || 50, params.points);
          break;
        case 'arrow':
          shapeObj = this.renderer.createArrowAtCursor(
            params.size || 100,
            params.direction || 'right'
          );
          break;
        case 'text':
          shapeObj = this.renderer.createTextAtCursor(params.text || '文字');
          break;
        default:
          shapeObj = this.renderer.createCircleAtCursor(50);
      }

      // 添加图形到画布
      this.renderer.addShape(shapeObj);

      // 记录到操作历史
      this.history.push({
        type: 'add_shape',
        shapeId: shapeObj.id,
        shape: shapeObj
      });

      // 批量绘制时，每个图形偏移一定距离
      if (count > 1 && i < count - 1) {
        const offset = (params.size || 50) * 2.5;
        this.renderer.setCursor(
          this.renderer.cursorX + offset,
          this.renderer.cursorY
        );
      }
    }

    // 语音反馈
    if (this.feedback) {
      if (count > 1) {
        this.feedback.speak(`已画${count}个${name}`);
      } else {
        this.feedback.speak(`已画${name}`);
      }
    }

    return true;
  }

  /**
   * 执行设置颜色指令
   */
  _executeSetColor(params) {
    if (!params.color) {
      if (this.feedback) this.feedback.speak('请指定颜色');
      return false;
    }
    this.renderer.updateStyle('strokeColor', params.color);
    this.renderer.updateStyle('fillColor', params.color);

    // 记录到操作历史
    const prevColor = this.renderer.currentStyle.strokeColor;
    this.history.push({
      type: 'set_color',
      prev: prevColor,
      next: params.color
    });

    if (this.feedback) this.feedback.speak(`颜色已更改`);
    return true;
  }

  /**
   * 执行设置线宽指令
   */
  _executeSetLinewidth(params) {
    let newWidth;
    if (params.value) {
      newWidth = params.value;
    } else if (params.delta) {
      newWidth = this.renderer.currentStyle.lineWidth + params.delta;
    } else {
      newWidth = this.renderer.currentStyle.lineWidth + 1;
    }
    newWidth = clamp(newWidth, 1, 50);

    const prevWidth = this.renderer.currentStyle.lineWidth;
    this.renderer.updateStyle('lineWidth', newWidth);

    this.history.push({
      type: 'set_linewidth',
      prev: prevWidth,
      next: newWidth
    });

    if (this.feedback) this.feedback.speak(`线宽已设为${newWidth}`);
    return true;
  }

  /**
   * 执行设置填充模式指令
   */
  _executeSetFill(params) {
    this.renderer.updateStyle('fill', params.fill);
    const modeText = params.fill ? '填充' : '描边';

    this.history.push({
      type: 'set_fill',
      prev: !params.fill,
      next: params.fill
    });

    if (this.feedback) this.feedback.speak(`已切换为${modeText}模式`);
    return true;
  }

  /**
   * 执行设置透明度指令
   */
  _executeSetOpacity(params) {
    const value = clamp(params.value || 1, 0, 1);
    const prev = this.renderer.currentStyle.opacity;
    this.renderer.updateStyle('opacity', value);

    this.history.push({
      type: 'set_opacity',
      prev, next: value
    });

    if (this.feedback) this.feedback.speak(`透明度已设为${Math.round(value * 100)}%`);
    return true;
  }

  /**
   * 执行设置虚线指令
   */
  _executeSetDash(params) {
    const prev = this.renderer.currentStyle.lineDash;
    this.renderer.updateStyle('lineDash', params.lineDash);

    this.history.push({
      type: 'set_dash',
      prev, next: params.lineDash
    });

    const dashNames = { '10,5': '虚线', '3,3': '点线' };
    const name = dashNames[params.lineDash.join(',')] || '实线';
    if (this.feedback) this.feedback.speak(`已切换为${name}`);
    return true;
  }

  /**
   * 执行移动指令
   */
  _executeMoveTo(params) {
    if (params.position) {
      this.renderer.moveCursorToPosition(params.position);
      if (this.feedback) this.feedback.speak(`已移到${params.position}`);
    } else if (params.x !== undefined && params.y !== undefined) {
      this.renderer.setCursor(params.x, params.y);
      if (this.feedback) this.feedback.speak(`已移到坐标${params.x},${params.y}`);
    } else if (params.direction) {
      const dist = params.distance || 50;
      let x = this.renderer.cursorX;
      let y = this.renderer.cursorY;
      switch (params.direction) {
        case 'up': y -= dist; break;
        case 'down': y += dist; break;
        case 'left': x -= dist; break;
        case 'right': x += dist; break;
      }
      this.renderer.setCursor(x, y);
      const dirNames = { up: '上', down: '下', left: '左', right: '右' };
      if (this.feedback) this.feedback.speak(`已向${dirNames[params.direction]}移动`);
    }
    return true;
  }

  /**
   * 执行方向绘图指令
   */
  _executeDrawDirection(params) {
    const direction = params.direction || 'right';
    const distance = params.distance || 100;

    // 在指定方向画线
    const shapeObj = this.renderer.createLineAtCursor(distance, direction);
    this.renderer.addShape(shapeObj);

    // 移动光标到线段终点
    let x = this.renderer.cursorX;
    let y = this.renderer.cursorY;
    switch (direction) {
      case 'up': y -= distance; break;
      case 'down': y += distance; break;
      case 'left': x -= distance; break;
      case 'right': x += distance; break;
    }
    this.renderer.setCursor(x, y);

    this.history.push({
      type: 'add_shape',
      shapeId: shapeObj.id,
      shape: shapeObj
    });

    const dirNames = { up: '上', down: '下', left: '左', right: '右' };
    if (this.feedback) this.feedback.speak(`已向${dirNames[direction]}画线`);
    return true;
  }

  /**
   * 执行撤销
   */
  _executeUndo() {
    const action = this.history.undo();
    if (!action) {
      if (this.feedback) this.feedback.speak('没有可撤销的操作');
      return false;
    }

    switch (action.type) {
      case 'add_shape':
        this.renderer.removeShape(action.shapeId);
        break;
      case 'set_color':
        this.renderer.updateStyle('strokeColor', action.prev);
        this.renderer.updateStyle('fillColor', action.prev);
        break;
      case 'set_linewidth':
        this.renderer.updateStyle('lineWidth', action.prev);
        break;
      case 'set_fill':
        this.renderer.updateStyle('fill', action.prev);
        break;
      case 'set_opacity':
        this.renderer.updateStyle('opacity', action.prev);
        break;
      case 'set_dash':
        this.renderer.updateStyle('lineDash', action.prev);
        break;
      case 'clear':
        this.renderer.shapes = action.prevShapes;
        this.renderer.redraw();
        break;
    }

    if (this.feedback) this.feedback.speak('已撤销');
    return true;
  }

  /**
   * 执行重做
   */
  _executeRedo() {
    const action = this.history.redo();
    if (!action) {
      if (this.feedback) this.feedback.speak('没有可重做的操作');
      return false;
    }

    switch (action.type) {
      case 'add_shape':
        this.renderer.addShape(action.shape);
        break;
      case 'set_color':
        this.renderer.updateStyle('strokeColor', action.next);
        this.renderer.updateStyle('fillColor', action.next);
        break;
      case 'set_linewidth':
        this.renderer.updateStyle('lineWidth', action.next);
        break;
      case 'set_fill':
        this.renderer.updateStyle('fill', action.next);
        break;
      case 'set_opacity':
        this.renderer.updateStyle('opacity', action.next);
        break;
      case 'set_dash':
        this.renderer.updateStyle('lineDash', action.next);
        break;
      case 'clear':
        this.renderer.clearAll();
        break;
    }

    if (this.feedback) this.feedback.speak('已重做');
    return true;
  }

  /**
   * 执行清空画布
   */
  _executeClear() {
    // 保存当前图形列表以便撤销
    const prevShapes = [...this.renderer.shapes];
    this.renderer.clearAll();

    this.history.push({
      type: 'clear',
      prevShapes
    });

    if (this.feedback) this.feedback.speak('画布已清空');
    return true;
  }

  /**
   * 执行删除最后一个图形
   */
  _executeDeleteLast() {
    const shape = this.renderer.removeLastShape();
    if (!shape) {
      if (this.feedback) this.feedback.speak('画布上没有图形');
      return false;
    }

    this.history.push({
      type: 'add_shape',
      shapeId: shape.id,
      shape: shape
    });

    if (this.feedback) this.feedback.speak('已删除');
    return true;
  }

  /**
   * 执行保存图片
   */
  _executeSave() {
    const dataURL = this.renderer.toDataURL();
    const link = document.createElement('a');
    link.download = `voicepaint_${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    if (this.feedback) this.feedback.speak('图片已保存');
    return true;
  }

  /**
   * 执行设置背景色
   */
  _executeSetBackground(params) {
    const prevBg = this.renderer.backgroundColor;
    this.renderer.setBackgroundColor(params.color);

    this.history.push({
      type: 'set_background',
      prev: prevBg,
      next: params.color
    });

    if (this.feedback) this.feedback.speak('背景色已更改');
    return true;
  }

  /**
   * 执行帮助指令
   */
  _executeHelp() {
    const helpText = '可用指令：画圆、画矩形、画三角形、画线、画星形、画箭头、写文字。' +
      '颜色指令：红色、蓝色、绿色等。' +
      '样式指令：填充、描边、粗一点、细一点、虚线。' +
      '操作指令：撤销、重做、清空、保存、删除。' +
      '位置指令：移到中间、移到左上角。';
    if (this.feedback) this.feedback.speak(helpText);
    return true;
  }

  /**
   * 执行暂停
   */
  _executePause() {
    // 由 app.js 处理
    return true;
  }

  /**
   * 执行恢复
   */
  _executeResume() {
    // 由 app.js 处理
    return true;
  }

  /**
   * 执行AI生成SVG图形指令
   */
  async _executeDrawSVG(params) {
    // 如果指定了位置，先移动光标
    if (params.position) {
      this.renderer.moveCursorToPosition(params.position);
    }

    // 如果指定了颜色，更新样式
    if (params.color) {
      this.renderer.updateStyle('strokeColor', params.color);
      this.renderer.updateStyle('fillColor', params.color);
    }

    const description = params.description || '图形';
    const scale = params.scale || 1;

    try {
      // 调用后端接口获取 SVG 代码
      const response = await fetch('/api/deepseek/svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description })
      });

      const result = await response.json();

      if (!result.success || !result.svg) {
        if (this.feedback) this.feedback.speak('生成图形失败，请重试');
        console.error('SVG生成失败:', result.error);
        return false;
      }

      // 创建 SVG 图形
      const shapeObj = this.renderer.createSVGAtCursor(result.svg, scale);
      this.renderer.addShape(shapeObj);

      // 记录到操作历史
      this.history.push({
        type: 'add_shape',
        shapeId: shapeObj.id,
        shape: shapeObj
      });

      // 语音反馈
      if (this.feedback) this.feedback.speak(`已画${description}`);
      return true;
    } catch (e) {
      console.error('SVG生成请求失败:', e);
      if (this.feedback) this.feedback.speak('生成图形出错');
      return false;
    }
  }

  /**
   * 执行预设模板绘制
   */
  _executeDrawPreset(params) {
    const preset = params.preset || 'tree';
    const cx = this.renderer.cursorX;
    const cy = this.renderer.cursorY;

    // 如果指定了位置，先移动光标
    if (params.position) {
      this.renderer.moveCursorToPosition(params.position);
    }

    // 如果指定了颜色，更新样式
    if (params.color) {
      this.renderer.updateStyle('strokeColor', params.color);
      this.renderer.updateStyle('fillColor', params.color);
    }

    const style = this.renderer.getStyleSnapshot();
    const shapes = [];

    switch (preset) {
      case 'tree':
        shapes.push(...this._presetTree(cx, cy, style));
        break;
      case 'house':
        shapes.push(...this._presetHouse(cx, cy, style));
        break;
      case 'sun':
        shapes.push(...this._presetSun(cx, cy, style));
        break;
      case 'flower':
        shapes.push(...this._presetFlower(cx, cy, style));
        break;
      case 'face':
      case 'smiley':
        shapes.push(...this._presetSmiley(cx, cy, style));
        break;
      case 'heart':
        shapes.push(...this._presetHeart(cx, cy, style));
        break;
      case 'cat':
        shapes.push(...this._presetCat(cx, cy, style));
        break;
      case 'dog':
        shapes.push(...this._presetDog(cx, cy, style));
        break;
      case 'fish':
        shapes.push(...this._presetFish(cx, cy, style));
        break;
      case 'butterfly':
        shapes.push(...this._presetButterfly(cx, cy, style));
        break;
      case 'bird':
        shapes.push(...this._presetBird(cx, cy, style));
        break;
      case 'rabbit':
        shapes.push(...this._presetRabbit(cx, cy, style));
        break;
      case 'bear':
        shapes.push(...this._presetBear(cx, cy, style));
        break;
      case 'panda':
        shapes.push(...this._presetPanda(cx, cy, style));
        break;
      case 'penguin':
        shapes.push(...this._presetPenguin(cx, cy, style));
        break;
      case 'frog':
        shapes.push(...this._presetFrog(cx, cy, style));
        break;
    }

    // 添加所有图形
    for (const shape of shapes) {
      this.renderer.addShape(shape);
      this.history.push({ type: 'add_shape', shapeId: shape.id, shape });
    }

    const presetNames = { tree: '树', house: '房子', sun: '太阳', flower: '花', smiley: '笑脸', face: '人脸', heart: '爱心',
      cat: '猫', dog: '狗', fish: '鱼', butterfly: '蝴蝶', bird: '鸟', rabbit: '兔子',
      bear: '熊', panda: '熊猫', penguin: '企鹅', frog: '青蛙' };
    if (this.feedback) this.feedback.speak(`已画${presetNames[preset] || preset}`);
    return true;
  }

  // ===== 预设模板绘制方法 =====

  _presetTree(cx, cy, style) {
    const shapes = [];
    // 树干
    shapes.push(ShapeFactory.createShape('rect', { x: cx, y: cy + 30, width: 20, height: 60 },
      { ...style, fillColor: '#8B4513', strokeColor: '#8B4513', fill: true }));
    // 树冠（三个圆叠加）
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy - 20, radius: 40 },
      { ...style, fillColor: '#228B22', strokeColor: '#228B22', fill: true }));
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 25, y: cy, radius: 30 },
      { ...style, fillColor: '#2E8B57', strokeColor: '#2E8B57', fill: true }));
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 25, y: cy, radius: 30 },
      { ...style, fillColor: '#2E8B57', strokeColor: '#2E8B57', fill: true }));
    return shapes;
  }

  _presetHouse(cx, cy, style) {
    const shapes = [];
    // 墙壁
    shapes.push(ShapeFactory.createShape('rect', { x: cx, y: cy + 20, width: 80, height: 60 },
      { ...style, fillColor: '#DEB887', strokeColor: '#8B4513', fill: true }));
    // 屋顶（三角形）
    shapes.push(ShapeFactory.createShape('triangle', { x: cx, y: cy - 25, size: 100 },
      { ...style, fillColor: '#B22222', strokeColor: '#8B0000', fill: true }));
    // 门
    shapes.push(ShapeFactory.createShape('rect', { x: cx, y: cy + 30, width: 20, height: 30 },
      { ...style, fillColor: '#8B4513', strokeColor: '#654321', fill: true }));
    return shapes;
  }

  _presetSun(cx, cy, style) {
    const shapes = [];
    // 太阳本体
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 35 },
      { ...style, fillColor: '#FFD700', strokeColor: '#FFA500', fill: true }));
    // 光芒（8条线）
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const x1 = cx + 40 * Math.cos(angle);
      const y1 = cy + 40 * Math.sin(angle);
      const x2 = cx + 60 * Math.cos(angle);
      const y2 = cy + 60 * Math.sin(angle);
      shapes.push(ShapeFactory.createShape('line', { x1, y1, x2, y2 },
        { ...style, strokeColor: '#FFA500', lineWidth: 3 }));
    }
    return shapes;
  }

  _presetFlower(cx, cy, style) {
    const shapes = [];
    // 花瓣（5个圆）
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const px = cx + 20 * Math.cos(angle);
      const py = cy + 20 * Math.sin(angle);
      shapes.push(ShapeFactory.createShape('circle', { x: px, y: py, radius: 15 },
        { ...style, fillColor: '#FF69B4', strokeColor: '#FF1493', fill: true }));
    }
    // 花心
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 10 },
      { ...style, fillColor: '#FFD700', strokeColor: '#FFA500', fill: true }));
    // 花茎
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 25, x2: cx, y2: cy + 70 },
      { ...style, strokeColor: '#228B22', lineWidth: 3 }));
    return shapes;
  }

  _presetSmiley(cx, cy, style) {
    const shapes = [];
    // 脸
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 40 },
      { ...style, fillColor: '#FFD700', strokeColor: '#FFA500', fill: true, lineWidth: 2 }));
    // 左眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 15, y: cy - 10, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 15, y: cy - 10, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴（用弧线近似，用小圆表示）
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy + 12, radius: 15 },
      { ...style, fillColor: '#FF6347', strokeColor: '#FF6347', fill: true }));
    // 遮挡嘴巴上半部分（用肤色圆覆盖）
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy + 5, radius: 15 },
      { ...style, fillColor: '#FFD700', strokeColor: '#FFD700', fill: true }));
    return shapes;
  }

  _presetHeart(cx, cy, style) {
    const shapes = [];
    // 用两个圆和一个三角形组合成心形
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 15, y: cy - 10, radius: 20 },
      { ...style, fillColor: '#FF1493', strokeColor: '#FF1493', fill: true }));
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 15, y: cy - 10, radius: 20 },
      { ...style, fillColor: '#FF1493', strokeColor: '#FF1493', fill: true }));
    shapes.push(ShapeFactory.createShape('triangle', { x: cx, y: cy + 25, size: 50 },
      { ...style, fillColor: '#FF1493', strokeColor: '#FF1493', fill: true }));
    return shapes;
  }

  // ===== 动物预设模板 =====

  _presetCat(cx, cy, style) {
    const shapes = [];
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 40 },
      { ...style, fillColor: '#FFA500', strokeColor: '#E08000', fill: true, lineWidth: 2 }));
    // 左耳
    shapes.push(ShapeFactory.createShape('triangle', { x: cx - 25, y: cy - 45, size: 25 },
      { ...style, fillColor: '#FFA500', strokeColor: '#E08000', fill: true }));
    // 右耳
    shapes.push(ShapeFactory.createShape('triangle', { x: cx + 25, y: cy - 45, size: 25 },
      { ...style, fillColor: '#FFA500', strokeColor: '#E08000', fill: true }));
    // 左内耳
    shapes.push(ShapeFactory.createShape('triangle', { x: cx - 25, y: cy - 43, size: 14 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FFB6C1', fill: true }));
    // 右内耳
    shapes.push(ShapeFactory.createShape('triangle', { x: cx + 25, y: cy - 43, size: 14 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FFB6C1', fill: true }));
    // 左眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 14, y: cy - 8, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 14, y: cy - 8, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 鼻子
    shapes.push(ShapeFactory.createShape('triangle', { x: cx, y: cy + 5, size: 8 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FFB6C1', fill: true }));
    // 嘴巴（两条短线）
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 9, x2: cx - 8, y2: cy + 16 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 9, x2: cx + 8, y2: cy + 16 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    // 胡须（左3条）
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 12, y1: cy + 6, x2: cx - 35, y2: cy + 2 },
      { ...style, strokeColor: '#000000', lineWidth: 1 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 12, y1: cy + 9, x2: cx - 35, y2: cy + 9 },
      { ...style, strokeColor: '#000000', lineWidth: 1 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 12, y1: cy + 12, x2: cx - 35, y2: cy + 16 },
      { ...style, strokeColor: '#000000', lineWidth: 1 }));
    // 胡须（右3条）
    shapes.push(ShapeFactory.createShape('line', { x1: cx + 12, y1: cy + 6, x2: cx + 35, y2: cy + 2 },
      { ...style, strokeColor: '#000000', lineWidth: 1 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx + 12, y1: cy + 9, x2: cx + 35, y2: cy + 9 },
      { ...style, strokeColor: '#000000', lineWidth: 1 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx + 12, y1: cy + 12, x2: cx + 35, y2: cy + 16 },
      { ...style, strokeColor: '#000000', lineWidth: 1 }));
    return shapes;
  }

  _presetDog(cx, cy, style) {
    const shapes = [];
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 40 },
      { ...style, fillColor: '#8B4513', strokeColor: '#6B3410', fill: true, lineWidth: 2 }));
    // 左耳（椭圆，下垂）
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 35, y: cy - 5, radiusX: 12, radiusY: 25 },
      { ...style, fillColor: '#5C2E00', strokeColor: '#5C2E00', fill: true }));
    // 右耳
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 35, y: cy - 5, radiusX: 12, radiusY: 25 },
      { ...style, fillColor: '#5C2E00', strokeColor: '#5C2E00', fill: true }));
    // 左眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 14, y: cy - 8, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 14, y: cy - 8, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 鼻子
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy + 8, radius: 7 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴（弧线）
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 12, y1: cy + 18, x2: cx, y2: cy + 24 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 24, x2: cx + 12, y2: cy + 18 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    // 舌头
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 28, radiusX: 6, radiusY: 9 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FF69B4', fill: true }));
    return shapes;
  }

  _presetFish(cx, cy, style) {
    const shapes = [];
    // 身体
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy, radiusX: 40, radiusY: 22 },
      { ...style, fillColor: '#4169E1', strokeColor: '#1E3A8A', fill: true, lineWidth: 2 }));
    // 尾巴
    shapes.push(ShapeFactory.createShape('triangle', { x: cx + 50, y: cy, size: 30 },
      { ...style, fillColor: '#1E3A8A', strokeColor: '#1E3A8A', fill: true }));
    // 眼睛（白色底）
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 18, y: cy - 5, radius: 6 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#FFFFFF', fill: true }));
    // 眼睛（黑色瞳孔）
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 16, y: cy - 5, radius: 3 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 上鳍
    shapes.push(ShapeFactory.createShape('triangle', { x: cx - 5, y: cy - 28, size: 18 },
      { ...style, fillColor: '#6495ED', strokeColor: '#6495ED', fill: true }));
    // 下鳍
    shapes.push(ShapeFactory.createShape('triangle', { x: cx + 5, y: cy + 25, size: 14 },
      { ...style, fillColor: '#6495ED', strokeColor: '#6495ED', fill: true }));
    return shapes;
  }

  _presetButterfly(cx, cy, style) {
    const shapes = [];
    // 身体
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy, radiusX: 5, radiusY: 25 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 左上翅膀
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 22, y: cy - 12, radiusX: 20, radiusY: 16 },
      { ...style, fillColor: '#9370DB', strokeColor: '#7B2FBE', fill: true, lineWidth: 2 }));
    // 右上翅膀
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 22, y: cy - 12, radiusX: 20, radiusY: 16 },
      { ...style, fillColor: '#FF69B4', strokeColor: '#FF1493', fill: true, lineWidth: 2 }));
    // 左下翅膀
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 18, y: cy + 12, radiusX: 14, radiusY: 12 },
      { ...style, fillColor: '#FFD700', strokeColor: '#DAA520', fill: true, lineWidth: 2 }));
    // 右下翅膀
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 18, y: cy + 12, radiusX: 14, radiusY: 12 },
      { ...style, fillColor: '#FFA500', strokeColor: '#FF8C00', fill: true, lineWidth: 2 }));
    // 左触角
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 2, y1: cy - 25, x2: cx - 15, y2: cy - 42 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    // 右触角
    shapes.push(ShapeFactory.createShape('line', { x1: cx + 2, y1: cy - 25, x2: cx + 15, y2: cy - 42 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    // 触角顶端小球
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 15, y: cy - 42, radius: 3 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 15, y: cy - 42, radius: 3 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    return shapes;
  }

  _presetBird(cx, cy, style) {
    const shapes = [];
    // 身体
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 5, radiusX: 30, radiusY: 22 },
      { ...style, fillColor: '#87CEEB', strokeColor: '#5BA3C9', fill: true, lineWidth: 2 }));
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 20, y: cy - 18, radius: 16 },
      { ...style, fillColor: '#87CEEB', strokeColor: '#5BA3C9', fill: true, lineWidth: 2 }));
    // 眼睛
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 24, y: cy - 20, radius: 4 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴
    shapes.push(ShapeFactory.createShape('triangle', { x: cx - 40, y: cy - 16, size: 14 },
      { ...style, fillColor: '#FFA500', strokeColor: '#FF8C00', fill: true }));
    // 翅膀
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 5, y: cy - 5, radiusX: 22, radiusY: 12 },
      { ...style, fillColor: '#4169E1', strokeColor: '#1E3A8A', fill: true }));
    // 尾巴
    shapes.push(ShapeFactory.createShape('triangle', { x: cx + 38, y: cy + 5, size: 20 },
      { ...style, fillColor: '#4169E1', strokeColor: '#1E3A8A', fill: true }));
    return shapes;
  }

  _presetRabbit(cx, cy, style) {
    const shapes = [];
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 38 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#C0C0C0', fill: true, lineWidth: 2 }));
    // 左耳
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 16, y: cy - 55, radiusX: 10, radiusY: 28 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#C0C0C0', fill: true, lineWidth: 2 }));
    // 左内耳
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 16, y: cy - 55, radiusX: 5, radiusY: 20 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FFB6C1', fill: true }));
    // 右耳
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 16, y: cy - 55, radiusX: 10, radiusY: 28 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#C0C0C0', fill: true, lineWidth: 2 }));
    // 右内耳
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 16, y: cy - 55, radiusX: 5, radiusY: 20 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FFB6C1', fill: true }));
    // 左眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 13, y: cy - 6, radius: 5 },
      { ...style, fillColor: '#FF0000', strokeColor: '#FF0000', fill: true }));
    // 右眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 13, y: cy - 6, radius: 5 },
      { ...style, fillColor: '#FF0000', strokeColor: '#FF0000', fill: true }));
    // 鼻子
    shapes.push(ShapeFactory.createShape('triangle', { x: cx, y: cy + 8, size: 8 },
      { ...style, fillColor: '#FFB6C1', strokeColor: '#FFB6C1', fill: true }));
    // 嘴巴
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 12, x2: cx - 8, y2: cy + 20 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 12, x2: cx + 8, y2: cy + 20 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    return shapes;
  }

  _presetBear(cx, cy, style) {
    const shapes = [];
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 42 },
      { ...style, fillColor: '#8B4513', strokeColor: '#6B3410', fill: true, lineWidth: 2 }));
    // 左耳
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 32, y: cy - 30, radius: 14 },
      { ...style, fillColor: '#5C2E00', strokeColor: '#5C2E00', fill: true }));
    // 右耳
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 32, y: cy - 30, radius: 14 },
      { ...style, fillColor: '#5C2E00', strokeColor: '#5C2E00', fill: true }));
    // 左眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 14, y: cy - 8, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 14, y: cy - 8, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 鼻子
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 8, radiusX: 10, radiusY: 7 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 10, y1: cy + 20, x2: cx, y2: cy + 26 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 26, x2: cx + 10, y2: cy + 20 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    return shapes;
  }

  _presetPanda(cx, cy, style) {
    const shapes = [];
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 42 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#000000', fill: true, lineWidth: 2 }));
    // 左耳
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 32, y: cy - 30, radius: 14 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右耳
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 32, y: cy - 30, radius: 14 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 左眼圈
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 14, y: cy - 6, radiusX: 12, radiusY: 10 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼圈
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 14, y: cy - 6, radiusX: 12, radiusY: 10 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 左眼（白色瞳孔）
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 14, y: cy - 6, radius: 4 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#FFFFFF', fill: true }));
    // 右眼
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 14, y: cy - 6, radius: 4 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#FFFFFF', fill: true }));
    // 鼻子
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 10, radiusX: 7, radiusY: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 8, y1: cy + 18, x2: cx, y2: cy + 24 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 24, x2: cx + 8, y2: cy + 18 },
      { ...style, strokeColor: '#000000', lineWidth: 2 }));
    return shapes;
  }

  _presetPenguin(cx, cy, style) {
    const shapes = [];
    // 身体
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 10, radiusX: 30, radiusY: 40 },
      { ...style, fillColor: '#000000', strokeColor: '#333333', fill: true, lineWidth: 2 }));
    // 肚子
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 15, radiusX: 20, radiusY: 30 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#FFFFFF', fill: true }));
    // 左眼（白色）
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 10, y: cy - 12, radius: 6 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#FFFFFF', fill: true }));
    // 左眼（黑色瞳孔）
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 10, y: cy - 12, radius: 3 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼（白色）
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 10, y: cy - 12, radius: 6 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#FFFFFF', fill: true }));
    // 右眼（黑色瞳孔）
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 10, y: cy - 12, radius: 3 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴
    shapes.push(ShapeFactory.createShape('triangle', { x: cx, y: cy - 2, size: 12 },
      { ...style, fillColor: '#FFA500', strokeColor: '#FF8C00', fill: true }));
    // 左脚
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx - 14, y: cy + 52, radiusX: 10, radiusY: 5 },
      { ...style, fillColor: '#FFA500', strokeColor: '#FF8C00', fill: true }));
    // 右脚
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx + 14, y: cy + 52, radiusX: 10, radiusY: 5 },
      { ...style, fillColor: '#FFA500', strokeColor: '#FF8C00', fill: true }));
    return shapes;
  }

  _presetFrog(cx, cy, style) {
    const shapes = [];
    // 头
    shapes.push(ShapeFactory.createShape('circle', { x: cx, y: cy, radius: 38 },
      { ...style, fillColor: '#228B22', strokeColor: '#1A6B1A', fill: true, lineWidth: 2 }));
    // 左眼突出（白色底）
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 18, y: cy - 28, radius: 12 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#228B22', fill: true, lineWidth: 2 }));
    // 左眼瞳孔
    shapes.push(ShapeFactory.createShape('circle', { x: cx - 18, y: cy - 28, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 右眼突出（白色底）
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 18, y: cy - 28, radius: 12 },
      { ...style, fillColor: '#FFFFFF', strokeColor: '#228B22', fill: true, lineWidth: 2 }));
    // 右眼瞳孔
    shapes.push(ShapeFactory.createShape('circle', { x: cx + 18, y: cy - 28, radius: 5 },
      { ...style, fillColor: '#000000', strokeColor: '#000000', fill: true }));
    // 嘴巴（大弧线）
    shapes.push(ShapeFactory.createShape('line', { x1: cx - 25, y1: cy + 12, x2: cx, y2: cy + 20 },
      { ...style, strokeColor: '#1A6B1A', lineWidth: 3 }));
    shapes.push(ShapeFactory.createShape('line', { x1: cx, y1: cy + 20, x2: cx + 25, y2: cy + 12 },
      { ...style, strokeColor: '#1A6B1A', lineWidth: 3 }));
    // 身体
    shapes.push(ShapeFactory.createShape('ellipse', { x: cx, y: cy + 45, radiusX: 28, radiusY: 22 },
      { ...style, fillColor: '#32CD32', strokeColor: '#228B22', fill: true, lineWidth: 2 }));
    return shapes;
  }

  // ===== 海龟画图指令执行方法 =====

  /**
   * 启动海龟画笔模式
   */
  _executeTurtleStart(params) {
    this.renderer.startTurtle();
    if (this.feedback) this.feedback.speak('画笔模式已启动');
    return true;
  }

  /**
   * 停止海龟画笔模式
   */
  _executeTurtleStop(params) {
    // 将所有海龟路径合并为一个 shape 添加到 shapes 列表
    const turtlePaths = this.renderer.turtle.paths;
    if (turtlePaths.length > 0) {
      // 将海龟路径转为一个复合图形保存
      const shapeObj = ShapeFactory.createShape('line', {
        x1: this.renderer.turtle.x, y1: this.renderer.turtle.y,
        x2: this.renderer.turtle.x, y2: this.renderer.turtle.y
      }, this.renderer.currentStyle);
      // 把海龟路径数据附加到 shape 上，以便 redraw 时绘制
      shapeObj.turtlePaths = [...turtlePaths];
      this.renderer.addShape(shapeObj);
      this.history.push({
        type: 'add_shape',
        shapeId: shapeObj.id,
        shape: shapeObj
      });
    }
    this.renderer.stopTurtle();
    if (this.feedback) this.feedback.speak('画笔模式已关闭');
    return true;
  }

  /**
   * 海龟前进
   */
  _executeTurtleForward(params) {
    const distance = params.distance || 50;
    this.renderer.turtleForward(distance);
    if (this.feedback) this.feedback.speak(`前进${distance}`);
    return true;
  }

  /**
   * 海龟后退
   */
  _executeTurtleBackward(params) {
    const distance = params.distance || 50;
    this.renderer.turtleBackward(distance);
    if (this.feedback) this.feedback.speak(`后退${distance}`);
    return true;
  }

  /**
   * 海龟左转
   */
  _executeTurtleTurnLeft(params) {
    const degrees = params.degrees || 90;
    this.renderer.turtleTurnLeft(degrees);
    if (this.feedback) this.feedback.speak(`左转${degrees}度`);
    return true;
  }

  /**
   * 海龟右转
   */
  _executeTurtleTurnRight(params) {
    const degrees = params.degrees || 90;
    this.renderer.turtleTurnRight(degrees);
    if (this.feedback) this.feedback.speak(`右转${degrees}度`);
    return true;
  }

  /**
   * 抬笔
   */
  _executeTurtlePenUp(params) {
    this.renderer.turtlePenUp();
    if (this.feedback) this.feedback.speak('抬笔');
    return true;
  }

  /**
   * 落笔
   */
  _executeTurtlePenDown(params) {
    this.renderer.turtlePenDown();
    if (this.feedback) this.feedback.speak('落笔');
    return true;
  }

  /**
   * 海龟画弧线
   */
  _executeTurtleArc(params) {
    const radius = params.radius || 50;
    const angle = params.angle || 90;
    this.renderer.turtleArc(radius, angle);
    if (this.feedback) this.feedback.speak(`画弧线`);
    return true;
  }
}
