# Cristiano Convites (MyBusiness)

Programa Electron para Windows com menu lateral: Dashboard, Demandas (produção), Financeiro (com senha), Contratos e Clientes.
Textos da interface e mensagens em português do Brasil.

## Estrutura
- `src/main.js`: processo principal (janela, arquivo de dados, backups, atualização automática)
- `src/preload.js`: ponte `window.api` entre as páginas e o processo principal
- `src/shell.js` + `shell.css`: menu lateral compartilhado pelas duas páginas (`window.__shellNav(modulo)`)
- `src/index.html` + `app.js` + `styles.css`: página principal; `app.js` tem os dados, a navegação entre módulos e as Demandas
- `src/dashboard.js`, `src/clientes.js`, `src/contratos.js` (+ `extenso.js`): os outros módulos da página principal
- `src/fluxo.js`: aba "Visão do mês" do Financeiro (fluxo de caixa, dados em `fin.cx`)
- `src/financeiro.html`: Financeiro, gerado por `tools/build-financeiro.py` a partir de
  `tools/dashboard-de-convites.html` (fora do git, porque contém dados de clientes).
  Se essa fonte não existir, edite `src/financeiro.html` direto.
- `src/update.js`: contagem regressiva da atualização automática, usada nas duas páginas
- `src/agenda-core.js`: regras da agenda (repetição, lembretes), usadas pela tela e pelo processo principal
- `src/agenda.js`: calendário da Produção (Mês/Semana, compromissos, arrastar, próximos 14 dias)

## Dados
- Ficam em `%APPDATA%\Producao Cristiano Convites\dados.json` (`{v, cfg, cards, events, clients, contracts, fin}`), com backup diário em `backups/`.
  O programa se chama "Cristiano Convites" desde a 1.2.3, mas a pasta de dados mantém o nome antigo: não renomeie.
  O `name` do package.json (`producao-cristiano-convites`) também fica, porque define a pasta de cache da atualização.
- **O repositório é público. Nunca commitar dados de clientes** (nomes, CPF, RG, telefones, backups `.json`).
  `src/seed.json` deve continuar sem cartões e com `fin: null`.

## Publicar uma versão nova (atualização automática)
**Só publique quando o dono pedir.** Ele prefere juntar várias alterações numa versão só.
Até lá, faça commits e push na `main` **sem mudar `version`** no `package.json` (sem essa mudança o workflow não roda).
A 1.2.7 foi cancelada antes de publicar: `package.json` já está em 1.2.7, que é o número da próxima versão.
Na hora de publicar, mude qualquer coisa no `package.json` (ex.: `version`, se for subir para 1.2.8) ou rode
o workflow à mão (Actions → Publicar versão → Run workflow); versões já publicadas são ignoradas.
1. Aumente `version` no `package.json` no mesmo commit da mudança. O dono prefere subir o último número
   (1.2.1 → 1.2.2), não o do meio.
2. Faça push na `main`. O workflow `.github/workflows/release.yml` gera o instalador num Windows
   e cria a Release `vX.Y.Z` com `latest.yml`; os programas instalados baixam sozinhos.
3. Esta sessão não pode criar Releases nem enviar tags: sempre use esse fluxo.

## Testar localmente
- `npm start` abre o programa (a atualização automática só roda no programa instalado).
- `npm run dist` gera o instalador em `dist/` (no Linux, precisa do Wine).

## Comportamento do programa instalado
- Fechar a janela deixa o programa na bandeja (lembretes continuam); sair: ícone da bandeja → Sair.
- Atualização: procura ao abrir, a cada 30 min e ao focar a janela; ao baixar, contagem de 30 s,
  salva, reinicia e instala em silêncio. Registro em `%APPDATA%\Producao Cristiano Convites\atualizacao.log`.
- Dados em `dados.json`: `{v, cfg, cards, events, clients, contracts, fin}`. `cfg.empresa` = dados da CONTRATADA nos contratos.
- O Electron não tem `prompt()`: o Financeiro usa `window.api.perguntar` (caixinha do processo principal).
