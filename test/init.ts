import chai from 'chai'
import nock from 'nock'

nock.disableNetConnect()                       // Disable HTTP connections

process.env.TZ = 'UTC'                         // Use UTC time always
process.stdout.columns = 80                    // Set screen width for consistent wrapping
process.stderr.columns = 80                    // Set screen width for consistent wrapping

chai.config.truncateThreshold = 0              // Disable truncation in assertion messages
