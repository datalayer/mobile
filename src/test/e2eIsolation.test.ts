/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("the Maestro smoke suite", () => {
  it("runs every top-level journey deterministically on the shared device", () => {
    const config = read(".maestro/config.yaml");
    const expected = [
      "01-sign-in",
      "02-approval-race",
      "03-notification-deep-link",
      "04-prompt-stream-stop",
      "05-pause-reset-authorization",
    ];

    let cursor = -1;
    for (const flow of expected) {
      const next = config.indexOf(`- ${flow}`);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it("can prepare a signed-out or keychain-restored iOS application", () => {
    const signIn = read(".maestro/common/sign-in.yaml");
    expect(signIn).toContain('visible: "Sign in to Datalayer|Inbox"');
    expect(signIn).toMatch(
      /when:\s*\n\s*visible: "Sign in to Datalayer"[\s\S]*inputText: \$\{E2E_TOKEN\}/,
    );
    expect(signIn).toMatch(/visible: "Inbox"\s*\n\s*timeout: 60000/);
  });
});
