/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache License Version 2.0.
 *
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2021 Datadog, Inc.
 */

import * as lambda from "@aws-cdk/aws-lambda";

export const apiKeyEnvVar = "DD_API_KEY";
export const apiKeyKMSEnvVar = "DD_KMS_API_KEY";
export const siteURLEnvVar = "DD_SITE";
export const logForwardingEnvVar = "DD_FLUSH_TO_LOG";
export const logLevelEnvVar = "DD_LOG_LEVEL";
export const enableDDTracingEnvVar = "DD_TRACE_ENABLED";
export const injectLogContextEnvVar = "DD_LOG_INJECTION";

export const defaultEnvVar = {
  addLayers: true,
  site: "datadoghq.com",
  flushMetricstoLogs: true,
  logLevel: "info",
  enableDDTracing: true,
  injectLogContext: true
};

export function applyEnvVariables(
    lambdas: lambda.Function[],
    flushMetricstoLogs: boolean,
    site: string,
    apiKey: string | undefined,
    apiKMSKey: string | undefined,
    logLevel: string,
    enableDDTracing: boolean,
    injectLogContext: boolean
  ) {
    const errors: string[] = []
    lambdas.forEach((l) => {
        l.addEnvironment(logForwardingEnvVar, flushMetricstoLogs.toString().toLowerCase());
        l.addEnvironment(siteURLEnvVar, site.toLowerCase());
        l.addEnvironment(logLevelEnvVar, logLevel.toLowerCase());
        l.addEnvironment(enableDDTracingEnvVar, enableDDTracing.toString().toLowerCase());
        l.addEnvironment(injectLogContextEnvVar, injectLogContext.toString().toLowerCase());

        if (apiKey != undefined && apiKMSKey != undefined) {
          errors.push("The parameters apiKey and apiKMSKey are mutually exclusive. Please note this is only necessary if flushMetricstoLogs is set to false")
        };
        if (apiKey != undefined && apiKMSKey === undefined) {
            l.addEnvironment(apiKeyEnvVar, apiKey)
        };
        if (apiKey === undefined && apiKMSKey != undefined) {
            l.addEnvironment(apiKeyKMSEnvVar, apiKMSKey);
        };
      }
    );
};