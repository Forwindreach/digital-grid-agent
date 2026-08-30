import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kb = JSON.parse(fs.readFileSync(path.join(root, "data/policy_kb.json"), "utf8"));
const outDir = path.join(root, "data", "hiagent-import", "官方政策");

fs.mkdirSync(outDir, { recursive: true });
for (const doc of kb) {
  const safeTitle = doc.title.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ");
  const fileName = `${doc.id}-${safeTitle}.md`;
  const markdown = [
    `# ${doc.title}`,
    "",
    "- 分类：" + doc.category,
    "- 发文机关：" + doc.source,
    "- 文号：" + doc.docNo,
    "- 发布日期：" + doc.issueDate,
    "- 更新时间：" + doc.updateDate,
    "- 官方原文：" + doc.url,
    "",
    "## 政策要点",
    "",
    doc.content,
    "",
    "## 高频问题",
    "",
    ...doc.questions.map((q) => "- " + q),
    "",
    "## 检索关键词",
    "",
    doc.keywords.map((k) => "`" + k + "`").join(" "),
    ""
  ].join("\n");
  fs.writeFileSync(path.join(outDir, fileName), markdown, "utf8");
}

console.log(`已导出 ${kb.length} 篇 Markdown 到 ${outDir}`);
