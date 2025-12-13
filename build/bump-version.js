const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 解析版本号
const versionParts = packageJson.version.split('.');
const patch = parseInt(versionParts[2]) + 1;
const newVersion = `${versionParts[0]}.${versionParts[1]}.${patch}`;

// 更新版本号
packageJson.version = newVersion;

// 写回文件
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`版本号已更新: ${versionParts.join('.')} -> ${newVersion}`);
