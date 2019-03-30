interface nodemonConfig {
  restartable?: string,
  ignore?: string[],
  verbose?: boolean,
  execMap?: { [x: string]: string },
  events?: { [event: string]: string },
  watch?: string[],
  env?: { [x: string]: string },
  ext?: string
}

interface nodemonSecond {
  restart(): this;
  on(event: string, handler: Function): this;
  addListener(event: string, handler: Function): this;
  once(event: string, handler: Function): this;
  emit(): this;
  removeAllListeners(event: string): this;
  reset(done: Function): void;

  config: nodemonConfig
}

type nodemonDefault = (settings: nodemonConfig | string) => nodemonSecond;

declare module 'nodemon' {
  export var nodemon: (settings: nodemonConfig | string) => nodemonSecond;
  /*export default class nodemonDef extends nodemon {
    constructor
  }*/
}
