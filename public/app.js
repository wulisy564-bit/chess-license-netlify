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

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-device-id": getDeviceId()
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
  playLink.href = `/play?deviceId=${encodeURIComponent(getDeviceId())}`;

  if (!user) {
    statusBox.textContent = "未登录。请先用手机号登录。";
    setTab("login");
    return;
  }

  if (user.hasAccess) {
    statusBox.textContent = `已登录 ${user.phone}，已解锁 ${user.plan || "完整"} 权限。`;
    return;
  }

  statusBox.textContent = `已登录 ${user.phone}，请输入兑换码解锁。`;
  setTab("redeem");
}

loginTab.addEventListener("click", () => setTab("login"));
redeemTab.addEventListener("click", () => setTab("redeem"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = new FormData(loginForm).get("phone");
  statusBox.textContent = "正在登录...";
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
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
    render(data.user);
  } catch (error) {
    statusBox.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  render(null);
});

api("/api/me")
  .then((data) => render(data.user))
  .catch(() => render(null));
