import { describe, expect, it } from "vitest";
import { createCliExitFailoverError } from "./exit-error.js";

describe("Claude CLI refresh-lock recovery signal", () => {
  it.each([true, false])("only permits retry before CLI activity: %s", (retryEmptyFailure) => {
    const error = createCliExitFailoverError({
      context: { provider: "claude-cli", model: "opus" },
      candidates: [
        "Failed to refresh OAuth token: another Claude Code process is refreshing the token",
      ],
      fallbackMessage: "CLI failed.",
      retryEmptyFailure,
    });
    expect(error.reason).toBe("timeout");
    expect(error.code).toBe(retryEmptyFailure ? "cli_oauth_refresh_lock" : undefined);
  });

  it("recognizes the lock inside a structured CLI error", () => {
    const error = createCliExitFailoverError({
      context: { provider: "claude-cli", model: "opus" },
      candidates: [
        JSON.stringify({
          type: "result",
          is_error: true,
          result: "Failed to refresh OAuth token: another Claude Code process is refreshing the token",
        }),
      ],
      fallbackMessage: "CLI failed.",
      retryEmptyFailure: true,
    });
    expect(error).toMatchObject({ reason: "timeout", code: "cli_oauth_refresh_lock" });
  });
});
