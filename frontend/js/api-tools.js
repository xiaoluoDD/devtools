Tools.base64 = function (root) {
  root.innerHTML = encodePanel({
    id: "b64",
    placeholder: "输入文本…",
    encodeId: "b64-encode",
    decodeId: "b64-decode",
  });
  wireEncodeTool(root, "b64", "/api/base64");
};

Tools.url = function (root) {
  root.innerHTML = encodePanel({
    id: "url",
    placeholder: "输入 URL 或查询字符串…",
    encodeId: "url-encode",
    decodeId: "url-decode",
  });
  wireEncodeTool(root, "url", "/api/url");
};

Tools.hash = function (root) {
  root.innerHTML = `
    <div class="card">
      <div class="field">
        <label for="hash-input">输入文本</label>
        <textarea id="hash-input" placeholder="要计算哈希的文本"></textarea>
      </div>
      <div class="row">
        <button type="button" class="btn" data-algo="md5">MD5</button>
        <button type="button" class="btn secondary" data-algo="sha1">SHA1</button>
        <button type="button" class="btn secondary" data-algo="sha256">SHA256</button>
        <button type="button" class="btn secondary" id="hash-all">全部计算</button>
      </div>
      ${resultBlock("hash-result")}
    </div>`;
  wireResultActions(root);

  async function run(algo) {
    const text = $("#hash-input", root).value;
    try {
      const data = await api("/api/hash", {
        method: "POST",
        body: JSON.stringify({ text, algo }),
      });
      return `${algo.toUpperCase()}: ${data}`;
    } catch (e) {
      throw e;
    }
  }

  root.querySelectorAll("[data-algo]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        setResult("hash-result", await run(btn.dataset.algo));
      } catch (e) {
        setResult("hash-result", null, e.message);
      }
    };
  });

  $("#hash-all", root).onclick = async () => {
    try {
      const lines = [];
      for (const algo of ["md5", "sha1", "sha256"]) {
        lines.push(await run(algo));
      }
      setResult("hash-result", lines.join("\n"));
    } catch (e) {
      setResult("hash-result", null, e.message);
    }
  };
};

Tools.uuid = function (root) {
  root.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 14px;font-size:15px;">UUID</h3>
      <div class="row">
        <div class="field" style="margin:0;width:120px;">
          <label for="uuid-count">数量</label>
          <input type="number" id="uuid-count" value="1" min="1" max="100" />
        </div>
        <button type="button" class="btn" id="uuid-gen" style="align-self:flex-end;">生成 UUID</button>
      </div>
      ${resultBlock("uuid-result")}

      <h3 style="margin:24px 0 14px;font-size:15px;">随机密码</h3>
      <div class="row">
        <div class="field" style="margin:0;width:120px;">
          <label for="pw-len">长度</label>
          <input type="number" id="pw-len" value="16" min="4" max="128" />
        </div>
        <div class="field" style="margin:0;width:120px;">
          <label for="pw-count">数量</label>
          <input type="number" id="pw-count" value="1" min="1" max="50" />
        </div>
        <label class="check" style="align-self:flex-end;margin-bottom:4px;">
          <input type="checkbox" id="pw-symbols" checked /> 含符号
        </label>
        <button type="button" class="btn" id="pw-gen" style="align-self:flex-end;">生成密码</button>
      </div>
      ${resultBlock("pw-result")}
    </div>`;
  wireResultActions(root);

  $("#uuid-gen", root).onclick = async () => {
    try {
      const count = Number($("#uuid-count", root).value) || 1;
      const data = await api("/api/uuid", {
        method: "POST",
        body: JSON.stringify({ count }),
      });
      setResult("uuid-result", Array.isArray(data) ? data.join("\n") : data);
    } catch (e) {
      setResult("uuid-result", null, e.message);
    }
  };

  $("#pw-gen", root).onclick = async () => {
    try {
      const data = await api("/api/password", {
        method: "POST",
        body: JSON.stringify({
          length: Number($("#pw-len", root).value) || 16,
          count: Number($("#pw-count", root).value) || 1,
          symbols: $("#pw-symbols", root).checked,
        }),
      });
      setResult("pw-result", Array.isArray(data) ? data.join("\n") : data);
    } catch (e) {
      setResult("pw-result", null, e.message);
    }
  };
};

Tools.qrcode = function (root) {
  root.innerHTML = `
    <div class="card">
      <div class="field">
        <label for="qr-input">文本内容</label>
        <textarea id="qr-input" placeholder="https://example.com 或任意文本"></textarea>
      </div>
      <div class="row">
        <div class="field" style="margin:0;width:140px;">
          <label for="qr-size">尺寸 (px)</label>
          <input type="number" id="qr-size" value="256" min="64" max="1024" />
        </div>
        <button type="button" class="btn" id="qr-gen" style="align-self:flex-end;">生成二维码</button>
      </div>
      <div class="error" id="qr-err" hidden></div>
      <div class="qr-preview" id="qr-preview" hidden>
        <img id="qr-img" alt="QR Code" />
      </div>
      <div class="result-actions" id="qr-actions" hidden>
        <a class="btn secondary" id="qr-download" download="qrcode.png">下载 PNG</a>
      </div>
    </div>`;

  $("#qr-gen", root).onclick = async () => {
    const err = $("#qr-err", root);
    const preview = $("#qr-preview", root);
    const actions = $("#qr-actions", root);
    err.hidden = true;
    try {
      const data = await api("/api/qrcode", {
        method: "POST",
        body: JSON.stringify({
          text: $("#qr-input", root).value,
          size: Number($("#qr-size", root).value) || 256,
        }),
      });
      const img = $("#qr-img", root);
      img.src = data.data_url;
      preview.hidden = false;
      actions.hidden = false;
      $("#qr-download", root).href = data.data_url;
    } catch (e) {
      preview.hidden = true;
      actions.hidden = true;
      err.hidden = false;
      err.textContent = e.message;
    }
  };
};

function encodePanel({ id, placeholder, encodeId, decodeId }) {
  return `
    <div class="card">
      <div class="field">
        <label for="${id}-input">输入</label>
        <textarea id="${id}-input" placeholder="${placeholder}"></textarea>
      </div>
      <div class="row">
        <button type="button" class="btn" id="${encodeId}">编码</button>
        <button type="button" class="btn secondary" id="${decodeId}">解码</button>
      </div>
      ${resultBlock(`${id}-result`)}
    </div>`;
}

function wireEncodeTool(root, id, path) {
  wireResultActions(root);
  const run = async (action) => {
    try {
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify({ text: $(`#${id}-input`, root).value, action }),
      });
      setResult(`${id}-result`, data);
    } catch (e) {
      setResult(`${id}-result`, null, e.message);
    }
  };
  $(`#${id}-encode`, root).onclick = () => run("encode");
  $(`#${id}-decode`, root).onclick = () => run("decode");
}
