'use strict'

const path = require('path')
const execa = require('execa')
const shell = execa.shell

// Exercise a real ENOENT spawn error without depending on the host's shell.
execa.shell = (command) => shell(command, {shell: path.join(__dirname, 'missing-shell')})

require('../cli')
