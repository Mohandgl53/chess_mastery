/**
 * stockfish.worker.js
 * 
 * Classic Web Worker bridge for Stockfish 19 Lite Single WASM.
 * Runs inside a dedicated browser Web Worker thread so engine computation
 * never blocks React / UI rendering.
 */

// CommonJS shim so stockfish-19-lite-single.js exports its factory function
var module = { exports: {} };
var exports = module.exports;

importScripts('/stockfish-19-lite-single.js');

var commandQueue = [];
var engineInstance = null;

var sfConfig = {
  locateFile: function (path) {
    if (path.indexOf('.wasm') > -1) {
      return '/stockfish-19-lite-single.wasm';
    }
    return path;
  },
  listener: function (line) {
    if (typeof line === 'string') {
      self.postMessage(line);
    }
  },
};

function sendCommand(cmd) {
  if (!cmd || !engineInstance) return;
  try {
    engineInstance.ccall('command', null, ['string'], [cmd], { async: /^go\b/.test(cmd) });
  } catch (err) {
    console.error('[StockfishWorker] Error executing command:', cmd, err);
  }
}

// Temporary message handler to queue commands during engine init
self.onmessage = function (e) {
  if (typeof e.data === 'string') {
    commandQueue.push(e.data);
  }
};

// stockfish-19-lite-single.js exports `t`, calling `t()` returns the Emscripten factory `e`
var factory = module.exports;
var initFn = typeof factory === 'function' ? factory() : null;

if (typeof initFn === 'function') {
  initFn(sfConfig)
    .then(function (engine) {
      engineInstance = engine;
      console.info('[StockfishWorker] Stockfish 19 Lite WASM loaded and ready in worker.');

      // Active message handler for incoming UCI commands from main thread
      self.onmessage = function (e) {
        var cmd = e.data;
        if (typeof cmd !== 'string') return;
        if (cmd === 'quit') {
          try {
            if (engine.terminate) engine.terminate();
          } catch (ignore) {}
          self.close();
          return;
        }
        sendCommand(cmd);
      };

      // Flush any queued commands
      while (commandQueue.length > 0) {
        sendCommand(commandQueue.shift());
      }
    })
    .catch(function (err) {
      console.error('[StockfishWorker] Failed to initialize Stockfish WASM:', err);
    });
} else {
  console.error('[StockfishWorker] Stockfish module factory could not be obtained.');
}
