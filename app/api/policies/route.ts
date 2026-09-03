import { getPolicies, getPoliciesForProvince } from "@/lib/policies";
import type { PoliciesResponse } from "@/types/policy";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get("province")?.trim() || undefined;
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
