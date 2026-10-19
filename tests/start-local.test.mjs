import assert from "node:assert/strict";
import { test } from "node:test";
import net from "node:net";
import { supportedNode, parseOptions, selectPort } from "../scripts/start-local.mjs";

test("launcher validates versions and arguments", () => {
  assert.equal(supportedNode("20.8.0"), false);
  assert.equal(supportedNode("20.9.0"), true);
  assert.equal(supportedNode("24.21.0"), true);
  assert.deepEqual(parseOptions(["--check", "--no-browser", "--port", "3100"]), { check: true, browser: false, port: 3100 });
  for (const args of [["--port"], ["--port", "1"], ["--port", "3000&whoami"], ["--unknown"]]) assert.throws(() => parseOptions(args));
});

test("occupied ports are skipped without terminating their process, existing app is reused", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    const selected = await selectPort(port, async () => false);
    assert.equal(selected.existing, false);
    assert.notEqual(selected.port, port);
    assert(server.listening);
    assert.deepEqual(await selectPort(port, async (candidate) => candidate === port), { port, existing: true });
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
