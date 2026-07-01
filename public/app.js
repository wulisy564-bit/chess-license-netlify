const loginForm = document.querySelector("#loginForm");
const redeemForm = document.querySelector("#redeemForm");
const loginTab = document.querySelector("#loginTab");
const redeemTab = document.querySelector("#redeemTab");
const statusBox = document.querySelector("#status");
const playLink = document.querySelector("#playLink");
const logoutButton = document.querySelector("#logoutButton");

function getDeviceId() {
  const key = "chess_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function getSessionToken() {
  return localStorage.getItem("chess_session_token") || "";
}

function setSessionToken(token) {
  if (token) localStorage.setItem("chess_session_token", token);
}

function clearSessionToken() {
  localStorage.removeItem("chess_session_token");
}

function getPlayUrl() {
  return `/.netlify/functions/play?deviceId=${encodeURIComponent(getDeviceId())}&token=${encodeURIComponent(getSessionToken())}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-device-id": getDeviceId(),
      ...(getSessionToken() ? { authorization: `Bearer ${getSessionToken()}` } : {})
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "请求失败");
  return data;
}

function setTab(tab) {
  const redeem = tab === "redeem";
  redeemForm.classList.toggle("hidden", !redeem);
  loginForm.classList.toggle("hidden", redeem);
  redeemTab.classList.toggle("active", redeem);
  loginTab.classList.toggle("active", !redeem);
}

function render(user) {
  logoutButton.classList.toggle("hidden", !user);
playLink.classList.toggle("hidden", !user?.hasAccess);
  playLink.href = getPlayUrl();

  if (!user) {
    statusBox.textContent = "未登录。请先用手机号登录。";
    setTab("login");
    return;
  }

  if (user.hasAccess) {
    statusBox.innerHTML = `已登录 ${user.phone}，已解锁 ${user.plan || "完整"} 权限。<br><a class="inline-play" href="${getPlayUrl()}">点击这里进入游戏</a>`;
    return;
  }

  statusBox.textContent = `已登录 ${user.phone}，请输入兑换码解锁。`;
  setTab("redeem");
}

loginTab.addEventListener("click", () => setTab("login"));
redeemTab.addEventListener("click", () => setTab("redeem"));

async function enterGame() {
  statusBox.textContent = "正在进入游戏...";
  try {
    const data = await api("/api/check-access", {
      method: "POST",
      body: "{}"
    });
    setSessionToken(data.token);
    const response = await fetch("/.netlify/functions/play", {
      credentials: "include",
      headers: {
        authorization: `Bearer ${getSessionToken()}`,
        "x-device-id": getDeviceId()
      }
    });
    const html = await response.text();
    if (!response.ok) {
      try {
        const payload = JSON.parse(html);
        throw new Error(payload.message || "进入游戏失败");
      } catch (parseError) {
        throw new Error(parseError.message || "进入游戏失败");
      }
    }
    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    statusBox.innerHTML = `${error.message}<br><span style="color:#625b52">如果你换了手机或换了浏览器，需要重新兑换或让我帮你重置设备。</span>`;
  }
}

playLink.addEventListener("click", async (event) => {
  event.preventDefault();
  enterGame();
});

statusBox.addEventListener("click", async (event) => {
  if (!event.target.closest(".inline-play")) return;
  event.preventDefault();
  enterGame();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = new FormData(loginForm).get("phone");
  statusBox.textContent = "正在登录...";
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
    setSessionToken(data.token);
    render(data.user);
  } catch (error) {
    statusBox.textContent = error.message;
  }
});

redeemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = new FormData(redeemForm).get("code");
  statusBox.textContent = "正在兑换...";
  try {
    const data = await api("/api/redeem", {
      method: "POST",
      body: JSON.stringify({ code, deviceId: getDeviceId() })
    });
    setSessionToken(data.token);
    render(data.user);
  } catch (error) {
    statusBox.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  clearSessionToken();
  render(null);
});

api("/api/me")
  .then((data) => {
    setSessionToken(data.token);
    render(data.user);
  })
  .catch(() => render(null));
