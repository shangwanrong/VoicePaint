// 图形工厂模块 - 各图形类型的绘制逻辑

class ShapeFactory {
  /**
   * 在Canvas上下文中绘制指定图形
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} shape - 图形对象
   */
  static draw(ctx, shape) {
    ctx.save();
    ctx.globalAlpha = shape.style.opacity || 1;
    ctx.strokeStyle = shape.style.strokeColor || '#000000';
    ctx.fillStyle = shape.style.fillColor || '#000000';
    ctx.lineWidth = shape.style.lineWidth || 2;
    ctx.setLineDash(shape.style.lineDash || []);

    switch (shape.type) {
      case 'line':
        ShapeFactory.drawLine(ctx, shape.params);
        break;
      case 'rect':
        ShapeFactory.drawRect(ctx, shape.params, shape.style.fill);
        break;
      case 'circle':
        ShapeFactory.drawCircle(ctx, shape.params, shape.style.fill);
        break;
      case 'triangle':
        ShapeFactory.drawTriangle(ctx, shape.params, shape.style.fill);
        break;
      case 'ellipse':
        ShapeFactory.drawEllipse(ctx, shape.params, shape.style.fill);
        break;
      case 'star':
        ShapeFactory.drawStar(ctx, shape.params, shape.style.fill);
        break;
      case 'arrow':
        ShapeFactory.drawArrow(ctx, shape.params, shape.style.fill);
        break;
      case 'text':
        ShapeFactory.drawText(ctx, shape.params, shape.style.fill);
        break;
      case 'svg':
        // SVG 渲染由 CanvasRenderer 异步处理，这里不执行同步绘制
        break;
      default:
        console.warn('未知图形类型:', shape.type);
    }

    ctx.restore();
  }

  static drawLine(ctx, params) {
    const { x1, y1, x2, y2 } = params;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  static drawRect(ctx, params, fill) {
    const { x, y, width, height } = params;
    if (fill) {
      ctx.fillRect(x - width / 2, y - height / 2, width, height);
    } else {
      ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    }
  }

  static drawCircle(ctx, params, fill) {
    const { x, y, radius } = params;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  static drawTriangle(ctx, params, fill) {
    const { x, y, size } = params;
    const h = size * Math.sqrt(3) / 2;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 2 / 3);
    ctx.lineTo(x - size / 2, y + h / 3);
    ctx.lineTo(x + size / 2, y + h / 3);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  static drawEllipse(ctx, params, fill) {
    const { x, y, radiusX, radiusY } = params;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  static drawStar(ctx, params, fill) {
    const { x, y, outerRadius, innerRadius, points } = params;
    const pts = points || 5;
    const inner = innerRadius || outerRadius * 0.4;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : inner;
      const angle = (Math.PI / pts) * i - Math.PI / 2;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  static drawArrow(ctx, params, fill) {
    const { x1, y1, x2, y2, headSize } = params;
    const hs = headSize || 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // 画线
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 画箭头
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - hs * Math.cos(angle - Math.PI / 6),
      y2 - hs * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - hs * Math.cos(angle + Math.PI / 6),
      y2 - hs * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  static drawText(ctx, params, fill) {
    const { x, y, text, fontSize } = params;
    const size = fontSize || 24;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (fill) {
      ctx.fillText(text, x, y);
    } else {
      ctx.strokeText(text, x, y);
    }
  }

  /**
   * 异步渲染SVG图形到Canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} shape - SVG图形对象
   * @returns {Promise<void>}
   */
  static async drawSVG(ctx, shape) {
    const { svgData, x, y, scale } = shape.params;
    const s = scale || 1;

    return new Promise((resolve, reject) => {
      // 使用 DOMParser 解析 SVG 字符串
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgData, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (!svgElement) {
        console.warn('SVG 解析失败，未找到 svg 元素');
        resolve();
        return;
      }

      // 确保 SVG 有 xmlns 属性
      if (!svgElement.getAttribute('xmlns')) {
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      // 序列化 SVG 并创建 Blob URL
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        // 计算绘制尺寸（viewBox 为 200x200，缩放到合适大小）
        const drawSize = 100 * s;
        ctx.save();
        ctx.globalAlpha = shape.style.opacity || 1;
        ctx.drawImage(img, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
        ctx.restore();
        URL.revokeObjectURL(url);
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
   * 创建图形对象的便捷方法
   */
  static createShape(type, params, style = {}) {
    return {
      id: generateId(),
      type,
      params,
      style: {
        strokeColor: style.strokeColor || '#000000',
        fillColor: style.fillColor || '#000000',
        lineWidth: style.lineWidth || 2,
        lineDash: style.lineDash || [],
        opacity: style.opacity || 1,
        fill: style.fill || false
      },
      timestamp: Date.now()
    };
  }
}
