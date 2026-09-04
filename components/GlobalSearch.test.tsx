import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GlobalSearch } from "@/components/GlobalSearch";

describe("GlobalSearch", () => {
  it("submits keywords to the monitor feed search", () => {
    render(<GlobalSearch />);

    const form = screen.getByRole("search", { name: "全局政策与情报搜索" });
    const input = screen.getByRole("searchbox", { name: "全局搜索关键词" });

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/monitor#intel-feed");
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAttribute("placeholder", "搜索地区、政策、算力券、OPC社区…");
  });
});
