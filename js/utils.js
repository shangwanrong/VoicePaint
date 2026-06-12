// 工具函数模块

/**
 * 生成唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 限制数值范围
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 将颜色名称映射到十六进制颜色值
 */
const COLOR_MAP = {
  '红': '#FF0000', '红色': '#FF0000',
  '蓝': '#0000FF', '蓝色': '#0000FF',
  '绿': '#00FF00', '绿色': '#00FF00',
  '黄': '#FFFF00', '黄色': '#FFFF00',
  '黑': '#000000', '黑色': '#000000',
  '白': '#FFFFFF', '白色': '#FFFFFF',
  '橙': '#FFA500', '橙色': '#FFA500',
  '紫': '#800080', '紫色': '#800080',
  '粉': '#FFC0CB', '粉色': '#FFC0CB',
  '灰': '#808080', '灰色': '#808080',
  '棕': '#8B4513', '棕色': '#8B4513',
  '青': '#00FFFF', '青色': '#00FFFF',
  '深红': '#8B0000', '深蓝': '#00008B', '深绿': '#006400',
  '浅红': '#FFB6C1', '浅蓝': '#ADD8E6', '浅绿': '#90EE90',
  '金色': '#FFD700', '银色': '#C0C0C0'
};

/**
 * 位置关键词映射
 */
const POSITION_MAP = {
  '中间': { x: 'center', y: 'center' },
  '中心': { x: 'center', y: 'center' },
  '左上': { x: 'left', y: 'top' },
  '右上': { x: 'right', y: 'top' },
  '左下': { x: 'left', y: 'bottom' },
  '右下': { x: 'right', y: 'bottom' },
  '左边': { x: 'left', y: 'center' },
  '右边': { x: 'right', y: 'center' },
  '上面': { x: 'center', y: 'top' },
  '下面': { x: 'center', y: 'bottom' },
  '顶部': { x: 'center', y: 'top' },
  '底部': { x: 'center', y: 'bottom' }
};

/**
 * 解析位置关键词为画布坐标
 */
function resolvePosition(posDesc, canvasWidth, canvasHeight, margin = 80) {
  const x = posDesc.x === 'center' ? canvasWidth / 2
    : posDesc.x === 'left' ? margin
    : posDesc.x === 'right' ? canvasWidth - margin
    : canvasWidth / 2;

  const y = posDesc.y === 'center' ? canvasHeight / 2
    : posDesc.y === 'top' ? margin
    : posDesc.y === 'bottom' ? canvasHeight - margin
    : canvasHeight / 2;

  return { x, y };
}

/**
 * 计算编辑距离（Levenshtein Distance）
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * 模糊匹配：在候选词列表中找到最接近的匹配
 */
function fuzzyMatch(input, candidates, maxDistance = 2) {
  let bestMatch = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const dist = levenshteinDistance(input, candidate);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }
  return bestDistance <= maxDistance ? bestMatch : null;
}
