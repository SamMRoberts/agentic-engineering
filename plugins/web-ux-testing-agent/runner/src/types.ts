// Shared TypeScript types for the web-ux-testing-agent runner. These mirror the
// JSON Schemas in ../../schemas and the structures produced by ../../lib.

export type SelectorRole =
  | "button"
  | "link"
  | "tab"
  | "dialog"
  | "menuitem"
  | "textbox"
  | "heading"
  | "checkbox"
  | "radio"
  | "status"
  | string;

export interface Selector {
  role?: SelectorRole;
  name?: string;
  exact?: boolean;
  label?: string;
  text?: string;
  placeholder?: string;
  test_id?: string;
  css?: string;
  xpath?: string;
  nth?: number;
  within?: Selector;
}

export type StepAction =
  | "navigate"
  | "click"
  | "dblclick"
  | "fill"
  | "select"
  | "check"
  | "uncheck"
  | "press"
  | "hover"
  | "upload"
  | "wait_for"
  | "assert_visible"
  | "assert_hidden"
  | "assert_text"
  | "assert_value"
  | "assert_url"
  | "assert_count"
  | "capture";

export interface TestStep {
  id: string;
  title?: string;
  action: StepAction;
  target?: Selector;
  value?: string | number | boolean | string[];
  url?: string;
  state?: "visible" | "hidden" | "attached" | "detached" | "enabled" | "disabled";
  timeout_ms?: number;
  optional?: boolean;
  needs_discovery?: boolean;
  notes?: string;
}

export interface AuthConfig {
  required?: boolean;
  strategy?: "none" | "storage_state" | "manual_login_pause" | "env_credentials" | "secret_manager";
  storage_state_path?: string;
  username_env?: string;
  password_env?: string;
}

export interface Environment {
  name?: string;
  base_url: string;
  stage?: "local" | "dev" | "test" | "staging" | "preview" | "production";
  test_id_attribute?: string;
  viewport?: { width: number; height: number };
  browsers?: Array<"chromium" | "firefox" | "webkit">;
  auth?: AuthConfig;
  destructive_actions_allowed?: boolean;
}

export interface TestPlan {
  schema_version?: string;
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  environment: Environment;
  preconditions?: string[];
  steps: TestStep[];
  assertions?: TestStep[];
  cleanup?: TestStep[];
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export type StepStatus = "passed" | "failed" | "timedout" | "skipped";
export type RunStatus = "passed" | "failed" | "timedout" | "skipped" | "interrupted";

export interface ReportStep {
  id: string;
  title?: string;
  status: StepStatus;
  duration_ms?: number;
  error?: { message?: string; stack?: string; snippet?: string };
}

export interface Diagnosis {
  category:
    | "product_bug"
    | "selector_drift"
    | "timing_issue"
    | "missing_auth"
    | "changed_workflow"
    | "environment_issue"
    | "invalid_test_plan"
    | "unknown";
  confidence?: "low" | "medium" | "high";
  rationale?: string;
  recommended_repairs?: string[];
}

export interface TestReport {
  schema_version?: string;
  plan_id: string;
  plan_title?: string;
  run_id?: string;
  status: RunStatus;
  started_at: string;
  finished_at: string;
  duration_ms?: number;
  environment?: Record<string, unknown>;
  steps: ReportStep[];
  artifacts?: {
    trace?: string;
    video?: string;
    screenshots?: string[];
    playwright_json?: string;
    html_report?: string;
    console_log?: string;
  };
  summary?: { total: number; passed: number; failed: number; skipped: number; flaky?: number };
  diagnosis?: Diagnosis;
}
