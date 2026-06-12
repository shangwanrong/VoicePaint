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
   * @returns {boolean} 是否执行成功
   */
  execute(command) {
    if (!command || !command.intent) {
      if (this.feedback) this.feedback.speak('未识别到指令');
      return false;
    }

    console.log('执行指令:', command.intent, command.params);
    this.lastCommand = command;

    switch (command.intent) {
      case 'draw_shape':
        return this._executeDrawShape(command.params);
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
      default:
        if (this.feedback) this.feedback.speak('未知指令');
        return false;
    }
  }

  /**
   * 执行绘图指令
   */
  _executeDrawShape(params) {
    const shape = params.shape || 'circle';
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
}
