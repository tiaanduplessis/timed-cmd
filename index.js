'use strict'

const prettyHrtime = require('pretty-hrtime')
const execa = require('execa')

module.exports = function (cmd) {
  const start = process.hrtime()
  execa.shell(cmd)
    .then((result) => {
      console.log(result.stdout)
      const end = process.hrtime(start)
      console.log(`\n⌨ Command: ${cmd}\n⌛ Time: ${prettyHrtime(end, {precise: true})}`)
    })
    .catch((error) => console.log(error.message))
}
