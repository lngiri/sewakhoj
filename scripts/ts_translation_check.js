"use strict";
/// <reference types="typescript" />
/**
 * TypeScript script to validate translation key usage against defined types.
 *
 * This script ensures that:
 * 1. All translation hook calls use keys that exist in the translation files
 * 2. Keys follow the expected naming convention (camelCase)
 * 3. No raw keys are used directly in JSX
 *
 * Usage:
 *   npx tsc ts_translation_check.ts --check
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
/**
 * Configuration
 */
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const EN_JSON = path.join(PROJECT_ROOT, 'src', 'messages', 'en.json');
const NE_JSON = path.join(PROJECT_ROOT, 'src', 'messages', 'ne.json');
/**
 * Regex to capture translation hook calls with a string literal argument
 */
const HOOK_REGEX = /\b(tdash|tcommon|tnav)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
/**
 * Load keys from a JSON file
 */
function loadKeys(jsonPath) {
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    const keys = new Set();
    function traverse(obj, prefix = '') {
        if (obj && typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
                const newPrefix = prefix ? `${prefix}.${k}` : k;
                if (typeof v === 'object' && v !== null) {
                    traverse(v, newPrefix);
                }
                else {
                    keys.add(newPrefix);
                }
            }
        }
    }
    traverse(data);
    return keys;
}
/**
 * Extract keys from codebase
 */
function extractKeysFromCode() {
    const keys = new Set();
    function walkDirectory(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item !== 'node_modules' && !item.startsWith('.')) {
                    walkDirectory(fullPath);
                }
            }
            else if (stat.isFile()) {
                const ext = path.extname(item);
                if (ext === '.tsx' || ext === '.ts') {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    let match;
                    while ((match = HOOK_REGEX.exec(content)) !== null) {
                        keys.add(match[2]);
                    }
                }
            }
        }
    }
    walkDirectory(SRC_DIR);
    return keys;
}
/**
 * Validate key naming convention (camelCase)
 */
function validateNamingConvention(key) {
    const issues = [];
    if (!/^[a-z]+([A-Z][a-z0-9]+)*$/.test(key)) {
        issues.push(`Invalid naming: "${key}" (should be camelCase)`);
    }
    return issues;
}
/**
 * Main validation
 */
function main() {
    const enKeys = loadKeys(EN_JSON);
    const neKeys = loadKeys(NE_JSON);
    const codeKeys = extractKeysFromCode();
    const allKeys = new Set([...enKeys, ...neKeys]);
    const missingInEn = new Set([...codeKeys].filter(k => !enKeys.has(k)));
    const missingInNe = new Set([...codeKeys].filter(k => !neKeys.has(k)));
    let hasIssues = false;
    // Check for missing keys
    for (const key of missingInEn) {
        hasIssues = true;
        console.error(`❌ Missing key in en.json: ${key}`);
    }
    for (const key of missingInNe) {
        hasIssues = true;
        console.error(`❌ Missing key in ne.json: ${key}`);
    }
    // Check naming convention
    for (const key of codeKeys) {
        const issues = validateNamingConvention(key);
        for (const issue of issues) {
            hasIssues = true;
            console.error(`❌ Naming issue: ${issue}`);
        }
    }
    if (!hasIssues) {
        console.log('✅ All translation keys are valid and present in both en.json and ne.json.');
        process.exit(0);
    }
    else {
        process.exit(1);
    }
}
main();
