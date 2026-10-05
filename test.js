/* eslint-env jest */
'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')
const spawnSync = require('child_process').spawnSync
const cliPath = path.join(__dirname, 'cli.js')
const fixturePath = path.join(__dirname, 'fixtures', 'command.js')
const cliSource = fs.readFileSync(cliPath, 'utf8')
const librarySource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

function runCli (args) {
  return spawnSync(process.execPath, [cliPath].concat(args), {encoding: 'utf8'})
}

function commandArgs (args) {
  return ['"' + process.execPath + '"', '"' + fixturePath + '"'].concat(args)
}

function expectSuccess (result, command) {
  expect(result.error).toBeUndefined()
  expect(result.signal).toBeNull()
  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  expect(result.stdout).toContain('\n⌨ Command: ' + command + '\n⌛ Time: ')
}

function expectFailure (result, status, diagnostic) {
  expect(result.error).toBeUndefined()
  expect(result.signal).toBeNull()
  expect(result.status).toBe(status)
  expect(result.stdout).toBe('')
  expect(result.stderr).toContain(diagnostic)
  expect(result.stderr).not.toContain('⌛ Time:')
}

test('successful commands retain stdout, command and timing', () => {
  const args = commandArgs(['success'])
  const result = runCli(args)
  expectSuccess(result, args.join(' '))
  expect(result.stdout).toMatch(/^fixture stdout\n/)
})

test('successful commands with empty stdout retain timing', () => {
  const args = commandArgs(['empty'])
  const result = runCli(args)
  expectSuccess(result, args.join(' '))
  expect(result.stdout).toMatch(/^\n\n⌨ Command:/)
})

;[1, 7, 127, 255].forEach((status) => {
  test('CLI preserves child exit status ' + status, () => {
    expectFailure(runCli(commandArgs(['failure', String(status)])), status, 'fixture stderr')
  })
})

test('CLI observes asynchronous command failure', () => {
  expectFailure(runCli(commandArgs(['delayed-failure'])), 7, 'delayed fixture stderr')
})

test('CLI uses failure status 1 for a real shell spawn failure', () => {
  expect(fs.existsSync(path.join(__dirname, 'fixtures', 'missing-shell'))).toBe(false)
  const result = spawnSync(process.execPath, [path.join(__dirname, 'fixtures', 'spawn-failure.js')].concat(commandArgs(['success'])), {encoding: 'utf8'})
  expectFailure(result, 1, 'ENOENT')
})

test('CLI retains shell quoting and argument joining', () => {
  const args = commandArgs(['args', '"two words"', 'plain'])
  const result = runCli(args)
  expectSuccess(result, args.join(' '))
  expect(result.stdout).toMatch(/^\["two words","plain"\]\n/)
})

test('CLI retains its no-command behavior', () => {
  const result = runCli([])
  expectSuccess(result, 'echo No command provided')
  expect(result.stdout).toMatch(/^No command provided\n/)
})

test('library failures retain logging, undefined return and caller exit status', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'fixtures', 'library.js')], {encoding: 'utf8'})
  expect(result.error).toBeUndefined()
  expect(result.signal).toBeNull()
  expect(result.status).toBe(0)
  expect(result.stdout).toContain('library return: undefined')
  expect(result.stdout).toContain('fixture stderr')
  expect(result.stderr).toBe('')
  expect(result.stdout).not.toContain('⌛ Time:')
})

function cliWithFailure (code) {
  const error = new Error('controlled failure')
  error.code = code
  const fakeProcess = {argv: ['node', 'cli.js', 'fixture command']}
  const messages = []
  let rejection
  vm.runInNewContext(cliSource.replace(/^#!.*\n/, ''), {
    process: fakeProcess,
    console: {error: (message) => messages.push(message)},
    require: () => (command, onError) => {
      expect(command).toBe('fixture command')
      rejection = Promise.reject(error).catch(onError)
    }
  })
  return rejection.then(() => ({process: fakeProcess, messages}))
}

;['ENOENT', undefined, null, '7', 0, -1, 1.5, NaN, Infinity, 256].forEach((code) => {
  test('CLI uses failure status 1 for error code ' + String(code), () => {
    return cliWithFailure(code).then((result) => {
      expect(result.process.exitCode).toBe(1)
      expect(result.messages).toEqual(['controlled failure'])
    })
  })
})

function libraryWithFailure (onError) {
  const error = new Error('controlled library failure')
  error.code = 'ENOENT'
  const fakeProcess = {hrtime: () => [0, 0], exitCode: 23}
  const messages = []
  const context = {
    module: {exports: {}},
    process: fakeProcess,
    console: {log: (message) => messages.push(message)},
    require: (name) => name === 'execa'
      ? {shell: () => Promise.reject(error)}
      : () => '0 s'
  }
  vm.runInNewContext(librarySource, context)
  const result = context.module.exports('fixture command', onError)
  return new Promise((resolve) => {
    setImmediate(() => resolve({error, result, process: fakeProcess, messages}))
  })
}

test('default library error handling does not mutate an existing exit status', () => {
  return libraryWithFailure().then((result) => {
    expect(result.result).toBeUndefined()
    expect(result.process.exitCode).toBe(23)
    expect(result.messages).toEqual(['controlled library failure'])
  })
})

;[null, true, 7, 'unused', {}].forEach((onError) => {
  test('library ignores a non-function second argument: ' + String(onError), () => {
    return libraryWithFailure(onError).then((result) => {
      expect(result.result).toBeUndefined()
      expect(result.process.exitCode).toBe(23)
      expect(result.messages).toEqual(['controlled library failure'])
    })
  })
})

test('optional library error handler receives the original error once', () => {
  const received = []
  return libraryWithFailure((error) => received.push(error)).then((result) => {
    expect(result.result).toBeUndefined()
    expect(result.process.exitCode).toBe(23)
    expect(result.messages).toEqual([])
    expect(received).toEqual([result.error])
  })
})
