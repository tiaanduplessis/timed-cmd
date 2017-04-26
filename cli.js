#!/usr/bin/env node
'use strict'

const cmd = process.argv.slice(2).join(' ')
const timed = require('./')

timed(cmd || 'echo No command provided')
