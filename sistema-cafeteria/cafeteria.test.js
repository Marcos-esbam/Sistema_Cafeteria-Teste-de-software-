// cafeteria.test.js
const { gerarComprovanteTexto } = require('./cafeteria');

test('gera comprovante com itens e total correto', () => {
  const order = {
    id: 'TEST-1',
    items: [
      { id: 1, name: 'Café', qty: 2, price: 3.5 },  // 2 * 3.5 = 7.00
      { id: 2, name: 'Bolo', qty: 1, price: 6.0 }   // 1 * 6.0 = 6.00
    ],
    customerName: 'João',
    paymentMethod: 'Dinheiro',
    date: '2025-10-16T10:00:00.000Z'
  };

  const txt = gerarComprovanteTexto(order);
  expect(txt).toMatch(/Café/);
  expect(txt).toMatch(/Bolo/);
  // total = 13.00 -> em pt-BR formata como "R$ 13,00"
  expect(txt).toMatch(/TOTAL:\s*R\$\s*13,00/);
});
