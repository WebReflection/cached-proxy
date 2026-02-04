# cached-proxy

[![build status](https://github.com/WebReflection/cached-proxy/actions/workflows/node.js.yml/badge.svg)](https://github.com/WebReflection/cached-proxy/actions) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/cached-proxy/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/cached-proxy?branch=main)

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
