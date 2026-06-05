import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export function initTracing() {
  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  const sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // ⚠️ pg 自动埋点会 patch pool.connect，每次取连接都给 pg Pool 注册一个不移除的
        // 'release' 监听器，随查询数无界增长 → MaxListenersExceededWarning + 连接池退化，
        // 前端请求逐渐卡住。禁用此项（HTTP/express 等埋点保留）。
        // 待 @opentelemetry/instrumentation-pg 修复该泄漏后可重新开启以恢复 DB query span。
        '@opentelemetry/instrumentation-pg': { enabled: false },
      }),
    ],
    serviceName: process.env.OTEL_SERVICE_NAME || 'vidcraft-api',
  });

  sdk.start();
  console.log('OpenTelemetry tracing initialized');
}
