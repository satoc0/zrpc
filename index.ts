// import http from "http";
// import findMyWay, { Handler, RouteOptions, HTTPVersion, HTTPMethod, Req, Res } from "find-my-way";
// const handlers = Symbol('ControllerHandlers');
// const services = Symbol('ControllerServices');

// const router = findMyWay();


// class ParamInjector {
//   private static paramInjectorMap: Map<any, Map<string, string[]>> = new Map();

//   //todo add more validator maps
//   static registerParamInjectorMap(obj: string, target: any, methodName: string, paramIndex: number): void {
//     let paramTargetMap: Map<string, string[]> | undefined = this.paramInjectorMap.get(target);
//     if (!paramTargetMap) {
//       paramTargetMap = new Map();
//       this.paramInjectorMap.set(target, paramTargetMap);
//     }
//     let paramIndexes: string[] | undefined = paramTargetMap.get(methodName);
//     if (!paramIndexes) {
//       paramIndexes = [];
//       paramTargetMap.set(methodName, paramIndexes);
//     }

//     paramIndexes.unshift(obj);
//   }

//   static getArgsForMethod(target: any, methodName: string) {
//     let paramTargetMap: Map<string, { [key in number]: string }> | undefined = this.paramInjectorMap.get(target);
//     return paramTargetMap?.get(methodName) || {};
//   }

// }

// type HandlerConfig = { url: string, handler: string, method: HTTPMethod };

// const Controller = (url: string) => (target: any): any => {
//   const methods: HandlerConfig[] = target[handlers]

//   return class extends target {
//     constructor(router: findMyWay.Instance<findMyWay.HTTPVersion.V1>, ...args: any[]) {
//       super(...args);

//       for (const method of methods) {
//         router.on(method.method, url + method.url, (...args: any[]) => this[method.handler].apply(this, args));
//       }
//     }
//   }

// };

// const Get = (url: `${string}` = '/') => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

//   console.log("__", { target })

//   const originalMethod = descriptor.value;

//   descriptor.value = function (req: any, res: any, param: any) {
//     const argsOrder = ParamInjector.getArgsForMethod(target, propertyKey) as string[]

//     const argss: Record<string, any> = { req, res, param };

//     let result = originalMethod.apply(this, argsOrder.map(arg => argss[arg]));
//     return result;
//   }
//   const handlerConfig: HandlerConfig = { url, handler: propertyKey, method: 'GET' };

//   if (target[handlers]) {
//     target.constructor[handlers].push(handlerConfig)
//   } else {
//     target.constructor[handlers] = [handlerConfig];
//   }

// }

// class Foo { }

// function test(target: any, propertyKey: string, parameterIndex: number) {
//   console.log("@@@", { target, propertyKey, parameterIndex })
// }

// function Req() {
//   return (target: any, propertyKey: string, parameterIndex: number) => ParamInjector.registerParamInjectorMap('req', target, propertyKey, parameterIndex);
// }

// function Res() {
//   return (target: any, propertyKey: string, parameterIndex: number) => ParamInjector.registerParamInjectorMap('res', target, propertyKey, parameterIndex);
// }

// function Param() {
//   return (target: any, propertyKey: string, parameterIndex: number) => ParamInjector.registerParamInjectorMap('param', target, propertyKey, parameterIndex);
// }

// @Controller('/')
// class MyController {

//   constructor(private wtf: Foo) {
//     console.log({ wtf });
//   }

//   @Get(':teste')
//   async handle(@Res() res: Res<HTTPVersion.V1>, @Param() params: Record<string, string>) {
//     res.statusCode = 200;
//     this.log();
//     res.end(JSON.stringify({ params }))
//   }

//   private log() {
//     return console.log("something");
//   }

// }


// const server = http.createServer((req, res) => {
//   router.lookup(req, res)
// })

// const a = new MyController(router, "_WTF");


// server.listen(3000, () => {

//   console.log('Server listening on: http://localhost:3000');
//   console.log(router.prettyPrint())
// })

