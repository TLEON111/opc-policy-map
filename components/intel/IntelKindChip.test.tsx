import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IntelKindChip } from "@/components/intel/IntelKindChip";

describe("IntelKindChip", () => {
  it("uses a soft semantic treatment for policy items", () => {
    render(<IntelKindChip kind="policy" />);

    expect(screen.getByText("政策文件")).toHaveStyle({
      background: "#e9f3ff",
      color: "#086beb",
    });
  });
});
