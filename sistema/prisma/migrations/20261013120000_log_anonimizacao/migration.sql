-- RNF10: a anonimizacao de dados pessoais entra no log junto das tres acoes do RF19
ALTER TABLE "log_acao" DROP CONSTRAINT "log_acao_check";
ALTER TABLE "log_acao" ADD CONSTRAINT "log_acao_check"
  CHECK ("acao" IN ('alteracao_situacao', 'atribuicao', 'cancelamento', 'anonimizacao'));
