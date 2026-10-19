/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("the Maestro smoke suite", () => {
  it("prepares authentication in every independently ordered journey", () => {
    for (const flow of [
      "01-sign-in.yaml",
      "02-approval-race.yaml",
      "03-notification-deep-link.yaml",
      "04-prompt-stream-stop.yaml",
      "05-pause-reset-authorization.yaml",
    ]) {
      expect(read(`.maestro/${flow}`)).toContain(
        "runFlow: common/sign-in.yaml",
      );
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
