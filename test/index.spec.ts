import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";
import "@aws-cdk/assert/jest";
import { Datadog, logForwardingEnvVar, enableDDTracingEnvVar, injectLogContextEnvVar } from "../src/index";
import { DD_ACCOUNT_ID } from "../src/layer";
import { JS_HANDLER_WITH_LAYERS, DD_HANDLER_ENV_VAR, PYTHON_HANDLER } from "../src/redirect";
import { findDatadogSubscriptionFilters } from "./test-utils";

describe("addLambdaFunctions", () => {
  it("Subscribes the same forwarder to two different lambda functions via separate addLambdaFunctions function calls", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "stack", {
      env: {
        region: "sa-east-1",
      },
    });
    const nodeLambda = new lambda.Function(stack, "NodeHandler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("test"),
      handler: "hello.handler",
    });
    const pythonLambda = new lambda.Function(stack, "PythonHandler", {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset("test"),
      handler: "hello.handler",
    });
    const datadogCdk = new Datadog(stack, "Datadog", {
      nodeLayerVersion: 20,
      pythonLayerVersion: 28,
      addLayers: true,
      forwarderArn: "forwarder-arn",
      enableDatadogTracing: true,
      flushMetricsToLogs: true,
      site: "datadoghq.com",
    });
    datadogCdk.addLambdaFunctions([nodeLambda]);
    datadogCdk.addLambdaFunctions([pythonLambda]);

    const nodeLambdaSubscriptionFilters = findDatadogSubscriptionFilters(nodeLambda);
    const pythonLambdaSubscriptionFilters = findDatadogSubscriptionFilters(pythonLambda);
    expect(nodeLambdaSubscriptionFilters).toHaveLength(1);
    expect(pythonLambdaSubscriptionFilters).toHaveLength(1);
    expect(nodeLambdaSubscriptionFilters[0].destinationArn).toEqual(pythonLambdaSubscriptionFilters[0].destinationArn);
  });

  it("Throws an error when a customer redundantly calls the addLambdaFunctions function on the same lambda function(s) and forwarder", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "stack", {
      env: {
        region: "sa-east-1",
      },
    });
    const nodeLambda = new lambda.Function(stack, "NodeHandler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("test"),
      handler: "hello.handler",
    });
    const datadogCdk = new Datadog(stack, "Datadog", {
      nodeLayerVersion: 20,
      pythonLayerVersion: 28,
      addLayers: true,
      forwarderArn: "forwarder-arn",
      enableDatadogTracing: true,
      flushMetricsToLogs: true,
      site: "datadoghq.com",
    });
    datadogCdk.addLambdaFunctions([nodeLambda]);
    let throwsError;
    try {
      datadogCdk.addLambdaFunctions([nodeLambda]);
    } catch (e) {
      throwsError = true;
    }
    expect(throwsError).toBe(true);
  });

  it("Adds a log group subscription to a lambda in a nested CDK stack", () => {
    const app = new cdk.App();
    const RootStack = new cdk.Stack(app, "RootStack");
    const NestedStack = new cdk.NestedStack(RootStack, "NestedStack");

    const NestedStackLambda = new lambda.Function(NestedStack, "NestedStackLambda", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("test"),
      handler: "hello.handler",
    });
    const NestedStackDatadogCdk = new Datadog(NestedStack, "NestedStackDatadogCdk", {
      nodeLayerVersion: 20,
      pythonLayerVersion: 28,
      addLayers: true,
      forwarderArn: "forwarder-arn",
      enableDatadogTracing: true,
      flushMetricsToLogs: true,
      site: "datadoghq.com",
    });
    NestedStackDatadogCdk.addLambdaFunctions([NestedStackLambda]);

    expect(NestedStack).toHaveResource("AWS::Logs::SubscriptionFilter", {
      DestinationArn: "forwarder-arn",
      FilterPattern: "",
    });
  });

  it("Adds DD Lambda Extension when using a nested CDK stack", () => {
    const app = new cdk.App();
    const RootStack = new cdk.Stack(app, "RootStack", {
      env: {
        region: "sa-east-1",
      },
    });
    const NestedStack = new cdk.NestedStack(RootStack, "NestedStack");

    const NestedStackLambda = new lambda.Function(NestedStack, "NestedStackLambda", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("test"),
      handler: "hello.handler",
    });
    const NestedStackDatadogCdk = new Datadog(NestedStack, "NestedStackDatadogCdk", {
      nodeLayerVersion: 20,
      pythonLayerVersion: 28,
      addLayers: true,
      extensionLayerVersion: 6,
      apiKey: "1234",
      enableDatadogTracing: true,
      flushMetricsToLogs: true,
      site: "datadoghq.com",
    });
    NestedStackDatadogCdk.addLambdaFunctions([NestedStackLambda]);

    expect(NestedStack).toHaveResource("AWS::Lambda::Function", {
      Layers: [
        `arn:aws:lambda:sa-east-1:${DD_ACCOUNT_ID}:layer:Datadog-Node10-x:20`,
        `arn:aws:lambda:sa-east-1:${DD_ACCOUNT_ID}:layer:Datadog-Extension:6`,
      ],
    });
  });
});

describe("applyLayers", () => {
  it("if addLayers is not given, layer is added", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogCDK = new Datadog(stack, "Datadog", {
      nodeLayerVersion: 39,
      pythonLayerVersion: 24,
      forwarderArn: "forwarder-arn",
    });
    datadogCDK.addLambdaFunctions([hello]);
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Handler: `${JS_HANDLER_WITH_LAYERS}`,
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [logForwardingEnvVar]: "true",
          [enableDDTracingEnvVar]: "true",
          [injectLogContextEnvVar]: "true",
        },
      },
    });
  });
  it("layer is added for python", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.PYTHON_3_6,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogCDK = new Datadog(stack, "Datadog", {
      nodeLayerVersion: 39,
      pythonLayerVersion: 24,
      forwarderArn: "forwarder-arn",
    });
    datadogCDK.addLambdaFunctions([hello]);
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Handler: `${PYTHON_HANDLER}`,
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [logForwardingEnvVar]: "true",
          [enableDDTracingEnvVar]: "true",
          [injectLogContextEnvVar]: "true",
        },
      },
    });
  });

  it("subscription filter is added", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.PYTHON_3_6,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const hello1 = new lambda.Function(stack, "HelloHandler1", {
      runtime: lambda.Runtime.PYTHON_3_6,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const hello2 = new lambda.Function(stack, "HelloHandler2", {
      runtime: lambda.Runtime.PYTHON_3_6,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });

    const datadogCDK = new Datadog(stack, "Datadog", {
      nodeLayerVersion: 39,
      pythonLayerVersion: 24,
      forwarderArn: "forwarder-arn",
    });
    datadogCDK.addLambdaFunctions([hello, hello1, hello2]);
    expect(stack).toHaveResource("AWS::Logs::SubscriptionFilter");
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Handler: `${PYTHON_HANDLER}`,
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [logForwardingEnvVar]: "true",
          [enableDDTracingEnvVar]: "true",
          [injectLogContextEnvVar]: "true",
        },
      },
    });
  });
});
