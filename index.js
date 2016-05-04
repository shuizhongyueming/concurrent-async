/**
 * 实现多个并发的async操作的单独callback和最终callback
 *
 * var co = new ConcurrentAsync();
 *
 * co.addAsync(function(next, handleError){
 *      ajax({
 *          url: 'xxx',
 *          type: 'GET',
 *          dataType: 'json',
 *          success: next
 *      });
 * }).addAsync(function(next, handleError){
 *      ajax({
 *          url: 'xxx',
 *          type: 'GET',
 *          dataType: 'json',
 *          success: function(data){
 *              console.log(JSON.stringify(data));
 *              next();
 *          },
 *          error: function(xhr, textStatus, errorThrown) {
 *              handleError(textStatus || errorThrown);
 *          }
 *      });
 * }).end(function(error){
 * }).run();
 */


(function (factory) {  
  if (typeof exports == 'object') {
    module.exports = factory();
  } else if ((typeof define == 'function') && define.amd) {
    define(factory);
  }
}(function () {
var Type = require('type-of-is');

function ConcurrentAsync(){
    var m = this;
    m.asyncList = [];
    m.asyncTotalNum = 0;
    m.asyncFinishedNum = 0;
    m.endCallback = [];
    m.isEnd = false;
    m.isRunning = false;
}

/**
 * 新增需要并发执行的异步函数
 * 可以在run之后继续添加
 * 如果并发已经结束, 则添加在本次无效, 等下次run的时候才能生效, 尽量是不要异步add
 * @param {Function} asyncFunc 要并发异步执行的函数
 * @return {Boolean} 是否能添加到此次并发 true 可以 false 不可以
 */
ConcurrentAsync.prototype.addAsync = function(asyncFunc) {
    var m = this;
    if (Type.string(asyncFunc) !== 'Function') {
        throw new Error('asyncFunc need to be a function');
    }

    m.asyncList.push(asyncFunc);
    m.asyncTotalNum++;

    if (m.isEnd) {
        return false;
    }

    if (m.isRunning) {
        asyncFunc(m._next.bind(m), m._handleError.bind(m));
    }

    return true
};

/**
 * 添加end的回调, 在所有并发异步执行完毕之后执行
 * 如果是在并发完成之后, 再调用此end, 则会立即执行.
 * @param {Function} cb 回调函数
 */
ConcurrentAsync.prototype.end = function(cb){
    var m = this;

    if (Type.string(cb) !== 'Function') {
        throw new Error('cb need to be a function');
    }

    m.endCallback.push(cb);

    // 如果已经结束, 则立即执行回调
    if (m.isEnd) {
        cb();
    }
};

/**
 * 开始并发执行, 在此之后进行addAsync, 只要没有结束, 就会立即执行
 */
ConcurrentAsync.prototype.run = function() {
    var m = this;
    m.isEnd = false; 
    m.isRunning = true;
    m.asyncFinishedNum = 0;

    // 不可以重复执行
    if (m.isRunning) {
        return;
    }

    m.asyncList.forEach(function(n, i){
        n(m._next.bind(m), m._handleError.bind(m));
    });
};

/**
 * 返回当前Concurrent的状态
 */
ConcurrentAsync.prototype.status = function(){
    var m = this;
    return {
        isEnd: m.isEnd,
        isRunning: m.isRunning
    };
};

ConcurrentAsync.prototype.destroy = function() {
    var m = this;

    m.asyncList = null;
    m.endCallback = null;
    m.isEnd = true; 
    m.isRunning = false;
};


/**
 * 负责接收错误消息并立即中断所有后续响应
 * @param {String} errorMsg 错误消息
 */
ConcurrentAsync.prototype._handleError = function(errorMsg) {
    var m = this;

    m._finish(errorMsg);
};

/**
 * 用于标识并发结束
 * 可以是所有并发都执行, 也可以是出了错误的时候
 * @param {String} errorMsg 错误消息  可选
 */
ConcurrentAsync.prototype._finish = function(errorMsg) {
    var m = this;
    m.isEnd = true; 
    m.isRunning = false;
    
    m.endCallback.forEach(function(n, i){
        n(errorMsg);
    });
};

/**
 * 交由第三方在异步结束之后调用
 * 用于标识此异步操作依据结束
 *
 * 同时会作判断, 如果所有的异步都结束了, 同时状态非结束状态, 则执行finish
 */
ConcurrentAsync.prototype._next = function(){
    var m = this;
    m.asyncFinishedNum++;
    
    if (m.isEnd) {
        return;
    }

    if (m.asyncFinishedNum >= m.asyncTotalNum) {
        m._finish();
    }
};

});
