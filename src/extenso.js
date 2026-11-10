/* Números por extenso em português do Brasil, para o contrato.
   Extenso.num(284) → "duzentos e oitenta e quatro";  Extenso.num(284, 'f') → "duzentas e oitenta e quatro"
   Extenso.reais(22964) → "vinte e dois mil, novecentos e sessenta e quatro reais" */
(function (root) {
  'use strict';
  const U = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const fem = (s) => s.replace(/\bum\b/g, 'uma').replace(/\bdois\b/g, 'duas').replace(/entos\b/g, 'entas');
  function ate999(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100, p = [];
    if (c) p.push(C[c]);
    if (r) p.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' e ' + U[r % 10] : ''));
    return p.join(' e ');
  }
  /* inteiro por extenso; g = 'f' para o feminino (ex.: "duzentas unidades") */
  function num(n, g) {
    n = Math.floor(Math.abs(+n || 0));
    if (n === 0) return 'zero';
    const grupos = [], esc = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
    let i = 0;
    while (n > 0 && i < esc.length) { grupos.push([n % 1000, i]); n = Math.floor(n / 1000); i++; }
    const partes = grupos.filter(([v]) => v).reverse().map(([v, k]) => {
      let t = ate999(v);
      if (k === 0 && g === 'f') t = fem(t);
      if (k === 1 && g === 'f') t = fem(t);
      if (k === 1) return v === 1 ? 'mil' : t + ' mil';
      if (k >= 2) return t + ' ' + esc[k][v === 1 ? 0 : 1];
      return t;
    });
    // "e" antes do último grupo quando ele é < 100 ou centena redonda; senão vírgula
    const ult = grupos.find(([v]) => v);
    if (partes.length > 1) {
      const last = ult[0];
      const sep = (last < 100 || last % 100 === 0) ? ' e ' : ', ';
      return partes.slice(0, -1).join(', ') + sep + partes[partes.length - 1];
    }
    return partes[0];
  }
  function reais(v) {
    v = Math.round((+v || 0) * 100);
    const r = Math.floor(v / 100), c = v % 100, p = [];
    if (r) {
      const t = num(r);
      const de = (r >= 1e6 && r % 1e6 === 0) ? ' de' : '';
      p.push(t + de + (r === 1 ? ' real' : ' reais'));
    }
    if (c) p.push(num(c) + (c === 1 ? ' centavo' : ' centavos'));
    return p.length ? p.join(' e ') : 'zero reais';
  }
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
  root.Extenso = { num, reais, brl };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Extenso;
})(typeof window !== 'undefined' ? window : globalThis);
