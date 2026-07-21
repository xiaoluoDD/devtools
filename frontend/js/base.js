Tools.base = function (root) {
  root.innerHTML = `
    <div class="card">
      <div class="row grid-2">
        <div class="field">
          <label for="base-from">源进制</label>
          <select id="base-from">
            <option value="2">2 进制</option>
            <option value="8">8 进制</option>
            <option value="10" selected>10 进制</option>
            <option value="16">16 进制</option>
          </select>
        </div>
        <div class="field">
          <label for="base-to">目标进制</label>
          <select id="base-to">
            <option value="2">2 进制</option>
            <option value="8">8 进制</option>
            <option value="10">10 进制</option>
            <option value="16" selected>16 进制</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="base-input">输入</label>
        <input type="text" id="base-input" placeholder="例如 255 或 FF" />
      </div>
      <div class="row">
        <button type="button" class="btn" id="base-convert">转换</button>
        <button type="button" class="btn secondary" id="base-swap">交换进制</button>
      </div>
      ${resultBlock("base-result")}
      <p class="hint">支持大整数（BigInt），十六进制可带 0x 前缀。</p>
    </div>`;

  wireResultActions(root);

  $("#base-swap", root).onclick = () => {
    const from = $("#base-from", root);
    const to = $("#base-to", root);
    const tmp = from.value;
    from.value = to.value;
    to.value = tmp;
  };

  $("#base-convert", root).onclick = () => {
    try {
      let raw = $("#base-input", root).value.trim().replace(/\s+/g, "");
      if (!raw) throw new Error("请输入数值");
      const from = Number($("#base-from", root).value);
      const to = Number($("#base-to", root).value);
      if (from === 16 && /^0x/i.test(raw)) raw = raw.slice(2);
      if (from === 2 && /^0b/i.test(raw)) raw = raw.slice(2);
      if (from === 8 && /^0o/i.test(raw)) raw = raw.slice(2);

      const n = BigInt(parseIntSafe(raw, from));
      let out = n.toString(to);
      if (to === 16) out = out.toUpperCase();
      setResult("base-result", out);
    } catch (e) {
      setResult("base-result", null, e.message || "转换失败");
    }
  };
};

function parseIntSafe(str, base) {
  const digits = "0123456789abcdefghijklmnopqrstuvwxyz".slice(0, base);
  const re = new RegExp(`^-?[${digits}]+$`, "i");
  if (!re.test(str)) throw new Error(`不是合法的 ${base} 进制数`);
  // BigInt 构造对非 10 进制需手动解析
  const neg = str[0] === "-";
  const body = neg ? str.slice(1) : str;
  let n = 0n;
  const b = BigInt(base);
  for (const ch of body.toLowerCase()) {
    const v = BigInt(digits.indexOf(ch));
    n = n * b + v;
  }
  return neg ? -n : n;
}
