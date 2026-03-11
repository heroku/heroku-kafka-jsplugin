declare module '@heroku/heroku-cli-util' {
  export interface Color {
    blue(text: string): string
    yellow(text: string): string
    green(text: string): string
    red(text: string): string
    cyan(text: string): string
    magenta(text: string): string
    gray(text: string): string
    addon(text: string): string
    cmd(text: string): string
  }

  export const color: Color

  export interface Action {
    start(message: string): void
    done(message?: string): void
  }

  export const action: Action & ((message: string, promise: Promise<any>) => Promise<any>)

  export function log(message?: string): void
  export function error(message: string): void
  export function warn(message: string): void
  export function exit(code: number, message?: string): never
  export function confirmApp(app: string, confirm?: string, message?: string): Promise<void>
  export function styledHeader(header: string): void
  export function table(data: any[], options?: any): void
  export function command(options: any, fn: Function): Function
}
