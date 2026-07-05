import type { CorporateActionTabKey } from "./types";

/**
 * Maps corporate-action tab keys to their PostgreSQL table names.
 * Shared between the [action] and corporate-counts API routes.
 */
export const CORPORATE_ACTION_TABLES: Record<CorporateActionTabKey, string> = {
  dividends: "corporate_actions_dividends",
  bonus: "corporate_actions_bonus",
  splits: "corporate_actions_splits",
  rights: "corporate_actions_rights",
  buybacks: "corporate_actions_buybacks",
  "quarterly-results": "corporate_actions_quarterly_results",
};
