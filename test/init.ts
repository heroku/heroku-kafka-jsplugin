/* eslint no-multi-spaces: off */

import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import {commands} from '../commands/index.js'

cli.raiseErrors = true                         // Fully raise exceptions
nock.disableNetConnect()                       // Disable HTTP connections
;(global as any).commands = commands          // Load plugin commands

process.env.TZ = 'UTC'                         // Use UTC time always
process.stdout.columns = 80                    // Set screen width for consistent wrapping
process.stderr.columns = 80                    // Set screen width for consistent wrapping
