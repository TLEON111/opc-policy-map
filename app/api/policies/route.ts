import { getPolicies, getPoliciesForProvince } from "@/lib/policies";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/supabase";
import {
  mapPolicyRow,
  type PolicyRow,
} from "@/lib/supabase-mappers";
import type { PoliciesResponse, Policy } from "@/types/policy";

async function fetchRemotePolicies(
  province?: string,
): Promise<PoliciesResponse["data"]> {
  const query = (where: string, value: string) =>
    supabaseSelect<PolicyRow>("policies", {
      filters: { [where]: `eq.${value}` },
      order: "publish_date.desc.nullslast",
    });

  const localRows = province
    ? await query("province", province)
    : await supabaseSelect<PolicyRow>("policies", {
        order: "publish_date.desc.nullslast",
      });
  const nationalRows = province
    ? await query("province", "全国")
    : [];

  const mapRow = (rows: PolicyRow[]) => rows.map(mapPolicyRow);
  return [...mapRow(localRows), ...mapRow(nationalRows)];
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get("province")?.trim() || undefined;

  if (isSupabaseConfigured()) {
    try {
      const data = await fetchRemotePolicies(province);
      const response: PoliciesResponse = {
        data,
        meta: {
          province: province ?? null,
          total: data.length,
          localTotal: province
            ? data.filter((policy: Policy) => policy.province === province).length
            : data.length,
          nationalTotal: province
            ? data.filter((policy: Policy) => policy.province === "全国").length
            : 0,
        },
      };
      return Response.json(response);
    } catch (error) {
      console.error("Supabase 读取失败，回退本地数据", error);
    }
  }

  const { localPolicies, nationalPolicies } = province
    ? getPoliciesForProvince(province)
    : { localPolicies: getPolicies(), nationalPolicies: [] };
  const policies = [...localPolicies, ...nationalPolicies];
  const response: PoliciesResponse = {
    data: policies,
    meta: {
      province: province ?? null,
      total: policies.length,
      localTotal: localPolicies.length,
      nationalTotal: nationalPolicies.length,
    },
  };

  return Response.json(response);
}
