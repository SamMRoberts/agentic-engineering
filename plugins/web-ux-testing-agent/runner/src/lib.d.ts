// Ambient declarations for the shared JS lib consumed by the TypeScript runner.
// The runtime implementations live in ../../lib/*.mjs and are loaded via tsx.
import type { TestPlan, ValidationResult, TestReport, Diagnosis, Selector } from "./types.js";

declare module "../../lib/plan-loader.mjs" {
  export function loadPlan(filePath: string): TestPlan;
  export function parsePlan(raw: string, opts?: { format?: "json" | "yaml" }): TestPlan;
  export function stringifyPlan(plan: TestPlan): string;
}

declare module "../../lib/plan-validator.mjs" {
  export function validatePlan(plan: unknown): ValidationResult;
}

declare module "../../lib/plan-normalizer.mjs" {
  export function normalizePlan(plan: TestPlan): TestPlan;
  export function normalizePlanToYaml(plan: TestPlan): string;
}

declare module "../../lib/test-generator.mjs" {
  export function generateSpec(plan: TestPlan): string;
}

declare module "../../lib/selectors.mjs" {
  export function buildLocator(selector: Selector, base?: string): string;
  export function isAccessible(selector: Selector): boolean;
  export function isEmptySelector(selector: Selector): boolean;
  export function jsString(value: unknown): string;
}

declare module "../../lib/report.mjs" {
  export function normalizeReport(pwJson: unknown, meta?: Record<string, unknown>): TestReport;
  export function renderMarkdown(report: TestReport): string;
}

declare module "../../lib/failure-triage.mjs" {
  export function analyzeFailure(report: TestReport): Diagnosis;
}
