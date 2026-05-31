export interface RepairProposeResult { ok: boolean; errors?: string[]; phase?: string; proposalId?: string; savedTo?: string }
export interface RepairApproveResult { ok: boolean; errors?: string[]; phase?: string; approvedRepairId?: string }
export interface RepairApplyResult { ok: boolean; errors?: string[]; phase?: string; backupPath?: string; changes?: unknown[] }
export function runRepairPropose(opts: { proposalPath: string; cwd?: string }): Promise<RepairProposeResult>;
export function runRepairApprove(opts?: { cwd?: string }): Promise<RepairApproveResult>;
export function runRepairApply(opts?: { cwd?: string }): Promise<RepairApplyResult>;
