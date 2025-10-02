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
exports.getConnection = getConnection;
exports.executeQuery = executeQuery;
exports.executeStatement = executeStatement;
exports.generateId = generateId;
exports.closeConnection = closeConnection;
const snowflake = __importStar(require("snowflake-sdk"));
// Snowflake connection configuration
const connectionOptions = {
    account: process.env.SNOWFLAKE_ACCOUNT || '',
    username: process.env.SNOWFLAKE_USERNAME || '',
    password: process.env.SNOWFLAKE_PASSWORD || '',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    database: process.env.SNOWFLAKE_DATABASE || 'SURVEYONLINE',
    schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
    role: process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN'
};
let connection = null;
async function getConnection() {
    if (connection) {
        return connection;
    }
    return new Promise((resolve, reject) => {
        connection = snowflake.createConnection(connectionOptions);
        connection.connect((err, conn) => {
            if (err) {
                console.error('Unable to connect to Snowflake:', err.message);
                reject(err);
            }
            else {
                console.log('Successfully connected to Snowflake');
                resolve(conn);
            }
        });
    });
}
async function executeQuery(sqlText, binds = []) {
    const conn = await getConnection();
    return new Promise((resolve, reject) => {
        conn.execute({
            sqlText,
            binds,
            complete: (err, stmt, rows) => {
                if (err) {
                    console.error('Failed to execute statement:', err.message);
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            }
        });
    });
}
async function executeStatement(sqlText, binds = []) {
    const conn = await getConnection();
    return new Promise((resolve, reject) => {
        conn.execute({
            sqlText,
            binds,
            complete: (err) => {
                if (err) {
                    console.error('Failed to execute statement:', err.message);
                    reject(err);
                }
                else {
                    resolve();
                }
            }
        });
    });
}
function generateId() {
    return 'sf_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
async function closeConnection() {
    if (connection) {
        return new Promise((resolve) => {
            connection.destroy((err) => {
                if (err) {
                    console.error('Error closing connection:', err.message);
                }
                else {
                    console.log('Snowflake connection closed');
                }
                connection = null;
                resolve();
            });
        });
    }
}
