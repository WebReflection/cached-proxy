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

The `drop` and `reset` utilities are also exposed via the module where `drop(ref, property)` will invalidate both `ownKeys` and the cache per specific *property* while `reset(ref)` will invalidate the whole cache per specific *reference*.

**Please note**: the *reference* is not the *proxied* one, it's the original one you must own, otherwise nothing will happen/work as expected, example:

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

### Timeout Use Cases

> "*... and what is the timeout about?*"

If the proxy deals with a remote reference that is 100% controlled by the proxy, the *timeout* is actually not necessary at all but some special care is needed if the proxied reference can change any of its public values internally when a method is invoked.

On the other hand, the *timeout* helps keeping cached results just temporarily with the following advances:

  * less RAM needed overall, occasionally things will get cached again which is better than keeping everything cached overtime
  * the remote reference might change overtime so that synchronous code would ask for new results once but it will free itself from those results (cached assumptions) next time it runs
    * this is great with listeners that triger not too frequently
    * this is also great for references that are not meant to change that much within a small amount of time (in milliseconds)
  * the remote reference has a known cadence of changes (i.e. a scheduled operation that triggers every 30 seconds) and within those 30 seconds it's pointless to ask for the exact same result again
  * the remote reference uses an expensive computation that doesn't need to be *real time* but could be retrieved occasionally, so that a *click* that asks for updates, if repeatedly clicked, would give for at least 1 second the same result, but eventually will return a new result and provide the same result for another second
  * the same proxy is used in unknown users' defined code so it's unpredictable how many operations will happen, yet it's OK per each *event loop* to provide just the same data, unless operations try to change the nature of the object (see `reset` on `setPrototypeOf` as example)

These are just a few use cases that I have encountered but it feels to me that a timeout, in general, is a good thing to have, which is why that's embedded as extra *Proxy Handler* field (and same goes for `Cached` suffix, to escape in some case caching entirely).


### Special Cases + `Cached` suffix

  * **arrays** have a `get` trap that *resets* the *cache* if the retrieved property is neither `length` nor an `index` (an unsigned integer, 0 to max array length). This makes usage of a *timeout* almost irrevelant because methods that mutate the array should *drop* properties as needed.
  * **dom nodes** should likely use no cache due their highly mutable nature, however it is possible to use a handler that checks the returned value by specifying a `getCached(target, property, value)` that if returns `true` will cache the entry, otherwise it won't cache anything and, if the `value` is a function able to mutate the instance, it should likely `reset(target)` *reference* to avoid any undesired cache.

The `Cached` suffix can be used for each of these traps:

  * `getCached`, to skip caching undesired results or reset the cache in case the value is a function with side effects (i.e. methods that mutate internally the proxied reference)
  * `getOwnPropertyDescriptorCached`, to skip caching a descriptor or reset the cache in case it is an accessor with side effects (i.e. `textContent` or others)
  * `has`, to skip caching a specific `key in proxy` check
