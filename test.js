import Proxy, { drop, reset } from './index.js';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const obj = {
  name: 'test',
  method() {
    return this.name;
  }
};

const list = Proxy([], Reflect);
const proxy = Proxy(obj, { timeout: 0 });
const fn = Proxy(function (...args) {
  return { self: this, args };
});

delete fn.name;

list.push(1, 2, 3);
Object.setPrototypeOf(list, Array.prototype);
assert(list.length === 3);
assert(list[0] === 1);
assert(list[1] === 2);
assert(list[2] === 3);
assert(Object.getPrototypeOf(list) === Array.prototype);
assert(Object.isExtensible(list));
Object.preventExtensions(list);

assert(fn(1, 2).args.length === 2);
assert(new fn(1, 2).self instanceof fn);
assert(fn.call(globalThis, 1, 2).self === globalThis);

assert('name' in proxy);
assert('name' in proxy);
assert(!('nope' in proxy));
assert(!('nope' in proxy));
assert(Object.hasOwn(proxy, 'name'));

assert(proxy.name === 'test');
assert(proxy.method() === proxy.name);
assert(Reflect.ownKeys(proxy).length === 2);

setTimeout(() => {
  assert(proxy.name === 'test');
  assert(proxy.nope === undefined);
  assert(proxy.nope === proxy.nope);

  delete proxy.name;
  assert(proxy.name === undefined);
  assert(proxy.name === proxy.nope);

  proxy.name = 'test';
  assert(proxy.name === 'test');
  assert(proxy.name === 'test');

  Object.setPrototypeOf(proxy, null);
  assert(Object.getPrototypeOf(proxy) === null);

  const fn = Proxy(function (...args) {
    return { self: this, args };
  }, Reflect);

  assert(fn(1, 2).args.length === 2);
  assert(new fn(1, 2).self instanceof fn);
  assert(fn.call(globalThis, 1, 2).self === globalThis);

  delete fn.name;

  const array = [];
  const list = Proxy(array, {
    getCached(target, property, value) {
      console.assert(array === target);
      console.assert(typeof property === 'string' || typeof property === 'symbol');
      return true;
    }
  });

  list.push(1, 2, 3);
  assert(list.length === 3);
  assert(list[0] === 1);
  assert(list[1] === 2);
  assert(list[2] === 3);
  list.splice(1);
  assert(list.length === 1);
  assert(list[0] === 1);

  Object.preventExtensions(list);
}, 1);
