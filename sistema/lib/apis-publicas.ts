// apis publicas e gratuitas, sem chave, chamadas direto do navegador (todas liberam cors).
// sao ajuda de preenchimento: se alguma estiver fora do ar, a pessoa digita na mao e nada
// trava. o servidor nunca confia nesses dados, valida tudo de novo na action (RNF02)
const LIMITE_MS = 8000;

async function buscar<T>(url: string): Promise<T | null> {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(LIMITE_MS) });
    if (!resposta.ok) return null;
    return (await resposta.json()) as T;
  } catch {
    return null;
  }
}

const digitos = (v: string) => v.replace(/\D/g, "");

export type DadosCnpj = {
  razaoSocial: string;
  nomeFantasia: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  situacao: string; // situacao cadastral na receita federal: ATIVA, BAIXADA, INAPTA...
};

// brasilapi.com.br, que repassa os dados abertos da receita federal
export async function consultarCnpj(cnpj: string): Promise<DadosCnpj | null> {
  type Resposta = {
    razao_social: string;
    nome_fantasia: string | null;
    ddd_telefone_1: string | null;
    email: string | null;
    cep: string | null;
    descricao_tipo_de_logradouro: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    descricao_situacao_cadastral: string | null;
  };
  const r = await buscar<Resposta>(`https://brasilapi.com.br/api/cnpj/v1/${digitos(cnpj)}`);
  if (!r?.razao_social) return null;
  const tel = digitos(r.ddd_telefone_1 ?? "");
  // a receita manda tudo em maiusculo: "AVENIDA REPUBLICA DO CHILE" vira "Avenida Republica do Chile"
  const capital = (t: string | null) =>
    (t ?? "")
      .toLowerCase()
      .split(" ")
      .map((p, i) => (i > 0 && ["de", "da", "do", "das", "dos", "e"].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
  return {
    razaoSocial: r.razao_social,
    nomeFantasia: capital(r.nome_fantasia),
    telefone: tel.length >= 10 ? `(${tel.slice(0, 2)}) ${tel.slice(2, -4)}-${tel.slice(-4)}` : "",
    email: (r.email ?? "").toLowerCase(),
    cep: digitos(r.cep ?? ""),
    logradouro: capital([r.descricao_tipo_de_logradouro, r.logradouro].filter(Boolean).join(" ")),
    numero: r.numero && r.numero !== "S/N" ? r.numero : "",
    complemento: capital(r.complemento),
    bairro: capital(r.bairro),
    cidade: capital(r.municipio),
    uf: r.uf ?? "",
    situacao: r.descricao_situacao_cadastral ?? "",
  };
}

// viacep.com.br
export async function consultarCep(cep: string) {
  type Resposta = { logradouro: string; bairro: string; localidade: string; uf: string; erro?: boolean | string };
  const r = await buscar<Resposta>(`https://viacep.com.br/ws/${digitos(cep)}/json/`);
  if (!r || r.erro) return null;
  return { logradouro: r.logradouro, bairro: r.bairro, cidade: r.localidade, uf: r.uf };
}

// ibge: municipios da uf, pra lista de sugestoes do campo cidade
const municipiosPorUf = new Map<string, Promise<string[]>>();
export function municipios(uf: string) {
  if (!municipiosPorUf.has(uf)) {
    municipiosPorUf.set(
      uf,
      buscar<{ nome: string }[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`).then((l) => (l ?? []).map((m) => m.nome)),
    );
  }
  return municipiosPorUf.get(uf)!;
}

// brasilapi: feriados nacionais do ano (aaaa-mm-dd -> nome)
const feriadosPorAno = new Map<number, Promise<Map<string, string>>>();
export function feriados(ano: number) {
  if (!feriadosPorAno.has(ano)) {
    feriadosPorAno.set(
      ano,
      buscar<{ date: string; name: string }[]>(`https://brasilapi.com.br/api/feriados/v1/${ano}`).then((l) => new Map((l ?? []).map((f) => [f.date, f.name]))),
    );
  }
  return feriadosPorAno.get(ano)!;
}
