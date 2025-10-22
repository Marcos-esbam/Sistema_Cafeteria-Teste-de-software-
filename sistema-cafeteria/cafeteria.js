// cafeteria.js
// Sistema de cafeteria (terminal) + função para emitir nota no terminal
const readline = require("readline");

// ======= UTIL =======
const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ======= CLASSES =======
class Produto {
  constructor(nome, categoria, preco) {
    this.nome = nome;
    this.categoria = categoria;
    this.preco = preco;
  }
}

class Cardapio {
  constructor() { this.produtos = []; }

  adicionarProduto(nome, categoria, preco) {
    this.produtos.push(new Produto(nome, categoria, preco));
    console.log(`✅ Produto "${nome}" adicionado ao cardápio!`);
  }

  listarProdutos() {
    console.log("\n📜 CARDÁPIO ATUAL:");
    if (this.produtos.length === 0) {
      console.log("⚠️ Nenhum produto cadastrado.");
    } else {
      this.produtos.forEach((p, i) => {
        console.log(`${i + 1}. ${p.nome} (${p.categoria}) - R$ ${p.preco.toFixed(2)}`);
      });
    }
  }

  editarProduto(indice, novoNome, novaCategoria, novoPreco) {
    if (this.produtos[indice]) {
      this.produtos[indice].nome = novoNome;
      this.produtos[indice].categoria = novaCategoria;
      this.produtos[indice].preco = novoPreco;
      console.log(`✏️ Produto #${indice + 1} atualizado com sucesso!`);
    } else {
      console.log("❌ Produto não encontrado.");
    }
  }

  removerProduto(indice) {
    if (this.produtos[indice]) {
      console.log(`🗑️ Produto "${this.produtos[indice].nome}" removido!`);
      this.produtos.splice(indice, 1);
    } else {
      console.log("❌ Produto não encontrado.");
    }
  }
}

class Pedido {
  constructor() { this.itens = []; } // { produto, quantidade }
  adicionarItem(produto, quantidade) { this.itens.push({ produto, quantidade }); }
  mostrarResumo() {
    console.log("\n🧾 RESUMO DO PEDIDO:");
    if (this.itens.length === 0) { console.log("Nenhum item adicionado ainda."); return; }
    let total = 0;
    this.itens.forEach((item, i) => {
      const subtotal = item.produto.preco * item.quantidade;
      console.log(`${i + 1}. ${item.produto.nome} x${item.quantidade} = R$ ${subtotal.toFixed(2)}`);
      total += subtotal;
    });
    console.log(`💰 Total a pagar: R$ ${total.toFixed(2)}\n`);
  }
}

// ======= INSTÂNCIAS INICIAIS =======
const cardapio = new Cardapio();
cardapio.adicionarProduto("Café Expresso", "Café", 4.5);
cardapio.adicionarProduto("Cappuccino", "Café", 7.0);
cardapio.adicionarProduto("Mocha", "Café", 8.5);
cardapio.adicionarProduto("Suco de Laranja", "Bebida", 6.0);
cardapio.adicionarProduto("Água Mineral", "Bebida", 3.0);
cardapio.adicionarProduto("Pão de Queijo", "Salgado", 3.0);
cardapio.adicionarProduto("Coxinha", "Salgado", 5.0);
cardapio.adicionarProduto("Bolo de Chocolate", "Sobremesa", 6.5);
cardapio.adicionarProduto("Torta de Limão", "Sobremesa", 7.0);

const pedido = new Pedido();

// ======= FUNÇÕES DE RECEBIMENTO/FORMATAÇÃO (testáveis) =======

// Constrói um objeto order simples a partir de Pedido
function buildOrderFromPedido(pedido, options = {}) {
  const items = pedido.itens.map((it, idx) => ({
    id: idx + 1,
    name: it.produto.nome,
    qty: Number(it.quantidade),
    price: Number(it.produto.preco)
  }));
  return Object.assign({}, options, { items });
}

// Calcula totais em centavos pra evitar problemas de float
function calcTotals(items) {
  let subtotalCents = 0;
  const rows = (items || []).map(it => {
    const qty = Number(it.qty) || 1;
    const priceNum = Number(it.price) || 0;
    const priceCents = Math.round(priceNum * 100);
    const lineCents = priceCents * qty;
    subtotalCents += lineCents;
    return Object.assign({}, it, { qty, priceNum, priceCents, lineCents });
  });
  return { rows, subtotalCents };
}

// Gera o comprovante como string (útil para testes)
function gerarComprovanteTexto(order) {
  if(!order || !Array.isArray(order.items) || order.items.length === 0) {
    return "⚠️ Não há itens no pedido.";
  }
  const { rows, subtotalCents } = calcTotals(order.items);
  const date = order.date ? new Date(order.date) : new Date();
  const id = order.id || `PED-${date.getTime()}`;

  const lines = [];
  lines.push("===== COMPROVANTE =====");
  lines.push(`Pedido: ${id}`);
  lines.push(`Data: ${date.toLocaleString()}`);
  if(order.customerName) lines.push(`Cliente: ${order.customerName}`);
  if(order.paymentMethod) lines.push(`Pagamento: ${order.paymentMethod}`);
  lines.push("------------------------------");
  rows.forEach(r => {
    lines.push(`${r.name} x${r.qty}  ->  ${currencyFmt.format(r.lineCents/100)}`);
  });
  lines.push("------------------------------");
  lines.push(`TOTAL: ${currencyFmt.format(subtotalCents/100)}`);
  lines.push("==============================");
  return lines.join("\n");
}

// Emite (printa) o comprovante no terminal
function emitirNotaTerminal(pedidoObj, options = {}) {
  const order = pedidoObj.items ? pedidoObj : buildOrderFromPedido(pedidoObj, options); // se passar order já montado, usa; se passar Pedido, transforma
  const texto = gerarComprovanteTexto(order);
  console.log("\n" + texto + "\n");
  return texto; // retorno útil pra testes
}

// ======= CLI =======
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function mostrarMenuPrincipal() {
  console.log("\n=== SISTEMA DA CAFETERIA ===");
  console.log("1. Ver cardápio");
  console.log("2. Adicionar item ao pedido");
  console.log("3. Ver resumo do pedido");
  console.log("4. Editar cardápio");
  console.log("5. Finalizar pedido e sair");
  console.log("6. Emitir nota no terminal (comprovante)\n");

  rl.question("Escolha uma opção: ", (opcao) => {
    switch (opcao.trim()) {
      case "1":
        cardapio.listarProdutos(); mostrarMenuPrincipal(); break;
      case "2": adicionarItemAoPedido(); break;
      case "3": pedido.mostrarResumo(); mostrarMenuPrincipal(); break;
      case "4": mostrarMenuCardapio(); break;
      case "5":
        pedido.mostrarResumo();
        if (pedido.itens.length > 0) {
          rl.question("Deseja gerar comprovante no terminal agora? (s/n) ", (resp) => {
            if (resp.toLowerCase() === 's') emitirNotaTerminal(pedido);
            console.log("👋 Obrigado por usar o sistema da cafeteria!");
            rl.close();
          });
        } else { console.log("👋 Obrigado por usar o sistema da cafeteria!"); rl.close(); }
        break;
      case "6":
        if (pedido.itens.length === 0) {
          console.log("⚠️ Nenhum item no pedido. Adicione itens antes de gerar a nota.");
          mostrarMenuPrincipal();
          return;
        }
        rl.question("Nome do cliente (opcional): ", (nome) => {
          rl.question("Forma de pagamento (opcional): ", (pag) => {
            emitirNotaTerminal(pedido, { customerName: nome || undefined, paymentMethod: pag || undefined });
            mostrarMenuPrincipal();
          });
        });
        break;
      default:
        console.log("❌ Opção inválida!"); mostrarMenuPrincipal();
    }
  });
}

function mostrarMenuCardapio() {
  console.log("\n=== EDITAR CARDÁPIO ===");
  console.log("1. Adicionar produto");
  console.log("2. Editar produto existente");
  console.log("3. Remover produto");
  console.log("4. Voltar ao menu principal\n");

  rl.question("Escolha uma opção: ", (opcao) => {
    switch (opcao.trim()) {
      case "1": adicionarProdutoAoCardapio(); break;
      case "2": editarProdutoDoCardapio(); break;
      case "3": removerProdutoDoCardapio(); break;
      case "4": mostrarMenuPrincipal(); break;
      default: console.log("❌ Opção inválida!"); mostrarMenuCardapio();
    }
  });
}

function adicionarItemAoPedido() {
  cardapio.listarProdutos();
  rl.question("\nDigite o número do produto: ", (num) => {
    const indice = parseInt(num) - 1;
    if (indice >= 0 && indice < cardapio.produtos.length) {
      rl.question("Digite a quantidade: ", (qtd) => {
        const quantidade = parseInt(qtd);
        if (quantidade > 0) {
          pedido.adicionarItem(cardapio.produtos[indice], quantidade);
          console.log(`✅ Adicionado: ${quantidade}x ${cardapio.produtos[indice].nome}`);
        } else {
          console.log("❌ Quantidade inválida.");
        }
        mostrarMenuPrincipal();
      });
    } else {
      console.log("❌ Produto inválido!"); mostrarMenuPrincipal();
    }
  });
}

function adicionarProdutoAoCardapio() {
  rl.question("\nNome do produto: ", (nome) => {
    rl.question("Categoria: ", (categoria) => {
      rl.question("Preço: R$ ", (precoStr) => {
        const preco = parseFloat(precoStr);
        if (!isNaN(preco) && preco > 0) {
          cardapio.adicionarProduto(nome, categoria, preco);
        } else {
          console.log("❌ Preço inválido!");
        }
        mostrarMenuCardapio();
      });
    });
  });
}

function editarProdutoDoCardapio() {
  cardapio.listarProdutos();
  rl.question("\nDigite o número do produto a editar: ", (num) => {
    const indice = parseInt(num) - 1;
    if (indice >= 0 && indice < cardapio.produtos.length) {
      rl.question("Novo nome: ", (novoNome) => {
        rl.question("Nova categoria: ", (novaCategoria) => {
          rl.question("Novo preço: R$ ", (novoPrecoStr) => {
            const novoPreco = parseFloat(novoPrecoStr);
            if (!isNaN(novoPreco) && novoPreco > 0) {
              cardapio.editarProduto(indice, novoNome, novaCategoria, novoPreco);
            } else {
              console.log("❌ Preço inválido!");
            }
            mostrarMenuCardapio();
          });
        });
      });
    } else {
      console.log("❌ Produto não encontrado."); mostrarMenuCardapio();
    }
  });
}

function removerProdutoDoCardapio() {
  cardapio.listarProdutos();
  rl.question("\nDigite o número do produto a remover: ", (num) => {
    const indice = parseInt(num) - 1;
    cardapio.removerProduto(indice);
    mostrarMenuCardapio();
  });
}

// ======= INÍCIO (se executado diretamente) =======
if (require.main === module) {
  mostrarMenuPrincipal();
}

// ======= EXPORTS (úteis para testes) =======
module.exports = {
  Produto, Cardapio, Pedido,
  buildOrderFromPedido, calcTotals, gerarComprovanteTexto, emitirNotaTerminal,
  cardapio, pedido
};
