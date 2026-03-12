import {expect} from 'chai'

function exit (code: number, gen: Promise<any>): Promise<void> {
  let actual: number | undefined
  return gen.catch(function (err: any) {
    // ux.error() throws an Error with exit code property
    expect(err).to.be.an.instanceof(Error)
    actual = err.oclif?.exit || code
  }).then(function () {
    expect(actual).to.be.an('number', 'Expected ux.error() to be called')
    expect(actual).to.equal(code)
  })
}

export default exit
