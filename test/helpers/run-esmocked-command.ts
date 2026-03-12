import ansis from 'ansis'
import {getConfig} from './testInstances.js'

interface CommandContext {
  app: string
  args: Record<string, any>
  flags: Record<string, any>
}

/**
 * Run an esmocked command that was loaded using the old command pattern.
 * This converts the old context format to proper argv array and invokes the command.
 */
export async function runEsmockedCommand(
  cmd: any,
  context: CommandContext,
  options: {print?: boolean; stripAnsi?: boolean} = {}
): Promise<{error?: Error; result?: any; stderr: string; stdout: string}> {
  const {print = false, stripAnsi: shouldStripAnsi = true} = options

  const originals = {
    stderr: process.stderr.write,
    stdout: process.stdout.write,
  }

  const output = {
    stderr: [] as Array<Uint8Array | string>,
    stdout: [] as Array<Uint8Array | string>,
  }

  const toString = (str: Uint8Array | string) =>
    shouldStripAnsi ? ansis.strip(str.toString()) : str.toString()

  const getStdout = () => output.stdout.map(b => toString(b)).join('')
  const getStderr = () => output.stderr.map(b => toString(b)).join('')

  const mock = (std: 'stderr' | 'stdout') =>
    (str: Uint8Array | string, encoding?: ((err?: Error | null) => void) | BufferEncoding, cb?: (err?: Error | null) => void) => {
      output[std].push(str)
      if (print) {
        originals[std].call(process[std], str, encoding as BufferEncoding, cb)
      }

      if (typeof encoding === 'function') {
        encoding()
      } else if (cb) {
        cb()
      }

      return true
    }

  process.stdout.write = mock('stdout') as typeof process.stdout.write
  process.stderr.write = mock('stderr') as typeof process.stderr.write

  try {
    // Build argv array from context
    const argv: string[] = []

    // Add positional args
    if (context.args) {
      for (const [key, value] of Object.entries(context.args)) {
        if (value !== undefined) {
          argv.push(value)
        }
      }
    }

    // Add flags
    if (context.flags) {
      for (const [key, value] of Object.entries(context.flags)) {
        if (value !== undefined && value !== false) {
          if (value === true) {
            argv.push(`--${key}`)
          } else {
            argv.push(`--${key}`, value)
          }
        }
      }
    }

    // Add app flag if present in context
    if (context.app) {
      argv.push('--app', context.app)
    }

    const config = await getConfig()
    const instance = new cmd(argv, config)
    const result = await instance.run()

    process.stdout.write = originals.stdout
    process.stderr.write = originals.stderr

    return {
      result,
      stderr: getStderr(),
      stdout: getStdout(),
    }
  } catch (error) {
    process.stdout.write = originals.stdout
    process.stderr.write = originals.stderr

    return {
      error: error as Error,
      result: undefined,
      stderr: getStderr(),
      stdout: getStdout(),
    }
  }
}
