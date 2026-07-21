Tools.timestamp = function (root) {
  root.innerHTML = `
    <div class="card">
      <div class="server-time" id="server-time">
        <span>服务器时间加载中…</span>
      </div>
      <div class="row">
        <button type="button" class="btn secondary" id="ts-refresh">刷新服务器时间</button>
        <button type="button" class="btn secondary" id="ts-now">填入当前本地时间戳</button>
      </div>
      <div class="row grid-2">
        <div class="field">
          <label for="ts-unix">时间戳（秒 / 毫秒）</label>
          <input type="text" id="ts-unix" placeholder="1700000000 或 1700000000000" />
        </div>
        <div class="field">
          <label for="ts-datetime">标准时间（本地）</label>
          <input type="text" id="ts-datetime" placeholder="2024-01-01 12:00:00" />
        </div>
      </div>
      <div class="row">
        <button type="button" class="btn" id="ts-to-date">时间戳 → 时间</button>
        <button type="button" class="btn secondary" id="ts-to-unix">时间 → 时间戳</button>
      </div>
      ${resultBlock("ts-result")}
    </div>`;

  wireResultActions(root);

  async function loadServerTime() {
    const box = $("#server-time", root);
    try {
      const data = await api("/api/time");
      box.innerHTML = `
        <span>Unix: <strong>${data.unix}</strong></span>
        <span>毫秒: <strong>${data.unix_ms}</strong></span>
        <span>本地: <strong>${data.local}</strong></span>
        <span>时区: <strong>${data.timezone}</strong></span>
        <span>UTC: <strong>${data.utc}</strong></span>`;
    } catch (e) {
      box.innerHTML = `<span class="error">无法获取服务器时间: ${e.message}</span>`;
    }
  }

  loadServerTime();
  $("#ts-refresh", root).onclick = loadServerTime;

  $("#ts-now", root).onclick = () => {
    $("#ts-unix", root).value = String(Date.now());
  };

  $("#ts-to-date", root).onclick = () => {
    try {
      let n = Number($("#ts-unix", root).value.trim());
      if (!Number.isFinite(n)) throw new Error("时间戳无效");
      if (n < 1e12) n *= 1000;
      const d = new Date(n);
      if (Number.isNaN(d.getTime())) throw new Error("时间戳无效");
      const local = formatLocal(d);
      $("#ts-datetime", root).value = local;
      setResult(
        "ts-result",
        [
          `本地: ${local}`,
          `UTC:  ${formatUTC(d)}`,
          `ISO:  ${d.toISOString()}`,
          `秒:   ${Math.floor(d.getTime() / 1000)}`,
          `毫秒: ${d.getTime()}`,
        ].join("\n")
      );
    } catch (e) {
      setResult("ts-result", null, e.message);
    }
  };

  $("#ts-to-unix", root).onclick = () => {
    try {
      const raw = $("#ts-datetime", root).value.trim();
      if (!raw) throw new Error("请输入标准时间");
      const d = parseDateTime(raw);
      if (Number.isNaN(d.getTime())) throw new Error("时间格式无效，示例: 2024-01-01 12:00:00");
      $("#ts-unix", root).value = String(d.getTime());
      setResult(
        "ts-result",
        [`秒:   ${Math.floor(d.getTime() / 1000)}`, `毫秒: ${d.getTime()}`, `ISO:  ${d.toISOString()}`].join("\n")
      );
    } catch (e) {
      setResult("ts-result", null, e.message);
    }
  };
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatUTC(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function parseDateTime(raw) {
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return new Date(raw);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0)
    );
  }
  return new Date(raw);
}
