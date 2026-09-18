import http from "node:http";
import fs from "node:fs";

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

export async function connect(port = 9224) {
  const tabs = await getJSON(`http://127.0.0.1:${port}/json`);
  const tab = tabs.find((t) => t.type === "page") || tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  await send("Page.enable");

  return {
    ws,
    send,
    async evaluate(expression) {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return result.result.value;
    },
    async bodyText() {
      return this.evaluate("document.body.innerText");
    },
    async screenshot(path) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path, Buffer.from(shot.data, "base64"));
    },
    async sleep(ms) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
    async clickByText(text, exact = false) {
      return this.evaluate(`(() => {
        const target = ${JSON.stringify(text)};
        const matches = Array.from(document.querySelectorAll("body *")).filter((el) => {
          const t = (el.innerText || "").trim();
          return t && (${exact} ? t === target : t.includes(target)) && el.children.length < 8;
        });
        const el = matches.find((x) => x.closest("button, a, [role=button], li, article, [class*=card], [class*=item]")) || matches[0];
        if (!el) return "NOT_FOUND:" + target;
        el.click();
        return "CLICKED:" + el.tagName + ":" + el.className;
      })()`);
    },
    async fill(selector, value) {
      return this.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return "NO_EL";
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return "FILLED";
      })()`);
    },
    async clickSelector(selector) {
      return this.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return "NO_EL";
        el.click();
        return "CLICKED";
      })()`);
    },
    close() {
      ws.close();
    }
  };
}
