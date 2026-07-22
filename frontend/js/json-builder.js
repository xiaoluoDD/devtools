Tools.jsonBuild = function (root) {
  root.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:12px;">
        <p class="muted" style="margin:0;">按行添加字段，右侧实时生成 JSON 对象</p>
        <div class="row" style="margin:0;">
          <button type="button" class="btn secondary" id="jb-add">添加字段</button>
          <button type="button" class="btn ghost" id="jb-clear">清空</button>
        </div>
      </div>

      <div class="jb-table-wrap">
        <table class="jb-table" id="jb-table">
          <thead>
            <tr>
              <th style="width:28%">Key</th>
              <th style="width:18%">类型</th>
              <th>Value</th>
              <th style="width:56px"></th>
            </tr>
          </thead>
          <tbody id="jb-body"></tbody>
        </table>
      </div>

      <div class="row" style="margin-top:16px;">
        <label class="check"><input type="checkbox" id="jb-pretty" checked /> 格式化输出</label>
        <button type="button" class="btn" id="jb-build">生成 JSON</button>
        <button type="button" class="btn secondary" id="jb-copy">复制结果</button>
      </div>
      ${resultBlock("jb-result")}
      <p class="hint">string 原样写入；number / boolean / null 按类型解析；重复 key 后者覆盖前者。</p>
    </div>`;

  wireResultActions(root);
  const tbody = $("#jb-body", root);

  function addRow(key = "", type = "string", value = "") {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="jb-key" placeholder="key" value="${escapeAttr(key)}" /></td>
      <td>
        <select class="jb-type">
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="null">null</option>
          <option value="json">json</option>
        </select>
      </td>
      <td><input type="text" class="jb-value" placeholder="value" value="${escapeAttr(value)}" /></td>
      <td><button type="button" class="btn ghost jb-del" title="删除">删除</button></td>`;
    tr.querySelector(".jb-type").value = type;
    syncValueInput(tr);
    tbody.appendChild(tr);
  }

  function syncValueInput(tr) {
    const type = tr.querySelector(".jb-type").value;
    const val = tr.querySelector(".jb-value");
    if (type === "null") {
      val.value = "";
      val.placeholder = "（无需填写）";
      val.disabled = true;
    } else if (type === "boolean") {
      val.disabled = false;
      val.placeholder = "true / false";
    } else if (type === "number") {
      val.disabled = false;
      val.placeholder = "123";
    } else if (type === "json") {
      val.disabled = false;
      val.placeholder = '{"a":1} 或 [1,2]';
    } else {
      val.disabled = false;
      val.placeholder = "value";
    }
  }

  function parseValue(type, raw) {
    switch (type) {
      case "null":
        return null;
      case "number": {
        const n = Number(String(raw).trim());
        if (!Number.isFinite(n)) throw new Error(`数字无效: ${raw}`);
        return n;
      }
      case "boolean": {
        const s = String(raw).trim().toLowerCase();
        if (s === "true" || s === "1") return true;
        if (s === "false" || s === "0") return false;
        throw new Error(`布尔值无效: ${raw}（请填 true/false）`);
      }
      case "json": {
        try {
          return JSON.parse(String(raw));
        } catch (e) {
          throw new Error(`JSON 片段无效: ${e.message}`);
        }
      }
      default:
        return String(raw);
    }
  }

  function buildObject() {
    const obj = {};
    const rows = [...tbody.querySelectorAll("tr")];
    for (const tr of rows) {
      const key = tr.querySelector(".jb-key").value.trim();
      if (!key) continue;
      const type = tr.querySelector(".jb-type").value;
      const raw = tr.querySelector(".jb-value").value;
      obj[key] = parseValue(type, raw);
    }
    return obj;
  }

  function refresh() {
    try {
      const obj = buildObject();
      const pretty = $("#jb-pretty", root).checked;
      const out = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
      setResult("jb-result", out);
      return out;
    } catch (e) {
      setResult("jb-result", null, e.message);
      return null;
    }
  }

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".jb-del");
    if (!btn) return;
    const tr = btn.closest("tr");
    if (tbody.children.length <= 1) {
      tr.querySelector(".jb-key").value = "";
      tr.querySelector(".jb-value").value = "";
      tr.querySelector(".jb-type").value = "string";
      syncValueInput(tr);
    } else {
      tr.remove();
    }
    refresh();
  });

  tbody.addEventListener("change", (e) => {
    if (e.target.classList.contains("jb-type")) {
      syncValueInput(e.target.closest("tr"));
    }
    refresh();
  });

  tbody.addEventListener("input", () => refresh());

  $("#jb-add", root).onclick = () => {
    addRow();
    refresh();
  };

  $("#jb-clear", root).onclick = () => {
    tbody.innerHTML = "";
    addRow();
    addRow();
    refresh();
  };

  $("#jb-build", root).onclick = () => refresh();
  $("#jb-pretty", root).onchange = () => refresh();
  $("#jb-copy", root).onclick = () => {
    const out = refresh();
    if (out != null) copyText(out);
  };

  // 默认两行示例，方便上手
  addRow("name", "string", "devtools");
  addRow("ok", "boolean", "true");
  refresh();
};

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
