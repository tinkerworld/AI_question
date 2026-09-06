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
exports.pgDb = void 0;
const pglite_1 = require("@electric-sql/pglite");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function getDbPath() {
    if (process.env.PG_DATA_DIR) {
        return path.resolve(process.env.PG_DATA_DIR);
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
const dbPath = getDbPath();
let _pgDbInstance = null;
function getOrInitDb() {
    if (!_pgDbInstance) {
        const pidFile = path.join(dbPath, 'postmaster.pid');
        if (fs.existsSync(pidFile)) {
            try {
                fs.unlinkSync(pidFile);
            }
            catch { }
        }
        _pgDbInstance = new pglite_1.PGlite(dbPath);
    }
    return _pgDbInstance;
}
// Primary in-process PostgreSQL 16 engine for all runtime services and routes
// Uses lazy Proxy so importing @repo/database in unit tests without queries does not lock postgres-data
exports.pgDb = new Proxy({}, {
    get(_target, prop) {
        if (prop === 'close') {
            return async () => {
                if (_pgDbInstance) {
                    await _pgDbInstance.close();
                    _pgDbInstance = null;
                }
            };
        }
        const db = getOrInitDb();
        const val = db[prop];
        if (typeof val === 'function') {
            return val.bind(db);
        }
        return val;
    },
});
