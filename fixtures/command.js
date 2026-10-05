'use strict'

const mode = process.argv[2]

if (mode === 'success') {
  console.log('fixture stdout')
} else if (mode === 'failure') {
  console.error('fixture stderr')
  process.exitCode = Number(process.argv[3])
} else if (mode === 'delayed-failure') {
  setTimeout(() => {
    console.error('delayed fixture stderr')
    process.exitCode = 7
  }, 10)
} else if (mode === 'args') {
  console.log(JSON.stringify(process.argv.slice(3)))
}
