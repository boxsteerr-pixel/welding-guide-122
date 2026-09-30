# welding-guide-122

122激光焊机操作工快速处置手册的独立 PWA 项目。当前只包含空白内容框架，未复制101的任何具体故障内容或线上资源。

## 目录职责

- `data/manual.json`：设备信息、版本与全部手册内容的主要维护入口。
- `assets/images/`：本设备独立图片目录；建议保留能辨认设备细节的清晰度，不设500KB硬上限。
- `css/style.css`、`js/app.js`：通用模板表现与交互，复制到其他设备时通常无需修改。
- `manifest.json`、`service-worker.js`：本设备独立 PWA 配置和缓存边界。

## 内容结构

`faults`、`maintenance`、`safety` 均为项目数组。项目可使用以下字段：

```json
{
  "id": "unique-item-id",
  "title": "经审核的项目标题",
  "risk": "high",
  "keywords": ["关键词"],
  "summary": "简短说明",
  "checks": ["检查项"],
  "stopConditions": ["必须停机并上报的条件"],
  "steps": [
    {
      "title": "步骤标题",
      "text": "经审核的操作说明",
      "image": "./assets/images/example.jpg",
      "alt": "图片中的设备部位说明"
    }
  ]
}
```

正式内容必须经设备、安全与现场责任人审核。大图查看支持按钮缩放、双指缩放、拖动与浏览器返回关闭。

## 本地检查

必须通过 HTTP 服务打开，不能直接双击 `index.html`，否则浏览器会限制 JSON 读取和 Service Worker。

```powershell
node tests/validate.mjs
```

复制为后续设备模板时，至少修改：`data/manual.json` 的 `machine`、`manifest.json`、Service Worker 的 `CACHE_NAME/CACHE_PREFIX`、图标和 README。
