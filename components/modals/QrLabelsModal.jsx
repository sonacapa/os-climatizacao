'use client';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { qrUrl } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Btn, Modal } from '../ui';

export default function QrLabelsModal({ equipment }) {
  const { closeModal, data } = useApp();
  const list = Array.isArray(equipment) ? equipment : [equipment];
  return (
    <Modal
      title={list.length > 1 ? `Etiquetas QR (${list.length})` : 'Etiqueta QR'}
      subtitle="Imprima e cole no aparelho. Ao ler o QR, o cliente vê o histórico do equipamento."
      maxWidth="max-w-2xl"
      printArea
      onClose={closeModal}
      footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={closeModal}>Fechar</Btn><Btn icon={Printer} onClick={() => window.print()}>Imprimir</Btn></div>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((eq) => (
          <div key={eq.id} className="border-2 border-slate-800 rounded-xl p-3 text-center break-inside-avoid">
            <QRCodeSVG value={qrUrl(eq)} size={128} level="M" className="mx-auto w-full max-w-[128px] h-auto" />
            <p className="font-mono font-semibold text-sm mt-2">{eq.code}</p>
            {eq.location_tag && <p className="text-xs text-slate-600 truncate">{eq.location_tag}</p>}
            <p className="text-[10px] text-slate-500 mt-1 truncate">{data.company?.name}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
