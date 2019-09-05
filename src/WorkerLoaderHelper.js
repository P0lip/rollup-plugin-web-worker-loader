const kIsNodeJS = typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]' && process.versions && process.versions.node !== undefined;
const kRequire = kIsNodeJS && typeof module.require === 'function' ? module.require : null;

function getNativeNodeWorker() {
    try {
        return kRequire('worker_threads').Worker;
    } catch (ex) {
        // eslint-disable-next-line no-use-before-define
        return WorkerShim;
    }
}

export function createInlineWorkerFactory(fn, sourcemap = null) {
    const source = fn.toString();
    const start = source.indexOf('\n', 10) + 1;
    const end = source.indexOf('}', source.length - 1);
    const body = source.substring(start, end) + (sourcemap ? `//# sourceMappingURL=${sourcemap}` : '');
    const blankPrefixLength = body.search(/\S/);
    const lines = body.split('\n').map(line => line.substring(blankPrefixLength) + '\n');

    if (kRequire) {
        /* node.js */
        const Worker = getNativeNodeWorker();
        const concat = lines.join('\n');
        return function WorkerFactory(options) {
            return new Worker(concat, Object.assign({}, options, { eval: true }));
        };
    }

    /* browser */
    const blob = new Blob(lines, { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return function WorkerFactory(options) {
        return new Worker(url, options);
    };
}

export function createURLWorkerFactory(url) {
    if (kRequire) {
        /* node.js */
        const Worker = getNativeNodeWorker();
        return function WorkerFactory(options) {
            return new Worker(url, options);
        };
    }
    /* browser */
    return function WorkerFactory(options) {
        return new Worker(url, options);
    };
}

export function createBase64WorkerFactory(base64, sourcemap = null) {
    const source = kIsNodeJS ? Buffer.from(base64, 'base64').toString('ascii') : atob(base64);
    const start = source.indexOf('\n', 10) + 1;
    const body = source.substring(start) + (sourcemap ? `//# sourceMappingURL=${sourcemap}` : '');

    if (kRequire) {
        /* node.js */
        const Worker = getNativeNodeWorker();
        return function WorkerFactory(options) {
            return new Worker(body, Object.assign({}, options, { eval: true }));
        };
    }

    /* browser */
    const blob = new Blob([body], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return function WorkerFactory(options) {
        return new Worker(url, options);
    };
}

function WorkerShim() {
    this.isFake = true;
}
WorkerShim.prototype.onmessage = null;
WorkerShim.prototype.postMessage = function () {};
WorkerShim.prototype.addEventListener = function () {};
WorkerShim.prototype.terminate = function () {};
WorkerShim.prototype.removeEventListener = function () {};
