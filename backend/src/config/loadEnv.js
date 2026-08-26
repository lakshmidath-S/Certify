/**
 * Deterministic .env loading.
 *
 * Bare `dotenv.config()` resolves `.env` against the process working directory,
 * so `npm start` from backend/ and `node backend/src/server.js` from the repo
 * root would look in different places. Everything that needs environment
 * variables goes through this module instead.
 *
 * Resolution order (first file that exists wins):
 *   1. backend/.env      — per-service config
 *   2. <repo root>/.env  — shared config for backend + Hardhat
 *
 * If neither exists we still call dotenv.config() so that host-injected
 * variables (Render, Docker, CI) work untouched — those never need a file.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const BACKEND_ENV = path.resolve(__dirname, '../../.env');
const ROOT_ENV = path.resolve(__dirname, '../../../.env');

const candidates = [BACKEND_ENV, ROOT_ENV];
const resolved = candidates.find(candidate => fs.existsSync(candidate)) || null;

dotenv.config(resolved ? { path: resolved } : undefined);

module.exports = {
    envPath: resolved,
    candidates
};
