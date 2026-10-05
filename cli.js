#!/usr/bin/env node
'use strict'

const cmd = process.argv.slice(2).join(' ')
const timed = require('./')

timed(cmd || 'echo No command provided', (error) => {
  console.error(error.message)
  process.exitCode = Number.isInteger(error.code) && error.code > 0 && error.code <= 255
    ? error.code
    : 1
})
