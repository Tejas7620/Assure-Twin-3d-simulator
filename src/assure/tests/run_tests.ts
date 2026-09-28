// Browser polyfill for Node test execution
if (typeof (globalThis as any).requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (callback: any) => setTimeout(callback, 16);
}
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {
    public onopen: any = null;
    public onclose: any = null;
    public onmessage: any = null;
    public onerror: any = null;
    public readyState: number = 0;
    public send(): void {}
  };
}

import { AssureTestSuite } from './AssureTestSuite.ts';

const report = AssureTestSuite.runAll();
console.log('====================================================');
console.log(`TOTAL SUITES / TESTS: ${report.total}`);
console.log(`PASSED:               ${report.passed}`);
console.log(`FAILED:               ${report.failed}`);
console.log('----------------------------------------------------');

for (const r of report.results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} [${r.suite.padEnd(20)}] ${r.name.padEnd(40)} => ${r.message}`);
}
console.log('====================================================');
if (report.failed === 0) {
  console.log('SUCCESS: All 20 engine suites passed verification with 0 errors.');
  (globalThis as any).process?.exit(0);
} else {
  console.error(`FAILURE: ${report.failed} test(s) failed.`);
  (globalThis as any).process?.exit(1);
}
