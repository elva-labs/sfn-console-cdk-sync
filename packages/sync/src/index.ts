import { Function, Table, Bucket } from "sst/constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import _ from "lodash";
import { diffJson, Change } from "diff";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

export const SfnSync = {
  transform(definitionPath: string, opt: Opt) {
    const rawFile = readFileSync(
      path.resolve(definitionPath),
      "utf8",
    ).toString();

    // TODO: support YML
    const definition = JSON.parse(rawFile);
    const { tpl, result, diff } = transform(definition, opt);

    if (diff.length) {
      opt.debug && console.debug("TPL=" + tpl);
      opt.debug && console.debug("RESULT=" + tpl);

      writeFileSync(definitionPath, tpl);
    }

    return { tpl, result, opt };
  },

  // TODO: can't be arsed atm 
  grantPolicies(target: sfn.StateMachine, opt: Opt) {
    target.addToRolePolicy(
      new PolicyStatement({
        actions: ["lambda:*"],
        resources: Object.values(opt.lambdas).map((fn) => fn.functionArn),
      }),
    );
    target.addToRolePolicy(
      new PolicyStatement({
        actions: ["dynamodb:*"],
        resources: Object.values(opt.tables).map((t) => t.tableArn),
      }),
    );
    target.addToRolePolicy(
      new PolicyStatement({
        actions: ["dynamodb:*"],
        resources: Object.values(opt.buckets).map((b) => b.bucketArn),
      }),
    );
  },
};

const lambdaReplacer = (
  definitions: object,
  state: string,
  replacer: (state: string) => string,
) => {
  return updatedefinition(definitions, state, {
    Parameters: {
      FunctionName: replacer(state),
    },
  });
};

const dynamoReplacer = (
  definition: object,
  state: string,
  replacer: (state: string) => string,
) => {
  return updatedefinition(definition, state, {
    Parameters: {
      TableName: replacer(state),
    },
  });
};

type State = string;

type Opt = {
  lambdas: Record<State, Function>;
  tables: Record<State, Table>;
  buckets: Record<State, Bucket>;
  debug?: boolean;
};

export const createVariableMap = (opt: Opt) => opt;

export const reset = (definition: object, o: Opt): object => {
  let next = Object.keys(o.lambdas).reduce((definition, state) => {
    return lambdaReplacer(definition, state, () => `{{${state}}}`);
  }, definition);

  next = Object.keys(o.tables).reduce((definition, state) => {
    return dynamoReplacer(definition, state, () => `{{${state}}}`);
  }, definition);

  return next;
};

export const build = (definition: object, o: Opt): object => {
  let next = Object.keys(o.lambdas).reduce((definition, state) => {
    return lambdaReplacer(
      definition,
      state,
      () => o.lambdas[state].functionArn,
    );
  }, definition);

  next = Object.keys(o.tables).reduce((definition, state) => {
    return dynamoReplacer(definition, state, () => o.tables[state].tableName);
  }, definition);

  return next;
};

export const transform = (
  definition: object,
  o: Opt,
): { tpl: string; result: string; diff: Change[] } => {
  const copyDef = JSON.parse(JSON.stringify(definition));
  const tpl = reset(copyDef, o);
  const tplResult = build(definition, o);
  const diff = diffJson(tpl, tplResult);

  return {
    tpl: JSON.stringify(tpl, null, 2),
    result: JSON.stringify(tplResult, null, 2),
    diff,
  };
};

export const updatedefinition = (
  obj: any,
  taskname: string,
  updatefields: any,
): object => {
  if (_.has(obj, taskname)) {
    obj[taskname] = _.merge(obj[taskname], updatefields);
  } else {
    for (var propertyname in obj) {
      if (_.isObject(obj[propertyname])) {
        obj[propertyname] = updatedefinition(
          obj[propertyname],
          taskname,
          updatefields,
        );
      } else if (_.isArray(obj[propertyname])) {
        obj[propertyname] = obj[propertyname].map((item: any) =>
          updatedefinition(item, taskname, updatefields),
        );
      }
    }
  }

  return obj;
};
