const assert = require("node:assert/strict");
const diagnosis = require("../scripts/diagnosis-logic.js");

assert.equal(diagnosis.questions.length, 5);
for (const question of diagnosis.questions) assert.equal(question.options.length, 4);

const base = { frequency: "daily", duration: "over60", method: "manual", goal: "time" };
assert.equal(diagnosis.evaluate({ ...base, task: "excel" }).category, "excel_automation");
assert.equal(diagnosis.evaluate({ ...base, task: "documents" }).category, "document_efficiency");
assert.equal(diagnosis.evaluate({ ...base, task: "management" }).category, "management_improvement");
assert.equal(diagnosis.evaluate({ ...base, task: "unknown" }).category, "priority_planning");

const message = diagnosis.buildConsultationMessage({ ...base, task: "excel" });
assert.match(message, /Excel・データ入力/);
assert.match(message, /作業時間の削減/);
assert.match(message, /Excel業務の自動化/);
console.log("diagnosis logic: ok");
