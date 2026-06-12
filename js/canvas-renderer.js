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
