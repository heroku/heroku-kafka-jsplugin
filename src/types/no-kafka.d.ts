declare module '@heroku/no-kafka' {
  export class SimpleConsumer {
    constructor(options: any)
    init(): Promise<void>
    subscribe(topic: string, callback: any): void
    end(): void
  }

  export class Producer {
    constructor(options: any)
    init(): Promise<void>
    send(payload: any): Promise<void>
    end(): void
  }

  export function createSimpleConsumer(options: any): Promise<SimpleConsumer>
  export function createProducer(options: any): Promise<Producer>

  export const COMPRESSION_GZIP: number
  export const COMPRESSION_NONE: number
  export const COMPRESSION_SNAPPY: number
  export const EARLIEST_OFFSET: number
  export const LATEST_OFFSET: number

  const kafka: {
    SimpleConsumer: typeof SimpleConsumer
    Producer: typeof Producer
    COMPRESSION_GZIP: number
    COMPRESSION_NONE: number
    COMPRESSION_SNAPPY: number
    EARLIEST_OFFSET: number
    LATEST_OFFSET: number
  }
  export default kafka
}
