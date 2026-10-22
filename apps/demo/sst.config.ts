import { SSTConfig } from "sst";
import { Function } from "sst/constructs";
import { Aspects } from "aws-cdk-lib";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { Machine } from "./stacks/MyStack";

export default {
  config(_input) {
    return {
      name: "demo",
      region: "eu-north-1",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({ runtime: "nodejs20.x" });
    // SST v2 can't select nodejs22.x and Node 20 is EOL and unpatched (CVE-2026-111497): rewrite the deployed runtime.
    Aspects.of(app).add({
      visit(node) {
        if (
          node instanceof CfnFunction &&
          node.node.scope instanceof Function &&
          typeof node.runtime === "string" &&
          node.runtime.startsWith("nodejs")
        ) {
          node.runtime = "nodejs22.x";
        }
      },
    });
    app.stack(Machine);
  }
} satisfies SSTConfig;
