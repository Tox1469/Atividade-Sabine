# como trabalhar neste repositorio

combinado entre o luis e o igor pra os dois mexerem no mesmo codigo sem um atropelar o outro. vale pra quem estiver digitando e pra qualquer ferramenta que um de nos use pra ajudar.

## antes de mexer e antes de subir

```
git pull --rebase          antes de comecar
...trabalha, commita...
git pull --rebase          de novo, antes de subir
git push
```

- os dois trabalham direto na `main`. por isso o `pull --rebase` antes e depois: o historico fica em linha reta e ninguem perde o commit do outro
- nunca `git push --force` nem `git push --tags`. a tag `entrega-20-10-2026` é a versao avaliada em 20/10 e nao muda
- deu conflito no rebase: resolve o arquivo, `git add` e `git rebase --continue`. se ficar em duvida, `git rebase --abort` volta tudo como estava e a gente olha junto

## primeira vez na maquina

seguir o [readme](README.md#como-rodar). o `npm install` dentro de `sistema/` tambem liga o gancho de commit da pasta `ferramentas/git` (ver abaixo). pra conferir:

```
git config core.hooksPath          tem que mostrar ferramentas/git
```

## commits

- cada um commita com a propria conta do github. o historico é o que mostra quem fez o que (RNF11)
- mensagem em portugues, minuscula, no formato `tipo: o que mudou`. tipos usados: `feat` (funcionalidade), `fix` (defeito), `docs`, `style` (so visual), `test`, `ci`, `chore`
- se o commit fecha uma tarefa do [backlog](docs/backlog.md), cita o id: `feat: relatorio de desempenho (TA54)`
- sem linha de co-autoria nem de "gerado por". o gancho `ferramentas/git/commit-msg` tira essas linhas sozinho, mas o certo é nem colocar

## antes do push

dentro de `sistema/`:

```
npx tsc --noEmit       tipos
npm run lint
npm test               com o npm run banco aberto roda tambem os testes contra o banco
```

o github actions repete tudo isso e o build a cada push (`.github/workflows/sistema.yml`). se ficar vermelho, arruma antes de seguir com outra coisa.

## como o codigo esta organizado

o mapa de pastas esta no [readme](README.md) e na secao 4.1 da [entrega de 06/11](docs/entrega-06-11.md). os padrões que se repetem:

| assunto | como fazer |
|---|---|
| permissao | toda pagina e toda action comeca com `exigirPerfil`, `exigirPrestador` ou `exigirCliente` (`lib/permissao.ts`). o id do usuario sai da sessao, nunca da tela (RNF02) |
| regra de negocio | funcao pura em `lib/dominio/`, com teste no `.test.ts` do lado. o que precisa do banco fica em `lib/ordens.ts`, `lib/aptidao.ts`, `lib/documentos.ts` |
| formulario | `useFormulario` de `app/_componentes/campos.tsx`, com envio pelo `onSubmit`. nao usar `<form action>`: o react 19 limpa o formulario e foi o defeito D05 |
| acao rapida | abre na `Janela` (`app/_componentes/janela.tsx`) por cima da lista e, ao terminar, fecha e chama `avisar("...")` pro aviso no canto. a pagina so muda quando é uma ficha inteira |
| mensagem pra pessoa | frase curta, com acento, dizendo o que aconteceu ou o que corrigir. sem emoji |
| cores | so pelos nomes do `app/globals.css` (`tinta`, `papel`, `regua`, `caneta`...). o laranja (`caneta`) é so do que da pra clicar. verde, ocre, vermelho e cinza sao das situacões |
| banco | mudou o `schema.prisma`: `npm run db:migrar` cria a migracao em `prisma/migrations`, e o [modelo de dados](docs/modelo-de-dados.md) ganha uma linha no historico |

## documentos

- os `.md` de `docs/` seguem o jeito que ja estao escritos: minusculo, frases diretas, tabelas no lugar de listas longas
- cada documento tem versao no topo e historico no fim. mudou algo que a professora ja viu, sobe a versao e explica no historico
- print de teste vai em `docs/evidencias/<entrega>/` com o numero do caso no nome (`CT41-...png`)
- depois de editar, gerar o html: `uv run --with markdown python ferramentas/gerar-html.py`

## publicar

o push nao publica sozinho. o sistema (https://sgp-equipe8-sistema.vercel.app) e o site da documentacao (https://sgp-equipe8.vercel.app) ficam na conta da vercel do luis. depois do push, avisa o luis, que roda:

```
cd sistema && npx vercel deploy --prod      sistema
npx vercel deploy --prod                    site, da raiz
```

o banco publicado é o de demonstracao da apresentacao. migracao, carga ou teste contra ele so combinando antes.
