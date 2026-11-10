# Cristiano Convites

Programa para Windows que reúne a gestão da **produção** e o **financeiro** dos convites de formatura.

- **Produção**: quadro (kanban), lista e calendário dos pedidos, com etiquetas, checklist e observações
- **Financeiro**: turmas, formandos e pagamentos, orçamentos, financeiro, convites com parceiros e relatórios em PDF
- Os dados ficam só no computador (`%APPDATA%\Producao Cristiano Convites\dados.json`), com backup automático diário
- O programa se atualiza sozinho pelas [Releases](https://github.com/ocristianotito/MyBusiness/releases) deste repositório

## Instalar

Baixe o `Cristiano-Convites-Setup-x.y.z.exe` da [última versão](https://github.com/ocristianotito/MyBusiness/releases/latest) e execute.
Num computador novo, traga seus dados em **Backup → Importar backup**.

> Este repositório é público e **não contém dados de clientes**. Nunca adicione backups (`*.json` exportados) ao repositório.

## Desenvolvimento

```bash
npm install
npm start          # abre o programa
npm run dist       # gera o instalador em dist/
```

Para gerar o instalador do Windows no Linux é preciso ter o Wine instalado.

`src/financeiro.html` é gerado por `tools/build-financeiro.py` a partir do Dashboard de Convites
(`tools/dashboard-de-convites.html`, que não vai para o repositório porque contém dados de clientes).
