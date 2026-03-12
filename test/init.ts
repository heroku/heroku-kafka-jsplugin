/* eslint no-multi-spaces: off */

import nock from 'nock'

nock.disableNetConnect()                       // Disable HTTP connections

process.env.TZ = 'UTC'                         // Use UTC time always
process.stdout.columns = 80                    // Set screen width for consistent wrapping
process.stderr.columns = 80                    // Set screen width for consistent wrapping
