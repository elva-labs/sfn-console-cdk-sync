import { Function, StackContext, Table, Bucket } from "sst/constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { SfnSync } from "@repo/sync";
import { RemovalPolicy } from "aws-cdk-lib/core";

export function Machine({ stack }: StackContext) {
  const storage = new Table(stack, "DemoTable", {
    primaryIndex: {
      partitionKey: "pk",
      sortKey: "sk",
    },
    fields: {
      pk: "string",
      sk: "string",
    },
    cdk: { table: { removalPolicy: RemovalPolicy.DESTROY } },
  });
  const archive = new Bucket(stack, "ArchiveBucket", {
    cdk: { bucket: { removalPolicy: RemovalPolicy.DESTROY } },
  });
  const fn1 = new Function(stack, "sfn-auto-sync-f1", {
    handler: "packages/functions/src/hello.main",
  });
  const fn2 = new Function(stack, "sfn-auto-sync-f2", {
    handler: "packages/functions/src/hello.main",
  });
  const fn3 = new Function(stack, "sfn-auto-sync-f3", {
    handler: "packages/functions/src/hello.main",
  });

  // Internally reads the def, and resets resource names/arns accordingly
  // then renders a real def with all the arns injected that can 
  // deployed to AWS
  //
  // The purpose is to be able to work in the sfn-console workflow, 
  // synd the generated def to `def.json` then reset the arns/names etc
  // to provide a "commitable" definition agnostic to stage/accout/env
  //
  const { result, opt } = SfnSync.transform("./stacks/def.json", {
    lambdas: {
      Fn1: fn1,
      Fn2: fn2,
      Fn3: fn3,
    },
    tables: {
      InsertMessage: storage,
    },
    buckets: {
      Archive: archive,
    },
  })

  const start = new sfn.StateMachine(stack, "DemoMachine", {
    definitionBody: sfn.DefinitionBody.fromString(result),
    stateMachineType: sfn.StateMachineType.STANDARD,
    tracingEnabled: true,
    logs: {
      destination: new LogGroup(stack, "trigger-sync-machine-log"),
      level: sfn.LogLevel.ALL,
      includeExecutionData: true,
    },
  });

  SfnSync.grantPolicies(start, opt);

  stack.addOutputs({
    fn1: fn1.functionArn,
    fn2: fn2.functionArn,
  });
}
