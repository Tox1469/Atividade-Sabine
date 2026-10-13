# -*- coding: utf-8 -*-
"""
gera a versao imprimivel (.html) dos documentos em markdown da pasta docs/.

o html sai com o mesmo layout do documento-visao-requisitos.html da 1a entrega:
capa, sumario em a4 e tabelas no padrao azul. as imagens dos diagramas entram
embutidas em base64, entao o arquivo pode ser aberto ou convertido em pdf
sozinho, sem depender da pasta diagramas/.

uso:
    pip install markdown
    python ferramentas/gerar-html.py
"""

import base64
import os
import re

import markdown

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RAIZ, "docs")

# reaproveita o css do documento da 1a entrega, pra manter o padrao visual
_MODELO = os.path.join(DOCS, "documento-visao-requisitos.html")
CSS = open(_MODELO, encoding="utf-8").read().split("<style>")[1].split("</style>")[0]

CSS += """
  img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
  figure { margin: 1.2em 0; text-align: center; page-break-inside: avoid; }
  pre { background: #f6f8fa; border: 1px solid #d0d7de; padding: 10px 12px;
        font-family: Consolas, "Courier New", monospace; font-size: 9.5pt;
        line-height: 1.35; overflow-x: auto; page-break-inside: avoid; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 10pt;
         background: #f0f3f6; padding: 1px 4px; border-radius: 3px; }
  pre code { background: none; padding: 0; font-size: 9.5pt; }
  h4 { color: #1f4e79; font-size: 11.5pt; margin-top: 1em; margin-bottom: .3em; }
  hr { border: 0; border-top: 1px solid #d0d7de; margin: 1.6em 0; }
  ol li, ul li { text-align: justify; }
"""

CAPA = """
<div class="capa">
  <div class="inst">unicesumar<br>analise e desenvolvimento de sistemas<br>imersao profissional - projeto de software</div>
  <div class="titulo">sgp - sistema de gestao de prestadores</div>
  <div class="sub">{subtitulo}<br>{entrega} - equipe 8</div>
  <div class="equipe">
    <strong>integrantes</strong><br>
    luis gustavo boratto de oliveira<br>
    igor schiniegoski pallisser
  </div>
  <div class="rodape">{data}</div>
</div>
"""

PAGINA = """<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<title>{titulo}</title>
<style>{css}</style>
</head>
<body>
{capa}
{corpo}
</body>
</html>
"""

# documentos gerados: arquivo .md, titulo da aba, subtitulo da capa, entrega, data da capa
DOCUMENTOS = [
    ("casos-de-uso.md",
     "sgp - casos de uso e historias de usuario - equipe 8",
     "casos de uso, historias de usuario e priorizacao",
     "2&ordf; entrega",
     "agosto de 2026"),
    ("tecnologias-e-arquitetura.md",
     "sgp - tecnologias e arquitetura - equipe 8",
     "especificacao de tecnologias e arquitetura",
     "2&ordf; entrega, revisado nas duas primeiras entregas do 2&ordm; bimestre",
     "outubro de 2026"),
    ("modelo-de-dados.md",
     "sgp - classes, modelo de dados e dicionario - equipe 8",
     "diagrama de classes, modelo de dados e dicionario de dados",
     "2&ordf; entrega, revisado nas duas primeiras entregas do 2&ordm; bimestre",
     "outubro de 2026"),
    ("mvp-e-prototipos.md",
     "sgp - mvp, navegacao e prototipo - equipe 8",
     "definicao do mvp, mapa de navegacao e prototipo de telas",
     "3&ordf; entrega",
     "setembro de 2026"),
    ("backlog.md",
     "sgp - backlog e quadro de tarefas - equipe 8",
     "backlog e quadro de tarefas",
     "3&ordf; entrega, atualizado nas duas primeiras entregas do 2&ordm; bimestre",
     "outubro de 2026"),
    ("apresentacao.md",
     "sgp - roteiro da apresentacao - equipe 8",
     "roteiro da apresentacao",
     "3&ordf; entrega",
     "setembro de 2026"),
    ("entrega-20-10.md",
     "sgp - planejamento tecnico e implementacao inicial - equipe 8",
     "planejamento tecnico e implementacao inicial",
     "1&ordf; entrega do 2&ordm; bimestre",
     "outubro de 2026"),
    ("entrega-06-11.md",
     "sgp - sistema publicado e funcionando - equipe 8",
     "sistema publicado e funcionando",
     "2&ordf; entrega do 2&ordm; bimestre",
     "novembro de 2026"),
    ("testes.md",
     "sgp - casos de teste e defeitos - equipe 8",
     "casos de teste e registro de defeitos",
     "1&ordf; e 2&ordf; entregas do 2&ordm; bimestre",
     "outubro de 2026"),
]


def embutir_imagens(md, base):
    """troca o caminho das imagens por data uri, pra o html ficar autocontido."""

    def troca(m):
        alt, rel = m.group(1), m.group(2)
        caminho = os.path.normpath(os.path.join(base, rel))
        if not os.path.exists(caminho):
            print("  aviso: imagem nao encontrada:", rel)
            return m.group(0)
        dados = base64.b64encode(open(caminho, "rb").read()).decode()
        return "![%s](data:image/png;base64,%s)" % (alt, dados)

    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", troca, md)


def gerar(arquivo_md, titulo, subtitulo, entrega, data):
    caminho_md = os.path.join(DOCS, arquivo_md)
    origem = open(caminho_md, encoding="utf-8").read()

    # o cabecalho do markdown vira a capa, entao é cortado antes da conversao
    if "\n---\n" in origem:
        origem = origem.split("\n---\n", 1)[1]

    origem = embutir_imagens(origem, DOCS)
    corpo = markdown.markdown(origem, extensions=["tables", "fenced_code", "sane_lists"])

    html = PAGINA.format(
        titulo=titulo,
        css=CSS,
        capa=CAPA.format(subtitulo=subtitulo, entrega=entrega, data=data),
        corpo=corpo,
    )

    saida = os.path.join(DOCS, arquivo_md.replace(".md", ".html"))
    open(saida, "w", encoding="utf-8").write(html)
    print("gerado:", os.path.relpath(saida, RAIZ), "-", len(html), "bytes")


if __name__ == "__main__":
    for doc in DOCUMENTOS:
        gerar(*doc)
