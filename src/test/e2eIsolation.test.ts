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

  it("waits for iOS's open-link dialog before answering it", () => {
    const openLink = read(".maestro/common/open-link-ios.yaml");
    expect(openLink.indexOf('visible: "Open"')).toBeGreaterThan(-1);
    expect(openLink.indexOf('visible: "Open"')).toBeLessThan(openLink.indexOf('text: "Open"'));
  });

  it("uploads Maestro's results only after the scrub kept the tokens out", () => {
    const check = read(".github/workflows/check.yaml");
    for (const platform of ["android", "ios"]) {
      const upload = check.indexOf(`name: maestro-${platform}`);
      const scrub = check.lastIndexOf("name: Keep the tokens out of the results", upload);
      expect(scrub).toBeGreaterThan(-1);
      expect(check.slice(scrub, upload)).toContain("id: scrub");
      expect(check.slice(scrub, upload)).toContain("if: always() && steps.scrub.outcome == 'success'");
    }
  });
});
