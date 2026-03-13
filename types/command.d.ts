export interface HerokuClient {
  request(params: any): Promise<any>
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
  [key: string]: any
}

export interface BaseContext {
  app: string
  [key: string]: any
}
