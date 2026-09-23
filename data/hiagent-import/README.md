# HiAgent 知识库导入包

本目录用于把本地 21 篇官方政策同步到 HiAgent「鼓楼区政务咨询库」。

## 文件说明

- `官方政策/`：21 篇独立 Markdown 文件，每篇包含标题、分类、发文机关、文号、发布日期、官方原文链接、政策要点、高频问题和检索关键词。
- 源数据：`data/policy_kb.json`（HiAgent 字段映射用）与 `data/knowledge-base.js`（本地演示用）。

## 导入步骤

1. 登录 HiAgent，进入「知识库」模块，打开「鼓楼区政务咨询库」。
2. 选择批量上传或新增文档，一次或分次导入 `官方政策/` 下的 Markdown 文件。
3. 若平台只接受单个文件，可把多篇 Markdown 合并为一个文件后再导入。
4. 启动向量化，确认文档数量为 21 篇、分块状态正常。
5. 在应用中重新关联或刷新知识库，再做一轮问答评测。

## 重新导出

修改 `data/policy_kb.json` 后运行：

```bash
node tools/export-hiagent-kb.mjs
```
