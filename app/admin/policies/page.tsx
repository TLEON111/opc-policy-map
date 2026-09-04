"use client";

import { useCallback, useEffect, useState } from "react";

import type { Policy } from "@/types/policy";

const EMPTY_POLICY: Policy = {
  id: "",
  title: "",
  province: "",
  city: "",
  category: "OPC创业",
  tags: [],
  publishDate: "",
  expiryDate: "",
  issuedBy: "",
  policyLevel: "市级",
  relevance: "direct",
  status: "现行有效",
  summary: "",
  benefits: [],
  eligibility: [],
  applicationNotes: "",
  sourceName: "",
  sourceType: "政策原文",
  sourceUrl: "",
  verifiedAt: "",
};

const PROVINCES = [
  "全国", "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北",
  "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏",
  "陕西", "甘肃", "青海", "宁夏", "新疆",
];

const CATEGORIES = [
  "OPC创业", "算力与模型", "创业服务", "资金与融资", "空间载体", "合规与登记",
];

const LEVELS = ["国家级", "省级", "市级", "区县级"];

function parseList(input: string): string[] {
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminPoliciesPage() {
  const [items, setItems] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data?kind=policies");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { data: Policy[] };
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
    setEditing({ ...EMPTY_POLICY });
    setFlash(null);
  }

  function startEdit(item: Policy) {
    setIsNew(false);
    setEditing({ ...item });
    setFlash(null);
  }

  function updateField<K extends keyof Policy>(key: K, value: Policy[K]) {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFlash(null);
    try {
      const response = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; commitSha?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setFlash({ type: "ok", text: `已保存（commit ${data?.commitSha?.slice(0, 7)}），CI 同步与部署稍后自动完成。` });
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
    if (!window.confirm(`确认删除政策 ${id}？此操作不可撤销。`)) return;
    setFlash(null);
    try {
      const response = await fetch(`/api/admin/policies?id=${encodeURIComponent(id)}`, {
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
        <h1 className="admin-page-title">政策库管理</h1>
        <button className="admin-btn-primary" style={{ width: "auto" }} onClick={startNew}>
          + 新增政策
        </button>
      </div>

      {flash ? <p className={`admin-flash ${flash.type}`}>{flash.text}</p> : null}

      {editing ? (
        <form className="admin-editor" onSubmit={submit}>
          <h2>{isNew ? "新增政策" : `编辑：${editing.title}`}</h2>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>ID（英文短横线，唯一）</span>
              <input
                value={editing.id}
                onChange={(e) => updateField("id", e.target.value)}
                disabled={!isNew}
                required
              />
            </label>
            <label className="admin-field">
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
                value={editing.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>类别</span>
              <select
                value={editing.category}
                onChange={(e) => updateField("category", e.target.value as Policy["category"])}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>政策层级</span>
              <select
                value={editing.policyLevel}
                onChange={(e) => updateField("policyLevel", e.target.value as Policy["policyLevel"])}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>相关度</span>
              <select
                value={editing.relevance}
                onChange={(e) => updateField("relevance", e.target.value as Policy["relevance"])}
              >
                <option value="direct">直接（深色）</option>
                <option value="related">相关（浅色）</option>
              </select>
            </label>
            <label className="admin-field">
              <span>状态</span>
              <select
                value={editing.status}
                onChange={(e) => updateField("status", e.target.value as Policy["status"])}
              >
                <option value="现行有效">现行有效</option>
                <option value="试行">试行</option>
                <option value="规划期内">规划期内</option>
              </select>
            </label>
            <label className="admin-field">
              <span>发布日期</span>
              <input
                type="date"
                value={editing.publishDate}
                onChange={(e) => updateField("publishDate", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>到期日</span>
              <input
                type="date"
                value={editing.expiryDate ?? ""}
                onChange={(e) => updateField("expiryDate", e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>发文单位</span>
              <input
                value={editing.issuedBy}
                onChange={(e) => updateField("issuedBy", e.target.value)}
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
              <select
                value={editing.sourceType}
                onChange={(e) => updateField("sourceType", e.target.value as Policy["sourceType"])}
              >
                <option value="政策原文">政策原文</option>
                <option value="政府公报">政府公报</option>
                <option value="官方发布">官方发布</option>
                <option value="政策解读">政策解读</option>
              </select>
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
            <label className="admin-field full">
              <span>核验日期</span>
              <input
                type="date"
                value={editing.verifiedAt}
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
              <span>标签（每行一个）</span>
              <textarea
                value={editing.tags.join("\n")}
                onChange={(e) => updateField("tags", parseList(e.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>扶持内容（每行一条）</span>
              <textarea
                value={editing.benefits.join("\n")}
                onChange={(e) => updateField("benefits", parseList(e.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>适用对象（每行一条）</span>
              <textarea
                value={editing.eligibility.join("\n")}
                onChange={(e) => updateField("eligibility", parseList(e.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>办理/申报说明</span>
              <textarea
                value={editing.applicationNotes}
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
        <p className="admin-empty">暂无政策</p>
      ) : (
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className="admin-list-item">
              <div className="admin-list-item-main">
                <span className="admin-list-item-title">{item.title}</span>
                <span className="admin-list-item-meta">
                  {item.province} · {item.category} · {item.policyLevel} ·{" "}
                  {item.relevance === "direct" ? "直接" : "相关"} · {item.publishDate}
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
