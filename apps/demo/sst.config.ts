import { SSTConfig } from "sst";
import { Machine } from "./stacks/MyStack";

export default {
  config(_input) {
    return {
      name: "demo",
      region: "eu-north-1",
    };
  },
  stacks(app) {
    app.stack(Machine);
  }
} satisfies SSTConfig;
