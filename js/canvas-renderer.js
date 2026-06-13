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
    this.svgCache = new Map(); // 缓存已渲染的 SVG Image 对象

    // 海龟画图状态
    this.turtle = {
      x: 0, y: 0,
      angle: -90, // 初始朝上（-90度，0度朝右）
      penDown: true,  // 画笔是否落下
      visible: false,  // 海龟是否可见
      paths: []  // 已绘制的路径段
    };

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
    // 海龟位置初始化为画布中心
    if (this.turtle.x === 0 && this.turtle.y === 0) {
      this.turtle.x = this.canvas.width / 2;
      this.turtle.y = this.canvas.height / 2;
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
   * 在当前光标位置创建SVG图形
   */
  createSVGAtCursor(svgData, scale) {
    const shape = ShapeFactory.createShape('svg', {
      svgData, x: this.cursorX, y: this.cursorY, scale: scale || 1
    }, this.currentStyle);
    // 异步渲染 SVG 到缓存
    this._renderSVGToCache(shape);
    return shape;
  }

  /**
   * 异步渲染 SVG 到缓存
   */
  async _renderSVGToCache(shape) {
    const { svgData, scale } = shape.params;
    const s = scale || 1;

    return new Promise((resolve) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgData, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (!svgElement) {
        console.warn('SVG 解析失败');
        resolve();
        return;
      }

      if (!svgElement.getAttribute('xmlns')) {
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        this.svgCache.set(shape.id, { img, scale: s });
        URL.revokeObjectURL(url);
        this.redraw();
        resolve();
      };
      img.onerror = () => {
        console.warn('SVG 图片加载失败');
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });
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
      if (shape.type === 'svg') {
        // SVG 图形使用缓存渲染
        const cached = this.svgCache.get(shape.id);
        if (cached) {
          const { img, scale } = cached;
          const drawSize = 100 * scale;
          ctx.save();
          ctx.globalAlpha = shape.style.opacity || 1;
          ctx.drawImage(img, shape.params.x - drawSize / 2, shape.params.y - drawSize / 2, drawSize, drawSize);
          ctx.restore();
        }
      } else {
        ShapeFactory.draw(ctx, shape);
      }
      // 如果图形包含海龟路径数据，也绘制它们
      if (shape.turtlePaths && shape.turtlePaths.length > 0) {
        for (const path of shape.turtlePaths) {
          if (path.type === 'segment') {
            ctx.save();
            ctx.strokeStyle = path.style.strokeColor;
            ctx.lineWidth = path.style.lineWidth;
            ctx.setLineDash(path.style.lineDash || []);
            ctx.globalAlpha = path.style.opacity;
            ctx.beginPath();
            ctx.moveTo(path.x1, path.y1);
            ctx.lineTo(path.x2, path.y2);
            ctx.stroke();
            ctx.restore();
          } else if (path.type === 'arc') {
            ctx.save();
            ctx.strokeStyle = path.style.strokeColor;
            ctx.lineWidth = path.style.lineWidth;
            ctx.setLineDash(path.style.lineDash || []);
            ctx.globalAlpha = path.style.opacity;
            ctx.beginPath();
            ctx.arc(path.cx, path.cy, path.radius, path.startAngle, path.endAngle);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // 绘制海龟路径
    for (const path of this.turtle.paths) {
      if (path.type === 'segment') {
        ctx.save();
        ctx.strokeStyle = path.style.strokeColor;
        ctx.lineWidth = path.style.lineWidth;
        ctx.lineDash = path.style.lineDash || [];
        ctx.globalAlpha = path.style.opacity;
        ctx.beginPath();
        ctx.moveTo(path.x1, path.y1);
        ctx.lineTo(path.x2, path.y2);
        ctx.stroke();
        ctx.restore();
      } else if (path.type === 'arc') {
        ctx.save();
        ctx.strokeStyle = path.style.strokeColor;
        ctx.lineWidth = path.style.lineWidth;
        ctx.lineDash = path.style.lineDash || [];
        ctx.globalAlpha = path.style.opacity;
        ctx.beginPath();
        ctx.arc(path.cx, path.cy, path.radius, path.startAngle, path.endAngle);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 绘制海龟指示器
    if (this.turtle.visible) {
      this._drawTurtleIndicator(ctx);
    }
  }

  /**
   * 绘制海龟指示器（绿色三角形箭头）
   */
  _drawTurtleIndicator(ctx) {
    const t = this.turtle;
    const size = 15;
    const rad = t.angle * Math.PI / 180;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(rad);

    // 绘制三角形箭头，指向右方（0度方向）
    ctx.fillStyle = '#00CC00';
    ctx.strokeStyle = '#006600';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size, 0);           // 尖端
    ctx.lineTo(-size * 0.6, -size * 0.5);  // 左后
    ctx.lineTo(-size * 0.3, 0);    // 凹口
    ctx.lineTo(-size * 0.6, size * 0.5);   // 右后
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ===== 海龟画图方法 =====

  /**
   * 启动海龟模式
   */
  startTurtle() {
    this.turtle.visible = true;
    this.turtle.x = this.cursorX;
    this.turtle.y = this.cursorY;
    this.turtle.angle = -90; // 初始朝上
    this.turtle.penDown = true;
    this.turtle.paths = [];
    this.redraw();
  }

  /**
   * 停止海龟模式
   */
  stopTurtle() {
    this.turtle.visible = false;
    this.redraw();
  }

  /**
   * 海龟前进
   */
  turtleForward(distance) {
    const t = this.turtle;
    const rad = t.angle * Math.PI / 180;
    const oldX = t.x;
    const oldY = t.y;
    t.x = oldX + distance * Math.cos(rad);
    t.y = oldY + distance * Math.sin(rad);

    if (t.penDown) {
      t.paths.push({
        type: 'segment',
        x1: oldX, y1: oldY,
        x2: t.x, y2: t.y,
        style: { ...this.currentStyle }
      });
    }
    this.redraw();
  }

  /**
   * 海龟后退
   */
  turtleBackward(distance) {
    const t = this.turtle;
    const rad = t.angle * Math.PI / 180;
    const oldX = t.x;
    const oldY = t.y;
    t.x = oldX - distance * Math.cos(rad);
    t.y = oldY - distance * Math.sin(rad);

    if (t.penDown) {
      t.paths.push({
        type: 'segment',
        x1: oldX, y1: oldY,
        x2: t.x, y2: t.y,
        style: { ...this.currentStyle }
      });
    }
    this.redraw();
  }

  /**
   * 海龟左转
   */
  turtleTurnLeft(degrees) {
    this.turtle.angle -= degrees;
    this.redraw();
  }

  /**
   * 海龟右转
   */
  turtleTurnRight(degrees) {
    this.turtle.angle += degrees;
    this.redraw();
  }

  /**
   * 抬笔
   */
  turtlePenUp() {
    this.turtle.penDown = false;
  }

  /**
   * 落笔
   */
  turtlePenDown() {
    this.turtle.penDown = true;
  }

  /**
   * 海龟移动到指定位置
   */
  turtleGoto(x, y) {
    const t = this.turtle;
    const oldX = t.x;
    const oldY = t.y;
    t.x = x;
    t.y = y;

    if (t.penDown) {
      t.paths.push({
        type: 'segment',
        x1: oldX, y1: oldY,
        x2: t.x, y2: t.y,
        style: { ...this.currentStyle }
      });
    }
    this.redraw();
  }

  /**
   * 海龟画弧线
   */
  turtleArc(radius, angle) {
    const t = this.turtle;
    const rad = t.angle * Math.PI / 180;

    // 弧线圆心在海龟左侧（垂直于当前方向）
    const cx = t.x + radius * Math.cos(rad - Math.PI / 2);
    const cy = t.y + radius * Math.sin(rad - Math.PI / 2);

    // 计算起始角度（从圆心到海龟位置的角度）
    const startAngle = Math.atan2(t.y - cy, t.x - cx);
    const endAngle = startAngle + angle * Math.PI / 180;

    if (t.penDown) {
      t.paths.push({
        type: 'arc',
        cx, cy, radius,
        startAngle, endAngle,
        style: { ...this.currentStyle }
      });
    }

    // 更新海龟位置到弧线终点
    t.x = cx + radius * Math.cos(endAngle);
    t.y = cy + radius * Math.sin(endAngle);
    // 更新海龟朝向
    t.angle += angle;

    this.redraw();
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
