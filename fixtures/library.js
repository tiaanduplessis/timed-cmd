'use strict'

const path = require('path')
const timed = require('../')
const command = '"' + process.execPath + '" "' + path.join(__dirname, 'command.js') + '" failure 7'
const result = timed(command)

console.log('library return: ' + result)
