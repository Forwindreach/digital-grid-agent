# md2pdf — Markdown → PDF with Chinese Support

一个轻量级的 Markdown 转 PDF 工具，**自动检测系统中文字体**，跨平台可用。

## 特性

- 🀄 **中文字体自动检测** — macOS / Linux / Windows 开箱即用
- 📄 **保留排版** — 标题层级、表格、列表、代码块、引用块完整保留
- 🖥 **CLI 命令行** — 单文件、批量、递归转换
- 🐍 **Python API** — 可在代码中 `import md2pdf` 调用
- 🤖 **Claude Code 集成** — `/md2pdf` 斜杠命令一键转换
- 📦 **轻量依赖** — 仅需 `markdown-it-py` + `fpdf2`

---

## 安装

### 方式一：pip 安装（推荐）

```bash
pip install -e git+https://github.com/Forwindreach/volcano-agent.git#subdirectory=md2pdf
# 或者本地安装
cd md2pdf && pip install -e .
```

### 方式二：直接运行（无需安装）

```bash
pip install markdown-it-py fpdf2
python md2pdf.py [文件或目录...]
```

---

## CLI 用法

```
md2pdf [OPTIONS] [PATHS...]

  PATHS          Markdown 文件或包含 .md 文件的目录（默认: 当前目录）

选项:
  -o, --output DIR    输出目录（默认: 与源文件同目录）
  -f, --font PATH     手动指定中文字体路径
  -r, --recursive     递归处理子目录
  --remove-source     转换成功后删除原始 .md 文件
  -q, --quiet         静默模式（不输出进度）
  --version           显示版本号
  -h, --help          显示帮助
```

### 示例

```bash
# 转换当前目录所有 .md 文件
md2pdf

# 转换指定目录
md2pdf ./docs/

# 转换单个文件
md2pdf README.md

# 输出到指定目录
md2pdf docs/ -o ./pdfs/

# 递归处理所有子目录
md2pdf . -r -o ./pdfs/

# 手动指定字体（如果自动检测失败）
md2pdf --font /usr/share/fonts/truetype/wqy/wqy-zenhei.ttc doc.md

# 转换后删除源文件
md2pdf docs/ --remove-source
```

---

## Python API

```python
from md2pdf import convert_file, convert, detect_cjk_font

# 查看自动检测到的字体
print(detect_cjk_font())
# → '/System/Library/Fonts/STHeiti Medium.ttc'

# 单文件转换
convert_file("doc.md", "doc.pdf")

# 批量转换
results = convert(
    paths=["docs/", "README.md"],
    output_dir="./pdfs/",
    font_path=None,       # None = 自动检测
    recursive=False,
    remove_source=False,
)
print(f"Generated: {len(results)} PDF(s)")

# 自定义字体
convert_file("doc.md", "doc.pdf", font_path="/path/to/my-font.ttf")
```

---

## 字体配置

工具启动时会按以下顺序自动寻找第一个可用的中文字体：

| 平台 | 搜索字体 |
|------|---------|
| **macOS** | STHeiti → Songti → Hiragino Sans GB → PingFang |
| **Linux** | WQY ZenHei → Noto Sans CJK → Droid Sans Fallback → AR PL UMing |
| **Windows** | 微软雅黑 → 宋体 → 黑体 → 细明体 |

如果自动检测不到，请安装字体：

```bash
# Ubuntu / Debian
sudo apt install fonts-wqy-zenhei

# 或手动指定
md2pdf --font /path/to/font.ttf doc.md
```

---

## Claude Code 集成

在 Claude Code 中直接调用 `/md2pdf` 命令：

```
/md2pdf                  # 转换当前目录所有 .md
/md2pdf 知识库/          # 转换指定目录
/md2pdf -r . -o ./pdfs/  # 递归转换并输出到指定目录
```

---

## 项目结构

```
md2pdf/
├── md2pdf.py          # 核心模块（CLI + API）
├── pyproject.toml     # pip 安装配置
├── requirements.txt   # 依赖清单
├── README.md          # 本文档
├── LICENSE            # MIT 许可
└── .claude/
    └── COMMANDS.md    # Claude Code 斜杠命令注册
```

---

## License

MIT © [Forwindreach](https://github.com/Forwindreach)
