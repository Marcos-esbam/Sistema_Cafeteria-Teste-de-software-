// FILE: app.js
(function(){
  // Dados iniciais (pode ser substituído por fetch para backend)
  const PRODUCTS = [
    { id: 1, name: 'Café Expresso', category: 'Café', priceCents: 450 },
    { id: 2, name: 'Cappuccino', category: 'Café', priceCents: 700 },
    { id: 3, name: 'Pão de Queijo', category: 'Salgado', priceCents: 300 },
    { id: 4, name: 'Bolo de Chocolate', category: 'Sobremesa', priceCents: 650 },
    { id: 5, name: 'Suco Natural', category: 'Bebida', priceCents: 625 }
  ];

  // util
  const fmt = v => (v/100).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const $ = sel => document.querySelector(sel);

  // estado local simples
  const state = { cart: [] };

  // DOM refs
  const productsList = $('#productsList');
  const cartList = $('#cartList');
  const cartEmpty = $('#cartEmpty');
  const subtotalEl = $('#subtotal');
  const totalEl = $('#total');
  const btnEmitir = $('#btnEmitir');
  const btnClear = $('#btnClear');

  const overlay = $('#overlay');
  const recBody = $('#recBody');
  const recId = $('#recId');
  const recDate = $('#recDate');
  const btnPrint = $('#btnPrint');
  const btnClose = $('#btnClose');

  // --- DOM refs adicionais
  const paymentMethodsEl = document.getElementById('paymentMethods');
  const cashBox = document.getElementById('cashBox');
  const cashReceivedInput = document.getElementById('cashReceived');
  const changeInfo = document.getElementById('changeInfo');

  // estado de pagamento
  state.payment = { method: null, cashReceivedCents: 0 };

  // listener: mudança da forma de pagamento
  if (paymentMethodsEl) {
    paymentMethodsEl.addEventListener('change', (e) => {
      const val = e.target.value;
      state.payment.method = val;
      // mostra/oculta campo de dinheiro
      if (val === 'dinheiro') {
        if (cashBox) cashBox.style.display = 'block';
      } else {
        if (cashBox) cashBox.style.display = 'none';
        if (cashReceivedInput) cashReceivedInput.value = '';
        if (changeInfo) changeInfo.textContent = '';
        state.payment.cashReceivedCents = 0;
      }
      updateEmitButtonState();
    });
  }

  // listener: valor recebido em dinheiro (calcula troco)
  if (cashReceivedInput) {
    cashReceivedInput.addEventListener('input', (e) => {
      const v = Number(e.target.value) || 0;
      // armazenar em centavos
      state.payment.cashReceivedCents = Math.round(v * 100);
      updateChangeInfo();
      updateEmitButtonState();
    });
  }

  function updateChangeInfo(){
    const totals = calcTotals();
    const received = state.payment.cashReceivedCents || 0;
    const diff = received - totals.subtotalCents;
    if(received <= 0){
      if (changeInfo) changeInfo.textContent = '';
      return;
    }
    if(diff < 0){
      if (changeInfo) changeInfo.textContent = `Faltam ${formatCents(-diff)} para cobrir o total.`;
    } else {
      if (changeInfo) changeInfo.textContent = `Troco: ${formatCents(diff)}.`;
    }
  }

  // helper para formatar centavos em pt-BR
  function formatCents(cents){
    return (cents/100).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  // desabilita o botão emitir quando sem pagamento ou pedido vazio
  function updateEmitButtonState(){
    const hasItems = state.cart.length > 0;
    const hasMethod = !!state.payment.method;
    if(!hasItems || !hasMethod) {
      btnEmitir.disabled = true;
      return;
    }
    if(state.payment.method === 'dinheiro'){
      // exigir que o valor recebido cubra o total
      const totals = calcTotals();
      if((state.payment.cashReceivedCents || 0) < totals.subtotalCents){
        btnEmitir.disabled = true;
        return;
      }
    }
    btnEmitir.disabled = false;
  }

  // render products
  function renderProducts(){
    productsList.innerHTML = '';
    for(const p of PRODUCTS){
      const li = document.createElement('li');
      li.className = 'product';
      li.innerHTML = `
        <div class="info">
          <div>
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="cat">${escapeHtml(p.category)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="price">${fmt(p.priceCents)}</div>
          <button class="btn btn-secondary" data-id="${p.id}">Adicionar</button>
        </div>
      `;
      productsList.appendChild(li);
    }
  }

  // cart helpers
  function findCartItem(id){ return state.cart.find(it => it.productId === id); }
  function addToCart(productId){
    const prod = PRODUCTS.find(p => p.id === productId);
    if(!prod) return;
    const existing = findCartItem(productId);
    if(existing) existing.qty += 1;
    else state.cart.push({ productId: prod.id, name: prod.name, unitPriceCents: prod.priceCents, qty: 1 });
    renderCart();
  }
  function removeFromCart(productId){
    state.cart = state.cart.filter(it => it.productId !== productId);
    renderCart();
  }
  function changeQty(productId, qty){
    const it = findCartItem(productId);
    if(!it) return;
    it.qty = qty <= 0 ? 1 : qty;
    renderCart();
  }
  function calcTotals(){
    let subtotal = 0;
    for(const it of state.cart) subtotal += it.unitPriceCents * it.qty;
    return { subtotalCents: subtotal };
  }

  // render cart
  function renderCart(){
    cartList.innerHTML = '';
    if(state.cart.length === 0){
      cartEmpty.style.display = 'block';
      btnEmitir.disabled = true;
      btnClear.disabled = true;
      subtotalEl.textContent = fmt(0);
      totalEl.textContent = fmt(0);
      updateEmitButtonState();
      return;
    }
    cartEmpty.style.display = 'none';
    btnEmitir.disabled = false;
    btnClear.disabled = false;

    for(const it of state.cart){
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div>
          <div class="name">${escapeHtml(it.name)}</div>
          <div class="qty muted">Qt: <input type="number" min="1" value="${it.qty}" data-id="${it.productId}" class="qty-input" style="width:68px"></div>
        </div>
        <div style="text-align:right">
          <div class="price">${fmt(it.unitPriceCents)}</div>
          <div style="margin-top:8px"><button class="btn btn-ghost remove-btn" data-id="${it.productId}">Remover</button></div>
        </div>
      `;
      cartList.appendChild(li);
    }

    const totals = calcTotals();
    subtotalEl.textContent = fmt(totals.subtotalCents);
    totalEl.textContent = fmt(totals.subtotalCents);

    // garantir que o estado do botão Emitir fique correto depois de qualquer mudança no carrinho
    updateEmitButtonState();
  }

  // receipt
  function buildOrder(){
    return {
      id: `PED-${Date.now()}`,
      date: new Date().toISOString(),
      paymentMethod: state.payment.method || null,
      cashReceivedCents: state.payment.cashReceivedCents || 0,
      items: state.cart.map(it => ({ id: it.productId, name: it.name, qty: it.qty, priceCents: it.unitPriceCents }))
    };
  }

  function openReceipt(){
    const order = buildOrder();
    const totals = calcTotals();
    // meta
    recId.textContent = `Pedido: ${order.id}`;
    recDate.textContent = new Date(order.date).toLocaleString();

    // tabela
    let html = '<table><thead><tr><th>Produto</th><th>Qt</th><th>Preço</th><th>Subtotal</th></tr></thead><tbody>';
    for(const it of order.items){
      html += `<tr><td>${escapeHtml(it.name)}</td><td>${it.qty}</td><td style="text-align:right">${fmt(it.priceCents)}</td><td style="text-align:right">${fmt(it.priceCents * it.qty)}</td></tr>`;
    }
    html += `</tbody></table><div class="totals" style="margin-top:16px"><div style="display:flex;justify-content:space-between"><span>Subtotal</span><strong>${fmt(totals.subtotalCents)}</strong></div><div style="display:flex;justify-content:space-between;margin-top:10px"><span class="total">TOTAL</span><strong class="total">${fmt(totals.subtotalCents)}</strong></div></div>`;

    // --- Monta a parte de pagamento (AGORA dentro do escopo onde 'order' e 'totals' existem) ---
    const paymentHtmlParts = [];
    if(order.paymentMethod){
      let pmLabel = '';
      if(order.paymentMethod === 'dinheiro') pmLabel = 'Dinheiro';
      if(order.paymentMethod === 'cartao') pmLabel = 'Cartão';
      if(order.paymentMethod === 'pix') pmLabel = 'PIX';
      if(order.paymentMethod === 'vale') pmLabel = 'Vale';
      paymentHtmlParts.push(`<div style="margin-top:12px"><strong>Pagamento:</strong> ${pmLabel}</div>`);
      if(order.paymentMethod === 'dinheiro'){
        paymentHtmlParts.push(`<div><strong>Valor recebido:</strong> ${formatCents(order.cashReceivedCents)}</div>`);
        const change = (order.cashReceivedCents || 0) - totals.subtotalCents;
        paymentHtmlParts.push(`<div><strong>Troco:</strong> ${formatCents(Math.max(0, change))}</div>`);
      }
    }
    html += paymentHtmlParts.join('');

    // inserir no DOM e abrir overlay
    recBody.innerHTML = html;
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeReceipt(){ overlay.setAttribute('aria-hidden','true'); }

  // events
  productsList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if(!btn) return;
    const id = Number(btn.getAttribute('data-id'));
    addToCart(id);
  });

  cartList.addEventListener('click', (e) => {
    const rem = e.target.closest('.remove-btn');
    if(rem){ removeFromCart(Number(rem.getAttribute('data-id'))); return; }
  });

  cartList.addEventListener('change', (e) => {
    const input = e.target.closest('.qty-input');
    if(!input) return;
    const id = Number(input.getAttribute('data-id'));
    const qty = Number(input.value);
    changeQty(id, qty);
  });

  btnClear.addEventListener('click', () => { state.cart = []; renderCart(); });
  btnEmitir.addEventListener('click', openReceipt);
  btnClose.addEventListener('click', closeReceipt);
  btnPrint.addEventListener('click', () => window.print());
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeReceipt(); });

  // escape util
  function escapeHtml(s){ return String(s).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // init
  renderProducts();
  renderCart();
})();
