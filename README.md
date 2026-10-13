# sgp - sistema de gestao de prestadores

plataforma web pra controlar prestadores de servico terceirizados: cadastro, documentacao, contratos e o acompanhamento das ordens de servico do pedido ate a conclusao.

trabalho da disciplina de projeto de software (imersao profissional) - unicesumar, ads.
equipe 8 - 1º e 2º bimestre de 2026.

## equipe

| integrante | github |
|---|---|
| luis gustavo boratto de oliveira | [@Tox1469](https://github.com/Tox1469) |
| igor schiniegoski pallisser | [@igorschiniegoski](https://github.com/igorschiniegoski) |

## o problema

empresa de pequeno e medio porte quase nunca executa tudo com equipe propria, ela aciona uma rede de prestadores terceirizados conforme a demanda. só que esse controle costuma ficar fora de qualquer sistema: o cadastro em uma planilha, os documentos espalhados no drive e no email, o contrato impresso na gaveta e a distribuicao dos servicos acontecendo em grupo de whatsapp.

o resultado é sempre o mesmo. documento vence e ninguem percebe até a fiscalizacao chegar, servico é esquecido ou cobrado duas vezes, e a escolha de quem chamar continua sendo no "fulano é bom", porque não existe historico nenhum pra consultar.

## objetivo

centralizar em um sistema só o cadastro, a documentacao e a execucao dos servicos terceirizados, com controle de validade dos documentos, atribuicao das ordens pra prestadores que estejam realmente aptos, e historico de avaliacao pra apoiar a decisao de quem contratar da proxima vez.

## principais funcionalidades

- cadastro de prestadores, clientes e categorias de servico
- upload de documentos com data de validade e painel dos que estao vencendo
- contratos com vigencia e arquivo anexo
- situacao cadastral do prestador (ativo, pendente, bloqueado, inativo)
- abertura, atribuicao e acompanhamento das ordens de servico por status
- avaliacao do atendimento pelo cliente e historico por prestador
- relatorios de desempenho e de servicos por periodo

sao 3 perfis de acesso: administrador, prestador e cliente. cada um enxerga só o que é da responsabilidade dele.

a lista completa (19 requisitos funcionais, 12 nao funcionais e 12 regras de negocio) esta em [docs/documento-visao-requisitos.md](docs/documento-visao-requisitos.md), e o desdobramento disso em casos de uso, historias de usuario e prioridades esta em [docs/casos-de-uso.md](docs/casos-de-uso.md).

## priorizacao

o escopo foi priorizado na **escala moscow**, que tem quatro niveis: **M**ust have, **S**hould have, **C**ould have e **W**ont have. a escolha foi por o prazo ser fixo e a equipe ter duas pessoas, entao o que precisa ser negociado é o escopo e nao a data.

| nivel | quantos | o que entrou |
|---|---|---|
| **M** - must have | 17 casos de uso | autenticacao, cadastros, documentacao, situacao cadastral e o fluxo completo da ordem de servico ate a avaliacao. é o mvp |
| **S** - should have | 5 casos de uso | contratos, aceite da atribuicao pelo prestador, historico consolidado, relatorio de desempenho e log |
| **C** - could have | 2 casos de uso | relatorio de servicos por periodo e exportacao em pdf ou csv |
| **W** - wont have | 8 itens | pagamento online, nota fiscal, assinatura digital, app nativo, whatsapp, aviso automatico por email, geolocalizacao e integracao com erp |

a definicao de cada nivel, o criterio de decisao e a justificativa item a item estao na secao 6 do [documento de casos de uso](docs/casos-de-uso.md).

## tecnologias

| camada | escolha | por que |
|---|---|---|
| linguagem | typescript 5 | tipagem compartilhada entre tela e api |
| interface | next.js 15.5 (app router) + react 19 | um projeto so entrega tela e servidor |
| estilo | tailwind css 4 | telas responsivas no visual do prototipo (RNF04) |
| servidor | node.js 20 ou mais novo, server actions do proprio next | menos configuracao e um deploy so |
| acesso a dados | prisma orm | migracões versionadas e schema como documentacao do modelo |
| banco | postgresql 18 (local pelo embedded-postgres) | restricao de unicidade nativa pra RN10 e tipos de data adequados |
| autenticacao | auth.js v5 (credentials) + bcryptjs | login por email e senha, sessao de 30 min e bloqueio depois de 5 erros (RF01, RNF01, RNF03, RNF12) |
| validacao | zod | o mesmo esquema valida no formulario e no servidor (RNF02) |
| arquivos | supabase storage (bucket privado), pasta `.arquivos` rodando local | documentos e contratos em pdf, jpg e png, ate 10 mb (RNF09). o navegador sobe direto pro storage com link assinado |
| hospedagem | vercel (regiao sao paulo) + postgresql do supabase | url publica, deploy a cada push e a rotina diaria de vencimentos (RN02) pelo cron da vercel |
| testes | vitest + casos manuais documentados | regras de negocio, permissoes e regras das ordens contra um postgres de verdade |
| integracao continua | github actions | tipos, lint, testes e build a cada push e pull request |

a escolha foi por familiaridade da equipe e por serem ferramentas com plano gratuito, que é o que cabe no prazo e no orcamento do trabalho. o detalhamento de cada decisao, as alternativas descartadas e a arquitetura em camadas estao em [docs/tecnologias-e-arquitetura.md](docs/tecnologias-e-arquitetura.md). o que mudou ao comecar a programar esta na secao 3.3 desse documento. o provedor do postgresql gerenciado e do storage ficou sendo o supabase.

## o projeto no ar

a documentacao e o prototipo navegavel ficam publicados em **[sgp-equipe8.vercel.app](https://sgp-equipe8.vercel.app)**.
a pagina inicial é o arquivo `index.html` da raiz, e o conteudo é o mesmo do repositorio, sem build.

o sistema esta publicado em **[sgp-equipe8-sistema.vercel.app](https://sgp-equipe8-sistema.vercel.app)**, com banco e storage no supabase. a tela de login tem os botoes "entrar como" com as contas de demonstracao dos tres perfis. pra rodar na propria maquina, seguir a secao "como rodar".

## organizacao do repositorio

```
index.html   pagina inicial do site publicado, com os links para tudo
docs/        documentos das entregas, do levantamento de requisitos ao roteiro da apresentacao
diagramas/   fontes .puml e imagens dos diagramas, inclusive os do banco e o mapa de navegacao
prototipos/  prototipo navegavel das 18 telas do mvp, em html
ferramentas/ scripts que geram a versao imprimivel dos documentos e as telas do prototipo
sistema/     codigo do sgp (next.js), explicado na secao "como rodar"
```

as pastas vao sendo criadas conforme cada entrega.

### documentos

| documento | entrega | conteudo |
|---|---|---|
| [documento-visao-requisitos.md](docs/documento-visao-requisitos.md) | 1ª | contexto, escopo, 19 RF, 12 RNF e 12 regras de negocio |
| [casos-de-uso.md](docs/casos-de-uso.md) | 2ª | atores, diagramas de caso de uso, especificacao dos 24 casos de uso, diagramas de atividade de UC13 e UC16, 23 historias de usuario, priorizacao moscow e matriz de rastreabilidade |
| [modelo-de-dados.md](docs/modelo-de-dados.md) | 2ª | diagrama de classes do dominio, modelo conceitual, modelo logico e dicionario de dados das 14 tabelas |
| [mvp-e-prototipos.md](docs/mvp-e-prototipos.md) | 3ª | revisao das entregas anteriores, definicao do mvp, fluxo completo, levantamento das telas, mapa de navegacao, prototipo e rastreabilidade |
| [backlog.md](docs/backlog.md) | 3ª, atualizado em 20/10 | quadro com as 62 tarefas do projeto, com requisito, prioridade, responsavel, prazo, situacao e criterio de conclusao |
| [apresentacao.md](docs/apresentacao.md) | 3ª | roteiro da apresentacao, divisao das falas, perguntas provaveis e checklist final |
| [tecnologias-e-arquitetura.md](docs/tecnologias-e-arquitetura.md) | 2ª, atualizado em 20/10 | stack com as versões em uso, ajustes feitos na implementacao, arquitetura em camadas e como cada RNF é atendido |
| [entrega-20-10.md](docs/entrega-20-10.md) | 1ª do 2º bimestre | indice da entrega: revisao do 1º bimestre, recorte implementado, rastreabilidade com codigo e teste, pendencias e checklist |
| [testes.md](docs/testes.md) | 1ª do 2º bimestre | casos de teste executados, resultados, evidencias e defeitos |

### diagramas

os diagramas sao escritos em plantuml e o arquivo `.puml` fica versionado junto com o `.png` e o `.svg` gerados, pra que qualquer alteracao apareca no diff.

| diagrama | arquivo |
|---|---|
| casos de uso - visao geral | [diagramas/caso-de-uso-geral.png](diagramas/caso-de-uso-geral.png) |
| casos de uso - acesso e cadastros | [diagramas/caso-de-uso-acesso-cadastros.png](diagramas/caso-de-uso-acesso-cadastros.png) |
| casos de uso - documentacao e contratos | [diagramas/caso-de-uso-documentacao.png](diagramas/caso-de-uso-documentacao.png) |
| casos de uso - ordens de servico | [diagramas/caso-de-uso-ordens.png](diagramas/caso-de-uso-ordens.png) |
| casos de uso - consultas e relatorios | [diagramas/caso-de-uso-consultas.png](diagramas/caso-de-uso-consultas.png) |
| atividade - UC13 atribuir ordem | [diagramas/atividade-uc13-atribuir-ordem.png](diagramas/atividade-uc13-atribuir-ordem.png) |
| atividade - UC16 concluir ordem | [diagramas/atividade-uc16-concluir-ordem.png](diagramas/atividade-uc16-concluir-ordem.png) |
| classes - dominio do sgp | [diagramas/diagrama-de-classes.png](diagramas/diagrama-de-classes.png) |
| banco - modelo conceitual | [diagramas/modelo-conceitual.png](diagramas/modelo-conceitual.png) |
| banco - modelo logico | [diagramas/modelo-logico.png](diagramas/modelo-logico.png) |
| arquitetura atual | [diagramas/arquitetura.png](diagramas/arquitetura.png) |
| mapa de navegacao | [diagramas/mapa-de-navegacao.png](diagramas/mapa-de-navegacao.png) |

pra gerar as imagens de novo depois de mexer em um `.puml`:

```
java -jar plantuml.jar -tpng diagramas/*.puml
java -jar plantuml.jar -tsvg diagramas/*.puml
```

### prototipo

as 18 telas do mvp estao em [prototipos/index.html](prototipos/index.html). é html estatico, sem framework e sem
dependencia de internet: basta abrir o arquivo com dois cliques e navegar clicando, como no sistema de verdade.
as telas mostram tambem os estados que nao aparecem no caminho feliz, como erro de validacao, arquivo recusado,
lista vazia e o motivo de cada prestador inapto.

depois de mexer nas telas, é so rodar:

```
python ferramentas/gerar-prototipo.py
```

### versao imprimivel dos documentos

cada documento em markdown tem um `.html` equivalente, com capa, formatacao a4 e as imagens ja embutidas, pronto pra imprimir ou salvar em pdf. depois de mexer em algum `.md`, é so rodar:

```
pip install markdown
python ferramentas/gerar-html.py
```

## entregas

| entrega | data | conteudo | status |
|---|---|---|---|
| 1 | 14/08/2026 | documento de visao e requisitos | pronto |
| 2 | 08/09/2026 | casos de uso, diagramas de atividade, diagrama de classes e modelagem do banco | pronto |
| 3 | 25/09/2026 | repositorio, backlog, mapa de navegacao, prototipos, mvp e apresentacao | pronto |
| 4 | 20/10/2026 | planejamento tecnico e implementacao inicial: login e cadastro e consulta de prestadores, com testes. tag `entrega-20-10-2026` | pronto |
| 5 | 06/11/2026 | implementacao, integracao e testes: resto da release 1 e release 2, publicado na vercel | em andamento |
| 6 | 27/11/2026 | sistema funcionando e apresentacao final | a fazer |

## mvp

a primeira versao funcional entrega o fluxo completo do sistema, do pedido do cliente ate a avaliacao do atendimento:
autenticacao, cadastros de apoio, documentacao com controle de validade, situacao cadastral, abertura da ordem,
atribuicao apenas a quem esta apto, execucao, conclusao e avaliacao. sao 17 dos 24 casos de uso e 18 telas.

ficam para depois do mvp os contratos, o aceite da atribuicao pelo prestador, o historico consolidado, os relatorios
e o log de acões criticas. o criterio de corte e a justificativa de cada item estao em
[docs/mvp-e-prototipos.md](docs/mvp-e-prototipos.md).

## como rodar

o codigo fica na pasta `sistema/`. precisa so do **node.js 20 ou mais novo** (o npm vem junto). nao precisa instalar postgres nem docker: o banco local sobe por um pacote do proprio projeto.

### primeira vez

```
cd sistema
npm install
copy .env.example .env        (no linux ou mac: cp .env.example .env)
```

abrir o `.env` e preencher o `AUTH_SECRET` com um texto aleatorio comprido. esse comando gera um e mostra no terminal:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

o `DATABASE_URL` ja vem certo pro banco local.

depois, em um terminal que vai ficar aberto:

```
npm run banco
```

e em outro terminal, dentro de `sistema/`:

```
npm run db:migrar     cria as 14 tabelas
npm run db:carga      administradores de teste, tipos de documento, categorias e alguns prestadores ficticios
npm run dev
```

o sistema abre em http://localhost:3000. usuarios de teste, todos com a senha `sgp@2026`: `luis@sgp.teste` ou `igor@sgp.teste` (administrador), `eletrica@sgp.teste` (prestador) e `zanin@sgp.teste` (cliente). todos os dados da carga sao inventados.

### no dia a dia

`npm run banco` num terminal e `npm run dev` no outro. pra parar, `ctrl+c` nos dois. os dados ficam na pasta `sistema/.banco`, que nao vai pro git. apagar essa pasta zera o banco (depois é so rodar `db:migrar` e `db:carga` de novo).

### testes

```
npm test
```

roda os testes das regras de negocio e das permissoes. com o `npm run banco` aberto, roda tambem os testes de integracao das ordens contra o banco `sgp_teste` (sem ele esses sao pulados). os casos de teste pela tela e os resultados estao em [docs/testes.md](docs/testes.md).

a cada push e pull request o github actions roda tipos, lint, todos os testes (com um postgres proprio) e o build de producao. a configuracao esta em `.github/workflows/sistema.yml`.

### variaveis de ambiente

| variavel | pra que serve |
|---|---|
| `DATABASE_URL` | endereco do postgres. o padrao aponta pro banco local do `npm run banco`, na porta 5433. no supabase, a conexao pelo pooler (porta 6543) |
| `DIRECT_URL` | conexao direta, usada so pelo `prisma migrate`. no banco local é igual ao `DATABASE_URL` |
| `DATABASE_URL_TESTE` | banco separado dos testes de integracao. o `npm run banco` ja cria |
| `AUTH_SECRET` | chave que assina o cookie da sessao. cada um gera a sua, nunca vai pro repositorio |
| `SUPABASE_URL` e `SUPABASE_SECRET_KEY` | so publicado: storage dos documentos e contratos. sem elas os arquivos vao pra pasta `.arquivos` |
| `CRON_SECRET` | so publicado: segredo que a vercel manda pra rodar a rotina diaria de vencimentos (RN02) |

### o que ja funciona

**acesso**
- login por email e senha, com bloqueio de 15 minutos depois de 5 senhas erradas e sessao que vence com 30 minutos parado
- conta desativada pelo administrador perde o acesso na proxima tela, mesmo com a sessao aberta
- cadastro pela tela de login: cliente entra ativo, prestador entra pendente ate o administrador conferir os documentos
- minha conta, com troca de senha, e liberacao de acesso e senha provisoria pelo administrador

**administrador**
- painel do dia, prestadores (ficha com categorias, documentos, contratos e historico de situacao), clientes, categorias e catalogo de servicos
- busca de cnpj, cep e municipios em apis publicas no cadastro
- vencimentos: painel dos documentos vencendo e rotina diaria que passa pra pendente quem tem documento obrigatorio vencido (RN02)
- ordens de servico: abertura, atribuicao so pra quem esta apto (com o motivo de cada inapto), troca de prestador com motivo e cancelamento
- relatorios de desempenho e de servicos por periodo, com exportacao em csv e pdf, log de acoes criticas e anonimizacao de cliente

**prestador**
- minhas ordens: aceitar ou recusar, iniciar, registrar andamento e concluir
- meus documentos: envio e acompanhamento da validade

**cliente**
- minhas solicitacoes: abrir pedido, acompanhar o andamento e avaliar o atendimento

o que ainda falta ate 06/11 esta no [quadro de tarefas](docs/backlog.md).

### limitacoes conhecidas

- o bloqueio depois de 5 senhas erradas é por email (RNF12). quem souber o email de alguem consegue travar o login dessa pessoa por 15 minutos, e a mensagem de bloqueio mostra que o email existe. limitar tambem por endereco ip resolveria, mas ficou fora do escopo
- o sistema nao manda email (item W da priorizacao): a senha provisoria aparece uma vez na tela pro administrador repassar
