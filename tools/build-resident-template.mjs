import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data", "templates");
const previewDir = path.join(root, "outputs", "resident-template-preview");
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const wb = Workbook.create();
const form = wb.worksheets.add("登记表");
const example = wb.worksheets.add("填写示例");

form.showGridLines = false;
example.showGridLines = false;

const title = form.getRange("A1:I1");
title.merge();
title.values = [["数字网格员 · 居民信息登记表（群内填写版）"]];
title.format.font = { bold: true, size: 16, color: "#FFFFFF" };
title.format.fill = { color: "#2563EB" };
title.format.alignment = { horizontal: "left", vertical: "middle" };
title.format.rowHeight = 34;

const instructions = [
  "填写说明：请按一行一人填写，带 * 的列为必填项。",
  "手机号是系统识别居民身份的关键字段，请务必准确；搬家换地址请选择“地址变更”并填写现居住地址。",
  "所属社区、所属网格请按社区网格员公布的名称填写，不清楚的可留空，由网格员导入时补全。"
];
for (let i = 0; i < instructions.length; i += 1) {
  const row = 2 + i;
  const range = form.getRange(`A${row}:I${row}`);
  range.merge();
  range.values = [[instructions[i]]];
  range.format.font = { color: "#526079", size: 11 };
  range.format.fill = { color: i === 0 ? "#EAF1FF" : "#F6F8FB" };
  range.format.alignment = { horizontal: "left", vertical: "middle" };
  range.format.rowHeight = 22;
}

const headers = [
  "登记类型*",
  "姓名*",
  "手机号*",
  "所属社区",
  "所属网格",
  "现居住地址（楼栋房号）*",
  "原居住地址（地址变更时填写）",
  "人员标签",
  "备注"
];
const header = form.getRange("A5:I5");
header.values = [headers];
header.format.font = { bold: true, color: "#182335", size: 12 };
header.format.fill = { color: "#DDE7F7" };
header.format.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
header.format.borders = { preset: "all", style: "thin", color: "#B7C5DB" };
header.format.rowHeight = 34;

const data = form.getRange("A6:I105");
data.format.font = { color: "#182335", size: 12 };
data.format.alignment = { vertical: "middle", wrapText: true };
data.format.borders = { preset: "all", style: "thin", color: "#D9E1EC" };
data.format.fill = { color: "#FFFFFF" };

form.getRange("A6:A105").dataValidation = {
  rule: { type: "list", values: ["新增登记", "地址变更"] }
};
form.getRange("D6:D105").dataValidation = {
  rule: { type: "list", values: ["温泉街道·华林社区", "温泉街道·观风亭社区", "温泉街道·金泉社区"] }
};

const widths = { A: 15, B: 12, C: 17, D: 25, E: 16, F: 30, G: 30, H: 18, I: 22 };
for (const [col, width] of Object.entries(widths)) {
  form.getRange(`${col}5`).format.columnWidth = width;
}
form.freezePanes.freezeRows(5);

const exTitle = example.getRange("A1:I1");
exTitle.merge();
exTitle.values = [["填写示例与字段说明"]];
exTitle.format.font = { bold: true, size: 16, color: "#FFFFFF" };
exTitle.format.fill = { color: "#0F9488" };
exTitle.format.alignment = { horizontal: "left", vertical: "middle" };
exTitle.format.rowHeight = 34;

const note = example.getRange("A3:I3");
note.merge();
note.values = [["正式发送给居民前，请删除“示例行”，只保留表头；居民填写后由网格员上传导入系统。"]];
note.format.font = { color: "#526079", size: 11 };
note.format.fill = { color: "#E6F7F4" };
note.format.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
note.format.rowHeight = 24;

const exHeader = example.getRange("A5:I5");
exHeader.values = [headers];
exHeader.format.font = { bold: true, color: "#182335", size: 12 };
exHeader.format.fill = { color: "#DDE7F7" };
exHeader.format.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
exHeader.format.borders = { preset: "all", style: "thin", color: "#B7C5DB" };
exHeader.format.rowHeight = 34;

const exampleRows = [
  ["新增登记", "王秀英", "13800000000", "温泉街道·华林社区", "华林网格03", "华林花园3号楼502", "", "高龄老人", "示例行"],
  ["地址变更", "林建国", "13900000000", "温泉街道·华林社区", "华林网格02", "五四路193号2单元", "华林花园1号楼301", "上班族", "示例行"]
];
const exData = example.getRange("A6:I7");
exData.values = exampleRows;
exData.format.font = { color: "#182335", size: 12 };
exData.format.alignment = { vertical: "middle", wrapText: true };
exData.format.borders = { preset: "all", style: "thin", color: "#D9E1EC" };

const fieldNotes = [
  ["登记类型", "新增登记：首次建档；地址变更：居民搬家后更新现居住地址", "必填，下拉选择"],
  ["姓名", "与身份证件一致或使用居民日常登记的姓名", "必填"],
  ["手机号", "用于识别居民身份和联系回访", "必填，请填写真实手机号"],
  ["所属社区", "按社区网格员公布的名称选择", "可选，导入时可补全"],
  ["所属网格", "例如：华林网格03", "可选，导入时可补全"],
  ["现居住地址", "具体到楼栋和房号，例如：华林花园3号楼502", "必填"],
  ["原居住地址", "仅地址变更时填写，便于系统保留搬家记录", "可选"],
  ["人员标签", "例如：高龄老人、独居、租户、志愿者", "可选"],
  ["备注", "其他需要网格员了解的情况", "可选"]
];
const notesRange = example.getRange("A9:C17");
notesRange.values = fieldNotes;
notesRange.format.font = { color: "#182335", size: 11 };
notesRange.format.alignment = { vertical: "middle", wrapText: true };
notesRange.format.borders = { preset: "all", style: "thin", color: "#D9E1EC" };
const notesHeader = example.getRange("A8:C8");
notesHeader.values = [["字段", "填写说明", "备注"]];
notesHeader.format.font = { bold: true, color: "#182335", size: 12 };
notesHeader.format.fill = { color: "#DDE7F7" };
notesHeader.format.alignment = { horizontal: "center", vertical: "middle" };
notesHeader.format.borders = { preset: "all", style: "thin", color: "#B7C5DB" };

example.getRange("A8").format.columnWidth = 16;
example.getRange("B8").format.columnWidth = 56;
example.getRange("C8").format.columnWidth = 28;

const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(path.join(outDir, "居民信息登记表.xlsx"));
await output.save(path.join(previewDir, "居民信息登记表.xlsx"));

const formBlob = await wb.render({ sheetName: "登记表", range: "A1:I14", scale: 1, format: "png" });
await fs.writeFile(path.join(previewDir, "登记表.png"), Buffer.from(await formBlob.arrayBuffer()));
const exampleBlob = await wb.render({ sheetName: "填写示例", range: "A1:H17", scale: 1, format: "png" });
await fs.writeFile(path.join(previewDir, "填写示例.png"), Buffer.from(await exampleBlob.arrayBuffer()));

console.log("template saved:", path.join(outDir, "居民信息登记表.xlsx"));
