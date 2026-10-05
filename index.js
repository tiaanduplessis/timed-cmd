'use strict'

const prettyHrtime = require('pretty-hrtime')
const execa = require('execa')

module.exports = function (cmd, onError) {
  const start = process.hrtime()
  execa.shell(cmd)
    .then((result) => {
      console.log(result.stdout)
      const end = process.hrtime(start)
      console.log(`\n⌨ Command: ${cmd}\n⌛ Time: ${prettyHrtime(end, {precise: true})}`)
    })
    .catch(typeof onError === 'function' ? onError : (error) => console.log(error.message))
}
