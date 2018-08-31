const { existsSync } = require('fs')
const { join } = require('path')
const { homedir } = require('os')

/* cloned from node-whereis@0.0.1
github repo was removed somehow so no way to give feedback/PRs
therefore copied it here */
const whereis = (filename) => {
    const pathSep = process.platform === 'win32' ? ';' : ':'
    const directories = process.env.PATH.split(pathSep)
    for (var i = 0; i < directories.length; i++) {
        var path = directories[i] + '/' + filename
        if (existsSync(path)) {
            return path
        }
    }
    if (existsSync(helperLocation)) {
        return helperLocation
    }
    return ""
}

exports.whereis = whereis;

// this is the fallback location where the prebuilt will be put
// TODO: does this work for windows?!
const helperLocation = join(homedir(), '.cache', 'systrayhelper')
exports.helperLocation = helperLocation