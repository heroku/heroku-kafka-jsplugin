// Wrapper around @heroku/no-kafka to make it easier to mock in tests
import kafka from '@heroku/no-kafka'

export class KafkaClient {
  async createProducer(options: any): Promise<any> {
    return new kafka.Producer(options)
  }

  async createSimpleConsumer(options: any): Promise<any> {
    return new kafka.SimpleConsumer(options)
  }
}

// Export a singleton instance
export const kafkaClient = new KafkaClient()

// Export convenience functions that use the singleton
export async function createProducer(options: any): Promise<any> {
  return kafkaClient.createProducer(options)
}

export async function createSimpleConsumer(options: any): Promise<any> {
  return kafkaClient.createSimpleConsumer(options)
}

export const {COMPRESSION_GZIP} = kafka
export const {COMPRESSION_NONE} = kafka
export const {COMPRESSION_SNAPPY} = kafka
export const {EARLIEST_OFFSET} = kafka
export const {LATEST_OFFSET} = kafka
