(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SHU_DIAGNOSIS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const questions = [
    { id: "task", text: "一番時間がかかっている業務は？", options: [
      { value: "excel", label: "Excel・データ入力" },
      { value: "documents", label: "書類・請求書作成" },
      { value: "management", label: "顧客・案件管理" },
      { value: "unknown", label: "何を改善すべきか分からない" }
    ]},
    { id: "frequency", text: "その作業の頻度は？", options: [
      { value: "daily", label: "毎日" }, { value: "weekly", label: "週に数回" },
      { value: "monthly", label: "月に数回" }, { value: "irregular", label: "不定期" }
    ]},
    { id: "duration", text: "1回の作業時間は？", options: [
      { value: "under15", label: "15分未満" }, { value: "15to30", label: "15〜30分" },
      { value: "30to60", label: "30〜60分" }, { value: "over60", label: "1時間以上" }
    ]},
    { id: "method", text: "現在の作業方法は？", options: [
      { value: "manual", label: "ほぼ手作業" }, { value: "partial", label: "一部だけ自動化" },
      { value: "multiple", label: "複数ツールを使用" }, { value: "unknown", label: "よく分からない" }
    ]},
    { id: "goal", text: "最も改善したいことは？", options: [
      { value: "time", label: "作業時間の削減" }, { value: "errors", label: "入力ミスの削減" },
      { value: "organize", label: "管理の整理" }, { value: "consult", label: "まず相談したい" }
    ]}
  ];

  const results = {
    excel: { category: "excel_automation", title: "Excel業務の自動化", summary: "入力・転記・集計など、繰り返し部分を切り分けると改善方法を検討しやすい状態です。", methods: ["Excel関数・Power Queryの見直し", "CSV整形や転記の自動化", "入力チェックと集計手順の整理"] },
    documents: { category: "document_efficiency", title: "書類作成の効率化", summary: "同じ形式の書類を繰り返し作る業務は、元データとテンプレートを整理すると効率化を検討できます。", methods: ["一覧データから帳票を一括作成", "ファイル名・保存先のルール化", "作成前後の確認手順を整理"] },
    management: { category: "management_improvement", title: "顧客・案件管理の改善", summary: "情報が複数の表やツールに分かれている場合、まず管理項目と更新の流れをそろえることが改善の第一歩です。", methods: ["管理項目と入力ルールの整理", "一覧・進捗・期限の見える化", "重複入力や転記の削減"] },
    unknown: { category: "priority_planning", title: "業務改善の優先順位整理", summary: "改善対象がまだ決まっていない場合は、頻度・時間・ミスの起きやすさから候補を並べると進めやすくなります。", methods: ["作業手順と所要時間の見える化", "繰り返し作業の洗い出し", "小さく試せる改善候補の整理"] }
  };

  function findLabel(question, value) {
    return question.options.find((option) => option.value === value)?.label || "未回答";
  }
  function evaluate(answers) {
    return results[answers.task] || results.unknown;
  }
  function buildConsultationMessage(answers) {
    const result = evaluate(answers);
    const lines = questions.map((question) => `・${question.text} ${findLabel(question, answers[question.id])}`);
    return ["SHU AUTOMATION 無料診断の結果をもとに相談します。", "", ...lines, "", `おすすめ改善テーマ：${result.title}`, "この内容について、改善できそうな範囲や進め方を相談したいです。"].join("\n");
  }
  return { questions, results, evaluate, buildConsultationMessage, findLabel };
});
