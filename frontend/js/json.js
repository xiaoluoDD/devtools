Tools.json = function (root) {
  root.innerHTML = `
    <div class="card">
      <div class="field">
        <label for="json-input">输入 JSON</label>
        <textarea id="json-input" placeholder='{"name":"devtools","ok":true}'></textarea>
      </div>
      <div class="row">
        <button type="button" class="btn" id="json-fmt">格式化</button>
        <button type="button" class="btn secondary" id="json-minify">压缩</button>
        <button type="button" class="btn secondary" id="json-escape">转义</button>
        <button type="button" class="btn secondary" id="json-unescape">去转义</button>
      </div>
      ${resultBlock("json-result")}
    </div>`;

  wireResultActions(root);

  const input = $("#json-input", root);

  $("#json-fmt", root).onclick = () => {
    try {
      const obj = JSON.parse(input.value);
      const out = JSON.stringify(obj, null, 2);
      input.value = out;
      setResult("json-result", out);
    } catch (e) {
      setResult("json-result", null, "JSON 解析失败: " + e.message);
    }
  };

  $("#json-minify", root).onclick = () => {
    try {
      const obj = JSON.parse(input.value);
      const out = JSON.stringify(obj);
      input.value = out;
      setResult("json-result", out);
    } catch (e) {
      setResult("json-result", null, "JSON 解析失败: " + e.message);
    }
  };

  $("#json-escape", root).onclick = () => {
    try {
      const out = JSON.stringify(input.value);
      setResult("json-result", out);
    } catch (e) {
      setResult("json-result", null, e.message);
    }
  };

  $("#json-unescape", root).onclick = () => {
    try {
      let raw = input.value.trim();
      if (!raw.startsWith('"')) raw = `"${raw}"`;
      const out = JSON.parse(raw);
      if (typeof out !== "string") throw new Error("结果不是字符串");
      setResult("json-result", out);
    } catch (e) {
      setResult("json-result", null, "去转义失败: " + e.message);
    }
  };
};
