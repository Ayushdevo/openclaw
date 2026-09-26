import { describe, expect, it } from "vitest";
import { assertNonDestructiveReplacement, mergeAtPath } from "./config-cli-path.js";

describe("config CLI replacement advice", () => {
  it("points config patch protected replacement refusals at replace-path", () => {
    const root = {
      models: {
        providers: {
          openai: {
            models: [
              { id: "gpt-4o", name: "GPT-4o" },
              { id: "gpt-4.1", name: "GPT-4.1" },
            ],
          },
        },
      },
    };

    expect(() =>
      assertNonDestructiveReplacement({
        root,
        path: ["models", "providers", "openai", "models"],
        value: [{ id: "gpt-4o", name: "GPT-4o" }],
        replaceAdvice: "patch-replace-path",
      }),
    ).toThrow(
      "Refusing to replace models.providers.openai.models; it would remove existing entries: gpt-4.1. Use --replace-path models.providers.openai.models to replace this path intentionally.",
    );
  });

  it("points config patch incompatible merges at replace-path", () => {
    const root = {
      models: {
        providers: {
          openai: {
            models: [{ id: "gpt-4o", name: "GPT-4o" }],
          },
        },
      },
    };

    expect(() =>
      mergeAtPath(
        root,
        ["models", "providers", "openai", "models"],
        {},
        {
          replaceAdvice: "patch-replace-path",
        },
      ),
    ).toThrow(
      "Cannot merge models.providers.openai.models; Use --replace-path models.providers.openai.models to replace this path intentionally.",
    );
  });
});
