"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = __importDefault(require("child_process"));
var events_1 = __importDefault(require("events"));
// missing TS definitions
var pull = require('pull-stream');
var toPull = require('stream-to-pull-stream');
var pndj = require('pull-ndjson');
var Notify = require('pull-notify');
var _a = require('../util'), whereis = _a.whereis, helperName = _a.helperName;
var SysTray = /** @class */ (function (_super) {
    __extends(SysTray, _super);
    function SysTray(conf) {
        var _this = _super.call(this) || this;
        _this.debugPull = function (from) {
            if (typeof process.env["DEBUG"] === 'undefined') {
                return pull.through();
            }
            return pull.through(function (data) {
                if (data instanceof Buffer) {
                    console.warn(from, ":", data.toString());
                }
                else {
                    console.warn(from, ":", data);
                }
            });
        };
        _this._conf = conf;
        _this._notifyHelper = Notify();
        _this._helperPath = whereis(helperName);
        if (_this._helperPath === '') {
            throw new Error("could not locate helper binary: " + helperName);
        }
        _this._helper = child_process_1.default.spawn(_this._helperPath, [], {
            windowsHide: true
        });
        // from helper
        pull(toPull.source(_this._helper.stdout), _this.debugPull("hstdout"), pndj.parse(), pull.drain(function (v) {
            if (v.type === 'ready') {
                _this.emit('ready', v);
            }
            if (v.type === 'clicked') {
                _this.emit('click', v);
            }
        }));
        // to helper
        pull(_this._notifyHelper.listen(), pndj.serialize(), _this.debugPull('hstdin'), toPull.sink(_this._helper.stdin));
        // was onError
        _this._helper.on('error', function (e) {
            _this.emit('error', e);
        });
        // was onExit
        _this._helper.on('exit', function (code, signal) {
            _this.emit('exit', { code: code, signal: signal });
        });
        // was sendAction
        _this.on('action', function (action) {
            _this._notifyHelper(action);
        });
        // initialize menu
        _this._notifyHelper(conf.menu);
        return _this;
    }
    /**
     * Kill the systray process
     * @param exitNode Exit current node process after systray process is killed, default is true
     */
    SysTray.prototype.kill = function (exitNode) {
        if (exitNode === void 0) { exitNode = true; }
        this._notifyHelper.end();
        this._helper.kill();
        if (exitNode) {
            this.on('exit', function () { return process.exit(0); });
        }
    };
    return SysTray;
}(events_1.default));
exports.default = SysTray;
//# sourceMappingURL=index.js.map