declare module 'xid-js' {
  class Xid {
    constructor();
    toString(): string;
  }
  
  // Support both CommonJS and ES6 exports
  export = Xid;
}
