'use client';

export default function Error({ reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 max-w-sm text-center space-y-3">
        <h1 className="text-lg font-bold text-slate-900">Algo deu errado</h1>
        <p className="text-sm text-slate-500">Seus dados estão salvos. Toque abaixo para recarregar a tela.</p>
        <button onClick={() => reset()} className="bg-brand-600 text-white font-semibold rounded-xl px-5 py-2.5">Recarregar</button>
      </div>
    </div>
  );
}
