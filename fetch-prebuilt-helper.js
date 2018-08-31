'use strict'
// inspired by https://github.com/Hackzzila/node-ffmpeg-binaries
const admZip = require('adm-zip')
const request = require('superagent')
const tarFs = require('tar-fs')
const gunzip = require('gunzip-maybe')
const { execSync } = require('child_process')

const os = require('os')
const fs = require('fs')
const { join } = require('path')

const { whereis, helperLocation } = require('./util')

function errorAndExit (err) {
  console.error(err)
  console.warn('\n######\nHello, sorry you had to see this...')
  console.warn(`\nFailed to fetch pre-built systrayhelper.
  Most likely the combination of OS and Architecture isn't currently supported.
  
  To still get this working you will have to do some console-magic...
  
  1) Install Go - See https://golang.org/doc/install
  1.5) On linux: you need two libraries, listed here: https://github.com/getlantern/systray#platform-specific-concerns
  2) run this command: go get github.com/ssbc/systrayhelper
  3) sudo mv $HOME/go/bin/systrayhelper /usr/local/bin (or any other folder, as long as it's in your $PATH)
  
  TODO: evaluate falling back to https://github.com/chemdrew/npm-golang`)
  process.exit(1)
}

const found = whereis('systrayhelper')
if (found !== '') {
  console.warn('systrayhelper already installed.')
  testExecutable(found)
  process.exit(0)
}

const tmpDownload = join(os.tmpdir(), 'node-systray-downloadHelper')
const tmpUnpack = join(os.tmpdir(), 'node-systray-unpack')

console.warn('systrayhelper not installed!')
console.log('trying to fetching prebuilt for:', process.platform)
console.log('donload location:', tmpDownload)

try {
  const urls = {
    'win32': {
      'x84': 'https://github.com/ssbc/systrayhelper/releases/download/v0.0.2/systrayhelper_0.0.2_windows_amd64.zip',
      'ia32': 'https://github.com/ssbc/systrayhelper/releases/download/v0.0.2/systrayhelper_0.0.2_windows_386.zip'
    },
    'linux': {
      'x64': 'https://github.com/ssbc/systrayhelper/releases/download/v0.0.2/systrayhelper_0.0.2_linux_amd64.tar.gz'
    },
    'darwin': {
      'x64': 'https://github.com/ssbc/systrayhelper/releases/download/v0.0.2/systrayhelper_0.0.2_darwin_amd64.tar.gz'
    }
  }
  const hasOS = urls[process.platform]
  if (!hasOS) {
    throw new Error('unsupported platform:' + process.platform)
  }
  const fileUrl = hasOS[process.arch]
  if (!fileUrl) {
    throw new Error('unsupported architecture:' + process.arch)
  }

  // TODO: find out how to pipe through this:
  // const ProgressBar = require('progress')
  // var bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
  //   complete: '=',
  //   incomplete: ' ',
  //   width: 20,
  //   total: total
  // })

  // unpackaPhase
  if (process.platform === 'win32') {
    request
      .get(fileUrl)
      .on('error', errorAndExit)
      .pipe(fs.createWriteStream(tmpDownload))
      .on('finish', () => {
        console.log('finished dowloading')
        const zip = new admZip(tmpDownload)
        console.log('start unzip')
        zip.extractAllTo(tmpUnpack, true)
        console.log('finished unzip')
        p = join(tmpUnpack, 'systrayhelper.exe')
        testExecutable(p)
        cleanup(p)
      })
  } else {
    request
      .get(fileUrl)
      .on('error', errorAndExit)
      .pipe(gunzip())
      .pipe(tarFs.extract(tmpUnpack))
      .on('finish', () => {
        console.log('finished untar')
        const p = join(tmpUnpack, 'systrayhelper')
        testExecutable(p)
        cleanup(p)
      })
  }
} catch (e) {
  errorAndExit(e)
}

function testExecutable (path) {
  console.log('testing execution')
  try {
    execSync(path + ' --test')
    // if (exitCode !== 0) {
    //   errorAndExit(new Error('unexpected exit from helper. exitCode:' + exitCode))
    // }
  } catch (e) {
    errorAndExit(e)
  }
  console.log('helper started succesful!')
}

function cleanup (path) {
  fs.renameSync(path, helperLocation)
  fs.chmodSync(helperLocation, 'u+x')
  fs.unlinkSync(tmpDownload)
  fs.unlinkSync(tmpUnpack)
  console.log('cleanup down. the helper is here:', helperLocation)
}
