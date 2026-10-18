import "server-only";
import { isIP } from "node:net";
import { APPROVED_SITE_ORIGIN } from "./policy";
export type HostingContext = Readonly<{ vercel?: string; environment?: string; projectId?: string }>;
/** Direct Vercel ingress ONLY. Platform docs promise x-forwarded-for overwrite against spoofing.
 * This is not portable to an arbitrary reverse proxy: owner must pin project/direct-ingress policy.
 */
export function vercelIdentity(request: Request, context: HostingContext, approvedProjectId: string): { ip: string } | null {
  if (context.vercel !== "1" || context.environment !== "production" || !/^prj_[A-Za-z0-9]{8,64}$/.test(approvedProjectId) || context.projectId !== approvedProjectId) return null;
  if (new URL(request.url).origin !== APPROVED_SITE_ORIGIN) return null;
  const ip = request.headers.get("x-vercel-forwarded-for"), forwarded = request.headers.get("x-forwarded-for");
  if (!ip || ip.length > 45 || !isIP(ip) || ip.includes('%') || forwarded !== ip || request.headers.get("x-forwarded-host") !== "scout.storkcoin.xyz" || request.headers.get("x-forwarded-proto") !== "https") return null;
  return { ip };
}
