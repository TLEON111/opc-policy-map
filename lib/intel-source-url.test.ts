import { describe, expect, it } from "vitest";

import {
  normalizeIntelCandidateUrl,
  shouldQueueIntelCandidateUrl,
} from "@/lib/intel-source-url";

describe("shouldQueueIntelCandidateUrl", () => {
  it("allows official government candidate URLs discovered from a government source", () => {
    expect(
      shouldQueueIntelCandidateUrl(
        "https://www.bjhd.gov.cn/ztzx/2026/opc/",
        "https://zyk.bjhd.gov.cn/zwdt/zcwj/202604/t20260414_4811721.shtml",
      ),
    ).toBe(true);
  });

  it("does not queue WeChat links discovered from an official source page", () => {
    expect(
      shouldQueueIntelCandidateUrl(
        "https://www.bjhd.gov.cn/ztzx/2026/opc/",
        "https://mp.weixin.qq.com/s/S-FqGQo-Pc_716GOvi8iZQ",
      ),
    ).toBe(false);
  });

  it("normalizes accidental duplicate slashes in URL paths", () => {
    expect(
      normalizeIntelCandidateUrl(
        "http://www.bjchy.gov.cn//affair/file/otherfile/4028805a9dfdb457019e25a981de22c6.html",
      ),
    ).toBe(
      "http://www.bjchy.gov.cn/affair/file/otherfile/4028805a9dfdb457019e25a981de22c6.html",
    );
  });
});
