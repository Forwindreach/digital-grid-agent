# Claude Code Command: /md2pdf

在 Claude Code 中直接调用 `/md2pdf` 命令转换 Markdown 文件为 PDF。

## 注册方式

将以下内容添加到项目根目录的 `.claude/settings.json`：

```json
{
  "commands": {
    "md2pdf": {
      "description": "Convert Markdown files to PDF with Chinese font detection",
      "command": "python3 md2pdf/md2pdf.py",
      "args": ["$ARGUMENTS"]
    }
  }
}
```

## 使用

```
/md2pdf                  # 转换当前目录所有 .md
/md2pdf 知识库/          # 转换指定目录
/md2pdf doc.md           # 转换单个文件
/md2pdf -r . -o ./pdfs/  # 递归转换并输出到指定目录
/md2pdf --font /path/to/font.ttf doc.md  # 手动指定字体
```
