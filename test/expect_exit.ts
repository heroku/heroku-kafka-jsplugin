import {expect} from 'chai'
import cli from '@heroku/heroku-cli-util'

function exit (code: number, gen: Promise<any>): Promise<void> {
  let actual: number | undefined
  return gen.catch(function (err: any) {
    expect(err).to.be.an.instanceof(cli.exit.ErrorExit)
    actual = err.code
  }).then(function () {
    expect(actual).to.be.an('number', 'Expected error.exit(i) to be called with a number')
    expect(actual).to.equal(code)
  })
}

export default exit
