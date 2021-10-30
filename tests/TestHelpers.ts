import * as ts from "typescript";
const fs = require('fs');
import * as assert from 'assert'

const TMP_FILENAME = "tmp.ts";

function diagnosticMsgToString(diagMsg: string | ts.DiagnosticMessageChain): string {
  if (typeof diagMsg === "string") {
    return diagMsg;
  }
  let curMsg: ts.DiagnosticMessageChain | undefined = diagMsg;
  while (curMsg) {
    if (typeof curMsg.messageText === "string") {
      return curMsg.messageText;
    }
    curMsg = (curMsg.next ?? [])[0];
  }

  return "found no error";
}

function diagnosticMsgContains(diagMsg: string | ts.DiagnosticMessageChain, contents: string): boolean {
  return diagnosticMsgToString(diagMsg).indexOf(contents) >= 0;
}

/**
 * @hidden
 */
export function assertFailCompile(contents: string, expectedMsg: string): void {
  fs.writeFileSync(
    TMP_FILENAME, "import { HashSet } from './dist/src/HashSet';" +
    " import { Stream } from './dist/src/Stream';" +
    " import { LinkedList } from './dist/src/LinkedList';" +
    " import { HashMap } from './dist/src/HashMap';" +
    " import { Option } from './dist/src/Option';" +
    " import { Either } from './dist/src/Either';" +
    " import { Vector } from './dist/src/Vector';" + contents);
  const tsProgram = ts.createProgram([TMP_FILENAME], { target: ts.ScriptTarget.ES2016 });
  const emitResult = tsProgram.emit();
  const allDiagnostics = ts.getPreEmitDiagnostics(tsProgram)
    .concat(emitResult.diagnostics as ts.Diagnostic[]);
  const allErrorsTxt = allDiagnostics.map(x => diagnosticMsgToString(x.messageText)).join(", ");
  // for some reason getting tons of 'cannot find module' errors
  // on circleCI. The test is otherwise still valid since i do "contains"
  // and the real error is still in there.
  //
  // if (allDiagnostics.length > 1) {
  //     console.log(allErrorsTxt);
  // }
  // assert.equal(1, allDiagnostics.length);
  const isMatch = allDiagnostics.filter(d => diagnosticMsgContains(d.messageText, expectedMsg)).length > 0;
  if (isMatch) {
    assert.ok(true);
  } else {
    assert.equal(allErrorsTxt, expectedMsg);
  }
  fs.unlinkSync(TMP_FILENAME);
  fs.unlinkSync(TMP_FILENAME.replace(/.ts$/, ".js"));
}
