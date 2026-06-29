import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const SOURCE_DIR = path.join(__dirname, 'src');
const MAIN_LOCALE_FILE = 'zh-CN.json';
const EXTENSIONS_TO_CHECK = ['.tsx', '.ts', '.jsx', '.js'];

function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(flattenKeys(obj[key], `${prefix}${key}.`));
        } else {
            keys.push(`${prefix}${key}`);
        }
    }
    return keys;
}

function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) {
        return arrayOfFiles || [];
    }
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '__tests__' && file !== 'mocks') {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            if (EXTENSIONS_TO_CHECK.includes(path.extname(fullPath))) {
                arrayOfFiles.push(fullPath);
            }
        }
    });
    return arrayOfFiles;
}

function checkI18n() {
    console.log('🔍 开始检查前端 i18n key 匹配情况...\n');

    const localePath = path.join(LOCALES_DIR, MAIN_LOCALE_FILE);
    if (!fs.existsSync(localePath)) {
        console.error(`❌ 找不到语言包文件: ${localePath}，请检查路径配置。`);
        return;
    }
    
    let localeData;
    try {
        localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    } catch (e) {
        console.error(`❌ 语言包 JSON 格式解析失败: ${e.message}`);
        return;
    }
    
    const validKeys = new Set(flattenKeys(localeData));
    console.log(`✅ 成功加载主语言包 ${MAIN_LOCALE_FILE}，共解析出 ${validKeys.size} 个有效 key。\n`);

    const sourceFiles = getAllFiles(SOURCE_DIR);
    console.log(`📁 扫描到 ${sourceFiles.length} 个源码文件\n`);
    
    let missingKeysFound = false;
    const allMissingKeys = new Map();

    const tFunctionRegex = /(?:\$t|i18n\.t|[^a-zA-Z0-9_]t)\s*\(\s*(['"`])(.*?)\1/g;

    sourceFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        const fileMissingKeys = new Set();

        while ((match = tFunctionRegex.exec(content)) !== null) {
            const i18nKey = match[2];
            
            if (i18nKey.includes('${') || i18nKey.includes('{')) continue;

            if (!validKeys.has(i18nKey)) {
                fileMissingKeys.add(i18nKey);
                missingKeysFound = true;
            }
        }

        if (fileMissingKeys.size > 0) {
            const relativePath = path.relative(__dirname, file);
            allMissingKeys.set(relativePath, fileMissingKeys);
        }
    });

    if (!missingKeysFound) {
        console.log('🎉 恭喜！未发现缺失的 i18n key，所有静态调用的结构和路径均已正确对应。');
    } else {
        console.log('❌ 发现以下文件存在缺失/未匹配的 i18n key:\n');
        allMissingKeys.forEach((keys, file) => {
            console.log(`📄 文件: ${file}`);
            keys.forEach(key => {
                console.log(`   ❌ 缺失/未匹配的 Key: "${key}"`);
            });
            console.log('--------------------------------------------------');
        });
        console.log(`\n⚠️ 扫描完毕。共发现 ${allMissingKeys.size} 个文件存在问题，请根据上述列表去语言包中补充或修正对应的 key。`);
    }
}

checkI18n();
