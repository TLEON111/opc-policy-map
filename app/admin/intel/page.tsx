"use client";

import { useCallback, useEffect, useState } from "react";

import type { IntelItem, IntelKind } from "@/types/intel";

const EMPTY_INTEL: IntelItem = {
  id: "",
  kind: "news",
  title: "",
  province: "",
  city: "",
  scopeLabel: "",
  publishDate: "",
  sourceName: "",
  sourceUrl: "",
  sourceType: "官方发布",
  summary: "",
  keyFacts: [],
  eligibility: [],
  applicationNotes: "",
  tags: [],
  discoveredAt: "",
  verified: true,
  verifiedAt: "",
  confidence: "high",
  origin: "manual",
};

const PROVINCES = [
  "全国", "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北",
  "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏",
  "陕西", "甘肃", "青海", "宁夏", "新疆",
];

const KINDS: Array<{ value: IntelKind; label: string }> = [
  { value: "application", label: "申报受理" },
  { value: "interpretation", label: "解读问答" },
  { value: "news", label: "落地动态" },
  { value: "resource", label: "资源活动" },
];

function parseList(input: string): string[] {
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminIntelPage() {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<IntelItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data?kind=intel");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { data: IntelItem[] };
      setItems(data.data);
    } catch (error) {
      setFlash({ type: "err", text: `加载失败：${error instanceof Error ? error.message : "未知错误"}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startNew() {
    setIsNew(true);
    setEditing({ ...EMPTY_INTEL, tags: [], keyFacts: [], eligibility: [] });
    setFlash(null);
  }

  function startEdit(item: IntelItem) {
    setIsNew(false);
    setEditing({ ...item });
    setFlash(null);
  }

  function updateField<K extends keyof IntelItem>(key: K, value: IntelItem[K]) {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFlash(null);
    try {
      const response = await fetch("/api/admin/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; commitSha?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setFlash({ type: "ok", text: `已保存（commit ${data?.commitSha?.slice(0, 7)}），稍后自动同步。` });
      setEditing(null);
      setIsNew(false);
      await load();
    } catch (error) {
      setFlash({ type: "err", text: `保存失败：${error instanceof Error ? error.message : "未知错误"}` });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`确认删除情报 ${id}？`)) return;
    setFlash(null);
    try {
      const response = await fetch(`/api/admin/intel?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setFlash({ type: "ok", text: "已删除，稍后自动同步。" });
      await load();
    } catch (error) {
      setFlash({ type: "err", text: `删除失败：${error instanceof Error ? error.message : "未知错误"}` });
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <h1 className="admin-page-title">情报库管理</h1>
        <button className="admin-btn-primary" style={{ width: "auto" }} onClick={startNew}>
          + 新增情报
        </button>
      </div>

      {flash ? <p className={`admin-flash ${flash.type}`}>{flash.text}</p> : null}

      {editing ? (
        <form className="admin-editor" onSubmit={submit}>
          <h2>{isNew ? "新增情报" : `编辑：${editing.title}`}</h2>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>ID（唯一）</span>
              <input
                value={editing.id}
                onChange={(e) => updateField("id", e.target.value)}
                disabled={!isNew}
                required
              />
            </label>
            <label className="admin-field">
              <span>类别</span>
              <select
                value={editing.kind}
                onChange={(e) => updateField("kind", e.target.value as IntelKind)}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field full">
              <span>标题</span>
              <input
                value={editing.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
              />
            </label>
            <label className="admin-field">
              <span>省份</span>
              <select
                value={editing.province}
                onChange={(e) => updateField("province", e.target.value)}
                required
              >
                <option value="">请选择</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>城市/区县</span>
              <input
                value={editing.city ?? ""}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>适用范围描述</span>
              <input
                value={editing.scopeLabel ?? ""}
                onChange={(e) => updateField("scopeLabel", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>发布日期</span>
              <input
                type="date"
                value={editing.publishDate ?? ""}
                onChange={(e) => updateField("publishDate", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>来源名称</span>
              <input
                value={editing.sourceName}
                onChange={(e) => updateField("sourceName", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>来源类型</span>
              <input
                value={editing.sourceType ?? ""}
                onChange={(e) => updateField("sourceType", e.target.value)}
              />
            </label>
            <label className="admin-field full">
              <span>来源 URL</span>
              <input
                value={editing.sourceUrl}
                onChange={(e) => updateField("sourceUrl", e.target.value)}
                placeholder="https://…"
                required
              />
            </label>
            <label className="admin-field">
              <span>置信度</span>
              <select
                value={editing.confidence}
                onChange={(e) => updateField("confidence", e.target.value as IntelItem["confidence"])}
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </label>
            <label className="admin-field">
              <span>核验日期</span>
              <input
                type="date"
                value={editing.verifiedAt ?? ""}
                onChange={(e) => updateField("verifiedAt", e.target.value)}
              />
            </label>
            <label className="admin-field full">
              <span>摘要</span>
              <textarea
                value={editing.summary}
                onChange={(e) => updateField("summary", e.target.value)}
              />
            </label>
            <label className="admin-field full">
              <span>要点（每行一条）</span>
              <textarea
                value={editing.keyFacts.join("\n")}
                onChange={(e) => updateField("keyFacts", parseList(e.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>适用对象（每行一条）</span>
              <textarea
                value={(editing.eligibility ?? []).join("\n")}
                onChange={(e) => updateField("eligibility", parseList(e.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>标签（每行一个）</span>
              <textarea
                value={editing.tags.join("\n")}
                onChange={(e) => updateField("tags", parseList(e.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>办理/参与说明</span>
              <textarea
                value={editing.applicationNotes ?? ""}
                onChange={(e) => updateField("applicationNotes", e.target.value)}
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="admin-btn-primary" style={{ width: "auto" }} disabled={saving}>
              {saving ? "保存中…" : "保存并提交"}
            </button>
            <button type="button" className="admin-btn" onClick={() => setEditing(null)}>
              取消
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="admin-empty">加载中…</p>
      ) : items.length === 0 ? (
        <p className="admin-empty">暂无情报</p>
      ) : (
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className="admin-list-item">
              <div className="admin-list-item-main">
                <span className="admin-list-item-title">{item.title}</span>
                <span className="admin-list-item-meta">
                  {item.kind} · {item.province} · {item.confidence} · {item.publishDate ?? "无日期"}
                </span>
              </div>
              <div className="admin-actions">
                <button className="admin-btn" onClick={() => startEdit(item)}>编辑</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(item.id)}>删除</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
