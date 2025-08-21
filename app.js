/* KwikSell demo logic (front-end only) */
const state = {
  catalog: {
    Apple: [
      { model: "iPhone 12", base: 22000 },
      { model: "iPhone 13", base: 30000 },
      { model: "iPhone XR", base: 15000 },
    ],
    Samsung: [
      { model: "Galaxy S21", base: 18000 },
      { model: "Galaxy S22", base: 26000 },
      { model: "Galaxy A52", base: 9000 },
    ],
    Xiaomi: [
      { model: "Redmi Note 10", base: 6000 },
      { model: "Mi 11X", base: 12000 },
      { model: "Poco X3", base: 8000 },
    ],
  },
  selectedBrand: null,
  selectedModel: null,
  condition: "excellent",
  issues: new Set(),
  offer: 0,
  cart: JSON.parse(localStorage.getItem("kwiksell_cart") || "[]"),
};

const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];

/* Init */
document.addEventListener("DOMContentLoaded", () => {
  // Year
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setupBrands();
  setupWizard();
  setupCart();
  setupDeviceDetect();
});

/* Brands */
function setupBrands() {
  const brandList = qs("#brandList");
  const brandSelect = qs("#brandSelect");
  brandSelect.innerHTML = "";
  brandList.innerHTML = "";

  Object.keys(state.catalog).forEach((brand, i) => {
    // select options
    const opt = document.createElement("option");
    opt.value = brand;
    opt.textContent = brand;
    brandSelect.appendChild(opt);

    // pills
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "brand-pill";
    pill.textContent = brand;
    pill.addEventListener("click", () => {
      brandSelect.value = brand;
      state.selectedBrand = brand;
      state.selectedModel = null; // reset model when switching brand
      renderModels();
      activateBrandPill(brand);
      document.getElementById("sell").scrollIntoView({ behavior: "smooth" });
    });
    brandList.appendChild(pill);

    if (i === 0) state.selectedBrand = brand;
  });

  activateBrandPill(state.selectedBrand);
  brandSelect.value = state.selectedBrand;
  renderModels();

  brandSelect.addEventListener("change", () => {
    state.selectedBrand = brandSelect.value;
    state.selectedModel = null;
    renderModels();
  });

  // Bind search input ONCE here
  const search = qs("#searchInput");
  if (search) search.addEventListener("input", (e) => renderModels(e.target.value));
}

function activateBrandPill(brand) {
  qsa(".brand-pill").forEach((p) =>
    p.classList.toggle("active", p.textContent === brand)
  );
}

function renderModels(filterText = "") {
  const models = state.catalog[state.selectedBrand] || [];
  const area = qs("#modelCards");
  const modelSelect = qs("#modelSelect");
  area.innerHTML = "";
  modelSelect.innerHTML = "";

  const filtered = models.filter((m) =>
    m.model.toLowerCase().includes(filterText.toLowerCase())
  );

  filtered.forEach((m, idx) => {
    // dropdown option
    const opt = document.createElement("option");
    opt.value = m.model;
    opt.textContent = m.model;
    modelSelect.appendChild(opt);

    // clickable card
    const card = document.createElement("button");
    card.type = "button";
    card.className = "model-card";
    card.innerHTML = `<strong>${m.model}</strong>
      <p class="muted">Base up to ₹${m.base.toLocaleString()}</p>`;
    card.addEventListener("click", () => {
      state.selectedModel = m;
      qsa(".model-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      modelSelect.value = m.model;
    });
    area.appendChild(card);

    // default select first
    if (idx === 0 && !state.selectedModel) {
      state.selectedModel = m;
      card.classList.add("active");
      modelSelect.value = m.model;
    }
  });

  // dropdown change
  modelSelect.onchange = () => {
    const picked = filtered.find((x) => x.model === modelSelect.value) || null;
    state.selectedModel = picked;
    qsa(".model-card").forEach((c) => {
      c.classList.toggle(
        "active",
        picked && c.textContent.includes(picked.model)
      );
    });
  };
}

/* Wizard */
function setupWizard() {
  const toStep2 = qs("#toStep2");
  const backTo1 = qs("#backTo1");
  const backTo2 = qs("#backTo2");
  const calcBtn = qs("#calcPriceBtn");
  const addToCartBtn = qs("#addToCartBtn");

  if (toStep2)
    toStep2.addEventListener("click", () => gotoStep(2));
  if (backTo1)
    backTo1.addEventListener("click", () => gotoStep(1));
  if (backTo2)
    backTo2.addEventListener("click", () => gotoStep(2));

  if (calcBtn)
    calcBtn.addEventListener("click", (e) => {
      e.preventDefault();
      calcPrice();
    });

  if (addToCartBtn)
    addToCartBtn.addEventListener("click", addToCart);

  // condition radios
  qsa('input[name="condition"]').forEach((r) => {
    r.addEventListener("change", (e) => {
      state.condition = e.target.value;
    });
  });

  // issue checkboxes
  qsa('.checkboxes input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      if (e.target.checked) state.issues.add(e.target.value);
      else state.issues.delete(e.target.value);
    });
  });
}

function gotoStep(n) {
  qsa(".wizard-step").forEach((step) => {
    step.classList.toggle("hidden", step.dataset.step !== String(n));
  });
}

function calcPrice() {
  if (!state.selectedModel) {
    alert("Please select a model first.");
    return;
  }
  const base = state.selectedModel.base;

  const conditionMultiplier = {
    excellent: 1.0,
    good: 0.82,
    fair: 0.62,
  }[state.condition] || 0.8;

  const issuePenalty = {
    screenCrack: 0.7,
    batteryPoor: 0.85,
    cameraFault: 0.8,
    waterDamage: 0.4,
  };

  let price = base * conditionMultiplier;
  state.issues.forEach((code) => (price *= issuePenalty[code] || 1));

  // round to nearest 10, min 500
  price = Math.max(500, Math.round(price / 10) * 10);
  state.offer = price;

  qs("#offerTitle").textContent = `${state.selectedBrand} ${state.selectedModel.model} • ${capitalize(state.condition)} condition`;
  qs("#offerAmount").textContent = price.toLocaleString("en-IN");

  gotoStep(3);
}

/* Helper: capitalize */
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* Device detection (very rough demo) */
function setupDeviceDetect() {
  const btn = qs("#detectDeviceBtn");
  const out = qs("#detectResult");
  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const ua = navigator.userAgent;
    let guess = "Couldn’t detect your model. Please pick from the list.";
    if (/iPhone/i.test(ua)) guess = "Looks like you're on an iPhone.";
    else if (/Samsung|SM-|Galaxy/i.test(ua)) guess = "Looks like you're on a Samsung Galaxy.";
    else if (/Mi|Redmi|Xiaomi|Poco/i.test(ua)) guess = "Looks like you're on a Xiaomi/Redmi/Poco device.";

    out.textContent = guess;
  });
}

/* Cart functions */
function setupCart() {
  const list = qs("#cartItems");
  const totalEl = qs("#cartTotal");
  const checkoutBtn = qs("#checkoutBtn");

  function render() {
    list.innerHTML = "";
    let total = 0;
    state.cart.forEach((item, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `${item.brand} ${item.model} - ₹${item.price.toLocaleString("en-IN")}
        <button data-idx="${idx}" class="remove">✖</button>`;
      list.appendChild(li);
      total += item.price;
    });
    totalEl.textContent = total.toLocaleString("en-IN");
    localStorage.setItem("kwiksell_cart", JSON.stringify(state.cart));
  }

  list.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove")) {
      const idx = e.target.dataset.idx;
      state.cart.splice(idx, 1);
      render();
    }
  });

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      alert("Proceeding to checkout...");
    });
  }

  render();
}

/* Add to cart */
function addToCart() {
  if (!state.offer || !state.selectedModel) {
    alert("Please calculate price first!");
    return;
  }
  state.cart.push({
    brand: state.selectedBrand,
    model: state.selectedModel.model,
    price: state.offer,
  });
  localStorage.setItem("kwiksell_cart", JSON.stringify(state.cart));
  alert("Added to cart!");
}
