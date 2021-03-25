# Datadog CDK Constructs
[![NPM](https://img.shields.io/npm/v/datadog-cdk-constructs?color=blue)](https://www.npmjs.com/package/datadog-cdk-constructs)
[![Slack](https://chat.datadoghq.com/badge.svg?bg=632CA6)](https://chat.datadoghq.com/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/DataDog/datadog-cdk-constructs/blob/main/LICENSE)

Use this Datadog CDK Construct Library to deploy serverless applications using AWS CDK .

This CDK library automatically configures ingestion of metrics, traces, and logs from your serverless applications by:

- Installing and configuring the Datadog Lambda library for your [Python][1] and [Node.js][2] Lambda functions.
- Enabling the collection of traces and custom metrics from your Lambda functions.
- Managing subscriptions from the Datadog Forwarder to your Lambda function log groups.

## Installation
```
yarn add --dev datadog-cdk-constructs
# or
npm install datadog-cdk-constructs --save-dev
```
## Usage

### AWS CDK

import datadog-cdk-constructs.

**Typescript**

```typescript
import * as cdk from "@aws-cdk/core";
import { Datadog } from "datadog-cdk-constructs";

class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const datadog = new Datadog(this, "Datadog", {
      nodeLayerVersion: <LAYER_VERSION>,
      pythonLayerVersion: <LAYER_VERSION>,
      addLayers: <BOOLEAN>,
      forwarderARN: "<FORWARDER_ARN>",
      flushMetricsToLogs: <BOOLEAN>,
      site: "<SITE>",
      apiKey: "{Datadog_API_Key}",
      apiKMSKey: "{Encrypted_Datadog_API_Key}",
      enableDDTracing: <BOOLEAN>,
      injectLogContext: <BOOLEAN>
    });
    datadog.addLambdaFunctions([<LAMBDA_FUNCTIONS>])
  }
}
```

## Configuration

To further configure your Datadog construct, use the following custom parameters:

| Parameter            | Description                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addLayers`          | Whether to add the Lambda Layers or expect the user to bring their own. Defaults to true. When true, the Lambda Library version variables are also required. When false, you must include the Datadog Lambda library in your functions' deployment packages.         |
| `pythonLayerVersion` | Version of the Python Lambda layer to install, such as 21. Required if you are deploying at least one Lambda function written in Python and `addLayers` is true. Find the latest version number from [https://github.com/DataDog/datadog-lambda-python/releases][5]. |
| `nodeLayerVersion`   | Version of the Node.js Lambda layer to install, such as 29. Required if you are deploying at least one Lambda function written in Node.js and `addLayers` is true. Find the latest version number from [https://github.com/DataDog/datadog-lambda-js/releases][6].   |
| `extensionLayerVersion`   | Version of the Datadog Lambda Extension layer to install, such as 5. When `extensionLayerVersion` is set, `apiKey` (or `apiKMSKey`) needs to be set as well. While using `extensionLayerVersion` do not set `forwarderARN`. The Datadog Lambda Extension layer is in public preview. Learn more about the Lambda extension [here][12].   |
| `forwarderARN`         | When set, the plugin will automatically subscribe the Datadog Forwarder to the functions' log groups. Do not set `forwarderARN` when `extensionLayerVersion` is set.|
| `flushMetricsToLogs` | Send custom metrics using CloudWatch logs with the Datadog Forwarder Lambda function (recommended). Defaults to `true`. If you disable this parameter, it's required to set `apiKey` (or `apiKMSKey`). |
| `site`               | Set which Datadog site to send data. This is only used when `flushMetricsToLogs` is `false` or `extensionLayerVersion` is set. Possible values are `datadoghq.com`, `datadoghq.eu`, `us3.datadoghq.com` and `ddog-gov.com`. The default is `datadoghq.com`. |
| `apiKey`             | Datadog API Key, only needed when `flushMetricsToLogs` is `false` or `extensionLayerVersion` is set. For more information about getting a Datadog API key, see the [API key documentation][8]. |
| `apiKMSKey`          | Datadog API Key encrypted using KMS. Use this parameter in place of `apiKey` when `flushMetricsToLogs` is `false` or `extensionLayerVersion` is set, and you are using KMS encryption. |
| `enableDDTracing`    | Enable Datadog tracing on your Lambda functions. Defaults to `true`.|
| `injectLogContext`   | When set, the lambda layer will automatically patch console.log with Datadog's tracing ids. Defaults to `true`. |

### AWS CDK Configurations

The AWS CDK library offers some additional options that you may include in your lambda functions and application / stack.

### Tracing

Enable X-Ray Tracing on your Lambda functions. For more information, see [CDK documentation][9].

```typescript
import * as lambda from "@aws-cdk/aws-lambda";

const lambda_function = new lambda.Function(this, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "hello.handler",
      tracing: lambda.Tracing.ACTIVE
});
```

### Tags

Add tags to your constructs. We recommend setting an `env` and `service` tag to tie Datadog telemetry together. For more information see [official AWS documentation][10] and [CDK documentation][11].


## How it works

The Datadog CDK construct takes in a list of lambda functions and installs the Datadog Lambda Library by attaching the Lambda Layers for [Node.js][2] and [Python][1] to your functions. It redirects to a replacement handler that initializes the Lambda Library without any required code changes. Additional configurations added to the Datadog CDK construct will also translate into their respective environment variables under each lambda function (if applicable / required).

## Resources to learn about CDK

* [CDK TypeScript Workshop](https://cdkworkshop.com/20-typescript.html)
* [Video Introducing CDK by AWS with Demo](https://youtu.be/ZWCvNFUN-sU)
* [CDK Concepts](https://youtu.be/9As_ZIjUGmY)

## Using Projen

This AWS CDK Construct Library uses Projen to maintain project configuration files such as the `package.json`, `.gitignore`, `.npmignore`, etc. Most of the configuration files will be protected by Projen via read-only permissions. In order to change these files, edit the `.projenrc.js` file then run `npx projen` to synthesize the new changes. Check out [Projen][13] for more details.


## Opening Issues

If you encounter a bug with this package, we want to hear about it. Before opening a new issue, search the existing issues to avoid duplicates.

When opening an issue, include the Datadog CDK Construct version, Node version, and stack trace if available. In addition, include the steps to reproduce when appropriate.

You can also open an issue for a feature request.

## Contributing

If you find an issue with this package and have a fix, please feel free to open a pull request following the [procedures](https://github.com/DataDog/datadog-cdk-constructs/blob/main/CONTRIBUTING.md).

## Testing

If you contribute to this package you can run the tests using `yarn test`. This package also includes a sample application for manual testing: 
1. Open a seperate terminal and run `yarn watch`, this will ensure the Typescript files in the `src` directory are compiled to Javascript in the `lib` directory. 
2. Navigate to `src/sample`, here you can edit `index.ts` to test your contributions manually. 
3. At the root `datadog-cdk-constructs` directory and run `npx cdk --app lib/sample/index.js <CDK Command>`, replacing `<CDK Command>` with common CDK commands like `synth`, `diff`, or `deploy`. 
* Note, if you receive "... is not authorized to perform: ..." you may also need to authorize the commands with your AWS credentials.

## Community

For product feedback and questions, join the `#serverless` channel in the [Datadog community on Slack](https://chat.datadoghq.com/).

## License

Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.

This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

[1]: https://github.com/DataDog/datadog-lambda-layer-python
[2]: https://github.com/DataDog/datadog-lambda-layer-js
[3]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros.html
[4]: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Stack.html
[5]: https://github.com/DataDog/datadog-lambda-python/releases
[6]: https://github.com/DataDog/datadog-lambda-js/releases
[7]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-subscriptionfilter.html
[8]: https://docs.datadoghq.com/account_management/api-app-keys/#api-keys
[9]: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Tracing.html
[10]: https://docs.aws.amazon.com/cdk/latest/guide/tagging.html
[11]: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Tags.html
[12]: https://docs.datadoghq.com/serverless/datadog_lambda_library/extension/
[13]: https://github.com/projen/projen
