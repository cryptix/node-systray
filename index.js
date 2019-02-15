const { EventEmitter } = require('events')
const { spawn } = require('child_process')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const pndj = require('pull-ndjson')
const Notify = require('pull-notify')

const { whereis, helperName } = require('./util')


class SysTray extends EventEmitter {
  constructor(conf) {
    const debugPull = (from) => {
      if (typeof process.env["DEBUG"] === 'undefined') {
        return pull.through()
      }
      return pull.through((data) => {
        if (data instanceof Buffer) {
          console.warn(from, ":", data.toString())
        } else {
          console.warn(from, ":", data)
        }
      })
    }

    super()
    this._conf = conf
    this._notifyHelper = Notify()

    this._helperPath = whereis(helperName)
    if (this._helperPath === '') {
      console.error('could not locate helper binary:', helperName)
      process.exit(1)
    }

    this._helper = spawn(this._helperPath, [], {
      windowsHide: true
    })
    this._helper.stderr.pipe(process.stderr)

    // from helper
    pull(
      toPull.source(this._helper.stdout),
      debugPull("hstdout"),
      pndj.parse(),
      pull.drain((v) => {
        if (v.type === 'ready') {
          this.emit('ready', v)
        }
        if (v.type === 'clicked') {
          this.emit('click', v)
        }
      })
    )

    // to helper
    pull(
      this._notifyHelper.listen(),
      pndj.serialize(),
      debugPull('hstdin'),
      toPull.sink(this._helper.stdin)
    )

    // was onError
    this._helper.on('error', e => {
      this.emit('error', e)
    })

    // was onExit
    this._helper.on('exit', (code, signal) => {
      this.emit('exit', {code, signal})
    })

    // was sendAction
    this.on('action', this._notifyHelper)

    // initialize menu
    this._notifyHelper(conf.menu)
  }

  /**
   * Kill the systray process
   * @param exitNode Exit current node process after systray process is killed, default is true
   */
  kill(exitNode = true) {
    this._notifyHelper.end()
    this._helper.kill()
    if (exitNode) {
      this.on('exit', () => process.exit(0))
    }
  }
}

module.exports = SysTray
