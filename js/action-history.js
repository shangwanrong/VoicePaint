// 操作历史管理模块

class ActionHistory {
  constructor(maxSize = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
  }

  /**
   * 记录一个操作
   * @param {object} action - 操作对象 { type, shapeId, shape, prevStyle }
   */
  push(action) {
    this.undoStack.push(action);
    this.redoStack = []; // 新操作清空重做栈
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * 撤销：取出最近一个操作
   */
  undo() {
    if (this.undoStack.length === 0) return null;
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    return action;
  }

  /**
   * 重做：恢复最近撤销的操作
   */
  redo() {
    if (this.redoStack.length === 0) return null;
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    return action;
  }

  /**
   * 是否可以撤销
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * 清空所有历史
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
