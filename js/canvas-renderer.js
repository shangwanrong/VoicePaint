// 画布渲染器模块

class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.shapes = []; // 图形对象列表
    this.currentStyle = {
      strokeColor: '#000000',
      fillColor: '#000000',
      lineWidth: 2,
      lineDash: [],
      opacity: 1,
      fill: false
    };
    this.cursorX = 0;
    this.cursorY = 0;
    this.backgroundColor = '#ffffff';

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  /**
   * 适配画布尺寸
   */
  _resize() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    // 默认光标在画布中心
    if (this.cursorX === 0 && this.cursorY === 0) {
      this.cursorX = this.canvas.width / 2;
      this.cursorY = this.canvas.height / 2;
    }
    this.redraw();
  }

  /**
   * 获取画布宽度
   */
  get width() {
    return this.canvas.width;
  }

  /**
   * 获取画布高度
   */
  get height() {
    return this.canvas.height;
  }

  /**
   * 添加图形并绘制
   */
  addShape(shape) {
    this.shapes.push(shape);
    this.redraw();
  }

  /**
   * 移除指定图形
   */
  removeShape(shapeId) {
    const idx = this.shapes.findIndex(s => s.id === shapeId);
    if (idx !== -1) {
      this.shapes.splice(idx, 1);
      this.redraw();
      return true;
    }
    return false;
  }

  /**
   * 移除最后一个图形
   */
  removeLastShape() {
    if (this.shapes.length === 0) return null;
    const shape = this.shapes.pop();
    this.redraw();
    return shape;
  }

  /**
   * 清空所有图形
   */
  clearAll() {
    this.shapes = [];
    this.redraw();
  }

  /**
   * 设置背景色
   */
  setBackgroundColor(color) {
    this.backgroundColor = color;
    this.redraw();
  }

  /**
   * 移动光标位置
   */
  setCursor(x, y) {
    this.cursorX = clamp(x, 0, this.canvas.width);
    this.cursorY = clamp(y, 0, this.canvas.height);
  }

  /**
   * 更新当前样式
   */
  updateStyle(key, value) {
    if (key in this.currentStyle) {
      this.currentStyle[key] = value;
    }
  }

  /**
   * 在当前光标位置创建线段
   */
  createLineAtCursor(length, direction) {
    const dir = direction || 'right';
    const len = length || 100;
    let x2 = this.cursorX, y2 = this.cursorY;
    switch (dir) {
      case 'right': x2 = this.cursorX + len; break;
      case 'left': x2 = this.cursorX - len; break;
      case 'up': y2 = this.cursorY - len; break;
      case 'down': y2 = this.cursorY + len; break;
    }
    return ShapeFactory.createShape('line', {
      x1: this.cursorX, y1: this.cursorY, x2, y2
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建矩形
   */
  createRectAtCursor(width, height) {
    return ShapeFactory.createShape('rect', {
      x: this.cursorX, y: this.cursorY,
      width: width || 100, height: height || 80
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建圆
   */
  createCircleAtCursor(radius) {
    return ShapeFactory.createShape('circle', {
      x: this.cursorX, y: this.cursorY,
      radius: radius || 50
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建三角形
   */
  createTriangleAtCursor(size) {
    return ShapeFactory.createShape('triangle', {
      x: this.cursorX, y: this.cursorY,
      size: size || 80
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建椭圆
   */
  createEllipseAtCursor(radiusX, radiusY) {
    return ShapeFactory.createShape('ellipse', {
      x: this.cursorX, y: this.cursorY,
      radiusX: radiusX || 60, radiusY: radiusY || 40
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建星形
   */
  createStarAtCursor(outerRadius, points) {
    return ShapeFactory.createShape('star', {
      x: this.cursorX, y: this.cursorY,
      outerRadius: outerRadius || 50,
      points: points || 5
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建箭头
   */
  createArrowAtCursor(length, direction) {
    const dir = direction || 'right';
    const len = length || 100;
    let x2 = this.cursorX, y2 = this.cursorY;
    switch (dir) {
      case 'right': x2 = this.cursorX + len; break;
      case 'left': x2 = this.cursorX - len; break;
      case 'up': y2 = this.cursorY - len; break;
      case 'down': y2 = this.cursorY + len; break;
    }
    return ShapeFactory.createShape('arrow', {
      x1: this.cursorX, y1: this.cursorY, x2, y2
    }, this.currentStyle);
  }

  /**
   * 在当前光标位置创建文字
   */
  createTextAtCursor(text, fontSize) {
    return ShapeFactory.createShape('text', {
      x: this.cursorX, y: this.cursorY,
      text: text || '文字', fontSize: fontSize || 24
    }, this.currentStyle);
  }

  /**
   * 在指定位置创建图形（通过位置关键词）
   */
  moveCursorToPosition(posKey) {
    const posDesc = POSITION_MAP[posKey];
    if (posDesc) {
      const pos = resolvePosition(posDesc, this.canvas.width, this.canvas.height);
      this.setCursor(pos.x, pos.y);
    }
  }

  /**
   * 重绘整个画布
   */
  redraw() {
    const ctx = this.ctx;
    // 清空并填充背景
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 依次绘制所有图形
    for (const shape of this.shapes) {
      ShapeFactory.draw(ctx, shape);
    }
  }

  /**
   * 获取当前样式快照
   */
  getStyleSnapshot() {
    return { ...this.currentStyle };
  }

  /**
   * 导出画布为图片
   */
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}
