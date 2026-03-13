import debugModule, {Debugger} from 'debug'

const debug: Debugger = debugModule('heroku-kafka-jsplugin')
export default debug
