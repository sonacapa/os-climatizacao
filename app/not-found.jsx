export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-slate-900">Equipamento não encontrado</h1>
        <p className="text-sm text-slate-600">Este QR Code não corresponde a nenhum aparelho cadastrado.</p>
      </div>
    </main>
  );
}
