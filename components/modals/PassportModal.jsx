'use client';
import { FileText, Pencil, QrCode, ExternalLink } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import { useApp } from '../AppContext';
import { MaintChip, WarrantyChip, eqSpecs, eqTitle, historyFor, spDate } from '../shared';
import { Btn, EmptyState, Modal } from '../ui';

export default function PassportModal({ equipmentId }) {
  const { data, closeModal, openModal, getClient, getTech, me } = useApp();
  const eq = data.equipment.find((e) => e.id === equipmentId);
  if (!eq) return null;
  const client = getClient(eq.client_id);
  const history = historyFor(data.orders, eq.id);

  return (
    <Modal
      title={eq.location_tag || eq.code}
      subtitle={`${eq.code} · ${client?.name || ''}`}
      onClose={closeModal}
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
          <Btn variant="secondary" icon={QrCode} onClick={() => openModal('qrLabels', { equipment: eq })}>Etiqueta QR</Btn>
          <div className="contents sm:flex sm:gap-2">
            <a href={`/qr/${eq.qr_token}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4" /> Visão do cliente</a>
            <Btn icon={Pencil} className="col-span-2 sm:col-auto" onClick={() => openModal('equipment', { equipment: eq })}>Editar</Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="font-semibold text-slate-900">{eqTitle(eq)}</p>
          <p className="text-sm text-slate-500">{eqSpecs(eq) || 'Sem detalhes técnicos'}{eq.serial_number ? ` · Série ${eq.serial_number}` : ''}</p>
          <div className="flex flex-wrap gap-1.5 mt-2"><WarrantyChip eq={eq} /><MaintChip eq={eq} /></div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 mb-2">Histórico de serviços</h4>
          {history.length === 0 && <EmptyState title="Nenhum serviço registrado" text="Os atendimentos concluídos aparecem aqui, cada um com o seu laudo." />}
          <ul className="space-y-2">
            {history.map(({ os, item }) => (
              <li key={item.id} className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{fmtDate(spDate(item.completed_at))} · {item.service_type || os.service_type}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {getTech(os.tech_id)?.name || 'Técnico'} · {item.materials.length ? `${item.materials.length} material(is)` : 'sem materiais'} · garantia {item.warranty_days ? `${item.warranty_days} dias` : 'não informada'}
                  </p>
                </div>
                <Btn variant="secondary" size="sm" icon={FileText} onClick={() => openModal('laudo', { osId: os.id, itemId: item.id })}>Laudo</Btn>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
