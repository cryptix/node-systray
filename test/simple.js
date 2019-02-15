const assert = require('assert')
const SysTray = require('../index')

const menu = require('./menu.json')

describe('test', function () {
  this.timeout("10s")

  it('systray is ok', () => {
    const systray = new SysTray({ menu })
    systray.on('click', (action) => {
      if (action.seq_id === 0) {
        systray.emit('action', {
          type: 'update-item',
          item: {
            ...(action.item),
            checked: !action.item.checked,
          },
          seq_id: action.seq_id,
        })
      } else if (action.seq_id === 2) {
        systray.kill()
      }
      console.log('action', action)
    })
    systray.on('ready', () => {
      console.log('is ready')
      systray.on('exit', ({code, signal}) => {
        console.log('exited.', 'code:', code, 'signal:', signal)
        assert.equal(code, 0)
        assert.equal(signal, null)
      })
    })
  })
})
