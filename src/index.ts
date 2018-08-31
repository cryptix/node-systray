import * as child from 'child_process'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs-extra'
import * as EventEmitter from 'events'
import * as readline from 'readline'
import Debug from 'debug'


const { whereis } = require("../util");

const pkg = require('../package.json')
const debug = Debug(pkg.name)

export type MenuItem = {
  title: string,
  tooltip: string,
  checked: boolean,
  enabled: boolean,
}

export type Menu = {
  icon: string,
  title: string,
  tooltip: string,
  items: MenuItem[],
}

export type ClickEvent = {
  type: 'clicked',
  item: MenuItem,
  seq_id: number,
}

export type ReadyEvent = {
  type: 'ready',
}

export type Event = ClickEvent | ReadyEvent

export type UpdateItemAction = {
  type: 'update-item',
  item: MenuItem,
  seq_id: number,
}

export type UpdateMenuAction = {
  type: 'update-menu',
  menu: Menu,
  seq_id: number,
}

export type UpdateMenuAndItemAction = {
  type: 'update-menu-and-item',
  menu: Menu,
  item: MenuItem,
  seq_id: number,
}

export type Action = UpdateItemAction | UpdateMenuAction | UpdateMenuAndItemAction

export type Conf = {
  menu: Menu,
}

const helperName = "systrayhelper"

const CHECK_STR = ' (√)'
function updateCheckedInLinux(item: MenuItem) {
  if (process.platform !== 'linux') {
    return item
  }
  if (item.checked) {
    item.title += CHECK_STR
  } else {
    item.title = (item.title || '').replace(RegExp(CHECK_STR + '$'), '')
  }
  return item
}

export default class SysTray extends EventEmitter {
  protected _conf: Conf
  protected _helper: child.ChildProcess
  protected _helperPath: string
  protected _rl: readline.ReadLine

  constructor(conf: Conf) {
    super()
    this._conf = conf
    this._helperPath = whereis(helperName)
    if (this._helperPath === "") {
      console.error("could not locate helper binary:", helperName)
      process.exit(1)
    }
    this._helper = child.spawn(this._helperPath, [], {
      windowsHide: true
    })
    this._rl = readline.createInterface({
      input: this._helper.stdout,
    })
    conf.menu.items = conf.menu.items.map(updateCheckedInLinux)
    this._rl.on('line', data => debug('onLine', data))
    this.onReady(() => this.writeLine(JSON.stringify(conf.menu)))
  }

  onReady(listener: () => void) {
    this._rl.on('line', (line: string) => {
      let action: Event = JSON.parse(line)
      if (action.type === 'ready') {
        listener()
        debug('onReady', action)
      }
    })
    return this
  }

  onClick(listener: (action: ClickEvent) => void) {
    this._rl.on('line', (line: string) => {
      let action: ClickEvent = JSON.parse(line)
      if (action.type === 'clicked') {
        debug('onClick', action)
        listener(action)
      }
    })
    return this
  }

  writeLine(line: string) {
    if (line) {
      debug('writeLine', line + '\n', '=====')
      this._helper.stdin.write(line.trim() + '\n')
    }
    return this
  }

  sendAction(action: Action) {
    switch (action.type) {
      case 'update-item':
        action.item = updateCheckedInLinux(action.item)
        break
      case 'update-menu':
        action.menu.items = action.menu.items.map(updateCheckedInLinux)
        break
      case 'update-menu-and-item':
        action.menu.items = action.menu.items.map(updateCheckedInLinux)
        action.item = updateCheckedInLinux(action.item)
        break
    }
    debug('sendAction', action)
    this.writeLine(JSON.stringify(action))
    return this
  }
  /**
   * Kill the systray process
   * @param exitNode Exit current node process after systray process is killed, default is true
   */
  kill(exitNode = true) {
    if (exitNode) {
      this.onExit(() => process.exit(0))
    }
    this._rl.close()
    this._helper.kill()
  }

  onExit(listener: (code: number | null, signal: string | null) => void) {
    this._helper.on('exit', listener)
  }

  onError(listener: (err: Error) => void) {
    this._helper.on('error', err => {
      debug('onError', err, 'helperPath', this.helperPath)
      listener(err)
    })
  }

  get killed() {
    return this._helper.killed
  }

  get helperPath() {
    return this._helperPath
  }
}
