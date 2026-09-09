"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgDb = exports.setTestDb = exports.getDbPath = void 0;
const pglite_1 = require("@electric-sql/pglite");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function getDbPath() {
    if (process.env.PG_DATA_DIR) {
        if (process.env.PG_DATA_DIR === 'memory://' || process.env.PG_DATA_DIR === ':memory:') {
            return process.env.PG_DATA_DIR;
        }
        return path.resolve(process.env.PG_DATA_DIR);
    }
    if (process.env.NODE_ENV === 'test') {
        return 'memory://';
    }
    let cur = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    for (let i = 0; i < 8; i++) {
        if (fs.existsSync(path.join(cur, 'start_all.bat')) || fs.existsSync(path.join(cur, 'ExamOS-Build-Directive.md'))) {
            const targetDir = path.join(cur, 'postgres-data');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            return targetDir;
        }
        const parent = path.dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    const fallback = path.resolve(process.cwd(), 'postgres-data');
    if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
}
exports.getDbPath = getDbPath;
let _pgDbInstance = null;
let _initPromise = null;
function setTestDb(db) {
    _pgDbInstance = db;
    _initPromise = db ? Promise.resolve(db) : null;
}
exports.setTestDb = setTestDb;
async function getOrInitReadyDb() {
    if (_pgDbInstance) {
        if (_pgDbInstance.waitReady) {
            await _pgDbInstance.waitReady;
        }
        return _pgDbInstance;
    }
    const dbPath = getDbPath();
    if (dbPath === 'memory://' || dbPath === ':memory:') {
        const memDb = new pglite_1.PGlite();
        await memDb.waitReady;
        _pgDbInstance = memDb;
        return memDb;
    }
    const pidFile = path.join(dbPath, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
        try {
            fs.unlinkSync(pidFile);
        }
        catch { }
    }
    try {
        const diskDb = new pglite_1.PGlite(dbPath);
        diskDb.waitReady.catch(() => {});
        await diskDb.waitReady;
        _pgDbInstance = diskDb;
        return diskDb;
    }
    catch (err) {
        const isAbort = String((err === null || err === void 0 ? void 0 : err.message) || err).includes('Aborted') || (err === null || err === void 0 ? void 0 : err.name) === 'RuntimeError';
        if (isAbort) {
            if (process.env.NODE_ENV === 'test' || process.env.PG_ALLOW_MEMORY_FALLBACK === 'true') {
                console.warn(`[ExamOS Database] Warning: Database directory at "${dbPath}" is locked by another running ExamOS process. Falling back to isolated in-memory database.`);
                const fallbackDb = new pglite_1.PGlite();
                await fallbackDb.waitReady;
                _pgDbInstance = fallbackDb;
                return fallbackDb;
            }
            throw new Error(`[ExamOS Database Lock Error] Could not open database directory "${dbPath}" because it is currently locked by another active ExamOS process (likely the API server on port 4043). Please stop existing processes using "stop_all.bat", or set PG_DATA_DIR=memory:// for an isolated instance.`);
        }
        throw err;
    }
}
// Primary in-process PostgreSQL 16 engine for all runtime services and routes
// Uses lazy Proxy so importing @repo/database in unit tests without queries does not lock postgres-data
exports.pgDb = new Proxy({}, {
    get(_target, prop) {
        if (prop === 'close') {
            return async () => {
                if (_pgDbInstance) {
                    try {
                        await _pgDbInstance.close();
                    }
                    catch { }
                    _pgDbInstance = null;
                    _initPromise = null;
                }
            };
        }
        if (prop === 'waitReady') {
            if (!_initPromise) {
                _initPromise = getOrInitReadyDb();
            }
            return _initPromise.then((db) => db.waitReady);
        }
        return async (...args) => {
            if (!_initPromise) {
                _initPromise = getOrInitReadyDb();
            }
            const db = await _initPromise;
            const val = db[prop];
            if (typeof val === 'function') {
                return val.apply(db, args);
            }
            return val;
        };
    },
});
