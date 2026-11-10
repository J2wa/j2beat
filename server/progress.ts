import { AsyncLocalStorage } from 'node:async_hooks';
export const progressContext = new AsyncLocalStorage<(stage:string)=>void>();
export const reportProgress = (stage:string) => progressContext.getStore()?.(stage);
