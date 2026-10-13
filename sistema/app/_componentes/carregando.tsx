// esqueleto mostrado enquanto a tela busca os dados no servidor
export function Carregando() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-4 border-b border-regua pb-3">
        <div className="h-6 w-48 rounded bg-regua-clara" />
        <div className="mt-2 h-4 w-72 rounded bg-regua-clara" />
      </div>
      <div className="cartao mb-4 h-16" />
      <div className="cartao">
        <div className="cartao-titulo h-10" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="mx-4 my-3 h-4 rounded bg-papel" />
        ))}
      </div>
    </div>
  );
}
