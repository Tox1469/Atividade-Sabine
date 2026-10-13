# sgp - sistema de gestao de prestadores
## casos de teste e registro de defeitos

**versao 1.2 - 13/10/2026 - 2ª entrega do 2º bimestre (06/11)**
unicesumar - analise e desenvolvimento de sistemas
imersao profissional - projeto de software - equipe 8

---

## 1. o que este documento registra

os testes de tudo que ja foi implementado. na versao 1.0 era so o recorte de 20/10 (login e cadastro e consulta de prestadores). nesta versao entram os cadastros de apoio, os documentos, a situacao cadastral, a ordem de servico do pedido ate a avaliacao, os relatorios, o log e a lgpd (ver [entrega-06-11.md](entrega-06-11.md)). é um documento vivo: a cada entrega entram os casos novos e os que ja existem sao executados de novo.

| tipo | o que cobre | como roda |
|---|---|---|
| unitario (vitest) | as regras que ficam em `lib/dominio`: cpf e cnpj, bloqueio do login, sequencia da ordem, prazo e atraso, aptidao, nota media e validade de documento | `npm test` dentro da pasta `sistema` |
| seguranca (vitest) | as actions e as rotas chamadas direto, sem passar pela tela, com um banco falso que falha se for tocado | `npm test` |
| integracao (vitest + postgres) | as regras das ordens contra um banco de verdade (`sgp_teste`), incluindo duas pessoas clicando ao mesmo tempo | `npm test` com o `npm run banco` aberto |
| pela tela | o uso de verdade no navegador, com banco, sessao, arquivo e mensagens | os casos CT01 a CT21 foram feitos a mao. os CT22 a CT62 foram feitos por um roteiro no navegador (playwright) que clica e preenche como uma pessoa e salva o print de cada caso |

desde 13/10 o github actions roda os tipos, o lint, todos os testes automaticos (com um postgres proprio) e o build a cada push (`.github/workflows/sistema.yml`).

## 2. condicões de execucao

| item | entrega de 20/10 (CT01 a CT21) | entrega de 06/11 (CT22 a CT68) |
|---|---|---|
| data | 06/10/2026 | 13/10/2026 |
| versao testada | commit `1239a07`. o reteste do D01 foi no `87a0287` | commit `6e0df72`. o CT58 refeito e os casos CT64 a CT68 no `df4b653` |
| ambiente | windows 11, node 22.14, google chrome, `npm run dev` | windows 11, node 22.14, chromium do playwright. o sistema rodou como em producao (`next build` e `next start`) |
| banco | clone novo seguindo so o readme: `npm install`, `npm run banco`, `npm run db:migrar`, `npm run db:carga` | um banco criado so pra esta rodada (`sgp_evidencia`), migrado e com a carga inicial. assim o resultado nao depende do que sobrou de teste anterior. desde o `df4b653` ele é zerado com `npm run db:restaurar` |
| telas | 1280x800 e 390x844 (celular) | 1280x800 e 390x844 (celular) |
| dados | os da carga inicial (`prisma/seed.ts`), todos ficticios. senha de todos os usuarios de teste: `sgp@2026` | os mesmos |
| desempenho (RNF06) | nao medido | medido no endereco publicado, https://sgp-equipe8-sistema.vercel.app, com 5.008 prestadores no banco |

## 3. testes automaticos

55 testes, todos passando. a saida completa do `npm test` esta em [evidencias/entrega-06-11/testes-automaticos.txt](evidencias/entrega-06-11/testes-automaticos.txt).

| arquivo | o que testa | testes |
|---|---|---|
| `lib/dominio/cpf-cnpj.test.ts` | cpf e cnpj validos com e sem mascara, digito errado, numero repetido, tamanho errado, escolha entre cpf e cnpj pelo tipo de pessoa e a formatacao pra tela (RN10) | 8 |
| `lib/dominio/login.test.ts` | as quatro primeiras senhas erradas so somam, a quinta bloqueia por 15 minutos e o bloqueio acaba quando passa o horario (RNF12) | 3 |
| `lib/dominio/regras.test.ts` | a ordem anda um passo por vez e nao volta (RN05), concluida nao muda (RN06), cancelamento antes da conclusao (RN07), prazo padrao do servico, atraso (RN12), numero OS-ano-sequencia, aptidao com o motivo de cada recusa (RN01 a RN04), nota media so com tres avaliacões (RN09), validade e formato do documento (RF08, RNF09) e o dia de hoje no horario de brasilia | 18 |
| `app/seguranca.test.ts` | actions do administrador sem sessao ou com outro perfil, actions do prestador e do cliente chamadas pelo administrador, cadastro tentando criar conta de administrador, download de documento e contrato, csv dos relatorios e a rotina do RN02 sem o segredo (RNF02) | 9 |
| `lib/permissao.test.ts` | a conta é conferida no banco a cada requisicao: desativada, apagada ou com perfil trocado perde o acesso mesmo com o cookie antigo | 5 |
| `lib/ordens.banco.test.ts` | contra o banco: numeracao e prazo padrao, nao atribui pra quem tem documento vencido e grava o log, duas atribuicões ao mesmo tempo gravam uma so, dois cliques em aceitar gravam um aceite so, outro prestador nao mexe na ordem, avaliacao unica do cliente titular, cancelamento com motivo e log, recusa devolve pra fila, a rotina do RN02 sem desfazer bloqueio, e cadastro que entra com conta de demonstracao nao é anonimizado | 12 |

## 4. casos de teste pela tela

a coluna evidencia aponta pro print. os de 20/10 estao em `docs/evidencias/entrega-20-10/` e os de 06/11 em `docs/evidencias/entrega-06-11/`. caso sem print teve o resultado conferido na propria tela ou no banco, e o que apareceu esta descrito na coluna observado.

### 4.1 login e acesso (RF01, RNF02, RNF03, RNF12)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT01 | RF01 | entrar com `luis@sgp.teste` e a senha certa | abrir a lista de prestadores com o nome do usuario no topo | abriu `/prestadores`, cabecalho com "Luis Gustavo Boratto - Administrador" | passou | CT01-login-valido-lista-de-prestadores.png |
| CT02 | RF01 | mesmo email com a senha `senhaerrada` | ficar no login com "E-mail ou senha inválidos." e manter o email digitado | ficou no login com a mensagem e o email preenchido (depois da correcao do D01) | passou no reteste | CT02-senha-errada.png |
| CT03 | RF01, UC01 | email que nao existe, `naoexiste@sgp.teste` | a mesma mensagem do CT02, sem dizer que o email nao existe | mesma mensagem, "E-mail ou senha inválidos." | passou | - |
| CT04 | RNF12 | errar a senha do `igor@sgp.teste` 5 vezes seguidas e depois tentar com a senha certa | da 1ª a 4ª: senha invalida. na 5ª e na tentativa com a senha certa: aviso de bloqueio de 15 minutos | 1ª a 4ª "E-mail ou senha inválidos.", 5ª e 6ª "Muitas tentativas erradas para este e-mail. Tente de novo em 15 minutos.", sem entrar | passou no reteste | CT04-bloqueio-apos-cinco-erros.png |
| CT05 | RNF02 | sem estar logado, abrir direto `/prestadores/novo` | ser levado pro login | foi levado pra `/login` | passou | CT05-sem-login-volta-para-login.png |
| CT18 | RNF03 | depois do login, conferir o cookie de sessao no navegador | sessao valendo 30 minutos | cookie `authjs.session-token` vencendo 30 minutos depois do login. a renovacao a cada requisicao vem do `updateAge: 0` no `auth.config.ts` | passou | - |
| CT21 | RNF01 | consultar a tabela `usuario` no banco | senha gravada so como hash bcrypt | as duas senhas gravadas como `$2b$10$...`, 60 caracteres, nenhuma em texto puro | passou | - |

### 4.2 cadastro e consulta de prestadores (RF02, RN10, RNF04, RNF06)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT12 | RF02 | em novo prestador, clicar em salvar sem preencher nada | nao salvar e destacar os campos obrigatorios | nao salvou, 8 campos destacados e o aviso "Confira os campos destacados." | passou | CT12-campos-obrigatorios.png |
| CT09 | RN10 | pessoa juridica com cnpj `42.091.765/0001-00` (digito errado) e o resto preenchido | recusar no campo cnpj e manter o que ja foi digitado | "CNPJ inválido: o dígito verificador não confere." e a razao social continuou preenchida | passou | CT09-cnpj-digito-errado.png |
| CT07 | RF02 | o mesmo cadastro com o cnpj certo, `42.091.765/0001-24` | salvar, voltar pra lista com aviso e o prestador aparecer como pendente | voltou com "Prestador cadastrado. Ele entra como pendente até a documentação ser conferida." e a linha nova com situacao pendente | passou | CT07-cadastro-pj-valido.png |
| CT11 | RN10 | outro cadastro usando o mesmo cnpj `42091765000124`, sem mascara | recusar porque o cnpj ja existe | "Já existe um prestador cadastrado com este CNPJ." | passou | CT11-cnpj-repetido.png |
| CT10 | RN10 | pessoa fisica com cpf `562.190.837-00` (digito errado) | o rotulo do campo virar CPF e recusar o numero | rotulo "CPF" e a mensagem "CPF inválido: o dígito verificador não confere." | passou | CT10-cpf-digito-errado.png |
| CT08 | RF02 | o mesmo cadastro com o cpf certo, `562.190.837-68` | salvar | "Prestador cadastrado..." | passou | - |
| CT20 | RF02, RF09 | consultar a tabela `historico_situacao` depois do CT07 e do CT08 | cada cadastro novo ter o primeiro registro do historico | 2 registros: situacao anterior vazia, nova "pendente", motivo "cadastro inicial do prestador", feito pelo luis | passou | - |
| CT13 | RF02 | buscar por `eletrica` | trazer so os prestadores com esse nome | 2 encontrados: central eletrica zona sete e eletrica santos | passou | CT13-busca-por-nome.png |
| CT14 | RF02 | buscar pelo cnpj com mascara `07.412.865/0001-04` | achar o prestador mesmo com ponto, barra e traco | trouxe so a eletrica santos | passou | - |
| CT15 | RF02 | filtrar a situacao pendente | listar so pendentes | 4 linhas, todas pendentes | passou | CT15-filtro-pendente.png |
| CT16 | RF02 | abrir o prestador do CT07, trocar o telefone pra `(44) 3031-2020` e salvar | salvar e mostrar o telefone novo na lista | "Alterações salvas." e a linha com o telefone novo | passou | CT16-edicao-salva.png |
| CT17 | RF02 | desligar o banco (`ctrl+c` no `npm run banco`) e o sistema, ligar os dois de novo e buscar `zona` | o prestador do CT07 continuar la, com o telefone do CT16 | continuou, com o telefone (44) 3031-2020 | passou | CT17-dados-continuam-apos-reiniciar.png |
| CT19 | RNF04 | abrir o cadastro numa tela de 390 px de largura | nenhuma rolagem horizontal, campos um embaixo do outro | conteudo com 375 px dentro dos 390, campos empilhados | passou | CT19-celular-390px.png |

desde 13/10 o cadastro novo de prestador e de cliente abre numa janela por cima da lista, e a pagina `/prestadores/novo` deixou de existir. o CT05 continua valendo pra qualquer endereco do sistema: sem login, o middleware leva pro `/login` antes de abrir a pagina.

### 4.3 clientes, categorias e servicos (RF03, RF04, RF05)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT22 | RF03 | em clientes, "Novo cliente". cnpj `11222333000181`, mercado bom preco, cep `87013210`, numero 1500 | o cep preencher o endereco, a janela fechar ao salvar e o cliente aparecer na lista sem sair da tela | o cep trouxe "Avenida Tamandaré, Zona 01, Maringá". aviso "Mercado Bom Preço cadastrado." e a linha nova ativa na lista | passou | CT22-cep-preenche-endereco.png, CT22-cliente-cadastrado.png |
| CT23 | RN10 | outro cliente com o mesmo cnpj, agora com mascara `11.222.333/0001-81` | recusar no campo | "Já existe um cliente cadastrado com este CNPJ." | passou | CT23-cnpj-de-cliente-repetido.png |
| CT24 | RF03 | inativar o supermercado zanin, que tem ordem em andamento | recusar dizendo qual ordem | "Não dá para inativar: o cliente tem ordem em aberto (OS-2026-0011). Conclua ou cancele antes." | passou | CT24-inativar-cliente-com-ordem-aberta.png |
| CT25 | RF04 | adicionar a categoria `Elétrica`, que ja existe | recusar o nome repetido | "Já existe uma categoria com esse nome." | passou | CT25-categoria-repetida.png |
| CT26 | RF04 | editar elétrica na janela e desmarcar "ativa" | recusar porque ainda tem servico ativo nela | "Tem 3 serviços ativos nesta categoria. Inative ou mude os serviços antes." | passou | CT26-inativar-categoria-com-servico.png |
| CT27 | RF05 | "Novo serviço" e salvar sem preencher | apontar cada campo obrigatorio | "Informe o nome do serviço.", "Escolha a categoria." e "O prazo padrão é de pelo menos 1 dia." | passou | CT27-servico-sem-dados.png |
| CT28 | RF05 | na mesma janela: troca de chuveiro, elétrica, R$ 95,00, 1 dia | salvar e aparecer no catalogo | "Serviço Troca de chuveiro cadastrado." e a linha "Troca de chuveiro, Elétrica, R$ 95,00, 1 dia, Ativo" | passou | CT28-servico-cadastrado.png |
| CT57 | RF03 | em novo cliente, cnpj `33000167000101` e "Buscar dados na Receita Federal" | preencher razao social e endereco pela brasilapi | "Dados preenchidos pela Receita Federal. Situação do CNPJ: ativa." razao "PETROLEO BRASILEIRO S A PETROBRAS", Rio de Janeiro/RJ | passou | CT57-cnpj-consultado-na-receita.png |

### 4.4 habilitacao, documentos, situacao e contratos (RF06 a RF10, RN02, RN11, RNF09)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT29 | RF06 | na ficha do valdir aparecido da silva, aba categorias, marcar hidráulica e salvar | gravar as habilitacões | "Habilitações salvas." e a tabela com elétrica, hidráulica e manutenção predial | passou | CT29-habilitacao-salva.png |
| CT30 | RF06 | na elétrica santos, desmarcar elétrica | recusar porque ela tem ordem em andamento nessa categoria | "Não dá para tirar a categoria enquanto houver ordem em andamento nela: OS-2026-0011 (Elétrica), OS-2026-0012 (Elétrica)." | passou | CT30-tirar-categoria-com-ordem-em-andamento.png |
| CT31 | RF07 | na ponto certo, enviar apolice de seguro em pdf, validade 01/10/2027 | gravar e mostrar em dia | "Documento enviado: Apólice de seguro." e a situacao "Em dia" na tabela | passou | CT31-documento-enviado.png |
| CT32 | RNF09 | enviar um arquivo com nome `.pdf` mas que por dentro é zip | recusar pelo conteudo, nao pelo nome | "Formato não aceito. Envie o arquivo em PDF, JPG ou PNG, com até 10 MB." | passou | CT32-arquivo-que-nao-e-pdf.png |
| CT33 | RNF09 | enviar um pdf de 10 mb e 5 kb | recusar pelo tamanho | "O arquivo passa de 10 MB." | passou | CT33-arquivo-acima-de-10mb.png |
| CT34 | RF07 | emissao 10/10/2026 e validade 01/10/2026 | recusar as datas invertidas | "A emissão não pode ser depois da validade." e "A validade não pode ser antes da emissão." | passou | CT34-emissao-depois-da-validade.png |
| CT35 | RF07 | enviar uma certidao negativa nova pra ponto certo, que ja tinha uma | a nova fica em dia e a anterior fica no historico como substituida | "Em dia" na nova e "Substituído" na anterior | passou | CT35-versao-anterior-substituida.png |
| CT36 | RF08 | abrir vencimentos | separar vencidos e os que vencem em 30 dias | "Vencidos (3)" e "Vencem nos próximos 30 dias (4)" | passou | CT36-painel-de-vencimentos.png |
| CT62 | RF09 | em vencimentos, "Alterar situação" e depois `esc` | abrir em janela sem trocar de pagina e fechar com esc | abriu em 34 ms continuando em `/vencimentos`, e o esc fechou | passou | CT62-situacao-em-janela-no-painel.png |
| CT37 | RN02 | na são judas, que esta ativa, enviar certidao com validade 01/10/2026 e clicar "Aplicar RN02 agora" | avisar que entrou vencido, e a rotina passar o prestador pra pendente com historico feito pelo sistema | "Documento enviado: Certidão negativa de débitos. A validade (01/10/2026) já passou, então ele entra como vencido.", "1 prestador passou para pendente." e no historico "Ativo para pendente, pelo sistema, Documento obrigatório vencido (RN02)" | passou | CT37-rn02-passou-para-pendente.png |
| CT38 | RF09 | na polar (bloqueada), mudar pra pendente com o motivo `curto`, depois com motivo completo | recusar motivo curto e gravar o historico com quem fez | "O motivo precisa ter no mínimo 10 caracteres." e depois "Bloqueado para pendente, por Luis Gustavo Boratto" com o motivo | passou | CT38-situacao-alterada-com-historico.png |
| CT39 | RN11 | inativar a elétrica santos, que tem duas ordens em andamento | recusar dizendo quais ordens | "Não dá para inativar: conclua ou realoque antes as ordens OS-2026-0011, OS-2026-0012." | passou | CT39-rn11-inativar-com-ordem-em-andamento.png |
| CT40 | RF10 | contrato novo da elétrica santos de 01/11/2026 a 01/11/2027, que cruza com o vigente | recusar a vigencia cruzada | "A vigência cruza com a do contrato CT-2026-004." | passou | CT40-contrato-com-vigencia-cruzada.png |

### 4.5 ordem de servico (RF11 a RF15, RN01 a RN08, RN12)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT42 | RF11 | como cliente zanin, "Nova solicitação": hidráulica, troca de registro, descricao `registro pingando` | recusar descricao curta sem perder o resto | "Descreva com mais detalhe: são necessários pelo menos 20 caracteres." e os outros campos continuaram preenchidos | passou | CT42-descricao-curta.png |
| CT61 | RF11 | na mesma janela, prazo 20/11/2026 e depois prazo em branco | avisar que é feriado e, em branco, mostrar o prazo padrao | "20/11/2026 é feriado nacional (Dia da consciência negra). Confirme se o prestador atende nesse dia." e em branco "Em branco vale o prazo padrão do serviço: 15/10/2026." | passou | CT61-aviso-de-feriado-no-prazo.png |
| CT41 | RF11, UC12 A3.1 | descricao completa, prazo em branco, "Enviar solicitação" | criar a ordem numerada com o prazo padrao e mostrar na lista | "Solicitação OS-2026-0015 enviada. Prazo combinado: 15/10/2026, pelo prazo padrão do serviço." e a linha nova como aberta | passou | CT41-solicitacao-com-prazo-padrao.png |
| CT43 | RF12, RN01 a RN04 | como administrador, "Atribuir" na OS-2026-0013 (hidráulica) | so os aptos com botao, e os demais com o motivo. ao atribuir, ficar na lista | aptos: ponto certo e hidráulica três lagoas. sem botao: jose carlos e valdir (pendentes) e elétrica santos (nao habilitada em hidráulica). "Ordem OS-2026-0013 atribuída a Hidráulica Três Lagoas." e continuou em `/ordens` | passou | CT43-atribuicao-aptos-e-inaptos.png |
| CT49 | RN07, RF19 | cancelar a OS-2026-0014 com o motivo `duplicada`, depois com motivo completo. abrir a OS-2026-0004 (concluida) | recusar motivo curto, cancelar com o completo e nao oferecer cancelar na concluida | "O motivo precisa ter no mínimo 10 caracteres. Faltam 1.", depois "Ordem OS-2026-0014 cancelada." e a trilha em cancelada. a concluida nao mostra o botao | passou | CT49-cancelamento-motivo-curto.png |
| CT45 | RF13, RF14, RN05 | como hidráulica três lagoas, abrir a OS-2026-0013, aceitar, iniciar e registrar andamento | cada passo liberar o seguinte e ficar no historico | historico: ordem aberta, ordem atribuída, atribuição aceita, execução iniciada, andamento registrado | passou | CT45-aceite-inicio-e-andamento.png |
| CT47 | RF13, RN06, RN12 | concluir sem relato, depois com relato | exigir o relato e, depois de concluida, travar a ordem e dizer se foi no prazo | "Descreva o que foi executado antes de concluir a ordem (mínimo de 10 caracteres)." e depois "Concluída dentro do prazo. A ordem não pode mais ser alterada (RN06)." | passou | CT47-conclusao-e-ordem-travada.png |
| CT46 | RF14, RNF02 | ainda como três lagoas, abrir o endereco da OS-2026-0011, que é da elétrica santos | nao mostrar ordem de outro prestador | http 404, "Página não encontrada" | passou | CT46-ordem-de-outro-prestador.png |
| CT51 | RF14, UC14 A3.1 | como elétrica santos, recusar a OS-2026-0012 com motivo. depois, como administrador, abrir a atribuicao dela | voltar pra lista com aviso, e na atribuicao a elétrica santos aparecer como "recusou" | "Ordem OS-2026-0012 devolvida para a fila do administrador." de volta em `/minhas-ordens`. na atribuicao: "Elétrica Santos, Recusou, Já recusou esta ordem" | passou | CT51-recusa-volta-para-a-lista.png, CT51-recusa-volta-para-a-fila.png |
| CT48 | RF15, RN08 | como padaria dom bosco, "Avaliar" a OS-2026-0013 com nota 5 | gravar e tirar o botao de avaliar | "Obrigado pela avaliação." e o botao avaliar sumiu da linha | passou | CT48-avaliacao-em-janela.png |

### 4.6 relatorios, log, lgpd e contas (RF16 a RF19, RN09, RNF10, RNF12)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT50 | RN09 | abrir a lista de prestadores | nota media so pra quem tem 3 avaliacões ou mais | 4,7 e 4,8 nos dois com historico, "Sem histórico" nos demais | passou | CT50-nota-media-na-lista.png |
| CT63 | RF16 | na ficha da elétrica santos, "Ver ordens do prestador" e filtrar aberta de 01/10/2026 ate 31/10/2026. depois o mesmo pela ficha do supermercado zanin | listar so as ordens dele, e so as do periodo quando filtrar | "Histórico do prestador Elétrica Santos" com OS-2026-0011, 0009, 0008 e 0004 (a 0012 que ele recusou no CT51 nao aparece). em outubro, so a OS-2026-0011. pelo cliente, "Histórico do cliente Supermercado Zanin" com 6 ordens, todas dele | passou | CT63-historico-do-prestador-por-periodo.png |
| CT52 | RF17 | relatorio de desempenho e "Exportar CSV" | concluidas, nota, percentual no prazo e o csv com as mesmas linhas | hidráulica três lagoas 4, 4,8, 100%. elétrica santos 3, 4,7, 100%. são judas 2, sem histórico suficiente. ponto certo 1, 0% no prazo. csv salvo | passou | CT52-relatorio-de-desempenho.png, CT52-desempenho.csv |
| CT53 | RF18 | servicos por periodo com a data final antes da inicial, depois o periodo padrao | recusar o periodo invertido e totalizar por categoria | "A data final está antes da inicial. Ajuste o intervalo e gere de novo (UC21)." e o total 12 abertas, 7 concluidas, 2 canceladas | passou | CT53-servicos-por-periodo.png |
| CT54 | RF19 | abrir o log de acões | atribuicões, cancelamento e mudancas de situacao feitas nos casos anteriores | cancelamento de ordem, atribuições e alterações de situação, a mais recente em cima | passou | CT54-log-de-acoes.png |
| CT55 | RNF10 | na cliente ana paula ribeiro (pessoa fisica), confirmar e anonimizar | apagar os dados pessoais e manter as ordens | "Dados pessoais removidos. As ordens do cliente continuam no histórico." a ficha virou "Cadastro anonimizado nº 5", documento ANON0000000005, telefone "dado removido" | passou | CT55-cliente-anonimizado.png |
| CT60 | RF01 | no auto posto maringá, que nao tem login, "Liberar acesso" e entrar com a senha provisoria | a senha continuar na tela ate ser anotada e funcionar | "Acesso liberado. Login adm@autopostomga.com.br, senha provisória ..." continuou na tela 3 segundos depois, e com ela entrou em `/minhas-solicitacoes` | passou | CT60-acesso-liberado-com-senha-provisoria.png |
| CT58 | RNF12, RF01 | errar 5 vezes a senha do `adm@autopostomga.com.br` (login liberado no CT60). como luis, em usuarios, "Gerar senha provisória" e entrar com ela | bloquear, mostrar o bloqueio na tela de usuarios e liberar com a provisoria | "Muitas tentativas erradas para este e-mail. Tente de novo em 15 minutos.", na lista "Bloqueado até 16:00", e com a provisoria entrou em `/minhas-solicitacoes`. ate a versao 1.1 este caso usava o igor, que agora é conta de demonstracao (CT64) | passou | CT58-desbloqueio-com-senha-provisoria.png |
| CT56 | RF03, RNF10 | sem login, "Criar conta" como cliente pessoa fisica, sem marcar o consentimento e depois marcando | exigir o consentimento e entrar como cliente | "Para criar a conta é preciso concordar com o uso dos dados." e depois entrou em `/minhas-solicitacoes` como Marina Souza Teixeira | passou | CT56-cadastro-pela-tela-de-login.png |
| CT64 | RNF12, RNF02 | errar 5 vezes a senha do `igor@sgp.teste`. como luis, em usuarios, buscar `sgp.teste` e "Gerar senha provisória" na linha do igor | as contas de demonstracao sem o botao desativar. a geracao so desbloquear, sem trocar a senha da tela de login | "Bloqueado até 16:01", nenhum botao desativar nas 9 contas @sgp.teste, "Login de igor@sgp.teste desbloqueado. Por ser conta de demonstração, a senha continua a da tela de login." e o igor entrou com `sgp@2026` em `/painel` | passou | CT64-conta-de-demonstracao-so-desbloqueia.png |
| CT65 | RNF02 | como elétrica santos, abrir minha conta | no lugar do formulario de troca de senha, o aviso de conta de demonstracao | nenhum campo de senha. "Esta é uma conta de demonstração, usada por todos que avaliam o sistema. A senha dela não muda, para ninguém ficar sem entrar." | passou | CT65-minha-conta-de-demonstracao.png |
| CT66 | RNF10, RNF02 | como luis, na ficha da elétrica santos, confirmar e "Anonimizar dados" | recusar, porque o login dela é de demonstracao, e nao mudar nada | "Este cadastro entra com uma conta de demonstração, que todo mundo usa. Para testar, use um cadastro sem login." e a ficha continuou "Elétrica Santos" | passou | CT66-anonimizar-cadastro-de-demonstracao.png |
| CT67 | RF01 | em usuarios, "Novo administrador", criar marta regina lopes (`marta.lopes@empresa.com.br`). entrar com a provisoria e trocar a senha em minha conta | abrir em janela, a senha provisoria ficar na janela, e a troca funcionar numa conta que nao é de demonstracao | a janela mostrou "Administrador criado. Login marta.lopes@empresa.com.br, senha provisória ..." e a marta apareceu na lista ao fechar. "Senha trocada. Use a nova no próximo acesso." e com a senha nova entrou em `/painel` | passou | CT67-novo-administrador-em-janela.png |
| CT68 | - | no terminal, `npm run db:restaurar` duas vezes seguidas no banco `sgp_evidencia`, depois dos casos acima | voltar ao estado da carga inicial, sem sobrar nada dos testes | "28 arquivos e 14 tabelas limpos" e "carga feita: 14 ordens de demonstracao". no banco: 9 usuarios, 14 ordens, 22 documentos, 6 contratos, ids comecando do 1. a marta e o login do auto posto sumiram, e os arquivos antigos sairam da pasta de arquivos | passou | - |

### 4.7 celular e desempenho (RNF04, RNF06)

| caso | requisito | passos e entrada | esperado | observado | situacao | evidencia |
|---|---|---|---|---|---|---|
| CT59 | RNF04 | com 390 px de largura: painel do administrador, janela de atribuicao e execucao da ordem pelo prestador | nenhuma rolagem horizontal na pagina | nenhuma rolagem horizontal nas tres telas | passou | CT59-celular-painel.png, CT59-celular-atribuicao.png, CT59-celular-execucao.png |
| CT44 | RNF06 | no sistema publicado, com 5.008 prestadores, abrir cada listagem quatro vezes e medir ate a pagina pronta | responder em ate 3 segundos | a mais lenta levou 716 ms. tabela abaixo | passou | - |

| tela no sistema publicado | 1ª | 2ª | 3ª | 4ª |
|---|---|---|---|---|
| `/prestadores` | 299 ms | 239 ms | 271 ms | 302 ms |
| `/prestadores?pagina=125` | 221 ms | 258 ms | 234 ms | 324 ms |
| `/prestadores?busca=ribeiro` | 246 ms | 186 ms | 200 ms | 263 ms |
| `/prestadores?busca=60000123` (cnpj) | 205 ms | 190 ms | 704 ms | 232 ms |
| `/prestadores?situacao=pendente&pagina=200` | 225 ms | 221 ms | 240 ms | 220 ms |
| `/vencimentos` | 215 ms | 230 ms | 242 ms | 234 ms |
| `/ordens` | 255 ms | 225 ms | 320 ms | 716 ms |
| `/painel` | 392 ms | 620 ms | 519 ms | 299 ms |

os 5 mil prestadores ficticios foram criados com `npx tsx scripts/carga-5mil.ts` e saem com `--apagar`.

**resumo:** 68 casos, todos passando: 21 de 20/10 e 47 de 06/11 (CT22 a CT68). 55 testes automaticos passando.

## 5. defeitos encontrados

| id | onde apareceu | como reproduzir | esperado | observado | situacao | correcao |
|---|---|---|---|---|---|---|
| D01 | print do CT04 | errar a senha no login | o email digitado continuar no campo | o campo de email voltava vazio. o react 19 limpa o formulario depois da action | corrigido e retestado (CT02 e CT04 passaram) | commit `87a0287`. a action do login devolve o email junto com a mensagem |
| D02 | conferencia visual do formulario, antes do commit da entrega | abrir o cadastro numa tela de uns 930 px | campos legiveis, sem barra de rolagem | o campo tipo cortava "Pessoa jurídica" e a linha das abas ganhava barra de rolagem | corrigido antes do commit `1239a07` | grade do formulario refeita em 12 colunas e abas quebrando linha |
| D03 | conferencia no celular, antes do commit da entrega | abrir qualquer tela com 390 px | o menu mostrar prestadores logo de cara | o menu horizontal comecava pelos itens em desenvolvimento e prestadores ficava escondido na rolagem | corrigido antes do commit `1239a07` | no celular os itens em desenvolvimento ficam ocultos |
| D04 | conferencia da tela de edicao, antes do commit da entrega | abrir um prestador ja cadastrado | cep no formato 00000-000 | aparecia so os 8 numeros | corrigido antes do commit `1239a07` | a tela formata o cep ao carregar |
| D05 | cadastro de pessoa fisica com erro em outro campo | escolher pessoa fisica, deixar um campo obrigatorio vazio e salvar | continuar pessoa fisica | a tela mostrava pessoa fisica, mas o formulario por baixo voltava pra juridica e o cpf era validado como cnpj | corrigido, CT10 e CT56 passam | o envio passou a ser pelo `onSubmit`, sem o reset automatico do react 19 |
| D06 | revisao do cadastro pela tela de login | mandar a requisicao do cadastro trocando o perfil pra administrador | recusar | o perfil vinha da tela e podia ser trocado | corrigido antes de publicar, teste automatico em `app/seguranca.test.ts` | o perfil fica preso no servidor e so aceita cliente ou prestador |
| D07 | atribuir pelo painel do dia | atribuir uma ordem na janela aberta pelo painel | aparecer a confirmacao | a ordem saia da lista junto com o botao, e a confirmacao sumia antes de aparecer | corrigido, CT43 passa | o aviso é disparado assim que a resposta chega e fica no canto da tela |
| D08 | revisao de codigo do igor | desativar a conta de alguem que esta logado | perder o acesso na hora | seguia usando o sistema enquanto o cookie valesse | corrigido pelo igor (commit `ee48be1`), teste em `lib/permissao.test.ts` | a conta é conferida no banco a cada tela e action |
| D09 | revisao de codigo do igor | bloquear um prestador enquanto a rotina do RN02 esta rodando | continuar bloqueado | a rotina lia os ativos e gravava pendente so pelo id, entao o bloqueio feito no meio virava pendente | corrigido pelo igor (commit `3cdd17b`), teste em `lib/ordens.banco.test.ts` | a rotina so mexe em quem esta ativo |
| D10 | revisao de codigo do igor | clicar duas vezes rapido em aceitar a ordem | um aceite so | o aceite era gravado sem transacao e entrava duas vezes no historico | corrigido pelo igor (commit `38cc0a5`), teste em `lib/ordens.banco.test.ts` | a linha da ordem fica travada durante a gravacao e o segundo clique recebe o aviso de que ja foi aceita |
| D11 | revisao de codigo do igor | baixar um documento com acento no nome | o nome certo no arquivo baixado | a cedilha chegava como %C3%A7 | corrigido pelo igor (commit `30fa2db`) | cabecalho `filename*` em utf-8 |
| D12 | bateria de 13/10, CT51 | recusar uma ordem como prestador | voltar pra lista com aviso | "Página não encontrada", porque a ordem deixa de ser dele e a pagina dela era redesenhada | corrigido e retestado, CT51 passa | commit `d22d462`. a recusa nao redesenha a ordem e a tela volta pra lista |
| D13 | bateria de 13/10, CT60 | liberar o acesso de um cliente | a senha provisoria ficar na tela | a senha aparecia e sumia em seguida, quando o cartao era redesenhado | corrigido e retestado, CT60 passa | commit `d22d462` |
| D14 | bateria de 13/10, CT41 e CT42 | abrir nova solicitacao como cliente | botao "Enviar solicitação" | o botao dizia "Abrir ordem", o texto do administrador | corrigido e retestado | commit `d22d462` |
| D15 | bateria de 13/10, CT55 | anonimizar um cliente | ver a confirmacao | a ficha mudava inteira e a mensagem ia junto | corrigido e retestado, CT55 passa | commit `d22d462`. a confirmacao vai pro canto da tela |
| D16 | bateria de 13/10, CT31 | enviar uma apolice ou certidao | mensagem com o genero certo | "Apólice de seguro enviado" | corrigido e retestado | commit `d22d462`. "Documento enviado: Apólice de seguro." |
| D17 | print do CT64 | abrir usuarios numa tela de 1280 px e gerar uma senha provisoria | a tabela inteira e a mensagem da linha legivel | a tabela nao cabia ao lado do formulario de novo administrador, rolava de lado e escondia o nome e o fim da mensagem. o print antigo do CT58 ja mostrava isso | corrigido e retestado, CT58 e CT64 passam | commit `df4b653`. novo administrador abre em janela (CT67), a tabela usa a largura toda e a mensagem quebra linha |

nenhum defeito aberto nesta versao.

## 6. o que ainda nao foi testado

| item | por que | quando |
|---|---|---|
| RNF07, firefox e edge | todos os casos rodaram no chrome e no chromium. o sistema nao usa nada especifico de navegador, mas falta abrir nos outros dois | ensaio de 27/11 |
| RNF08, restauracao do backup | o supabase faz o backup diario sozinho, mas a equipe ainda nao restaurou um pra conferir | antes de 27/11 |
| RNF03 em producao | a sessao de 30 minutos foi conferida no ambiente local (CT18), falta conferir no endereco publicado | ensaio de 27/11 |

---

## historico de alteracões

| versao | data | alteracao |
|---|---|---|
| 1.0 | 06/10/2026 | primeira versao, com os testes do recorte da 1ª entrega do 2º bimestre |
| 1.1 | 13/10/2026 | testes da entrega de 06/11: CT22 a CT63 pela tela, 54 testes automaticos, medicao do RNF06 com 5 mil prestadores no sistema publicado e os defeitos D05 a D16 |
| 1.2 | 13/10/2026 | contas de demonstracao travadas e comando que restaura a demonstracao (backlog TA71): CT64 a CT68 novos, CT58 refeito com uma conta que nao é de demonstracao, 55 testes automaticos e o defeito D17 |
