import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLogo } from "@/components/BrandLogo";

describe("BrandLogo", () => {
  it("exposes the product name while keeping the symbol decorative", () => {
    render(<BrandLogo />);

    expect(screen.getByText("OPC POLICY MAP")).toBeInTheDocument();
    expect(screen.getByText("全国 OPC 政策地图")).toBeInTheDocument();
    expect(screen.getByTestId("brand-symbol")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
