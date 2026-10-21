# sgp - sistema de gestao de prestadores
## 1ª entrega do 2º bimestre - planejamento tecnico e implementacao inicial

**versao 1.0 - 06/10/2026 - entrega de 20/10/2026**
unicesumar - analise e desenvolvimento de sistemas
imersao profissional - projeto de software - equipe 8

---

## 1. identificacao

| item | valor |
|---|---|
| equipe | 8 |
| integrantes | luis gustavo boratto de oliveira e igor schiniegoski pallisser |
| projeto | sgp - sistema de gestao de prestadores |
| repositorio | https://github.com/Tox1469/Atividade-Sabine (publico, com todo o historico do 1º bimestre) |
| versao avaliada | tag `entrega-20-10-2026` no repositorio |
| codigo | pasta [`sistema/`](../sistema) |

este documento é o indice da entrega. ele resume o que mudou e aponta pra onde cada coisa esta, sem repetir o que ja esta nos outros documentos.

| o manual pede | onde esta |
|---|---|
| resumo da revisao e das alteracões | secao 2 deste documento |
| escopo do bimestre e recorte desta entrega | secao 3 |
| tecnologias justificadas e arquitetura | [tecnologias-e-arquitetura.md](tecnologias-e-arquitetura.md), versao 1.1, e o resumo na secao 4 |
| backlog com prioridade, responsavel, prazo e situacao | [backlog.md](backlog.md), versao 1.1 |
| codigo integrado e como executar | pasta `sistema/` e o [readme](../README.md) |
| casos de teste, resultados e evidencias | [testes.md](testes.md) e a pasta [evidencias/entrega-20-10](evidencias/entrega-20-10) |
| documentacao atualizada e rastreabilidade | secao 5 |
| pendencias pra 06/11 | secao 6 |
| checklist do manual | secao 8 |

---

## 2. revisao da base do projeto

no inicio do bimestre a equipe releu o documento de visao, os casos de uso, o modelo de dados, a arquitetura e o prototipo procurando o que impediria comecar a programar. a proposta continua a mesma: o problema, os tres perfis, os 19 requisitos funcionais e o mvp nao mudaram. nenhum requisito foi removido.

o que mudou foi detalhe que so aparece na hora de escrever o codigo:

| data | item | alteracao e motivo | impacto |
|---|---|---|---|
| 06/10 | RNF12 x tabela `usuario` | o RNF12 (bloqueio depois de 5 erros) entrou na versao 1.2 do documento de visao, mas a tabela `usuario` nao tinha onde guardar os erros. foram criadas as colunas `tentativas_falhas` e `bloqueado_ate` | modelo de dados 1.1, migracao inicial, login |
| 06/10 | banco local | o documento previa postgresql em docker, mas nenhum dos dois tem docker instalado. o banco local passou a subir pelo pacote `embedded-postgres`, que baixa o postgres junto com o `npm install` | tecnologias 1.1, readme |
| 06/10 | versao do postgresql | previsto 16, ficou 18, que é a versao que o pacote traz. nada usado no projeto depende disso | tecnologias 1.1 |
| 06/10 | bcrypt | trocado por `bcryptjs`, que faz o mesmo hash com o mesmo custo 10 e nao precisa compilar nada no windows | tecnologias 1.1 |
| 06/10 | rotas de api | as telas do recorte usam server actions do next em vez de rota de api separada. elas rodam no servidor do mesmo jeito, e a regra do RNF02 continua: toda action confere a sessao e o perfil antes de qualquer coisa | arquitetura 1.1 |
| 06/10 | shadcn/ui | nao foi usado no recorte. as telas seguem o visual do prototipo com tailwind e as mesmas cores do `prototipos/estilo.css`. o dialogo de confirmacao do RNF05 entra junto com a primeira acao destrutiva (inativar prestador) | tecnologias 1.1 |
| 06/10 | pasta do codigo | o codigo ficou em `sistema/` e nao na raiz, porque a raiz ja publica a documentacao e o prototipo | tecnologias 1.1, secao de organizacao |
| 06/10 | status da ordem | o valor "em execucao" é gravado como `em_execucao`, sem espaco | modelo de dados 1.1 |
| 06/10 | publicacao | a publicacao na vercel ficou pra 06/11, porque depende de escolher o banco gerenciado (neon ou supabase), decisao que ja estava em aberto | tecnologias 1.1, backlog TA16 |
| 06/10 | backlog | as tarefas de tela TA20 a TA22 foram feitas junto com o backend pra fechar o recorte inteiro. o igor assume TA24 a TA26 pra 06/11 e a validacao do readme na maquina dele (TA58) | backlog 1.1 |

---

## 3. o que foi priorizado

### 3.1 escopo do bimestre

o mvp é o mesmo da 3ª entrega (releases 1 a 3 do [backlog](backlog.md)). a ordem de construcao segue as dependencias: sem login nao tem permissao, sem prestador cadastrado nao tem o que habilitar, documentar ou atribuir.

| data | o que precisa estar funcionando |
|---|---|
| 20/10 | login do administrador e cadastro e consulta de prestadores (o recorte abaixo) |
| 06/11 | resto da release 1 (clientes, categorias, catalogo e habilitacao) e a release 2 (documentos e situacao cadastral), publicado na vercel |
| 27/11 | release 3: a ordem de servico do pedido ate a avaliacao, fechando o mvp |

### 3.2 recorte desta entrega

| funciona agora | requisito |
|---|---|
| login por email e senha, com senha gravada em hash | RF01, RNF01 |
| bloqueio de 15 minutos depois de 5 senhas erradas seguidas no mesmo email | RNF12 |
| sessao que vence com 30 minutos sem uso | RNF03 |
| nenhuma tela ou acao do administrador abre sem login e sem o perfil certo, conferido no servidor | RNF02 |
| cadastro de prestador pessoa fisica ou juridica, com validacao do cpf e do cnpj pelo digito verificador e sem repetir documento | RF02, RN10 |
| edicao do cadastro | RF02 |
| consulta com busca por nome ou documento, filtro por situacao e paginacao no banco | RF02, RNF06 |
| telas usaveis no computador e no celular | RNF04 |

| fica pras proximas entregas | por que |
|---|---|
| abas categorias, documentos e situacao cadastral do prestador | dependem das tabelas de apoio (categorias e tipos de documento) ganharem tela primeiro |
| inativar prestador | é alteracao de situacao, entra junto com o RF09 e a RN11 |
| telas do prestador e do cliente | o recorte é so do administrador |

na tela, o que ainda nao existe aparece no menu e nas abas marcado como "em desenvolvimento", sem clique.

---

## 4. decisões tecnicas confirmadas

o detalhe de cada escolha esta em [tecnologias-e-arquitetura.md](tecnologias-e-arquitetura.md). o resumo do que esta de fato no codigo:

| componente | o que foi usado |
|---|---|
| interface | next.js 15.5 (app router) com react 19 e tailwind 4. as telas seguem o prototipo T01, T03 e T04 |
| logica | typescript. as regras de negocio ficam em `sistema/lib/dominio`, a validacao de entrada em `sistema/lib/validacao` (zod) e a permissao em `sistema/lib/permissao.ts` |
| persistencia | postgresql 18 com prisma 6. as 14 tabelas do modelo logico ja estao na migracao inicial, com os `check` do dicionario de dados |
| autenticacao | auth.js 5 com login por email e senha e sessao em cookie |
| integracões | nenhuma ainda |
| ambiente | node 20 ou mais novo, npm, banco local pelo `npm run banco`. os comandos estao no readme |

![arquitetura atual](../diagramas/arquitetura.png)

### 4.1 onde mexer em cada coisa

```
sistema/
  app/login/                 tela de login (T01) e a action de entrar
  app/(admin)/layout.tsx     cabecalho e menu do administrador, confere o perfil
  app/(admin)/prestadores/   lista (T03), novo e edicao (T04) e a action de salvar
  lib/dominio/               regras de negocio e os testes delas
  lib/validacao/             esquemas zod usados no formulario e no servidor
  lib/permissao.ts           exigirPerfil, usado em toda pagina e action
  prisma/schema.prisma       modelo de dados
  prisma/migrations/         migracões versionadas
  prisma/seed.ts             carga inicial com dados ficticios
  scripts/banco.mjs          sobe o postgres local
```

---

## 5. rastreabilidade com implementacao e teste

complementa a rastreabilidade da 3ª entrega ([mvp-e-prototipos.md](mvp-e-prototipos.md), secao de rastreabilidade) com o arquivo que implementa e o teste que confere.

| requisito | implementacao | teste | estado atual |
|---|---|---|---|
| RF01 - autenticar | `app/login/`, `auth.ts`, `lib/dominio/login.ts` | CT01, CT02, CT03 | pronto pro administrador. prestador e cliente entram mas ainda nao tem tela |
| RF02 - manter prestadores | `app/(admin)/prestadores/` | CT07, CT08, CT12 a CT17 | cadastrar, editar e consultar prontos. inativar fica com o RF09 |
| RN10 - cpf e cnpj unicos e validos | `lib/dominio/cpf-cnpj.ts`, `unique` em `prestador.cpf_cnpj` | unitarios, CT09, CT10, CT11 | pronto |
| RF09 - situacao cadastral | primeiro registro do `historico_situacao` gravado no cadastro | CT20 | parcial, a tela da situacao é da release 2 |
| RNF01 - senha em hash | `prisma/seed.ts` e `lib/dominio/login.ts` (bcryptjs, custo 10) | CT21 | pronto |
| RNF02 - permissao no servidor | `middleware.ts`, `lib/permissao.ts` | CT05 | pronto pras telas do administrador |
| RNF03 - sessao de 30 minutos | `auth.config.ts` | CT18 | pronto |
| RNF04 - responsivo | telas com tailwind | CT19 | pronto nas telas existentes |
| RNF06 - listagem paginada | `app/(admin)/prestadores/page.tsx`, 20 por pagina no banco | falta medir com 5 mil registros | parcial |
| RNF12 - bloqueio por tentativas | `lib/dominio/login.ts` | unitarios, CT04 | pronto |

os demais requisitos continuam com o estado "a fazer" do backlog.

---

## 6. pendencias e proximos passos ate 06/11

| o que | quem |
|---|---|
| escolher o banco gerenciado (neon ou supabase), publicar na vercel e fechar a TA16 | luis |
| validar o readme rodando o sistema do zero na maquina do igor (TA58) | igor |
| clientes, categorias e catalogo de servicos (TA24 a TA26) | igor |
| habilitacao por categoria (TA27) e storage dos documentos (TA28) | luis |
| carga de 5 mil prestadores pra medir o RNF06 | luis |
| teste automatizado provando que a action recusa chamada sem sessao | luis |

---

## 7. roteiro da demonstracao

1. o problema e o recorte, em uma frase cada (secao 3 deste documento).
2. o que mudou desde o 1º bimestre e por que (tabela da secao 2), mostrando o diagrama de arquitetura.
3. o backlog: o que foi concluido nesta entrega e quem pega o que ate 06/11.
4. no sistema rodando: login com senha errada, depois certa. cadastrar um prestador com cnpj de digito errado, corrigir e salvar. buscar pelo cnpj e editar o telefone.
5. os testes: `npm test` passando e a tabela do [testes.md](testes.md), com o defeito D01 e como ele foi corrigido.

antes de apresentar: rodar `npm run banco` e `npm run dev` uns minutos antes, entrar uma vez pra deixar tudo compilado, e conferir que nenhum usuario de teste ficou bloqueado pelo ensaio.

---

## 8. checklist do manual

| item | situacao |
|---|---|
| mantivemos o projeto e o repositorio do primeiro bimestre | sim, mesmo repositorio, codigo novo em `sistema/` |
| revisamos a documentacao e registramos as mudancas | sim, secao 2 |
| definimos prioridades e o recorte demonstravel de 20/10 | sim, secao 3 |
| confirmamos tecnologias e arquitetura com justificativas | sim, tecnologias 1.1 e secao 4 |
| organizamos tarefas, responsaveis, prazos e criterios de conclusao | sim, backlog 1.1 |
| o codigo da entrega esta integrado ao repositorio | sim, na branch main |
| conseguimos executar a aplicacao seguindo o readme | sim, testado num clone novo (testes.md, secao 2). falta repetir na maquina do igor (TA58) |
| conseguimos demonstrar uma interacao funcional real | sim, cadastro e consulta gravando no banco |
| preparamos o armazenamento inicial | sim, migracao e carga inicial |
| executamos os testes e registramos resultados reais | sim, testes.md |
| registramos defeitos, correcões e pendencias | sim, testes.md secao 5 e secao 6 deste documento |
| atualizamos os documentos afetados e a rastreabilidade | sim, secões 2 e 5 |
| identificamos a versao ou commit da entrega | sim, tag `entrega-20-10-2026` |
| verificamos o acesso da professora ao repositorio | sim, o repositorio é publico e abre sem login |
| preparamos os dados ficticios e ensaiamos a demonstracao | dados prontos na carga inicial. o ensaio é com a equipe antes do dia 20 |
| cada integrante consegue explicar sua contribuicao | a combinar entre os dois antes da apresentacao |
| definimos os proximos passos ate 06/11 | sim, secao 6 |

---

## historico de alteracões

| versao | data | alteracao |
|---|---|---|
| 1.0 | 06/10/2026 | primeira versao, para a entrega de 20/10/2026 |
