import { Search } from "lucide-react";

export function GlobalSearch() {
  return (
    <form
      action="/monitor#intel-feed"
      method="get"
      className="global-search"
      role="search"
      aria-label="全局政策与情报搜索"
    >
      <label>
        <span>全局搜索</span>
        <div>
          <Search aria-hidden="true" className="size-4" strokeWidth={1.8} />
          <input
            type="search"
            name="q"
            aria-label="全局搜索关键词"
            placeholder="搜索地区、政策、算力券、OPC社区…"
          />
        </div>
      </label>
      <button type="submit">搜索</button>
    </form>
  );
}
