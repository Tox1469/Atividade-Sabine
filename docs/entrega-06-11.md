# sgp - sistema de gestao de prestadores
## 2ª entrega do 2º bimestre - sistema publicado e funcionando

**versao 1.2 - 20/10/2026 - entrega de 06/11/2026**
unicesumar - analise e desenvolvimento de sistemas
imersao profissional - projeto de software - equipe 8

---

## 1. identificacao

| item | valor |
|---|---|
| equipe | 8 |
| integrantes | luis gustavo boratto de oliveira e igor schiniegoski pallisser |
| projeto | sgp - sistema de gestao de prestadores |
| repositorio | https://github.com/Tox1469/Atividade-Sabine (publico, com todo o historico desde o 1º bimestre) |
| sistema publicado | https://sgp-equipe8-sistema.vercel.app |
| documentacao e prototipo | https://sgp-equipe8.vercel.app |
| versao avaliada | branch main. o commit testado esta no [testes.md](testes.md), secao 2 |
| codigo | pasta [`sistema/`](../sistema) |

pra entrar no sistema publicado, todos os usuarios de teste usam a senha `sgp@2026`. a tela de login tem os botões "Entrar como" pra cada perfil. essas contas sao de todo mundo que abre a demonstracao, entao a senha delas nao muda e elas nao podem ser desativadas nem anonimizadas. pra ver a troca de senha, criar um administrador novo em usuarios (CT67).

| perfil | usuario |
|---|---|
| administrador | `luis@sgp.teste` ou `igor@sgp.teste` |
| prestador | `eletrica@sgp.teste` (elétrica santos) ou `treslagoas@sgp.teste` (hidráulica três lagoas) |
| cliente | `zanin@sgp.teste` (supermercado zanin) ou `dombosco@sgp.teste` (padaria dom bosco) |

este documento é o indice da entrega. ele resume o que mudou desde 20/10 e aponta pra onde cada coisa esta.

| o que a entrega pede | onde esta |
|---|---|
| o que mudou desde a entrega anterior e por que | secao 2 |
| o que funciona agora e o que fica pra 27/11 | secao 3 |
| tecnologias e arquitetura | [tecnologias-e-arquitetura.md](tecnologias-e-arquitetura.md), versao 1.2, e o resumo na secao 4 |
| backlog atualizado | [backlog.md](backlog.md), versao 1.3 |
| codigo integrado e como executar | pasta `sistema/` e o [readme](../README.md) |
| sistema publicado | https://sgp-equipe8-sistema.vercel.app |
| testes, resultados e evidencias | [testes.md](testes.md), versao 1.2, e a pasta [evidencias/entrega-06-11](evidencias/entrega-06-11) |
| rastreabilidade com codigo e teste | secao 5 |
| pendencias pra 27/11 | secao 6 |
| checklist | secao 8 |

---

## 2. o que mudou desde 20/10

o problema, os tres perfis, os 19 requisitos funcionais e as 12 regras de negocio continuam os mesmos. o que mudou foi o ritmo: com o recorte de 20/10 pronto antes do prazo, a equipe seguiu e fechou tambem o que era de 27/11 e o que estava "depois do mvp".

| data | item | alteracao e motivo | impacto |
|---|---|---|---|
| 13/10 | banco gerenciado | escolhido o supabase, na regiao de sao paulo. o sistema usa um schema proprio (`sgp`) com um usuario do banco que so enxerga esse schema | tecnologias 1.2, readme |
| 13/10 | publicacao | sistema publicado na vercel, com as funcões na regiao gru1 (sao paulo), perto do banco | tecnologias 1.2, TA16 concluida |
| 13/10 | arquivos | documentos e contratos ficam num bucket privado do supabase. o navegador envia direto pro storage com um link assinado, porque a funcao da vercel nao aceita mais que 4,5 mb e o RNF09 pede 10 mb. o servidor confere o conteudo depois e apaga o que nao for pdf, jpg ou png | tecnologias 1.2 |
| 13/10 | rotina do RN02 | roda uma vez por dia pelo agendador da vercel e tambem pelo botao "Aplicar RN02 agora" no painel de vencimentos | tecnologias 1.2 |
| 13/10 | escopo | entraram a ordem de servico completa (release 3) e os complementos (release 4): contratos, aceite e recusa pelo prestador, historico, relatorios, log, exportacao e anonimizacao | backlog 1.2, TA24 a TA57 |
| 13/10 | cadastro pela tela de login | o cliente e o prestador podem criar a propria conta. o cliente entra ativo e o prestador entra pendente, com o consentimento da lgpd | backlog TA63 |
| 13/10 | tela de usuarios | o administrador cria outro administrador, gera senha provisoria, desbloqueia e desativa acesso | backlog TA64 |
| 13/10 | apis publicas | cnpj pela receita (brasilapi), endereco pelo cep (viacep), municipios (ibge) e feriados no prazo da ordem (brasilapi). so ajudam a preencher, e se cairem a pessoa digita | backlog TA65 |
| 13/10 | acões rapidas | atribuir, abrir ordem, novo cadastro, avaliar e alterar situacao abrem numa janela por cima da lista, sem trocar de pagina | backlog TA66, tecnologias 1.2 |
| 13/10 | visual | mantidas as cores do prototipo (chumbo e laranja queimado). a barra escura com faixa laranja virou menu lateral claro, as tabelas ganharam espaco e a letra passou a ser a ibm plex sans | tecnologias 1.2 |
| 13/10 | modelo de dados | migracao `20261013120000_log_anonimizacao`: a anonimizacao do RNF10 entra no log junto com as tres acões do RF19 | modelo de dados |
| 13/10 | revisao e integracao continua | o igor revisou o codigo e corrigiu quatro defeitos (D08 a D11 do testes.md), e montou o github actions que confere tipos, lint, testes e build a cada push | testes 1.1, backlog TA67 e TA68 |
| 13/10 | backlog | as telas que estavam com o igor foram feitas junto com o backend, e ele ficou com a revisao, o ci e o readme | backlog 1.2 |
| 13/10 | demonstracao protegida | as contas da tela de login nao mudam de senha nem perdem o acesso, e `npm run db:restaurar` volta o banco e os arquivos pra carga inicial, com as datas contadas do dia. novo administrador passou a abrir em janela | backlog TA71, testes 1.2 (CT64 a CT68, D17) |

---

## 3. o que funciona agora

### 3.1 por perfil

| perfil | o que faz no sistema publicado |
|---|---|
| administrador | painel do dia, prestadores (cadastro, categorias, documentos, situacao, contratos, acesso e lgpd), clientes, categorias, servicos, ordens do pedido ao cancelamento, painel de vencimentos, relatorios de desempenho e por periodo com exportacao, log de acões e usuarios |
| prestador | ve so as ordens atribuidas a ele, aceita ou recusa, inicia, registra andamento e conclui. envia os proprios documentos |
| cliente | abre solicitacao, acompanha cada passo e avalia o atendimento concluido |

### 3.2 por requisito

| requisito | situacao |
|---|---|
| RF01 a RF19 | todos implementados e testados pela tela |
| RN01 a RN12 | todas implementadas. as das ordens (RN01 a RN08 e RN12) tambem tem teste automatico contra o banco |
| RNF01 a RNF06, RNF09, RNF10, RNF12 | implementados e testados |
| RNF07, compatibilidade | testado no chrome. falta abrir no firefox e no edge |
| RNF08, nuvem e backup | publicado na nuvem, com o backup diario do supabase. falta testar uma restauracao |
| RNF11, manutenibilidade | github, readme, commits por integrante e o ci a cada push |

### 3.3 o que fica pra 27/11

| item | por que |
|---|---|
| firefox e edge (RNF07) e restauracao de backup (RNF08) | conferencias que faltam, sem codigo novo previsto |
| roteiro da apresentacao final e ensaio (TA70) | entrega de 27/11 |

---

## 4. decisões tecnicas confirmadas

o detalhe de cada escolha esta em [tecnologias-e-arquitetura.md](tecnologias-e-arquitetura.md). o resumo do que esta no codigo:

| componente | o que foi usado |
|---|---|
| interface | next.js 15.5 (app router), react 19 e tailwind 4, com a letra ibm plex sans |
| logica | typescript. regras de negocio em `sistema/lib/dominio`, validacao em `sistema/lib/validacao` (zod), permissao em `sistema/lib/permissao.ts` e o fluxo das ordens em `sistema/lib/ordens.ts` |
| persistencia | postgresql com prisma 6. local pelo `embedded-postgres`, publicado no supabase (sao paulo) |
| arquivos | storage privado do supabase, com envio direto por link assinado |
| autenticacao | auth.js 5, email e senha, sessao em cookie de 30 minutos, conta conferida no banco a cada requisicao |
| integracões | brasilapi (cnpj e feriados), viacep e ibge |
| hospedagem | vercel, regiao gru1, com o agendador diario do RN02 |
| testes | vitest (unitarios, seguranca e integracao com banco) e github actions |

### 4.1 onde mexer em cada coisa

```
sistema/
  app/login/, app/cadastro/       entrar e criar conta
  app/(admin)/                    telas do administrador (painel, ordens, prestadores, clientes...)
  app/(prestador)/                minhas ordens e meus documentos
  app/(cliente)/                  minhas solicitacoes
  app/_componentes/               casca, menu, janela, campos e formularios usados por todas as telas
  app/api/rotinas/vencimentos/    rotina diaria do RN02
  app/arquivos/                   download de documento e contrato, conferindo quem pede
  app/relatorios/exportar/        csv dos relatorios
  lib/dominio/                    regras de negocio puras e os testes delas
  lib/ordens.ts                   abrir, atribuir, aceitar, recusar, iniciar, concluir, cancelar e avaliar
  lib/aptidao.ts                  quem pode receber a ordem (RN01 a RN04)
  lib/documentos.ts, storage.ts   envio de arquivo e versao do documento
  lib/permissao.ts                exigirPerfil, exigirPrestador e exigirCliente
  prisma/                         modelo, migracões e carga inicial
  scripts/carga-5mil.ts           5 mil prestadores pra medir o RNF06
```

---

## 5. rastreabilidade com implementacao e teste

| requisito | implementacao | teste | estado |
|---|---|---|---|
| RF01 - autenticar | `app/login/`, `auth.ts`, `lib/dominio/login.ts`, `app/(admin)/usuarios/` | CT01 a CT04, CT58, CT60, CT67 | pronto |
| RF02 - prestadores | `app/(admin)/prestadores/` | CT07 a CT17, CT39 | pronto |
| RF03 - clientes | `app/(admin)/clientes/`, `app/cadastro/` | CT22 a CT24, CT56, CT57 | pronto |
| RF04 - categorias | `app/(admin)/categorias/` | CT25, CT26 | pronto |
| RF05 - catalogo de servicos | `app/(admin)/servicos/` | CT27, CT28 | pronto |
| RF06 - habilitacao | `app/(admin)/prestadores/[id]/categorias/` | CT29, CT30 | pronto |
| RF07 - documentos | `lib/documentos.ts`, `lib/storage.ts`, `app/(prestador)/meus-documentos/` | CT31 a CT35 | pronto |
| RF08 - vencidos | `app/(admin)/vencimentos/`, `lib/dominio/documento.ts` | CT36, unitarios | pronto |
| RF09 - situacao cadastral | `app/(admin)/prestadores/[id]/situacao/` | CT20, CT38, CT62 | pronto |
| RF10 - contratos | `app/(admin)/prestadores/[id]/contratos/` | CT40 | pronto |
| RF11 - registrar ordem | `lib/ordens.ts`, `app/(cliente)/minhas-solicitacoes/` | CT41, CT42, CT61, integracao | pronto |
| RF12 - atribuir | `lib/ordens.ts`, `lib/aptidao.ts`, `app/(admin)/ordens/formularios.tsx` | CT43, integracao | pronto |
| RF13 - acompanhar | `app/(admin)/ordens/[id]/`, `app/(cliente)/minhas-solicitacoes/[id]/` | CT45, CT47 | pronto |
| RF14 - ordens do prestador | `app/(prestador)/minhas-ordens/` | CT45 a CT47, CT51 | pronto |
| RF15 - avaliar | `lib/ordens.ts`, `lib/dominio/avaliacao.ts` | CT48, integracao | pronto |
| RF16 - historico | filtros por prestador, cliente e periodo em `app/(admin)/ordens/` | CT63 | pronto |
| RF17 - desempenho | `app/(admin)/relatorios/desempenho/`, `lib/relatorios.ts` | CT52 | pronto |
| RF18 - servicos por periodo | `app/(admin)/relatorios/periodo/` | CT53 | pronto |
| RF19 - log | `lib/log.ts`, `app/(admin)/log/` | CT54, integracao | pronto |
| RN01 a RN04 - aptidao | `lib/dominio/aptidao.ts`, `lib/aptidao.ts` | CT43, unitarios, integracao | pronto |
| RN02 - documento vencido | `app/api/rotinas/vencimentos/` | CT37, integracao | pronto |
| RN05 e RN06 - sequencia e ordem travada | `lib/dominio/ordem.ts` | CT45, CT47, unitarios, integracao | pronto |
| RN07 - cancelamento | `lib/ordens.ts` | CT49, integracao | pronto |
| RN08 e RN09 - avaliacao e nota | `lib/dominio/avaliacao.ts` | CT48, CT50, unitarios, integracao | pronto |
| RN10 - cpf e cnpj | `lib/dominio/cpf-cnpj.ts` | CT09 a CT11, CT23, unitarios | pronto |
| RN11 - inativar com ordem aberta | `app/(admin)/prestadores/actions.ts` | CT39 | pronto |
| RN12 - prazo e atraso | `lib/dominio/ordem.ts` | CT47, unitarios | pronto |
| RNF02 - permissao no servidor | `middleware.ts`, `lib/permissao.ts`, contas de demonstracao em `lib/acesso.ts` | CT05, CT46, CT64 a CT66, `app/seguranca.test.ts`, `lib/permissao.test.ts` | pronto |
| RNF04 - responsivo | todas as telas | CT19, CT59 | pronto |
| RNF05 - confirmacao e retorno | janelas, `confirm` e aviso no canto | CT43, CT49, CT55 | pronto |
| RNF06 - 5 mil registros | paginacao no banco | CT44 | pronto, a mais lenta em 716 ms |
| RNF09 - formato e tamanho | `lib/dominio/documento.ts`, `lib/storage.ts` | CT32, CT33, unitarios | pronto |
| RNF10 - lgpd | consentimento no cadastro, `lib/anonimizar.ts` | CT55, CT56, CT66 | pronto |
| RNF12 - bloqueio | `lib/dominio/login.ts` | CT04, CT58, CT64, unitarios | pronto |

---

## 6. pendencias e proximos passos ate 27/11

| o que | quem |
|---|---|
| abrir o sistema publicado no firefox e no edge e repetir os casos principais | igor |
| restaurar um backup do supabase num banco de teste e conferir os dados | luis |
| roteiro da apresentacao final, divisao das falas e ensaio com o sistema publicado (TA70) | os dois |

---

## 7. roteiro da demonstracao

1. o problema em uma frase e o que mudou desde 20/10 (secao 2).
2. no sistema publicado, como cliente: abrir uma solicitacao e ver o aviso de feriado no prazo.
3. como administrador: no painel, atribuir a ordem e mostrar por que cada prestador nao apto ficou de fora.
4. como prestador: aceitar, iniciar, registrar andamento e concluir. tentar abrir a ordem de outro prestador.
5. como cliente: avaliar. como administrador: nota media, relatorio de desempenho e log.
6. painel de vencimentos: enviar um documento vencido e rodar o RN02 na hora.
7. os testes: o github actions verde, o `npm test` e a tabela do [testes.md](testes.md), com um defeito encontrado e corrigido.

antes de apresentar: rodar `npm run db:restaurar` contra o banco publicado (o luis roda, porque as variaveis de producao ficam com ele), entrar uma vez em cada perfil pra deixar o sistema quente, e conferir que nenhum usuario de teste ficou bloqueado pelo ensaio.

---

## 8. checklist

| item | situacao |
|---|---|
| mantivemos o projeto e o repositorio | sim, o mesmo desde o 1º bimestre |
| registramos o que mudou e por que | sim, secao 2 |
| o sistema esta publicado e acessivel | sim, https://sgp-equipe8-sistema.vercel.app |
| o banco esta em nuvem com dados de demonstracao | sim, supabase em sao paulo, com a carga inicial. `npm run db:restaurar` volta pra ela |
| o codigo da entrega esta integrado ao repositorio | sim, na branch main |
| conseguimos executar a aplicacao seguindo o readme | sim, o ci faz isso a cada push e o igor repetiu num clone novo na maquina dele em 20/10 (TA58) |
| executamos os testes e registramos resultados reais | sim, testes.md 1.2 |
| registramos defeitos, correcões e pendencias | sim, testes.md secao 5 e secao 6 deste documento |
| atualizamos os documentos afetados e a rastreabilidade | sim, secões 2 e 5 |
| atualizamos o backlog | sim, backlog 1.3 |
| verificamos o acesso da professora | sim, o repositorio e o sistema abrem sem pedir nada alem do login de teste |
| cada integrante consegue explicar sua contribuicao | a combinar entre os dois antes da apresentacao |
| definimos os proximos passos ate 27/11 | sim, secao 6 |

---

## historico de alteracões

| versao | data | alteracao |
|---|---|---|
| 1.0 | 13/10/2026 | primeira versao, para a entrega de 06/11/2026 |
| 1.1 | 13/10/2026 | demonstracao protegida (backlog TA71): contas de teste travadas, `npm run db:restaurar` e novo administrador em janela. testes 1.2 e backlog 1.3 |
| 1.2 | 20/10/2026 | TA58 concluida: sai das pendencias e o checklist registra o teste na maquina do igor. backlog 1.4 |
