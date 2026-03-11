import cli from '@heroku/heroku-cli-util'

export default function (current: number, total: number, width: number = 10): string {
  let percentage = current / total
  if (percentage > 1) percentage = 1
  if (percentage < 0) percentage = 0
  const filled = Math.floor(percentage * width)
  const empty = width - filled
  let output = cli.color.blue('█'.repeat(filled))
  output += '·'.repeat(empty)
  return `[${output}]`
}
