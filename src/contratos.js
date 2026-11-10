'use strict';
/* ===== Contratos =====
   Modelo "Contrato de prestação de serviços para confecção dos convites de formatura" (o mesmo texto que a
   Cristiano Convites já usa). Formulário à esquerda, prévia ao vivo à direita, PDF pelo processo principal.
   Nada de dados pessoais no código: contratantes e dados da empresa ficam no arquivo de dados do computador. */
const E = window.Extenso;
let ctMes = null, ctPrevia = true, ctPrevT = null;

const CT_DEF = {
  produto: 'Convite Luxo', qtd: '', unit: '',
  especificacoes: '**Medidas:** 23,5 x 18 cm fechado; **Capa e guarda:** Couchê Fosco 150g, cor 4x1; **Tamanho aberto da capa/guarda:** 47,8 x 18 cm; **Miolo:** 16 páginas em Couchê Fosco 170g, cor 4x4; **Tamanho aberto do miolo:** 46 x 17,5 cm; **Lacre:** Papel Supremo 250g, cor 4x0; **Tamanho aberto do lacre:** 23,8 x 41 cm; **Acabamento:** capa dura em 2 partes, laminação fosca na capa, guarda e lacre, hot stamping na capa e no lacre, vinco, dobras, cola em 1 lado no lacre, 2 grampos no miolo e acoplamento da última página à capa;',
  complementares: '1 folha em papel vegetal com foto de infância e 2 páginas com foto individual ou em família.',
  prazoCriacao: 30, prazoAprov: 5, alteracoes: 3, quitacaoDias: 90, entregaMin: 25, entregaMax: 30, materiais: '6 (seis) a 8 (oito)',
  cidade: 'Vitória da Conquista – BA', foro: 'Vitória da Conquista/BA', vias: 2, testemunhas: 2
};
const NOVO_CONTRATANTE = () => ({ nome: '', genero: 'f', estadoCivil: '', profissao: '', rg: '', cpf: '', telefone: '', email: '', endereco: '' });
const emp = () => Object.assign({ nome: 'CRISTIANO CONVITES', cnpj: '', sede: '', telefone: '', email: '' }, C().empresa || {});
const unitV = (u) => { const v = conta(u); return isNaN(v) ? 0 : v; };
const ctTotal = (k) => (n0(k.qtd) || 0) * unitV(k.unit);
const ctNomes = (k) => (k.contratantes || []).map((p) => p.nome).filter(Boolean);
const ctTitulo = (k) => cliName(k.clientId) || ctNomes(k).join(' e ') || [k.curso, k.instituicao, k.turma].filter(Boolean).join(' ') || 'Contrato sem nome';
const ymOf = (k) => (k.data || (k.criado ? new Date(k.criado).toISOString() : new Date().toISOString())).slice(0, 7);
const ymNome = (ym) => { const [y, m] = ym.split('-').map(Number); return MESL[m - 1].replace(/^./, (c) => c.toUpperCase()) + ' ' + y; };

/* texto com **negrito** → HTML seguro */
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const B = (s, ph) => s ? `<b>${esc(s)}</b>` : `<span class="ph">${ph || '_______'}</span>`;
const nE = (n, g) => { n = n0(n); return n + ' (' + E.num(n, g) + ')'; };

/* ----- o contrato em HTML (mesmo texto do modelo) ----- */
function contratoHTML(k) {
  const e = emp(), ps = (k.contratantes && k.contratantes.length) ? k.contratantes : [NOVO_CONTRATANTE()];
  const total = ctTotal(k), qtd = n0(k.qtd), unit = unitV(k.unit);
  const turmaTxt = [k.curso, k.instituicao].filter(Boolean).join(' da ');
  const pessoa = (p, i) => {
    const f = p.genero !== 'm';
    return `<p>${i === 0 ? '<b>CONTRATANTES:</b> ' : ''}${B(p.nome, 'Nome completo')}, ${f ? 'brasileira' : 'brasileiro'}, ${p.estadoCivil ? esc(p.estadoCivil) + ', ' : ''}${p.profissao ? esc(p.profissao) + ', ' : ''}${f ? 'portadora' : 'portador'} da Carteira de Identidade nº ${B(p.rg, 'RG')}, ${f ? 'inscrita' : 'inscrito'} no CPF nº ${B(p.cpf, 'CPF')}, telefone ${B(p.telefone, 'telefone')}, e-mail ${B(p.email, 'e-mail')}, residente e ${f ? 'domiciliada' : 'domiciliado'} na ${B(p.endereco, 'endereço completo')};</p>`;
  };
  const d = parseD(k.data) || today();
  const col = parseD(k.colacao);
  const colTxt = col ? `cuja data oficial prevista é <b>${String(col.getDate()).padStart(2, '0')}/${String(col.getMonth() + 1).padStart(2, '0')}/${col.getFullYear()}</b>, podendo ser confirmada por escrito à CONTRATADA` : 'cuja data oficial será informada por escrito à CONTRATADA, em formato <b>dd/mm/aaaa</b>';
  const assin = (nome, rot) => `<div class="sig"><div class="ln"></div><b>${esc(nome || '')}</b><span>${rot}</span></div>`;
  return `<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS PARA CONFECÇÃO DOS CONVITES DE FORMATURA</h1>
<p>Pelo presente instrumento particular, de um lado:</p>
${ps.map(pessoa).join('')}
<p>na qualidade de ${ps.length > 1 ? 'representantes' : 'representante'} da <b>comissão de formatura da turma de ${turmaTxt ? esc(turmaTxt) : '<span class="ph">curso e instituição</span>'} ${esc(k.turma || '')}</b>, doravante denominados simplesmente <b>CONTRATANTES</b>;</p>
<p>e, de outro lado:</p>
<p><b>CONTRATADA:</b> <b>${esc(e.nome)}</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ${B(e.cnpj, 'CNPJ')}, com sede na ${B(e.sede, 'endereço da empresa')}, telefone ${B(e.telefone, 'telefone')}, e-mail ${B(e.email, 'e-mail')}, doravante denominada simplesmente <b>CONTRATADA</b>;</p>
<p>têm entre si justo e contratado o presente <b>Contrato de Prestação de Serviços para Confecção dos Convites de Formatura</b>, que se regerá pelas cláusulas e condições abaixo.</p>

<h2>CLÁUSULA PRIMEIRA – DO OBJETO</h2>
<p>Constitui objeto do presente contrato a <b>confecção de ${qtd ? nE(qtd) : '<span class="ph">quantidade</span>'} convites de formatura</b> do curso de <b>${turmaTxt ? esc(turmaTxt) : '<span class="ph">curso e instituição</span>'} – turma ${esc(k.turma || '')}</b>, destinados ao evento de colação de grau, ${colTxt}.</p>
<p><b>§1º</b> Os serviços contratados correspondem ao produto denominado <b>${esc(k.produto || 'Convite')}</b>, com as seguintes especificações:</p>
<ul><li><b>Valor unitário:</b> R$ <b>${unit ? unit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '<span class="ph">0,00</span>'}</b> (${E.reais(unit)}) por unidade;</li>
<li>${md(k.especificacoes || '')}</li>
${k.complementares ? `<li><b>Itens complementares:</b> ${md(k.complementares)}</li>` : ''}</ul>
<p><b>§2º</b> A quantidade contratada é de <b>${qtd ? nE(qtd, 'f') : '<span class="ph">quantidade</span>'} unidades</b>, podendo ser alterada apenas mediante acordo escrito entre as partes.</p>
<p><b>§3º</b> Os CONTRATANTES deverão enviar à CONTRATADA todos os textos, nomes, fotos e demais informações necessárias à composição do convite, devidamente revisados e conferidos.</p>
<p><b>§4º</b> O texto das mensagens, homenagens, nomes dos formandos, autoridades e homenageados deverá ser enviado em arquivo editável, preferencialmente em formato Word, sem formatação especial, contendo, quando aplicável:</p>
<ul><li>mensagem inicial; mensagem aos pais; mensagem a Deus; mensagem aos colegas; mensagem aos mestres; mensagem da comissão; relação completa dos nomes dos formandos; filiação dos formandos; fotos de infância digitalizadas, quando houver.</li></ul>
<p><b>§5º</b> O projeto gráfico será desenvolvido com base no material fornecido pelos CONTRATANTES, que assumem a responsabilidade pela conferência dos dados enviados, especialmente nomes, textos, fotos e informações pessoais.</p>
<p><b>§6º</b> O projeto gráfico e os demais elementos autorais desenvolvidos pela CONTRATADA possuem caráter original e não poderão ser reproduzidos, total ou parcialmente, por quaisquer meios, sem autorização prévia e expressa por escrito da CONTRATADA.</p>
<p><b>§7º</b> A CONTRATADA terá o prazo de <b>${nE(k.prazoCriacao)} dias úteis</b> para concluir a etapa de criação e apresentação da prova virtual, contados do recebimento integral de todos os materiais necessários e da confirmação de aprovação preliminar por meio eletrônico.</p>
<p><b>§8º</b> As aprovações, solicitações de ajuste e autorizações encaminhadas por e-mail, WhatsApp ou outro meio eletrônico identificável terão validade entre as partes.</p>

<h2>CLÁUSULA SEGUNDA – DO VALOR DOS SERVIÇOS</h2>
<p>O valor total dos serviços contratados será de <b>${total ? E.brl(total) + ' (' + E.reais(total) + ')' : '<span class="ph">valor total</span>'}</b>, correspondente a <b>${qtd ? nE(qtd, 'f') : '<span class="ph">quantidade</span>'} unidades</b> do ${esc(k.produto || 'convite')}, ao valor unitário de <b>${E.brl(unit)}</b> por convite.</p>
<p><b>§1º</b> O preço acima corresponde à quantidade contratada nesta data.</p>
<p><b>§2º</b> Qualquer alteração de quantidade somente poderá ocorrer mediante acordo escrito entre as partes.</p>
<p><b>§3º</b> Eventual aumento de quantidade será cobrado pelo valor unitário vigente à época do pedido, salvo ajuste diverso formalizado por escrito.</p>
<p><b>§4º</b> Eventual redução de quantidade, se aceita pela CONTRATADA antes do início da impressão, deverá ser formalizada por aditivo contratual, observados os custos já incorridos e os trabalhos já executados.</p>
<p><b>§5º</b> A eventual desistência individual de formando não altera automaticamente o valor total pactuado perante a CONTRATADA, salvo se houver acordo escrito em sentido diverso.</p>

<h2>CLÁUSULA TERCEIRA – DA FORMA DE PAGAMENTO</h2>
<p>O pagamento do valor contratado será realizado da seguinte forma, conforme <b>planilha de pagamento anexa</b>, que integra o presente instrumento:</p>
<p><b>§1º</b> Será paga uma entrada no ato da assinatura deste contrato, por meio de <b>PIX</b>, transferência bancária, depósito ou outro meio previamente ajustado entre as partes.</p>
<p><b>§2º</b> O saldo remanescente poderá ser pago:</p>
<ul><li>à vista;</li><li>parcelado por PIX, transferência bancária ou depósito, conforme os vencimentos previstos na planilha anexa;</li><li>ou por cartão de crédito, com acréscimo da taxa da maquineta e observadas as condições da operadora.</li></ul>
<p><b>§3º</b> Caso o pagamento seja realizado por cartão de crédito, a responsabilidade por eventuais taxas, encargos da operadora ou acréscimos administrativos será dos CONTRATANTES, salvo pacto diverso por escrito.</p>
<p><b>§4º</b> O valor total contratado deverá estar integralmente quitado <b>até ${nE(k.quitacaoDias)} dias antes da data oficial da colação de grau</b>.</p>
<p><b>§5º</b> O inadimplemento de qualquer parcela autoriza a CONTRATADA a suspender a produção, a impressão e a entrega até a regularização integral do débito.</p>
<p><b>§6º</b> A emissão e entrega dos convites ficam condicionadas à quitação integral do contrato.</p>

<h2>CLÁUSULA QUARTA – DOS PRAZOS, APROVAÇÃO E ENTREGA</h2>
<p><b>§1º</b> O início dos trabalhos para confecção dos convites se dará após o recebimento integral de todos os materiais necessários, inclusive as fotos fornecidas pela empresa de fotografia, os textos revisados e a relação completa dos nomes dos formandos.</p>
<p><b>§2º</b> Preferencialmente, a entrega de fotos e materiais deverá ocorrer com antecedência de <b>${esc(k.materiais || '')} meses</b> da data oficial da colação, sem prejuízo de ajuste entre as partes caso o envio ocorra em prazo diverso.</p>
<p><b>§3º</b> Recebido o material, a CONTRATADA desenvolverá a prova virtual do convite para apreciação dos CONTRATANTES.</p>
<p><b>§4º</b> Após a apresentação da prova virtual, os CONTRATANTES terão o prazo de <b>${nE(k.prazoAprov)} dias úteis</b> para aprovar ou solicitar ajustes.</p>
<p><b>§5º</b> Poderão ser realizadas até <b>${nE(k.alteracoes, 'f')} alterações</b> no brasão/símbolo e no layout, desde que não haja modificação substancial do projeto aprovado. Eventuais alterações adicionais ou mudanças estruturais serão cobradas à parte.</p>
<p><b>§6º</b> Toda solicitação de ajuste deverá ser acompanhada, sempre que possível, de referência visual ou descritiva, a fim de orientar a CONTRATADA.</p>
<p><b>§7º</b> Após a aprovação final, a CONTRATADA encaminhará o layout para impressão e acabamento em gráfica de sua escolha, respeitados os padrões técnicos e de qualidade necessários à execução do produto.</p>
<p><b>§8º</b> Os convites impressos serão entregues aos CONTRATANTES entre <b>${nE(k.entregaMin)} e ${nE(k.entregaMax)} dias antes da data oficial da colação de grau da turma ${esc(k.turma || '')}</b>, salvo caso fortuito, força maior, atraso causado pelos CONTRATANTES ou atraso de terceiro.</p>
<p><b>§9º</b> Em caso de paralisação da instituição de ensino, greve, suspensão de atividades ou fato semelhante que impeça a conclusão da impressão no prazo originalmente previsto, os prazos serão automaticamente prorrogados pelo tempo necessário, mediante comunicação entre as partes.</p>

<h2>CLÁUSULA QUINTA – DA DESISTÊNCIA, RESCISÃO E MULTA</h2>
<p>Em caso de desistência imotivada dos CONTRATANTES, após a assinatura deste contrato, aplicar-se-ão as seguintes regras:</p>
<p><b>§1º</b> Se a desistência ocorrer <b>antes do início dos trabalhos</b>, a CONTRATADA poderá reter <b>10% (dez por cento)</b> do valor total do contrato, a título de despesas administrativas e operacionais.</p>
<p><b>§2º</b> Se a desistência ocorrer <b>após o início da criação, tratamento de imagens ou ajustes de layout</b>, a CONTRATADA poderá reter <b>20% (vinte por cento)</b> do valor total do contrato, acrescido dos custos já comprovadamente incorridos.</p>
<p><b>§3º</b> Se a desistência ocorrer <b>após a aprovação final da arte e antes da impressão</b>, a CONTRATADA poderá reter <b>40% (quarenta por cento)</b> do valor total do contrato, acrescido dos custos já realizados.</p>
<p><b>§4º</b> Se a desistência ocorrer <b>após a impressão</b>, será devido o valor integral do contrato, uma vez que o produto já terá sido produzido sob medida para a turma.</p>
<p><b>§5º</b> Os valores eventualmente já pagos serão abatidos do montante devido, e eventual saldo remanescente deverá ser quitado pelos CONTRATANTES.</p>
<p><b>§6º</b> Caso a rescisão decorra de descumprimento contratual por parte da CONTRATADA, os valores pagos deverão ser restituídos integralmente, sem prejuízo de apuração de eventuais perdas e danos cabíveis.</p>
<p><b>§7º</b> A eventual desistência de um ou mais formandos não exime a comissão de formatura das obrigações assumidas perante a CONTRATADA, cabendo aos CONTRATANTES eventual acerto interno entre os participantes.</p>

<h2>CLÁUSULA SEXTA – DA IMPRESSÃO E DO ARQUIVO DIGITAL</h2>
<p><b>§1º</b> Os convites somente serão impressos após a quitação integral do presente contrato e a aprovação final da arte pelos CONTRATANTES.</p>
<p><b>§2º</b> A impressão será realizada de uma única vez, não sendo obrigatória a produção parcial de unidades isoladas, salvo acordo expresso e escrito entre as partes.</p>
<p><b>§3º</b> A CONTRATADA disponibilizará, quando aplicável, o arquivo digital da arte final para divulgação em redes sociais, como <b>Instagram</b> e <b>WhatsApp</b>, em qualidade adequada para compartilhamento digital.</p>
<p><b>§4º</b> Após a aprovação final da arte, não haverá obrigação da CONTRATADA de realizar novas alterações no arquivo digital, salvo se houver novo ajuste formalmente contratado.</p>

<h2>CLÁUSULA SÉTIMA – DO RECEBIMENTO DOS CONVITES</h2>
<p><b>§1º</b> Os convites serão entregues à <b>Comissão de Formatura</b>, mediante protocolo de recebimento, na data previamente aprazada entre as partes.</p>
<p><b>§2º</b> Após a assinatura do recibo de entrega, a responsabilidade pela guarda, conferência interna, distribuição e repasse dos convites aos formandos será exclusivamente da comissão.</p>
<p><b>§3º</b> A entrega à comissão será considerada cumprimento integral da obrigação da CONTRATADA, salvo comprovado vício de fabricação ou erro imputável à CONTRATADA.</p>

<h2>CLÁUSULA OITAVA – DO USO DE IMAGEM E DADOS</h2>
<p><b>§1º</b> Os CONTRATANTES autorizam, de forma gratuita, não exclusiva e para fins institucionais e de portfólio, o uso dos arquivos digitais, fotos e peças gráficas produzidos no âmbito deste contrato pela CONTRATADA, podendo tais materiais ser utilizados em jornais, revistas, redes sociais, site, catálogo e materiais promocionais.</p>
<p><b>§2º</b> A autorização prevista no parágrafo anterior poderá ser revogada por escrito pelos CONTRATANTES para usos futuros, respeitando-se as publicações e divulgações já realizadas.</p>
<p><b>§3º</b> As partes comprometem-se a observar a legislação aplicável à proteção de dados pessoais, ao direito de imagem e à confidencialidade das informações fornecidas para execução do contrato.</p>

<h2>CLÁUSULA NONA – DO FORO</h2>
<p>As partes elegem o foro da Comarca de <b>${esc(k.foro || '')}</b> para dirimir quaisquer dúvidas ou controvérsias oriundas da execução do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>E, por estarem justos e contratados, assinam o presente instrumento em <b>${nE(k.vias, 'f')} vias de igual teor e forma</b>, na presença de <b>${nE(k.testemunhas, 'f')} testemunhas</b>, para que produza seus efeitos legais.</p>
<p class="dt"><b>${esc(k.cidade || '')}, ${d.getDate()} de ${MESL[d.getMonth()]} de ${d.getFullYear()}.</b></p>
<div class="sigs"><p><b>CONTRATANTES:</b></p>${ps.map((p) => assin(p.nome, 'CONTRATANTE')).join('')}
<p><b>CONTRATADA:</b></p>${assin(e.nome, e.cnpj ? 'CNPJ nº ' + esc(e.cnpj) : 'CONTRATADA')}
<p><b>TESTEMUNHAS:</b></p>${Array.from({ length: n0(k.testemunhas) || 2 }, () => '<div class="sig tst"><div class="ln"></div><span>Nome:</span><span>CPF:</span></div>').join('')}</div>`;
}
const PAPER_CSS = `.paper{font-family:Arial,"Segoe UI",sans-serif;font-size:10.5pt;line-height:1.45;color:#111;text-align:justify}
.paper h1{font-size:12pt;text-align:center;margin:0 0 16px;font-weight:700}
.paper h2{font-size:10.5pt;margin:18px 0 6px;font-weight:700}
.paper p{margin:0 0 7px}.paper ul{margin:0 0 7px;padding-left:22px}.paper li{margin-bottom:3px}
.paper .ph{background:#fff3b0;color:#8a6d00;padding:0 3px;border-radius:2px;font-weight:600}
.paper .dt{margin-top:16px}
.paper .sigs{margin-top:18px;break-inside:avoid}
.paper .sig{margin:26px 0 8px;width:62%;break-inside:avoid}
.paper .sig .ln{border-top:1px solid #111;margin-bottom:4px}
.paper .sig b{display:block}.paper .sig span{display:block;font-size:9.5pt}
.paper .sig.tst span{margin-top:2px}`;

/* ----- lista ----- */
function ctLinha(id, k, assin) {
  const s = CT_SIT[k.status || 'rascunho'], da = parseD(k.assinadoEm || '');
  const extra = assin ? (da ? ' · assinado em ' + da.getDate() + ' ' + MES[da.getMonth()] + ' ' + da.getFullYear() : ' · data da assinatura não registrada') + (k.colacao && parseD(k.colacao) ? ' · colação ' + parseD(k.colacao).toLocaleDateString('pt-BR') : '') : '';
  return `<div class="ctrow" data-ct="${esc(id)}"><span class="cki" style="--c:${assin ? '#34D399' : '#2DB5AE'}">${ShellIcon('contratos', 17)}</span>
     <div class="ctinfo"><b>${esc(ctTitulo(k).toUpperCase())}</b><small>${esc(k.produto || 'Convite')} · ${n0(k.qtd)} unid. · ${E.brl(ctTotal(k))}${extra}</small></div>
     <span class="sit" style="--c:${s.c}">${s.n}</span>
     <button class="ib" data-cta="pdf" data-id="${esc(id)}" title="Baixar PDF">PDF</button><button class="ib" data-cta="edit" data-id="${esc(id)}" title="Editar">Editar</button><button class="ib del" data-cta="del" data-id="${esc(id)}" title="Excluir">Excluir</button></div>`;
}
let ctVista = 'mes';
function renderContratos() {
  const box = $('mod-contratos');
  const all = [...contracts.entries()];
  const meses = [...new Set(all.map(([, k]) => ymOf(k)).concat([new Date().toISOString().slice(0, 7)]))].sort().reverse();
  if (!ctMes || !meses.includes(ctMes)) ctMes = meses[0];
  const doMes = all.filter(([, k]) => ymOf(k) === ctMes).sort((a, b) => (b[1].atualizado || 0) - (a[1].atualizado || 0));
  const assinados = all.filter(([, k]) => k.status === 'assinado').sort((a, b) => String(b[1].assinadoEm || '').localeCompare(String(a[1].assinadoEm || '')) || (b[1].atualizado || 0) - (a[1].atualizado || 0));
  const st = (s) => doMes.filter(([, k]) => (k.status || 'rascunho') === s).length;
  const val = doMes.reduce((s, [, k]) => s + ctTotal(k), 0);
  const kpi = (ic, v, l, col, act) => `<div class="ck${act ? ' ckbtn' : ''}"${act ? ` data-cta="${act}" role="button" tabindex="0"` : ''}><span class="cki" style="--c:${col}">${ShellIcon(ic, 18)}</span><div><b>${v}</b><span>${l}</span></div></div>`;
  const e = emp(), faltaEmp = !e.cnpj || !e.sede;
  const seg = `<div class="seg" style="margin-left:18px"><button data-cta="vmes" class="${ctVista === 'mes' ? 'on' : ''}">Do mês</button><button data-cta="vass" class="${ctVista === 'assinados' ? 'on' : ''}">Assinados <em class="segn">${assinados.length}</em></button></div>`;
  const corpo = ctVista === 'assinados'
    ? `<div class="ckpis c4">${kpi('contratos', assinados.length, 'Contratos assinados', '#34D399')}${kpi('financeiro', E.brl(assinados.reduce((s, [, k]) => s + ctTotal(k), 0)), 'Valor contratado', '#2DB5AE')}${kpi('demandas', fmtN(assinados.reduce((s, [, k]) => s + n0(k.qtd), 0)), 'Convites contratados', '#A78BFA')}${kpi('clientes', new Set(assinados.map(([, k]) => k.clientId || ctTitulo(k))).size, 'Turmas / clientes', '#60A5FA')}</div>
       ${assinados.length ? assinados.map(([id, k]) => ctLinha(id, k, true)).join('') : `<div class="emptybox">${ShellIcon('contratos', 30)}<b>Nenhum contrato assinado ainda</b><p>Quando a comissão assinar, abra o contrato e mude a situação para "Assinado": ele aparece aqui, com a data da assinatura.</p></div>`}`
    : `<div class="ckpis c4">${kpi('financeiro', E.brl(val), 'Valor no mês', '#2DB5AE')}${kpi('contratos', st('rascunho'), 'Rascunhos', '#F0A53F')}${kpi('demandas', st('enviado'), 'Enviados', '#60A5FA')}${kpi('contratos', st('assinado'), 'Assinados no mês · ver todos', '#34D399', 'vass')}</div>
       ${doMes.length ? doMes.map(([id, k]) => ctLinha(id, k, false)).join('') : `<div class="emptybox">${ShellIcon('contratos', 30)}<b>Nenhum contrato em ${ymNome(ctMes)}</b><p>Clique em "Novo contrato", escolha o cliente e preencha os dados: o programa monta o seu modelo e gera o PDF.</p><button class="btn" data-cta="novo">+ Novo contrato</button></div>`}`;
  box.innerHTML = `<header class="pagehead"><span class="phicon">${ShellIcon('contratos', 19)}</span><div><h1>Contratos</h1><small>${ctVista === 'assinados' ? assinados.length + ' contrato(s) assinado(s) no total' : doMes.length + ' contrato(s) em ' + ymNome(ctMes)}</small></div>${seg}
   <span class="phsp"></span>${ctVista === 'mes' ? `<select id="ctmes" class="hsel" aria-label="Mês">${meses.map((m) => `<option value="${m}"${m === ctMes ? ' selected' : ''}>${ymNome(m)}</option>`).join('')}</select>` : ''}
   <button class="btn ghost sm" data-cta="emp">Dados da empresa</button><button class="btn sm" data-cta="novo">+ Novo contrato</button></header>
  <div class="mbody"><div class="mwrap">
   ${faltaEmp ? `<div class="banner o">Preencha os <b>dados da empresa</b> (CNPJ, endereço, telefone e e-mail) uma vez; eles entram em todos os contratos. <button class="linkbtn" data-cta="emp">Preencher agora</button></div>` : ''}
   ${corpo}
  </div></div>`;
}

/* ----- editor (tela cheia: formulário + prévia) ----- */
function openCt(id, clientId) {
  const base = id ? contracts.get(id) : null;
  const k = base ? JSON.parse(JSON.stringify(base)) : Object.assign({ status: 'rascunho', clientId: clientId || '', data: isoD(today()), curso: '', instituicao: '', turma: '', colacao: '', contratantes: [NOVO_CONTRATANTE(), NOVO_CONTRATANTE()] }, JSON.parse(JSON.stringify(CT_DEF)));
  if (!base && clientId) preencheDoCliente(k, clientId);
  if (!Array.isArray(k.contratantes)) k.contratantes = [];
  modal = { t: 'ct', id, k, confirm: false }; renderModal();
}
function preencheDoCliente(k, cid) {
  const c = clients.get(cid); if (!c) return;
  k.clientId = cid;
  if (c.curso) k.curso = c.curso; if (c.instituicao) k.instituicao = c.instituicao; if (c.periodo) k.turma = c.periodo;
  if (c.colacao) k.colacao = c.colacao; if (c.qtd) k.qtd = c.qtd;
  const nomes = String(c.comissao || '').split(/,| e |;|\n/).map((s) => s.trim()).filter(Boolean);
  if (nomes.length && !(k.contratantes || []).some((p) => p.nome)) k.contratantes = nomes.slice(0, 6).map((n) => Object.assign(NOVO_CONTRATANTE(), { nome: n }));
}
const fld = (id, label, val, attrs) => `<label${attrs && attrs.full ? ' class="full"' : ''}>${label}<input id="${id}" value="${esc(val == null ? '' : val)}"${attrs && attrs.type ? ` type="${attrs.type}"` : ''}${attrs && attrs.ph ? ` placeholder="${esc(attrs.ph)}"` : ''}${attrs && attrs.num ? ' inputmode="decimal"' : ''}></label>`;
function renderCt() {
  if (modal.t === 'emp') return renderEmp();
  const k = modal.k;
  $('modal').innerHTML = `<div class="ov ctfull"><div class="ctwin" role="dialog" aria-modal="true" aria-labelledby="ctt">
  <div class="ctbar"><h2 id="ctt">${modal.id ? 'Editar contrato' : 'Novo contrato'}</h2>
   <select id="t-status" class="hsel" aria-label="Situação">${Object.entries(CT_SIT).map(([s, x]) => `<option value="${s}"${(k.status || 'rascunho') === s ? ' selected' : ''}>${x.n}</option>`).join('')}</select>
   <span class="phsp"></span><button class="btn ghost sm" data-cta="previa">${ctPrevia ? 'Ocultar prévia' : 'Mostrar prévia'}</button>
   <button class="btn ghost sm" data-cta="pdfnow">Gerar PDF</button><button class="btn sm" data-cta="salvar">Salvar</button><button class="x" data-act="close" title="Fechar">✕</button></div>
  <div class="ctgrid${ctPrevia ? '' : ' noprev'}"><div class="ctform">
   <div class="fg">
    <label>Modelo de contrato<select disabled><option>Convites de formatura</option></select></label>
    <label>Cliente (preenche sozinho)<select id="t-cli"><option value="">Sem cliente</option>${[...clients.entries()].sort((a, b) => String(a[1].nome).localeCompare(String(b[1].nome), 'pt-BR')).map(([id, c]) => `<option value="${esc(id)}"${k.clientId === id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
   </div>
   <div class="sect">Contratantes (comissão)</div>
   ${k.contratantes.map((p, i) => `<div class="pcard"><div class="pchead"><b>Contratante ${i + 1}</b><select data-pg="${i}" aria-label="Gênero"><option value="f"${p.genero !== 'm' ? ' selected' : ''}>Feminino</option><option value="m"${p.genero === 'm' ? ' selected' : ''}>Masculino</option></select>${k.contratantes.length > 1 ? `<button class="x" data-cta="rmp" data-i="${i}" title="Remover">✕</button>` : ''}</div>
    <div class="fg">${[['nome', 'Nome completo *', 1], ['estadoCivil', 'Estado civil', 0, 'solteira, casado…'], ['profissao', 'Profissão', 0], ['rg', 'RG (com órgão)', 0, '00.000.000-00 SSP-BA'], ['cpf', 'CPF', 0], ['telefone', 'Telefone', 0], ['email', 'E-mail', 0], ['endereco', 'Endereço completo', 1, 'Rua, nº, bairro, cidade/UF']].map(([f, l, full, ph]) => `<label${full ? ' class="full"' : ''}>${l}<input data-p="${i}" data-f="${f}" value="${esc(p[f] || '')}"${ph ? ` placeholder="${ph}"` : ''}></label>`).join('')}</div></div>`).join('')}
   <button class="btn ghost sm" data-cta="addp">+ Adicionar contratante</button>
   <div class="sect">Turma</div>
   <div class="fg">${fld('t-curso', 'Curso', k.curso, { ph: 'Direito' })}${fld('t-inst', 'Instituição', k.instituicao, { ph: 'UNEX' })}${fld('t-turma', 'Turma', k.turma, { ph: '2027.1' })}${fld('t-colacao', 'Data da colação (se já souber)', k.colacao, { type: 'date' })}</div>
   <div class="sect">Objeto e valores</div>
   <div class="fg">${fld('t-produto', 'Produto', k.produto, { ph: 'Convite Luxo' })}${fld('t-qtd', 'Quantidade', k.qtd, { num: 1 })}${fld('t-unit', 'Valor unitário (R$)', k.unit, { num: 1, ph: '81,00' })}
    <label>Valor total<input id="t-total" value="${E.brl(ctTotal(k))}" disabled></label>
    <label class="full">Especificações (use **texto** para negrito)<textarea id="t-esp" rows="6">${esc(k.especificacoes)}</textarea></label>
    <label class="full">Itens complementares<textarea id="t-comp" rows="2">${esc(k.complementares)}</textarea></label></div>
   <div class="sect">Prazos</div>
   <div class="fg3">${fld('t-pc', 'Criação (dias úteis)', k.prazoCriacao, { num: 1 })}${fld('t-pa', 'Aprovação (dias úteis)', k.prazoAprov, { num: 1 })}${fld('t-alt', 'Alterações incluídas', k.alteracoes, { num: 1 })}
    ${fld('t-qd', 'Quitar até (dias antes)', k.quitacaoDias, { num: 1 })}${fld('t-emin', 'Entrega: de (dias antes)', k.entregaMin, { num: 1 })}${fld('t-emax', 'até (dias antes)', k.entregaMax, { num: 1 })}</div>
   <div class="fg" style="margin-top:12px">${fld('t-mat', 'Materiais com antecedência de (meses)', k.materiais, { full: 1 })}</div>
   <div class="sect">Assinatura</div>
   <div class="fg">${fld('t-cidade', 'Cidade – UF', k.cidade)}${fld('t-data', 'Data', k.data, { type: 'date' })}${fld('t-foro', 'Foro (comarca)', k.foro)}${fld('t-vias', 'Vias', k.vias, { num: 1 })}</div>
   <p class="pwerr" id="t-err" role="alert"></p>
   ${modal.id ? `<div class="acts" style="justify-content:flex-start">${modal.confirm ? '<button class="btn danger" data-cta="delok">Confirmar exclusão</button><button class="btn ghost" data-cta="delno">Manter</button>' : '<button class="btn danger sm" data-cta="delm">Excluir contrato</button>'}</div>` : ''}
  </div>
  <div class="ctprev" id="ctprev"><div class="paper" id="paper">${contratoHTML(k)}</div></div></div></div></div>
  <style>${PAPER_CSS}</style>`;
}
function readCt() {
  const k = modal.k, v = (id) => { const e = $(id); return e ? e.value : ''; };
  k.status = v('t-status'); k.clientId = v('t-cli');
  if (k.status === 'assinado' && !k.assinadoEm) k.assinadoEm = isoD(today());   /* data da assinatura, registrada sozinha */
  if (k.status !== 'assinado') delete k.assinadoEm;
  document.querySelectorAll('[data-p][data-f]').forEach((el) => { const p = k.contratantes[+el.dataset.p]; if (p) p[el.dataset.f] = el.value; });
  document.querySelectorAll('[data-pg]').forEach((el) => { const p = k.contratantes[+el.dataset.pg]; if (p) p.genero = el.value; });
  k.curso = v('t-curso').trim(); k.instituicao = v('t-inst').trim(); k.turma = v('t-turma').trim(); k.colacao = v('t-colacao');
  k.produto = v('t-produto').trim(); k.qtd = n0(v('t-qtd')) || ''; k.unit = v('t-unit').trim(); k.especificacoes = v('t-esp'); k.complementares = v('t-comp');
  k.prazoCriacao = n0(v('t-pc')); k.prazoAprov = n0(v('t-pa')); k.alteracoes = n0(v('t-alt')); k.quitacaoDias = n0(v('t-qd'));
  k.entregaMin = n0(v('t-emin')); k.entregaMax = n0(v('t-emax')); k.materiais = v('t-mat').trim();
  k.cidade = v('t-cidade').trim(); k.data = v('t-data'); k.foro = v('t-foro').trim(); k.vias = n0(v('t-vias')) || 2;
}
function atualizaPrevia() {
  readCt();
  const t = $('t-total'); if (t) t.value = E.brl(ctTotal(modal.k));
  const p = $('paper'); if (p) p.innerHTML = contratoHTML(modal.k);
}
function saveCt(silencioso) {
  readCt(); const k = modal.k;
  if (!ctNomes(k).length && !k.clientId) { $('t-err').textContent = 'Informe pelo menos o nome de um contratante ou escolha o cliente.'; return null; }
  const id = modal.id || newId(); if (!k.criado) k.criado = Date.now(); k.atualizado = Date.now();
  contracts.set(id, JSON.parse(JSON.stringify(k))); modal.id = id; persist();
  if (!silencioso) { modal = null; renderModal(); render(); toast('Contrato salvo'); }
  return id;
}
async function gerarPdf(k) {
  const nome = ('contrato-' + ctTitulo(k)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '').toLowerCase() + '.pdf';
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>@page{size:A4;margin:20mm 18mm}body{margin:0}${PAPER_CSS}.paper .ph{background:none;color:transparent;border-bottom:1px solid #111;border-radius:0;padding:0 18px}</style></head><body><div class="paper">${contratoHTML(k)}</div></body></html>`;
  const r = await window.api.gerarPdf(html, nome);
  if (r && r.ok) toast('PDF salvo em ' + r.path); else if (r && r.error) toast(r.error);
}
/* ----- dados da empresa ----- */
function renderEmp() {
  const e = modal.e;
  $('modal').innerHTML = `<div class="ov"><div class="dlg narrow" role="dialog" aria-modal="true" aria-labelledby="empt"><h2 id="empt">Dados da empresa</h2>
  <div class="sub">Aparecem como CONTRATADA em todos os contratos. Ficam guardados só neste computador.</div>
  <div class="fg">${fld('e-nome', 'Nome / razão social', e.nome, { full: 1 })}${fld('e-cnpj', 'CNPJ', e.cnpj, { ph: '00.000.000/0001-00' })}${fld('e-tel', 'Telefone', e.telefone)}${fld('e-email', 'E-mail', e.email, { full: 1 })}${fld('e-sede', 'Endereço da sede', e.sede, { full: 1, ph: 'Rua, nº, bairro, cidade/UF' })}</div>
  <div class="acts"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-cta="salvaremp">Salvar</button></div></div></div>`;
}
function contratosModalClick(t, act) {
  const b = t.closest('[data-cta]'); const a = b && b.dataset.cta;
  if (modal.t === 'emp') {
    if (a === 'salvaremp') {
      const v = (id) => $(id).value.trim();
      const empresa = { nome: v('e-nome') || 'CRISTIANO CONVITES', cnpj: v('e-cnpj'), telefone: v('e-tel'), email: v('e-email'), sede: v('e-sede') };
      const volta = modal.volta; modal = null; renderModal(); saveCfg(Object.assign(JSON.parse(JSON.stringify(C())), { empresa })); toast('Dados da empresa salvos');
      if (volta) { modal = volta; renderModal(); }
    }
    return;
  }
  if (!a) return;
  if (a === 'salvar') return saveCt();
  if (a === 'previa') { readCt(); ctPrevia = !ctPrevia; return renderCt(); }
  if (a === 'pdfnow') { readCt(); return gerarPdf(modal.k); }
  if (a === 'addp') { readCt(); modal.k.contratantes.push(NOVO_CONTRATANTE()); return renderCt(); }
  if (a === 'rmp') { readCt(); modal.k.contratantes.splice(+b.dataset.i, 1); return renderCt(); }
  if (a === 'delm') { readCt(); modal.confirm = true; return renderCt(); }
  if (a === 'delno') { readCt(); modal.confirm = false; return renderCt(); }
  if (a === 'delok') { const id = modal.id; modal = null; renderModal(); contracts.delete(id); persist(); render(); return toast('Contrato excluído'); }
}
$('mod-contratos').addEventListener('click', (e) => {
  if (modal) return;
  const b = e.target.closest('[data-cta]');
  if (b) {
    const a = b.dataset.cta, id = b.dataset.id;
    if (a === 'novo') return openCt(null);
    if (a === 'vmes' || a === 'vass') { ctVista = a === 'vass' ? 'assinados' : 'mes'; return renderContratos(); }
    if (a === 'emp') { modal = { t: 'emp', e: emp() }; return renderModal(); }
    if (a === 'edit') return openCt(id);
    if (a === 'pdf') return gerarPdf(contracts.get(id));
    if (a === 'del') { const k = contracts.get(id); modal = { t: 'ct', id, k: JSON.parse(JSON.stringify(k)), confirm: true }; return renderModal(); }
    return;
  }
  const r = e.target.closest('[data-ct]'); if (r) openCt(r.dataset.ct);
});
$('mod-contratos').addEventListener('change', (e) => { if (e.target.id === 'ctmes') { ctMes = e.target.value; renderContratos(); } });
document.addEventListener('input', (e) => {
  if (!modal || modal.t !== 'ct' || !e.target.closest('.ctform')) return;
  clearTimeout(ctPrevT); ctPrevT = setTimeout(atualizaPrevia, 150);
});
document.addEventListener('change', (e) => {
  if (!modal || modal.t !== 'ct') return;
  if (e.target.id === 't-cli' && e.target.value) { readCt(); preencheDoCliente(modal.k, e.target.value); return renderCt(); }
  if (e.target.closest('.ctform')) atualizaPrevia();
});
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && modal && modal.t === 'ct') { e.preventDefault(); saveCt(); } });
