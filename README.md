# cached-proxy

[![build status](https://github.com/WebReflection/cached-proxy/actions/workflows/node.js.yml/badge.svg)](https://github.com/WebReflection/cached-proxy/actions) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/cached-proxy/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/cached-proxy?branch=main)

<sup>**Social Media Photo by [Bozhin Karaivanov](https://unsplash.com/@bkaraivanov) on [Unsplash](https://unsplash.com/)**</sup>

A cached Proxy with optional timeouts per property to simplify complex remote scenarios.

```js
import CachedProxy from 'https://esm.run/cached-proxy';

const remote = new CachedProxy({ id: 123 }, {
  // optional: 0 means ASAP, otherwise cached for N milliseconds
  timeout: 0,

  // example: compute some remote value synchronously
  get(target, property) {
    const xhr = new XMLHttpRequest;
    xhr.open('GET', 'end/point', false);
    xhr.send(JSON.stringify({ trap: 'get', args: [target.id, property] }));
    return JSON.parse(xhr.responseText);
  }
});

// executes the XHR once, returns whatever value was cached
remote.test === remote.test;

setTimeout(() => {
  remote.test; // runs the XHR again
}, 10);
```

The example is there to explain that given enough amount of traps, it is possible via *Atomics* or synchronous / asynchronous behavior to retrieve once properties and values from elsewhere, similarly to how [reflected-ffi](https://github.com/WebReflection/reflected-ffi) memoized cache works but in an easier to orchestrate way.

### Traps

|                          | cached | timeout | drop | reset |
| :----------------------- | :----: | :-----: | :--: | :---: |
| apply                    |        |         |      |       |
| construct                |        |         |      |       |
| defineProperty           |        |         |  ☑️  |       |
| deleteProperty           |        |         |  ☑️  |       |
| get                      |   ☑️   |   ☑️   |      |       |
| getOwnPropertyDescriptor |   ☑️   |   ☑️   |      |       |
| getPrototypeOf           |   ☑️   |         |      |       |
| has                      |   ☑️   |   ☑️   |      |       |
| isExtensible             |   ☑️   |         |      |       |
| ownKeys *                |   ☑️   |   ✔️   |      |       |
| preventExtensions        |        |         |       |       |
| set                      |        |         |  ☑️  |       |
| setPrototypeOf           |        |         |       |  ☑️  |

#### Traps Explainer

  * **cached** means each trap result is weakly stored
  * **timeout** means that, if a `timeout` optional integer is passed as *proxy handler* field, `get`, `getOwnPropertyDescriptor` and `has` will be *dropped* after that amount of time (in milliseconds)
  * **drop** means that the eventually stored value for that property or accessor will be instantly removed from the *cache*, affecting also `ownKeys` but without affecting `isExtensible` and `getPrototypeOf`
  * **reset** means that all weakly related values will be erased per property or target reference, effectively invalidating the whole cache for any trap that has one

The `drop` and `reset` utilities are also exposed via the module where `drop(ref, property)` will invalidate the cache per specific property while `reset(ref)` will invalidate the whole cache per specific *reference*.

Please note: the *reference* is not the *proxied* one, it's the original one you must own, otherwise nothing will happen/work as expected, example:

```js
import Proxy, { drop, reset  } from 'https://esm.run/cached-proxy';

const ref = { my: 'reference' };
const proxied = Proxy(ref);

// when/if needed, this works:
drop(ref, 'property');
// ... or ...
reset(ref);

// while this will not work:
drop(proxied, 'property');
// ... or ...
reset(proxied);
```

This is to avoid leaking the cache intent of the proxy owner/creator.
