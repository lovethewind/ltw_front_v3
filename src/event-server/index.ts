/**
 * 发布订阅模块
 */

export class EventServer {
  static instance: EventServer

  private constructor() {
  }

  static getInstance() {
    if (!EventServer.instance) {
      EventServer.instance = new EventServer()
    }
    return EventServer.instance
  }

  private eventMap: Map<string, Function[]> = new Map()

  on(eventName: string, callback: Function) {
    const callbacks = this.eventMap.get(eventName)
    if (callbacks) {
      callbacks.push(callback)
    } else {
      this.eventMap.set(eventName, [callback])
    }
  }

  off(eventName: string, callback: Function) {
    const callbacks = this.eventMap.get(eventName)
    if (callbacks) {
      const index = callbacks.findIndex((item) => item === callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(eventName: string, ...args: any[]) {
    const callbacks = this.eventMap.get(eventName)
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args))
    }
  }

  clear() {
    this.eventMap.clear()
  }
}