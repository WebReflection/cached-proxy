//@ts-check

const {
  apply,
  construct,
  defineProperty,
  deleteProperty,
  preventExtensions,
  set,
  setPrototypeOf,
} = Reflect;

const descriptors = new WeakMap;
const extensibles = new WeakMap;
const prototypes = new WeakMap;
const values = new WeakMap;
const keys = new WeakMap;
const had = new WeakMap;

const drop = (ref, property) => {
  descriptors.get(ref)?.delete(property);
  values.get(ref)?.delete(property);
  had.get(ref)?.delete(property);
  keys.delete(ref);
};

const checkTarget = (wm, method, reflect = Reflect[method]) =>
  (handler, target) => {
    const value = method in handler ?
      handler[method](target) :
      reflect(target);

    wm.set(target, value);
    return value;
  }
;

const own = checkTarget(keys, 'ownKeys');
const extensible = checkTarget(extensibles, 'isExtensible');
const prototype = checkTarget(prototypes, 'getPrototypeOf');

const checkProperty = (wm, method, reflect = Reflect[method]) =>
  (handler, target, property, ...rest) => {
    const timeout = handler.timeout ?? -1;
    const value = method in handler ?
      handler[method](target, property, ...rest) :
      reflect(target, property, ...rest);

    let properties = wm.get(target);
    if (!properties) wm.set(target, properties = new Map);
    properties.set(property, value);
    if (-1 < timeout) setTimeout(drop, timeout, target, property);
    return value;
  }
;

const cacheProperty = (wm, callback) =>
  (handler, target, property, ...rest) => {
    const map = wm.get(target);
    return map?.has(property) ?
      map.get(property) :
      callback(handler, target, property, ...rest);
  }
;

const descriptor = cacheProperty(
  descriptors,
  checkProperty(descriptors, 'getOwnPropertyDescriptor'),
);

const value = cacheProperty(
  values,
  checkProperty(values, 'get'),
);

const got = cacheProperty(
  had,
  checkProperty(had, 'has'),
);

class Cached {
  #handler;

  constructor(handler) {
    this.#handler = handler;
  }

  apply(target, thisArg, argumentsList) {
    return 'apply' in this.#handler ?
      this.#handler.apply(target, thisArg, argumentsList) :
      apply(target, thisArg, argumentsList);
  }

  construct(target, argumentsList, newTarget) {
    return 'construct' in this.#handler ?
      this.#handler.construct(target, argumentsList, newTarget) :
      construct(target, argumentsList, newTarget);
  }

  defineProperty(target, property, descriptor) {
    drop(target, property);
    return 'defineProperty' in this.#handler ?
      this.#handler.defineProperty(target, property, descriptor) :
      defineProperty(target, property, descriptor);
  }

  deleteProperty(target, property) {
    drop(target, property);
    return 'deleteProperty' in this.#handler ?
      this.#handler.deleteProperty(target, property) :
      deleteProperty(target, property);
  }

  get(target, property, receiver) {
    return value(this.#handler, target, property, receiver);
  }

  getOwnPropertyDescriptor(target, property) {
    return descriptor(this.#handler, target, property);
  }

  getPrototypeOf(target) {
    return prototypes.get(target) ?? prototype(this.#handler, target);
  }

  has(target, property) {
    return got(this.#handler, target, property);
  }

  isExtensible(target) {
    return extensibles.get(target) ?? extensible(this.#handler, target);
  }

  ownKeys(target) {
    return keys.get(target) ?? own(this.#handler, target);
  }

  preventExtensions(target) {
    return 'preventExtensions' in this.#handler ?
      this.#handler.preventExtensions(target) :
      preventExtensions(target);
  }

  set(target, property, value, receiver) {
    drop(target, property);
    return 'set' in this.#handler ?
      this.#handler.set(target, property, value, receiver) :
      set(target, property, value, receiver);
  }

  setPrototypeOf(target, prototype) {
    reset(target);
    return 'setPrototypeOf' in this.#handler ?
      this.#handler.setPrototypeOf(target, prototype) :
      setPrototypeOf(target, prototype);
  }
}

const { Proxy: NativeProxy } = globalThis;

const Proxy = (ref, handler = {}) => new NativeProxy(ref, new Cached(handler));

const reset = ref => {
  descriptors.delete(ref);
  prototypes.delete(ref);
  extensibles.delete(ref);
  values.delete(ref);
  keys.delete(ref);
  had.delete(ref);
  return ref;
};

export { drop, reset };
export default Proxy;
