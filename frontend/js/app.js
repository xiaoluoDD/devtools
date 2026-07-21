const API_BASE = (() => {
  const params = new URLSearchParams(location.search);
  if (params.get("api")) return params.get("api").replace(/\/$/, "");
  // 本地直接打开 file:// 或静态服务时，默认打到后端
  if (location.protocol === "file:" || location.port === "5500" || location.port === "3000") {
    return "http://127.0.0.1:8080";
  }
  return "";
})();

const Tools = {};

const META = {
  json: { title: "JSON 格式化", desc: "格式化、压缩与转义，纯前端即时处理" },
  base64: { title: "Base64 编解码", desc: "通过后端 API 进行 Base64 编码与解码" },
  url: { title: "URL 编解码", desc: "URL QueryEscape / QueryUnescape" },
  timestamp: { title: "时间戳转换", desc: "本地互转，并可校准服务器时间" },
  uuid: { title: "UUID / 随机密码", desc: "生成 UUID v4 与安全随机密码" },
  base: { title: "进制转换", desc: "2 / 8 / 10 / 16 进制互转，纯前端" },
  hash: { title: "MD5 / SHA 哈希", desc: "计算 MD5、SHA1、SHA256" },
  qrcode: { title: "二维码生成", desc: "将文本生成 PNG 二维码" },
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 1800);
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制到剪贴板");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("已复制到剪贴板");
  }
}

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`请求失败 (${res.status})`);
  }
  if (!body.ok) {
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return body.data;
}

function resultBlock(id = "result") {
  return `
    <div class="field result-box">
      <label>结果</label>
      <pre id="${id}" class="result-text"></pre>
      <div class="result-actions">
        <button type="button" class="btn secondary" data-copy="${id}">复制结果</button>
        <button type="button" class="btn ghost" data-clear="${id}">清空</button>
      </div>
      <div class="error" id="${id}-err" hidden></div>
    </div>`;
}

function wireResultActions(root) {
  root.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.dataset.copy);
      copyText(el ? el.textContent : "");
    });
  });
  root.querySelectorAll("[data-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.dataset.clear);
      const err = document.getElementById(`${btn.dataset.clear}-err`);
      if (el) el.textContent = "";
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
    });
  });
}

function setResult(id, text, errMsg) {
  const el = document.getElementById(id);
  const err = document.getElementById(`${id}-err`);
  if (errMsg) {
    if (el) el.textContent = "";
    if (err) {
      err.hidden = false;
      err.textContent = errMsg;
    }
    return;
  }
  if (err) {
    err.hidden = true;
    err.textContent = "";
  }
  if (el) el.textContent = text == null ? "" : String(text);
}

function switchTool(name) {
  const meta = META[name];
  if (!meta || !Tools[name]) return;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === name);
  });
  $("#tool-title").textContent = meta.title;
  $("#tool-desc").textContent = meta.desc;

  const panel = $("#panel");
  panel.innerHTML = "";
  Tools[name](panel);
  history.replaceState(null, "", `#${name}`);
}

document.addEventListener("DOMContentLoaded", () => {
  $("#nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    switchTool(btn.dataset.tool);
  });

  const hash = (location.hash || "#json").slice(1);
  switchTool(META[hash] ? hash : "json");
});
