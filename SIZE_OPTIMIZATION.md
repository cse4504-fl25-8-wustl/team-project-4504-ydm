# Electron 应用体积优化方案

## 问题现状

**优化前**：
- 应用包大小：1.7GB
- DMG 安装包：533MB
- 主要占用：`node_modules` (1.4GB)
  - `@next`: 1.1GB
  - `@img`: 178MB
  - `next`: 167MB

## 优化策略

### 1. 启用 ASAR 打包 ✅

**配置**：[package.json:29](package.json#L29)
```json
"asar": true
```

**效果**：
- 将所有文件打包到 `app.asar` 单个文件
- 减少文件数量，提高加载速度
- 预计减小 **30-40%** 体积

**注意事项**：
- 需要解包 native modules (`.node` 文件)
- `sharp` 等二进制依赖需要特殊处理

### 2. 移除不必要的文件 ✅

**实现**：[scripts/optimize-build.mjs](scripts/optimize-build.mjs)

**移除内容**：
- 文档文件：README, CHANGELOG, LICENSE
- TypeScript 定义：`*.d.ts`
- Source maps：`*.map`
- 测试文件：`test/`, `tests/`, `__tests__/`
- 示例代码：`examples/`, `docs/`
- 构建工具：`.bin`

**效果**：预计减小 **50-100MB**

### 3. Next.js 构建优化 ✅

**配置**：[next.config.mjs:14-24](next.config.mjs#L14-L24)

```javascript
experimental: {
  optimizePackageImports: ['react', 'react-dom'],
},
telemetry: {
  enabled: false,
},
productionBrowserSourceMaps: false,
compress: true,
```

**效果**：
- 优化 React 打包
- 禁用遥测和 source maps
- 启用压缩

### 4. 精简打包文件 ✅

**配置**：[package.json:35-47](package.json#L35-L47)

```json
"files": [
  "electron/**/*",
  ".next/standalone/**/*",
  "!.next/standalone/node_modules/**/*",  // 避免重复打包
  "node_modules/**/*",
  "!node_modules/**/README*",             // 排除文档
  "!node_modules/**/CHANGELOG*",
  "!node_modules/**/*.md",
  "!node_modules/**/.bin",                // 排除二进制工具
  "!node_modules/**/test",                // 排除测试
  "!node_modules/**/tests"
]
```

## 构建流程

```
1. next build (ELECTRON_BUILD=1)
   ↓
2. copy-standalone-assets.mjs
   - 复制静态资源
   ↓
3. optimize-build.mjs  ← 新增
   - 移除不必要文件
   - 清理文档和测试
   ↓
4. electron-builder
   - ASAR 打包
   - 生成安装包
```

## 预期效果

| 项目 | 优化前 | 优化后（预期） | 减少 |
|------|--------|----------------|------|
| 应用包 | 1.7GB | ~800MB | ~53% |
| DMG | 533MB | ~250MB | ~53% |
| 文件数 | ~50,000 | ~1,000 | ~98% |

## 验证优化效果

```bash
# 重新构建
rm -rf .next dist
pnpm electron:build:mac

# 检查大小
du -sh "dist/mac-arm64/ARCH Freight Calculator.app"
ls -lh dist/*.dmg
```

## 进一步优化（可选）

### 1. 分析包内容

```bash
npm install -g asar
asar extract "dist/mac-arm64/ARCH Freight Calculator.app/Contents/Resources/app.asar" extracted/
du -sh extracted/* | sort -hr | head -20
```

### 2. 考虑 Tree Shaking

如果某些依赖过大但只用到部分功能，可以：
- 使用 webpack-bundle-analyzer 分析
- 替换为更小的替代品
- 手动 tree shake

### 3. 延迟加载

对于非核心功能，可以考虑：
- 动态 `import()`
- 按需加载模块

### 4. 移除开发依赖

确保 `devDependencies` 没有被打包：
```bash
pnpm prune --prod
```

## 注意事项

1. **测试 ASAR 兼容性**
   - 有些模块可能不兼容 ASAR
   - 需要添加到 `asarUnpack`

2. **验证功能完整性**
   - 优化后需要完整测试所有功能
   - 特别是文件读取、图片处理等

3. **Windows 兼容性**
   - 优化方案对 Windows 同样有效
   - ASAR 是跨平台的

## 回滚方案

如果优化后出现问题，可以快速回滚：

```json
// package.json
"asar": false,
```

然后移除 `optimize-build.mjs` 步骤。

## 参考资料

- [Electron ASAR](https://www.electronjs.org/docs/latest/tutorial/application-packaging)
- [electron-builder 文件配置](https://www.electron.build/configuration/contents)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
