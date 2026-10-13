// carga inicial (docs/modelo-de-dados.md, secao 9) + dados ficticios pra demonstracao.
// todos os dados sao inventados, conforme a restricao de lgpd da 1a entrega.
// as datas sao contadas a partir do dia em que a carga roda, pra demonstracao nunca ficar velha:
// sempre tem documento vencido, documento vencendo, ordem aberta, em execucao, concluida e avaliada.
// rodar com: npm run db:carga (pode rodar mais de uma vez, nao duplica)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { guardarArquivo } from "../lib/storage";

const prisma = new PrismaClient();
const SENHA_TESTE = "sgp@2026";

// ---------------------------------------------------------------- datas

const agora = new Date();
const hojeBR = new Date(agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00Z");
const DIA = 86400000;
// dia relativo a hoje, como coluna date
const dia = (n: number) => new Date(hojeBR.getTime() + n * DIA);
// horario de brasilia num dia relativo (brasilia = utc-3)
const as = (n: number, hora: number, minuto = 0) => new Date(hojeBR.getTime() + n * DIA + (hora + 3) * 3600000 + minuto * 60000);

// ---------------------------------------------------------------- pdf de mentira

// um pdf de uma pagina com uma linha de texto, so pra ter o que baixar na demonstracao
function pdf(texto: string) {
  const conteudo = `BT /F1 14 Tf 60 760 Td (${texto.replace(/[()\\]/g, "")}) Tj 0 -24 Td (documento ficticio gerado pela carga de teste do SGP) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let saida = "%PDF-1.4\n";
  const posicoes: number[] = [];
  objetos.forEach((o, i) => {
    posicoes.push(saida.length);
    saida += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = saida.length;
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posicoes.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(saida);
}

// ---------------------------------------------------------------- carga

async function main() {
  const hash = await bcrypt.hash(SENHA_TESTE, 10); // RNF01, custo 10
  const usuario = (email: string, nome: string, perfil: string) =>
    prisma.usuario.upsert({ where: { email }, update: {}, create: { email, nome, perfil, senha_hash: hash } });

  const luis = await usuario("luis@sgp.teste", "Luis Gustavo Boratto", "administrador");
  await usuario("igor@sgp.teste", "Igor Schiniegoski Pallisser", "administrador");

  const tipos = [
    { nome: "CPF", obrigatorio: true, exige_validade: false },
    { nome: "RG", obrigatorio: true, exige_validade: false },
    { nome: "CNPJ", obrigatorio: true, exige_validade: false },
    { nome: "Certidão negativa de débitos", obrigatorio: true, exige_validade: true },
    { nome: "Comprovante de endereço", obrigatorio: false, exige_validade: false },
    { nome: "Apólice de seguro", obrigatorio: false, exige_validade: true },
    { nome: "Certificado de curso", obrigatorio: false, exige_validade: true },
  ];
  for (const tipo of tipos) await prisma.tipo_documento.upsert({ where: { nome: tipo.nome }, update: {}, create: tipo });

  for (const nome of ["Elétrica", "Hidráulica", "Limpeza", "Manutenção predial", "Refrigeração", "Informática"]) {
    await prisma.categoria_servico.upsert({ where: { nome }, update: {}, create: { nome, ativa: nome !== "Informática" } });
  }

  const endereco = { logradouro: "Avenida Brasil", bairro: "Centro", cidade: "Maringá", uf: "PR", cep: "87013000" };
  const prestadores = [
    { tipo_pessoa: "J", nome_razao_social: "ELETRICA SANTOS E CIA LTDA", nome_fantasia: "Elétrica Santos", cpf_cnpj: "07412865000104", telefone: "(44) 99812-4410", email: "eletricasantos@hotmail.com", numero: "1420", situacao: "ativo" },
    { tipo_pessoa: "F", nome_razao_social: "JOSE CARLOS DE OLIVEIRA", cpf_cnpj: "04128837679", telefone: "(44) 99745-2201", numero: "88", situacao: "pendente" },
    { tipo_pessoa: "J", nome_razao_social: "LIMPADORA SAO JUDAS LTDA", nome_fantasia: "São Judas", cpf_cnpj: "19603774000135", telefone: "(44) 3025-7788", email: "contato@limpadorasaojudas.com.br", numero: "310", situacao: "ativo" },
    { tipo_pessoa: "J", nome_razao_social: "POLAR REFRIGERACAO E CLIMATIZACAO LTDA", nome_fantasia: "Polar", cpf_cnpj: "26155908000168", telefone: "(44) 99120-3377", numero: "57", situacao: "bloqueado" },
    { tipo_pessoa: "F", nome_razao_social: "VALDIR APARECIDO DA SILVA", cpf_cnpj: "88304152940", telefone: "(44) 99666-1180", numero: "1002", situacao: "pendente" },
    { tipo_pessoa: "J", nome_razao_social: "HIDRAULICA PONTO CERTO LTDA", nome_fantasia: "Ponto Certo", cpf_cnpj: "33810427000104", telefone: "(44) 3263-9021", email: "pontocerto.hidraulica@gmail.com", numero: "45", situacao: "ativo" },
    { tipo_pessoa: "F", nome_razao_social: "MARCIA REGINA FERREIRA", cpf_cnpj: "31765290406", telefone: "(44) 99871-5530", numero: "230", situacao: "inativo" },
    { tipo_pessoa: "J", nome_razao_social: "HIDRAULICA TRES LAGOAS LTDA", nome_fantasia: "Hidráulica Três Lagoas", cpf_cnpj: "41827365000171", telefone: "(44) 99133-0458", email: "treslagoas@hidraulica.com.br", numero: "2210", situacao: "ativo" },
  ];
  for (const p of prestadores) {
    await prisma.prestador.upsert({ where: { cpf_cnpj: p.cpf_cnpj }, update: {}, create: { ...endereco, ...p } });
  }

  const clientes = [
    { tipo_pessoa: "J", nome_razao_social: "ZANIN COMERCIO DE ALIMENTOS LTDA", nome_fantasia: "Supermercado Zanin", cpf_cnpj: "05937612000129", telefone: "(44) 3028-1100", email: "compras@superzanin.com.br", logradouro: "Rua Néo Alves Martins", numero: "2810", bairro: "Zona 3", cidade: "Maringá", cep: "87013210" },
    { tipo_pessoa: "J", nome_razao_social: "PANIFICADORA DOM BOSCO LTDA", nome_fantasia: "Padaria Dom Bosco", cpf_cnpj: "22804157000102", telefone: "(44) 3262-4471", email: "padariadombosco@gmail.com", logradouro: "Avenida Mandacaru", numero: "1503", bairro: "Jardim Alvorada", cidade: "Maringá", cep: "87033000" },
    { tipo_pessoa: "J", nome_razao_social: "ASSOCIACAO EDUCACIONAL SAO VICENTE", nome_fantasia: "Colégio São Vicente", cpf_cnpj: "31470286000100", telefone: "(44) 3264-9900", email: "secretaria@saovicente.com.br", logradouro: "Rua Pioneiro João Bento", numero: "77", bairro: "Centro", cidade: "Sarandi", cep: "87111000" },
    { tipo_pessoa: "J", nome_razao_social: "AUTO POSTO MARINGA LTDA", nome_fantasia: "Auto Posto Maringá", cpf_cnpj: "14628093000108", telefone: "(44) 3031-2020", email: "adm@autopostomga.com.br", logradouro: "Avenida Colombo", numero: "6500", bairro: "Zona 7", cidade: "Maringá", cep: "87020000" },
    { tipo_pessoa: "F", nome_razao_social: "ANA PAULA RIBEIRO", cpf_cnpj: "52718493097", telefone: "(44) 99901-7712", email: "anapaula.ribeiro@gmail.com", logradouro: "Rua Santos Dumont", numero: "1188", complemento: "ap 32", bairro: "Zona 1", cidade: "Maringá", cep: "87013050" },
  ];
  for (const c of clientes) {
    await prisma.cliente.upsert({ where: { cpf_cnpj: c.cpf_cnpj }, update: {}, create: { ...c, uf: "PR" } });
  }

  // o resto so entra no banco vazio de ordens, senao a carga duplicaria a historia
  if ((await prisma.ordem_servico.count()) > 0) {
    console.log("ja tem ordens no banco, pulando a parte de demonstracao");
    return fim();
  }

  const P = Object.fromEntries((await prisma.prestador.findMany()).map((p) => [p.cpf_cnpj, p]));
  const C = Object.fromEntries((await prisma.cliente.findMany()).map((c) => [c.cpf_cnpj, c]));
  const T = Object.fromEntries((await prisma.tipo_documento.findMany()).map((t) => [t.nome, t]));
  const CAT = Object.fromEntries((await prisma.categoria_servico.findMany()).map((c) => [c.nome, c]));

  const santos = P["07412865000104"], jose = P["04128837679"], judas = P["19603774000135"], polar = P["26155908000168"];
  const valdir = P["88304152940"], pontoCerto = P["33810427000104"], marcia = P["31765290406"], tresLagoas = P["41827365000171"];
  const zanin = C["05937612000129"], domBosco = C["22804157000102"], saoVicente = C["31470286000100"], autoPosto = C["14628093000108"];

  // catalogo
  const catalogo: [string, string, number, number, string][] = [
    ["Elétrica", "Instalação de tomadas", 187.5, 3, "Instalação de tomadas novas em alvenaria ou drywall, incluindo passagem de cabo e teste de carga. O material fica por conta do cliente."],
    ["Elétrica", "Troca de disjuntor", 122, 2, "Substituição de disjuntor no quadro, com teste e identificação do circuito."],
    ["Elétrica", "Revisão de quadro elétrico", 350, 5, "Reaperto, troca de componentes gastos e identificação dos circuitos."],
    ["Hidráulica", "Desentupimento de pia", 215, 1, "Desentupimento de pia de cozinha ou banheiro, com limpeza do sifão."],
    ["Hidráulica", "Troca de registro", 160, 2, "Troca de registro de gaveta ou de pressão, com fechamento e teste."],
    ["Hidráulica", "Conserto de vazamento", 190, 2, "Localização e conserto de vazamento aparente em tubulação."],
    ["Limpeza", "Limpeza pós-obra", 940, 2, "Limpeza completa depois de reforma: retirada de entulho fino, vidros e pisos."],
    ["Limpeza", "Limpeza de caixa d'água", 280, 1, "Esvaziamento, escovação e desinfecção da caixa d'água."],
    ["Manutenção predial", "Troca de fechadura", 130, 1, "Troca de fechadura de porta interna ou externa."],
    ["Manutenção predial", "Pintura de parede", 600, 4, "Pintura de parede interna com massa corrida nos pontos que precisarem."],
    ["Refrigeração", "Manutenção de ar-condicionado", 300, 4, "Limpeza de filtros e serpentina, verificação de gás e dreno."],
    ["Refrigeração", "Instalação de ar-condicionado split", 650, 3, "Instalação de aparelho split de até 18 mil BTUs, com suporte e tubulação de até 3 metros."],
  ];
  const S: Record<string, { id_servico: number }> = {};
  for (const [cat, nome, valor, prazo, descricao] of catalogo) {
    S[nome] = await prisma.servico.create({ data: { id_categoria: CAT[cat].id_categoria, nome, valor_referencia: valor, prazo_padrao_dias: prazo, descricao } });
  }

  // habilitacoes (RN04)
  const habilita = async (p: { id_prestador: number }, cats: string[], ha: number) => {
    for (const c of cats) await prisma.prestador_categoria.create({ data: { id_prestador: p.id_prestador, id_categoria: CAT[c].id_categoria, habilitado_em: dia(-ha) } });
  };
  await habilita(santos, ["Elétrica"], 250);
  await habilita(jose, ["Hidráulica"], 200);
  await habilita(judas, ["Limpeza"], 230);
  await habilita(polar, ["Refrigeração"], 180);
  await habilita(valdir, ["Manutenção predial", "Elétrica"], 160);
  await habilita(pontoCerto, ["Hidráulica"], 140);
  await habilita(marcia, ["Limpeza"], 300);
  await habilita(tresLagoas, ["Hidráulica"], 120);

  // documentos. o arquivo e um pdf de mentira guardado no mesmo storage do sistema
  const documento = async (p: { id_prestador: number }, tipo: string, emissao: number, validade: number | null, versaoAtual = true) => {
    const caminho = await guardarArquivo(`documentos/${p.id_prestador}`, pdf(`${tipo} - prestador ${p.id_prestador}`), "application/pdf");
    const nome = tipo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
    return prisma.documento.create({
      data: {
        id_prestador: p.id_prestador,
        id_tipo_documento: T[tipo].id_tipo_documento,
        nome_arquivo: `${nome}.pdf`,
        arquivo_url: caminho,
        tamanho_bytes: 1200,
        data_emissao: dia(emissao),
        data_validade: validade === null ? null : dia(validade),
        versao_atual: versaoAtual,
        enviado_por: luis.id_usuario,
        enviado_em: as(emissao, 10),
      },
    });
  };
  await documento(santos, "CNPJ", -250, null);
  await documento(santos, "Certidão negativa de débitos", -300, -120, false); // versao anterior, substituida
  await documento(santos, "Certidão negativa de débitos", -100, 80);
  await documento(santos, "Apólice de seguro", -250, 110);
  await documento(santos, "Certificado de curso", -340, 19);
  await documento(jose, "CPF", -200, null);
  await documento(jose, "RG", -200, null);
  await documento(jose, "Certidão negativa de débitos", -190, -10);
  await documento(judas, "CNPJ", -230, null);
  await documento(judas, "Certidão negativa de débitos", -170, 12);
  await documento(polar, "CNPJ", -180, null);
  await documento(polar, "Certidão negativa de débitos", -200, -23);
  await documento(polar, "Apólice de seguro", -360, 6);
  await documento(valdir, "CPF", -160, null);
  await documento(valdir, "RG", -160, null);
  await documento(valdir, "Certificado de curso", -369, -4);
  await documento(pontoCerto, "CNPJ", -140, null);
  await documento(pontoCerto, "Certidão negativa de débitos", -60, 120);
  await documento(tresLagoas, "CNPJ", -120, null);
  await documento(tresLagoas, "Certidão negativa de débitos", -40, 140);
  await documento(tresLagoas, "Apólice de seguro", -343, 22);
  await documento(marcia, "CPF", -300, null);

  // contratos (RN03): todo prestador que trabalha tem um vigente
  for (const [p, numero] of [[santos, "CT-2026-004"], [judas, "CT-2026-007"], [pontoCerto, "CT-2026-011"], [tresLagoas, "CT-2026-015"], [jose, "CT-2026-009"], [valdir, "CT-2026-012"]] as const) {
    const caminho = await guardarArquivo(`contratos/${p.id_prestador}`, pdf(`Contrato ${numero}`), "application/pdf");
    await prisma.contrato.create({ data: { id_prestador: p.id_prestador, numero, data_inicio: dia(-200), data_fim: dia(165), valor: 1800, arquivo_url: caminho } });
  }

  // historico de situacao e log, contando como cada um chegou onde esta
  const situacao = async (p: { id_prestador: number }, passos: [string | null, string, string, number, boolean][]) => {
    for (const [de, para, motivo, quando, sistema] of passos) {
      await prisma.historico_situacao.create({
        data: { id_prestador: p.id_prestador, situacao_anterior: de, situacao_nova: para, motivo, id_usuario: sistema ? null : luis.id_usuario, alterado_em: sistema ? as(quando, 0, 5) : as(quando, 9, 12) },
      });
      if (de && !sistema) {
        await prisma.log_acao.create({ data: { id_usuario: luis.id_usuario, acao: "alteracao_situacao", entidade: "prestador", entidade_id: p.id_prestador, detalhe: `${de} para ${para}: ${motivo}`, registrado_em: as(quando, 9, 12) } });
      }
    }
  };
  const inicio: [null, string, string, number, boolean] = [null, "pendente", "Cadastro inicial, aguardando a documentação obrigatória.", -250, false];
  await situacao(santos, [inicio, ["pendente", "ativo", "Documentação conferida e contrato assinado.", -245, false]]);
  await situacao(jose, [[null, "pendente", inicio[2], -200, false], ["pendente", "ativo", "Documentação conferida e contrato assinado.", -195, false], ["ativo", "pendente", "Documento obrigatório vencido: certidão negativa de débitos (RN02).", -9, true]]);
  await situacao(judas, [[null, "pendente", inicio[2], -230, false], ["pendente", "ativo", "Documentação conferida e contrato assinado.", -228, false]]);
  await situacao(polar, [[null, "pendente", inicio[2], -180, false], ["pendente", "ativo", "Documentação conferida.", -175, false], ["ativo", "bloqueado", "Duas reclamações de cliente sobre serviço deixado pela metade. Bloqueado até a reunião com o responsável.", -30, false]]);
  await situacao(valdir, [[null, "pendente", inicio[2], -160, false], ["pendente", "ativo", "Documentação conferida e contrato assinado.", -150, false], ["ativo", "pendente", "Falta enviar a certidão negativa de débitos para renovar o contrato.", -12, false]]);
  await situacao(pontoCerto, [[null, "pendente", inicio[2], -140, false], ["pendente", "ativo", "Documentação conferida e contrato assinado.", -138, false]]);
  await situacao(marcia, [[null, "pendente", inicio[2], -300, false], ["pendente", "ativo", "Documentação conferida.", -295, false], ["ativo", "inativo", "A prestadora encerrou as atividades e pediu o desligamento.", -60, false]]);
  await situacao(tresLagoas, [[null, "pendente", inicio[2], -120, false], ["pendente", "ativo", "Documentação conferida e contrato assinado.", -118, false]]);

  // logins de prestador e de cliente, todos com a mesma senha de teste
  const loginPrestador = async (p: typeof santos, email: string) => {
    const u = await usuario(email, p.nome_fantasia ?? p.nome_razao_social, "prestador");
    await prisma.prestador.update({ where: { id_prestador: p.id_prestador }, data: { id_usuario: u.id_usuario } });
    return u;
  };
  const loginCliente = async (c: typeof zanin, email: string) => {
    const u = await usuario(email, c.nome_fantasia ?? c.nome_razao_social, "cliente");
    await prisma.cliente.update({ where: { id_cliente: c.id_cliente }, data: { id_usuario: u.id_usuario } });
    return u;
  };
  const uSantos = await loginPrestador(santos, "eletrica@sgp.teste");
  const uJudas = await loginPrestador(judas, "saojudas@sgp.teste");
  const uPonto = await loginPrestador(pontoCerto, "pontocerto@sgp.teste");
  const uTres = await loginPrestador(tresLagoas, "treslagoas@sgp.teste");
  const uZanin = await loginCliente(zanin, "zanin@sgp.teste");
  const uDom = await loginCliente(domBosco, "dombosco@sgp.teste");
  const uVicente = await loginCliente(saoVicente, "saovicente@sgp.teste");
  const usuarioDo = new Map([[santos.id_prestador, uSantos], [judas.id_prestador, uJudas], [pontoCerto.id_prestador, uPonto], [tresLagoas.id_prestador, uTres]]);
  const usuarioCliente = new Map([[zanin.id_cliente, uZanin], [domBosco.id_cliente, uDom], [saoVicente.id_cliente, uVicente]]);

  // ordens: cada uma anda pelos status com o historico e o log que o sistema gravaria
  let sequencia = 0;
  type Ordem = {
    cliente: typeof zanin;
    servico: string;
    descricao: string;
    abertaHa: number;
    prazo: number;
    prioridade?: string;
    prestador?: typeof santos;
    ate: "aberta" | "atribuida" | "aceita" | "em_execucao" | "concluida" | "cancelada";
    concluidaEm?: number;
    relato?: string;
    andamento?: string;
    nota?: number;
    comentario?: string;
    cancelamento?: string;
  };
  const ano = hojeBR.getUTCFullYear();
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

  const ordem = async (o: Ordem) => {
    sequencia++;
    const numero = `OS-${ano}-${String(sequencia).padStart(4, "0")}`;
    const quemAbriu = usuarioCliente.get(o.cliente.id_cliente) ?? luis;
    const etapas = ["aberta", "atribuida", "aceita", "em_execucao", "concluida"];
    const chegou = (e: string) => o.ate !== "cancelada" && etapas.indexOf(o.ate) >= etapas.indexOf(e);
    const uPrest = o.prestador ? usuarioDo.get(o.prestador.id_prestador)! : null;
    // aberta hoje fica uma hora atras, pra nao nascer no futuro se a carga rodar cedo
    const tAbertura = o.abertaHa === 0 ? new Date(agora.getTime() - 3600000) : as(-o.abertaHa, 8, 47);
    const tAtribuicao = as(-o.abertaHa, 9, 40);
    const tAceite = as(-o.abertaHa, 10, 5);
    const tInicio = as(-o.abertaHa, 10, 30);
    const tConclusao = o.concluidaEm !== undefined ? as(-o.concluidaEm, 16, 20) : null;
    const status = o.ate === "aceita" ? "atribuida" : o.ate;

    const criada = await prisma.ordem_servico.create({
      data: {
        numero,
        id_cliente: o.cliente.id_cliente,
        id_servico: S[o.servico].id_servico,
        id_prestador: chegou("atribuida") ? o.prestador!.id_prestador : null,
        descricao: o.descricao,
        local_atendimento: `${o.cliente.logradouro}, ${o.cliente.numero} - ${o.cliente.bairro}`,
        prioridade: o.prioridade ?? "normal",
        prazo: dia(-o.abertaHa + o.prazo),
        status,
        aberta_por: quemAbriu.id_usuario,
        data_abertura: tAbertura,
        data_atribuicao: chegou("atribuida") ? tAtribuicao : null,
        data_inicio_execucao: chegou("em_execucao") ? tInicio : null,
        data_conclusao: chegou("concluida") ? tConclusao : null,
        relato_conclusao: chegou("concluida") ? o.relato : null,
        // RN12: no prazo quando o dia da conclusao nao passa do dia do prazo
        entregue_no_prazo: chegou("concluida") ? -o.concluidaEm! <= -o.abertaHa + o.prazo : null,
        motivo_cancelamento: o.cancelamento ?? null,
      },
    });
    const andamentos: [string | null, string, string | null, number, Date][] = [[null, "aberta", "Prazo informado na solicitação.", quemAbriu.id_usuario, tAbertura]];
    if (chegou("atribuida")) andamentos.push(["aberta", "atribuida", `Atribuída a ${nome(o.prestador!)}.`, luis.id_usuario, tAtribuicao]);
    if (chegou("aceita")) andamentos.push(["atribuida", "atribuida", "O prestador aceitou a ordem.", uPrest!.id_usuario, tAceite]);
    if (chegou("em_execucao")) andamentos.push(["atribuida", "em_execucao", null, uPrest!.id_usuario, tInicio]);
    if (o.andamento && chegou("em_execucao")) andamentos.push(["em_execucao", "em_execucao", o.andamento, uPrest!.id_usuario, as(-o.abertaHa + 1, 17, 40)]);
    if (chegou("concluida")) andamentos.push(["em_execucao", "concluida", o.relato!, uPrest!.id_usuario, tConclusao!]);
    if (o.ate === "cancelada") andamentos.push(["aberta", "cancelada", o.cancelamento!, luis.id_usuario, as(-o.abertaHa + 1, 10, 0)]);
    for (const [de, para, obs, quem, quando] of andamentos) {
      await prisma.andamento_ordem.create({ data: { id_ordem: criada.id_ordem, status_anterior: de, status_novo: para, observacao: obs, id_usuario: quem, registrado_em: quando } });
    }
    if (chegou("atribuida")) {
      await prisma.log_acao.create({ data: { id_usuario: luis.id_usuario, acao: "atribuicao", entidade: "ordem_servico", entidade_id: criada.id_ordem, detalhe: `${numero}: Atribuída a ${nome(o.prestador!)}.`, registrado_em: tAtribuicao } });
    }
    if (o.ate === "cancelada") {
      await prisma.log_acao.create({ data: { id_usuario: luis.id_usuario, acao: "cancelamento", entidade: "ordem_servico", entidade_id: criada.id_ordem, detalhe: `${numero}: ${o.cancelamento}`, registrado_em: as(-o.abertaHa + 1, 10, 0) } });
    }
    if (o.nota) await prisma.avaliacao.create({ data: { id_ordem: criada.id_ordem, nota: o.nota, comentario: o.comentario ?? null, avaliado_em: as(-(o.concluidaEm ?? 0) + 1, 11) } });
  };

  // as mais antigas primeiro, pra numeracao seguir a data de abertura
  await ordem({ cliente: domBosco, servico: "Conserto de vazamento", descricao: "vazamento embaixo da pia do banheiro dos funcionarios, ja molhou o rodape e ta subindo umidade na parede", abertaHa: 70, prazo: 2, prestador: tresLagoas, ate: "concluida", concluidaEm: 69, relato: "troquei a conexao do sifao e a mangueira flexivel, testei por 20 minutos sem vazamento", nota: 5, comentario: "resolveram no mesmo dia" });
  await ordem({ cliente: saoVicente, servico: "Troca de registro", descricao: "registro do bebedouro do patio nao fecha mais, a agua fica escorrendo o dia inteiro", abertaHa: 52, prazo: 2, prestador: tresLagoas, ate: "concluida", concluidaEm: 51, relato: "troquei o registro de gaveta de 3/4 e o reparo do bebedouro", nota: 4 });
  await ordem({ cliente: zanin, servico: "Desentupimento de pia", descricao: "pia do acougue entupida, a agua volta pelo ralo do chao quando lava as bancadas", abertaHa: 41, prazo: 1, prestador: tresLagoas, ate: "concluida", concluidaEm: 41, relato: "desentupi com maquina, tinha muita gordura na caixa. recomendei limpar a caixa de gordura todo mes", nota: 5, comentario: "chegou rapido e explicou o problema" });
  await ordem({ cliente: zanin, servico: "Troca de disjuntor", descricao: "o disjuntor da camara fria desarma toda vez que liga o compressor junto com o forno", abertaHa: 30, prazo: 3, prestador: santos, ate: "concluida", concluidaEm: 28, relato: "troquei o disjuntor geral por um de 40A, testei com a camara ligada e identifiquei o quadro com etiqueta nova", nota: 5, comentario: "chegou no horario e deixou tudo limpo. so demorou um pouco pra achar o quadro" });
  await ordem({ cliente: saoVicente, servico: "Limpeza pós-obra", descricao: "terminou a reforma das duas salas do segundo andar, precisa limpar antes da volta das aulas na segunda", abertaHa: 27, prazo: 2, prestador: judas, ate: "concluida", concluidaEm: 25, relato: "limpeza completa das duas salas, vidros e piso. retirado o entulho fino que ficou nos cantos", nota: 4 });
  await ordem({ cliente: domBosco, servico: "Desentupimento de pia", descricao: "pia da cozinha entupida desde ontem a tarde, a agua nao desce de jeito nenhum", abertaHa: 22, prazo: 1, prestador: pontoCerto, ate: "concluida", concluidaEm: 20, relato: "desentupido com mola, troquei o sifao que estava rachado", nota: 3, comentario: "resolveu mas chegou um dia depois do combinado" });
  await ordem({ cliente: autoPosto, servico: "Manutenção de ar-condicionado", descricao: "ar da conveniencia pingando agua em cima do caixa e fazendo barulho alto", abertaHa: 19, prazo: 4, ate: "cancelada", cancelamento: "cliente resolveu com a assistencia tecnica da marca, que ainda estava na garantia" });
  await ordem({ cliente: zanin, servico: "Revisão de quadro elétrico", descricao: "quadro do deposito esquentando e com cheiro de queimado, precisa revisar antes de ligar as geladeiras novas", abertaHa: 18, prazo: 5, prestador: santos, ate: "concluida", concluidaEm: 15, relato: "reapertei todos os bornes, troquei dois disjuntores com sinal de aquecimento e o barramento de neutro", nota: 5 });
  await ordem({ cliente: saoVicente, servico: "Instalação de tomadas", descricao: "precisa de 6 tomadas novas na sala de informatica, perto das bancadas da parede do fundo", abertaHa: 13, prazo: 3, prestador: santos, ate: "concluida", concluidaEm: 10, relato: "instaladas as 6 tomadas com circuito separado e disjuntor proprio no quadro", nota: 4, comentario: "servico bem feito" });
  await ordem({ cliente: zanin, servico: "Limpeza de caixa d'água", descricao: "limpeza semestral da caixa d'agua do predio, sao duas caixas de mil litros na laje", abertaHa: 4, prazo: 1, prestador: judas, ate: "concluida", concluidaEm: 3, relato: "as duas caixas esvaziadas, escovadas e desinfetadas. tampas recolocadas com lacre" });
  await ordem({ cliente: zanin, servico: "Instalação de tomadas", descricao: "instalar 4 tomadas no estoque, 2 em cada parede. uma delas tem que ser de 20A por causa da seladora nova. o material ja comprei, esta na sala do gerente", abertaHa: 2, prazo: 4, prestador: santos, ate: "em_execucao", andamento: "passei o cabo das duas primeiras tomadas. amanha volto pra fechar a parede" });
  await ordem({ cliente: saoVicente, servico: "Troca de disjuntor", descricao: "disjuntor do bloco b desarmando sozinho no meio da aula, ja aconteceu tres vezes essa semana", abertaHa: 1, prazo: 5, prestador: santos, ate: "atribuida" });
  await ordem({ cliente: domBosco, servico: "Desentupimento de pia", descricao: "a pia da cozinha entupiu ontem de tarde e a agua nao desce mais. ja transbordou uma vez e molhou o estoque de farinha. precisa resolver antes de quinta se nao a padaria nao abre", abertaHa: 1, prazo: 2, prioridade: "alta", ate: "aberta" });
  await ordem({ cliente: saoVicente, servico: "Conserto de vazamento", descricao: "vazamento no teto do banheiro masculino do primeiro andar, parece vir do banheiro de cima", abertaHa: 0, prazo: 3, ate: "aberta" });

  console.log(`carga feita: ${sequencia} ordens de demonstracao.`);
  return fim();
}

function fim() {
  console.log(`login de teste (senha ${SENHA_TESTE}): luis@sgp.teste ou igor@sgp.teste (administrador), eletrica@sgp.teste (prestador), zanin@sgp.teste (cliente)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
