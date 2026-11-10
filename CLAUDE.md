# Cristiano Convites (MyBusiness)

Programa Electron para Windows: Produção (kanban de pedidos) + Financeiro (Dashboard de Convites).
Textos da interface e mensagens em português do Brasil.

## Estrutura
- `src/main.js`: processo principal (janela, arquivo de dados, backups, atualização automática)
- `src/preload.js`: ponte `window.api` entre as páginas e o processo principal
- `src/index.html` + `app.js` + `styles.css`: Produção
- `src/financeiro.html`: Financeiro, gerado por `tools/build-financeiro.py` a partir de
  `tools/dashboard-de-convites.html` (fora do git, porque contém dados de clientes).
  Se essa fonte não existir, edite `src/financeiro.html` direto.
- `src/update.js`: aviso "Nova versão pronta" usado nas duas páginas

## Dados
- Ficam em `%APPDATA%\Producao Cristiano Convites\dados.json` (`{v, cfg, cards, fin}`), com backup diário em `backups/`.
- **O repositório é público. Nunca commitar dados de clientes** (nomes, CPF, RG, telefones, backups `.json`).
  `src/seed.json` deve continuar sem cartões e com `fin: null`.

## Publicar uma versão nova (atualização automática)
1. Aumente `version` no `package.json` (ex.: 1.2.0 → 1.2.1) no mesmo commit da mudança.
2. Faça push na `main`. O workflow `.github/workflows/release.yml` gera o instalador num Windows
   e cria a Release `vX.Y.Z` com `latest.yml`; os programas instalados baixam sozinhos.
3. Esta sessão não pode criar Releases nem enviar tags: sempre use esse fluxo.

## Testar localmente
- `npm start` abre o programa (a atualização automática só roda no programa instalado).
- `npm run dist` gera o instalador em `dist/` (no Linux, precisa do Wine).
